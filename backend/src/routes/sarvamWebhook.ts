import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import logger from '../utils/logger.js';
import {
  pick, toCallStatus, toDirection, toRole, externalKey, storeSarvamCall,
} from '../services/sarvamCalls.js';

const router = Router();

/**
 * Receives Sarvam Agents campaign / instant-outbound webhooks and writes them into the local
 * calls + transcripts tables, so every existing page (Analytics, CRM, Insights, Escalations)
 * keeps reading one source of truth.
 *
 * Sarvam sends no signature and its webhook_config accepts only { url, metadata } — no custom
 * headers. So the shared secret travels in metadata, which is echoed back inside the request
 * BODY: unlike a ?token= query string it never lands in access logs, proxy logs or Fly's log
 * stream. Never log the raw body here, or the secret leaks anyway.
 *
 * Configure in the Sarvam dashboard / outbound call payload as:
 *   url:      https://<your-api-host>/api/sarvam/webhook
 *   metadata: { "token": "<SARVAM_WEBHOOK_SECRET>" }
 *
 * If Sarvam ever documents an HMAC body signature, prefer it: it also proves the payload
 * wasn't tampered with, which a bearer secret cannot.
 */

const secretsMatch = (provided: string, expected: string) => {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // length check first: timingSafeEqual throws on mismatched lengths
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

export function tokenIsValid(req: { header(n: string): string | undefined; body?: any }): boolean {
  const expected = process.env.SARVAM_WEBHOOK_SECRET;
  if (!expected) return false;
  const body = req.body || {};
  const provided = String(
    req.header('x-webhook-token') ||           // preferred, if Sarvam ever supports headers
    body?.metadata?.token ||                    // campaign webhook
    body?.webhook_config?.metadata?.token ||    // instant outbound webhook
    '',
  );
  return provided !== '' && secretsMatch(provided, expected);
}

router.post('/webhook', async (req: Request, res: Response) => {
  if (!tokenIsValid(req)) {
    logger.warn('Rejected Sarvam webhook with bad token');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = process.env.SARVAM_WEBHOOK_USER_ID;
  if (!userId) {
    logger.error('SARVAM_WEBHOOK_USER_ID not set; cannot attribute Sarvam call');
    return res.status(500).json({ error: 'SARVAM_WEBHOOK_USER_ID not configured' });
  }

  const body = req.body || {};
  const externalId = externalKey(body);
  // The campaign webhook carries user_phone_number; the instant-outbound webhook does not, so
  // outbound.ts echoes it back through webhook_config.metadata when it places the call.
  const phone = pick(body, 'user_phone_number', 'metadata.user_phone_number', 'webhook_config.metadata.user_phone_number');

  if (!externalId || !phone) {
    // Log the shape, not the contents: the payload carries phone numbers and transcript text.
    logger.error('Sarvam webhook missing call id or phone', { payloadKeys: Object.keys(body) });
    return res.status(202).json({ data: { stored: false, reason: 'missing call id or phone' } });
  }

  try {
    const turns = pick(body, 'interaction_transcript');
    const { callId } = await storeSarvamCall(userId, {
      externalId,
      phone: String(phone),
      contactName: pick(body,
        'initial_agent_variables.customer_name',
        'final_agent_variables.customer_name',
        'metadata.customer_name',
        'webhook_config.metadata.customer_name',
        'user_identifier',
      ) || 'Unknown',
      campaignName: pick(body, 'campaign_id') || 'Instant Outbound',
      status: toCallStatus(body),
      direction: toDirection(body),
      durationSeconds: Number(pick(body, 'duration') || 0),
      interactionId: pick(body, 'interaction_id'),
      appId: pick(body, 'app_id', 'metadata.app_id', 'webhook_config.metadata.app_id'),
      sentiment: pick(body, 'final_agent_variables.sentiment'),
      keyNotes: pick(body, 'failure_reason'),
      startedAt: pick(body, 'executed_at'),
      endedAt: pick(body, 'executed_at'),
      transcript: Array.isArray(turns)
        ? turns.map((t: any) => ({
            role: toRole(t.role),
            message: String(t.en_text ?? t.text ?? t.message ?? ''),
            language: t.language,
            timestampSeconds: Number(t.timestamp_seconds ?? t.start_time ?? 0),
          }))
        : undefined,
    });

    // live-update any open dashboard
    const { io } = await import('../index.js');
    io.emit('call:updated', { id: callId });

    return res.json({ data: { stored: true, call_id: callId } });
  } catch (error: any) {
    logger.error('Failed to store Sarvam webhook', { message: error.message, payloadKeys: Object.keys(body) });
    return res.status(500).json({ error: error.message });
  }
});

export default router;
