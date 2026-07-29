import { Router, Response } from 'express';
import axios from 'axios';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import logger from '../utils/logger.js';
import { fromAttempt, storeSarvamCall, fetchTranscript, fetchAllAttempts } from '../services/sarvamCalls.js';
import { adminClient } from '../lib/insforge.js';

const router = Router();

router.use(requireAuth);

// There is deliberately no generic passthrough to the Sarvam API.
//
// A `/:service/*` proxy re-exposed every per-interaction analytics resource
// (analytics/recordings/{id}, analytics/transcripts/{id}) without an owner check, so any
// authenticated user could read any other user's call audio by guessing an interaction_id —
// bypassing the check on /recording/* below. It also exposed POST outbounds/outbounds, letting
// any authenticated user place real billable calls.
//
// Each Sarvam endpoint this app actually needs gets its own owner-scoped route instead.
const cfg = () => ({
  key: process.env.SARVAM_VOICE_AGENTS_API_KEY,
  org: process.env.SARVAM_ORG_ID,
  workspace: process.env.SARVAM_WORKSPACE_ID,
  appId: process.env.SARVAM_AGENT_ID,
});

function targetUrl(service: string, rest: string) {
  const { org, workspace, appId } = cfg();
  if (service === 'analytics') {
    return `https://apps.sarvam.ai/api/analytics/v1/${org}/${workspace}/${appId}/${rest}`;
  }
  return `https://apps.sarvam.ai/api/${service}/v1/orgs/${org}/workspaces/${workspace}/${rest}`;
}

/**
 * Pull calls from the analytics `attempts` API into the local calls table.
 *
 * This is the only source that covers INBOUND calls — Sarvam documents no inbound webhook, but
 * every attempt row carries an explicit `channel_direction`. It also backfills history and gives
 * each call an `audio_url` recording, neither of which the webhook can do.
 *
 * ponytail: user-triggered pull, not a background poller — polling a paid API on a timer burns
 * quota for nothing. Move to a schedule only if calls need to appear without anyone opening the app.
 */
router.post('/sync', async (req: AuthRequest, res) => {
  const { key, org, workspace, appId } = cfg();
  if (!key || !org || !workspace || !appId) {
    return res.status(500).json({ error: 'Sarvam Agents not configured (need key, org, workspace, agent id).' });
  }

  const days = Math.min(Number(req.body?.days) || 90, 365);
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

  try {
    const items = await fetchAllAttempts(
      { org, workspace, appId, key },
      {
        start: start.toISOString().replace(/\.\d{3}Z$/, 'Z'),
        end: end.toISOString().replace(/\.\d{3}Z$/, 'Z'),
      },
    );

    let created = 0, updated = 0, skipped = 0;
    const errors: string[] = [];
    let withTranscript = 0;
    for (const item of items) {
      const mapped = fromAttempt(item, appId);
      if (!mapped) { skipped++; continue; }
      try {
        // The attempts list has no conversation; pull it per call. One extra request each, which
        // is why sync stays a user-triggered action rather than a background poll.
        if (mapped.interactionId) {
          mapped.transcript = await fetchTranscript(mapped.interactionId, { org, workspace, appId, key });
          if (mapped.transcript?.length) withTranscript++;
        }
        const r = await storeSarvamCall(req.userId!, mapped);
        r.created ? created++ : updated++;
      } catch (e: any) {
        errors.push(e.message);
      }
    }

    logger.info('Sarvam sync complete', { fetched: items.length, created, updated, skipped, withTranscript, failed: errors.length });
    return res.json({ data: { fetched: items.length, created, updated, skipped, withTranscript, failed: errors.length, errors: errors.slice(0, 3) } });
  } catch (error: any) {
    logger.error('Sarvam sync errored', { message: error.message });
    return res.status(502).json({ error: error.message });
  }
});

/**
 * Signed-URL proxy for the browser Voice Agents SDK (docs: /sdks/proxy-setup).
 *
 * The SDK makes exactly one authenticated HTTP call — GET .../apps/{app_id}/url — to obtain a
 * pre-signed WebSocket URL, then connects to that URL directly. So proxying this single request
 * is enough to keep the API key server-side; no WebSocket proxying is needed.
 *
 * Locked to this workspace: the client supplies the path, so an unchecked proxy would let any
 * caller spend our key against arbitrary orgs/workspaces.
 */
router.get('/app-runtime/orgs/:org/workspaces/:ws/apps/:appId/url', async (req: AuthRequest, res) => {
  const { key, org, workspace } = cfg();
  if (!key || !org || !workspace) {
    return res.status(500).json({ error: 'Sarvam Agents not configured.' });
  }
  if (req.params.org !== org || req.params.ws !== workspace) {
    logger.warn('Rejected app-runtime proxy for foreign workspace', { org: req.params.org, ws: req.params.ws });
    return res.status(403).json({ error: 'Workspace not allowed' });
  }

  try {
    const url = `https://apps.sarvam.ai/api/app-runtime/orgs/${org}/workspaces/${workspace}/apps/${encodeURIComponent(req.params.appId)}/url`;
    const response = await axios.get(url, {
      params: req.query,
      headers: { 'X-API-Key': key },
      validateStatus: () => true,
      timeout: 30000,
    });
    if (response.status >= 400) {
      logger.error('Sarvam signed-url request failed', { status: response.status });
      return res.status(response.status).json({ error: 'Could not start voice session' });
    }
    return res.json(response.data); // SDK reads this body directly, so pass it through unwrapped
  } catch (error: any) {
    logger.error('Sarvam signed-url proxy errored', { message: error.message });
    return res.status(502).json({ error: error.message });
  }
});

/**
 * Stream a call recording. Sarvam's `audio_url` from the attempts API is a dashboard web page,
 * not a media file — following it returns HTML. The real audio comes from the analytics
 * recordings endpoint as raw WAV bytes, and it needs the API key, so it must be proxied here
 * rather than played directly from the browser.
 *
 * interaction_id contains a slash ("20260726/33929b8c-..."), hence the wildcard.
 */
router.get('/recording/*', async (req: AuthRequest, res) => {
  const { key, org, workspace, appId } = cfg();
  if (!key || !org || !workspace || !appId) {
    return res.status(500).json({ error: 'Sarvam Agents not configured.' });
  }
  const interactionId = String((req.params as any)[0] || '');
  if (!interactionId || interactionId.includes('..')) {
    return res.status(400).json({ error: 'Invalid interaction id' });
  }

  // only serve recordings for calls this user owns
  const { data: owned } = await adminClient.database
    .from('calls').select('id').eq('user_id', req.userId!).eq('interaction_id', interactionId).limit(1);
  if (!owned?.[0]) return res.status(404).json({ error: 'Recording not found' });

  try {
    const response = await axios.get(
      `https://apps.sarvam.ai/api/analytics/v1/${org}/${workspace}/${appId}/recordings/${interactionId}`,
      { headers: { 'X-API-Key': key }, responseType: 'arraybuffer', validateStatus: () => true, timeout: 60000 },
    );
    if (response.status >= 400) {
      return res.status(response.status).json({ error: 'Recording unavailable' });
    }
    res.setHeader('Content-Type', String(response.headers['content-type'] || 'audio/wav'));
    res.setHeader('Content-Length', String(response.data.byteLength));
    return res.send(Buffer.from(response.data));
  } catch (error: any) {
    logger.error('Sarvam recording fetch failed', { message: error.message });
    return res.status(502).json({ error: error.message });
  }
});

export default router;
