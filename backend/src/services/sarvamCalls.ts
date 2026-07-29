import axios from 'axios';
import { adminClient } from '../lib/insforge.js';

/**
 * Shared mapping + persistence for Sarvam Agents calls.
 *
 * Two sources feed the same `calls` rows and must agree, or the same call lands twice:
 *   - the webhook   (routes/sarvamWebhook.ts) — live push, outbound campaigns + instant outbound
 *   - the sync      (routes/sarvam.ts)        — pull from the analytics `attempts` API, all calls
 */

export const pick = (obj: any, ...keys: string[]) => {
  for (const k of keys) {
    const v = k.split('.').reduce((o: any, part) => (o == null ? o : o[part]), obj);
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
};

export const normalizePhone = (phone: string) => String(phone).replace(/[^\d]/g, '').slice(-10);

/**
 * Sarvam reports outcome in three different shapes:
 *   campaign webhook  -> connectivity_status: connected | busy | no_answer | failed | null
 *                        completion_status:   completed | partial | failed
 *   instant outbound  -> status:              connected | no_answer | busy | failed
 *   analytics attempts-> connectivity_status: connected | ...
 * Collapse all onto the calls.status CHECK constraint.
 */
export const STATUS_MAP: Record<string, string> = {
  connected: 'completed', completed: 'completed', partial: 'completed',
  no_answer: 'no-answer',
  busy: 'busy',
  failed: 'failed',
};

export function toCallStatus(body: any): string {
  const raw = String(pick(body, 'connectivity_status', 'status', 'completion_status') || '').toLowerCase();
  return STATUS_MAP[raw] || 'failed';
}

/**
 * The analytics API returns an explicit `channel_direction`. Webhook payloads don't — campaign and
 * instant-outbound are dial-out by definition, so they fall through to 'outbound'.
 */
export function toDirection(body: any): 'inbound' | 'outbound' {
  const raw = String(
    pick(body, 'channel_direction', 'direction', 'call_direction', 'channel_info.direction', 'metadata.direction') || '',
  ).toLowerCase();
  return raw === 'inbound' || raw === 'incoming' ? 'inbound' : 'outbound';
}

// Transcript turns look like { role: 'agent' | 'user', en_text: '...' }
export const toRole = (role: any) =>
  ['assistant', 'agent', 'ai', 'bot'].includes(String(role || '').toLowerCase()) ? 'ai' : 'customer';

/**
 * Inbound attempts all come back with attempt_id "NO_JOB_ID", so attempt_id cannot identify a call.
 * interaction_id is unique per call and present on every row that actually connected.
 */
export function externalKey(body: any): string | undefined {
  const interaction = pick(body, 'interaction_id');
  if (interaction) return String(interaction);
  const attempt = pick(body, 'attempt_id');
  return attempt && attempt !== 'NO_JOB_ID' ? String(attempt) : undefined;
}

export interface SarvamCall {
  externalId: string;
  phone: string;
  contactName: string;
  campaignName: string;
  status: string;
  direction: 'inbound' | 'outbound';
  durationSeconds: number;
  interactionId?: string;
  appId?: string;
  sentiment?: string;
  keyNotes?: string;
  startedAt?: string;
  endedAt?: string;
  recordingUrl?: string;
  transcript?: Array<{ role: string; message: string; language?: string; timestampSeconds?: number }>;
}

/** Idempotent upsert: the same call arriving twice updates one row rather than duplicating it. */
export async function storeSarvamCall(userId: string, call: SarvamCall) {
  const db = adminClient.database;

  // find-or-create the campaign this call belongs to
  const { data: existingCampaigns } = await db
    .from('campaigns').select('id').eq('user_id', userId).eq('name', call.campaignName).limit(1);
  let campaignId = existingCampaigns?.[0]?.id;
  if (!campaignId) {
    // No explicit status: migration 001 allows 'active' and 002 allows 'running', so anything we
    // hardcode breaks under one of them. The column default ('draft') is valid in both.
    const { data: created, error } = await db
      .from('campaigns')
      .insert([{ user_id: userId, name: call.campaignName, description: 'Auto-created from synced call activity' }])
      .select().single();
    if (error) throw error;
    campaignId = created.id;
  }

  // find-or-create the contact by normalized phone within that campaign
  const phoneNorm = normalizePhone(call.phone);
  const { data: existingContacts } = await db
    .from('contacts').select('id').eq('campaign_id', campaignId).eq('phone_normalized', phoneNorm).limit(1);
  let contactId = existingContacts?.[0]?.id;
  if (!contactId) {
    const { data: created, error } = await db
      .from('contacts')
      .insert([{ user_id: userId, campaign_id: campaignId, name: call.contactName, phone: String(call.phone), phone_normalized: phoneNorm }])
      .select().single();
    if (error) throw error;
    contactId = created.id;
  }

  const row: Record<string, any> = {
    user_id: userId,
    campaign_id: campaignId,
    contact_id: contactId,
    twilio_sid: call.externalId, // reused as the external provider call id (UNIQUE => DB-level idempotency)
    status: call.status,
    direction: call.direction,
    duration_seconds: Math.round(call.durationSeconds || 0),
    interaction_id: call.interactionId,
    sarvam_app_id: call.appId,
    sentiment: ['positive', 'neutral', 'negative'].includes(String(call.sentiment)) ? call.sentiment : undefined,
    key_notes: call.keyNotes,
    started_at: call.startedAt,
    ended_at: call.endedAt,
    recording_url: call.recordingUrl,
  };
  Object.keys(row).forEach(k => row[k] === undefined && delete row[k]);

  const { data: existing } = await db.from('calls').select('id').eq('twilio_sid', call.externalId).limit(1);
  let callId = existing?.[0]?.id;
  if (callId) {
    const { error } = await db.from('calls').update(row).eq('id', callId);
    if (error) throw error;
  } else {
    const { data: created, error } = await db.from('calls').insert([row]).select().single();
    if (error) throw error;
    callId = created.id;
  }

  if (call.transcript?.length) {
    // replace rather than append, so a redelivered payload doesn't double the turns
    await db.from('transcripts').delete().eq('call_id', callId);
    const rows = call.transcript
      .map(t => ({
        call_id: callId,
        role: t.role,
        message: t.message,
        original_language: t.language || 'te',
        timestamp_seconds: t.timestampSeconds ?? 0,
      }))
      .filter(r => r.message);
    if (rows.length) await db.from('transcripts').insert(rows);
  }

  return { callId, created: !existing?.[0] };
}

export interface SarvamCfg { org: string; workspace: string; appId: string; key: string }

/**
 * Page through GET /analytics/v1/{org}/{ws}/{app}/attempts.
 *
 * Sarvam caps `limit` at 1000 and reports the true count in `total`, so a single request silently
 * truncates any workspace with more history than that. Keep requesting until we've seen `total`
 * or a page comes back empty.
 */
export async function fetchAllAttempts(
  cfg: SarvamCfg,
  range: { start: string; end: string },
  pageSize = 1000,
  maxPages = 50, // ponytail: hard stop so a bad `total` can't spin forever; raise if 50k calls isn't enough
): Promise<any[]> {
  const url = `https://apps.sarvam.ai/api/analytics/v1/${cfg.org}/${cfg.workspace}/${cfg.appId}/attempts`;
  const all: any[] = [];
  let offset = 0;

  for (let page = 0; page < maxPages; page++) {
    const res = await axios.get(url, {
      params: {
        start_datetime: range.start,
        end_datetime: range.end,
        limit: pageSize,
        offset,
        sort_by: 'start_datetime',
        sort_order: 'desc',
      },
      headers: { 'X-API-Key': cfg.key },
      validateStatus: () => true,
      timeout: 60000,
    });
    if (res.status >= 400) {
      if (all.length) break;            // keep whatever we already have
      throw new Error(`Sarvam attempts failed (${res.status})`);
    }

    const items: any[] = res.data?.items || [];
    all.push(...items);

    const total = Number(res.data?.total ?? all.length);
    if (items.length === 0 || all.length >= total) break;
    offset += items.length;
  }
  return all;
}

/**
 * Fetch a call's conversation from GET /analytics/v1/{org}/{ws}/{app}/transcripts/{interaction_id}.
 * The attempts list carries no transcript, so this is the only source for synced calls.
 * Returns [] when the call has no conversation (e.g. it never connected).
 */
export async function fetchTranscript(
  interactionId: string,
  cfg: { org: string; workspace: string; appId: string; key: string },
): Promise<SarvamCall['transcript']> {
  const url = `https://apps.sarvam.ai/api/analytics/v1/${cfg.org}/${cfg.workspace}/${cfg.appId}/transcripts/${interactionId}`;
  const res = await axios.get(url, {
    headers: { 'X-API-Key': cfg.key },
    validateStatus: () => true,
    timeout: 30000,
  });
  if (res.status >= 400) return [];

  const messages: any[] = res.data?.messages || [];
  return messages
    .map((m: any) => ({
      role: toRole(m.role),
      message: String(m.content ?? m.text ?? ''),
      language: m.language_name,
      // ponytail: Sarvam gives turn_id, not per-turn timing. Stored here so the UI can order
      // turns; swap for real offsets if the API ever exposes them.
      timestampSeconds: Number(m.turn_id ?? 0),
    }))
    .filter(t => t.message);
}

/** Map one row from GET /analytics/v1/{org}/{ws}/{app}/attempts onto the common shape. */
export function fromAttempt(item: any, appId?: string): SarvamCall | null {
  const externalId = externalKey(item);
  const phone = pick(item, 'user_contact', 'user_contact_masked');
  if (!externalId || !phone) return null;

  const campaignId = pick(item, 'campaign_id');
  return {
    externalId,
    phone: String(phone),
    contactName: pick(item, 'agent_variables.userName', 'agent_variables.customer_name', 'user_identifier') || 'Unknown',
    // inbound calls report campaign_id "NO_CAMPAIGN_ID" — they belong to no campaign
    campaignName: campaignId && campaignId !== 'NO_CAMPAIGN_ID' ? String(campaignId)
      : (toDirection(item) === 'inbound' ? 'Inbound Calls' : 'Outbound Calls'),
    status: toCallStatus(item),
    direction: toDirection(item),
    durationSeconds: Number(pick(item, 'duration_in_seconds') || 0),
    interactionId: pick(item, 'interaction_id'),
    appId,
    keyNotes: pick(item, 'failure_reason') !== 'NO_FAILURE_REASON' ? pick(item, 'failure_reason') : undefined,
    // when the call actually happened — created_at is only when WE synced the row
    startedAt: pick(item, 'start_datetime', 'attempted_at'),
    endedAt: pick(item, 'end_datetime'),
    recordingUrl: pick(item, 'audio_url'),
  };
}
