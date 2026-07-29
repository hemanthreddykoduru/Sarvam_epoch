// Self-check for the Sarvam webhook field mapping. No network, no DB.
//   npx tsx src/routes/sarvamWebhook.test.ts
//
// Fixtures are the verbatim example payloads from the Sarvam docs:
//   /api-reference/scheduling/campaigns/webhook-payload
//   /api-reference/instant-outbound/webhook-payload
import assert from 'node:assert/strict';
import { tokenIsValid } from './sarvamWebhook.js';
import {
  pick, normalizePhone, STATUS_MAP, toRole, toCallStatus, toDirection, externalKey, fromAttempt,
} from '../services/sarvamCalls.js';

const SECRET = 'correct-horse-battery-staple';
process.env.SARVAM_WEBHOOK_SECRET = SECRET;

const req = (body: any = {}, headers: Record<string, string> = {}) =>
  ({ header: (n: string) => headers[n.toLowerCase()], body } as any);

// --- webhook auth ---
// Sarvam supports no custom headers, so the secret arrives in metadata (request body).
assert.equal(tokenIsValid(req({ metadata: { token: SECRET } })), true, 'campaign webhook metadata token');
assert.equal(tokenIsValid(req({ webhook_config: { metadata: { token: SECRET } } })), true, 'instant outbound metadata token');
assert.equal(tokenIsValid(req({}, { 'x-webhook-token': SECRET })), true, 'header still accepted');
assert.equal(tokenIsValid(req({ metadata: { token: 'wrong' } })), false);
assert.equal(tokenIsValid(req({})), false, 'no token must be rejected');
assert.equal(tokenIsValid(req({ metadata: {} })), false, 'empty token must not pass');
// a query-string token must never authenticate: it would leak into access logs
assert.equal(tokenIsValid({ header: () => undefined, query: { token: SECRET }, body: {} } as any), false);
delete process.env.SARVAM_WEBHOOK_SECRET;
assert.equal(tokenIsValid(req({ metadata: { token: 'anything' } })), false, 'unset secret must fail closed');
process.env.SARVAM_WEBHOOK_SECRET = SECRET;

// --- documented campaign payloads ---
const connected = {
  app_id: 'my-agent-app', attempt_id: '019d392a-4f5a-7db3-904a-6ecebb9aac96',
  campaign_id: 'welcome-campaign-2026', completion_status: 'completed', connectivity_status: 'connected',
  user_phone_number: '+919876543210', duration: 42.5,
  interaction_id: '20260329/a1b2c3d4-10:30:00-e5f6a7b8',
  initial_agent_variables: { customer_name: 'Rahul Kumar' },
  final_agent_variables: { payment_confirmed: 'yes', sentiment: 'positive' },
  interaction_transcript: [
    { role: 'agent', en_text: "Hello Rahul, I'm calling about your pending payment." },
    { role: 'user', en_text: "Yes, I'll pay today." },
  ],
};
const notConnected = {
  attempt_id: '019d392a-11c6-72bd-8eb7-c37e84bbd1f3', completion_status: 'failed',
  connectivity_status: 'failed', failure_reason: 'TelephonyProvider: Rate Limit Exceeded',
  user_phone_number: '+919876543211', duration: null, interaction_id: null,
  final_agent_variables: null, interaction_transcript: null,
};
const instantOutbound = {
  attempt_id: '44b4f89d-252b-4585-ad2e-0ed5842cc6c5', status: 'connected',
  duration: 16.83, interaction_id: '20250920/1ae056a30013510b66a6a0', failure_reason: null,
  webhook_config: { url: 'https://your-server.example.com/webhook', metadata: { user_phone_number: '+919876543212' } },
};

assert.equal(pick(connected, 'attempt_id'), '019d392a-4f5a-7db3-904a-6ecebb9aac96');
assert.equal(pick(connected, 'initial_agent_variables.customer_name'), 'Rahul Kumar');
assert.equal(pick(connected, 'final_agent_variables.sentiment'), 'positive');
assert.equal(pick(connected, 'interaction_id'), '20260329/a1b2c3d4-10:30:00-e5f6a7b8');

// the instant-outbound payload has no top-level phone; it must come from echoed metadata
assert.equal(
  pick(instantOutbound, 'user_phone_number', 'metadata.user_phone_number', 'webhook_config.metadata.user_phone_number'),
  '+919876543212',
);
// null-valued fields must not be treated as present
assert.equal(pick(notConnected, 'interaction_id'), undefined);
assert.equal(pick(notConnected, 'final_agent_variables.sentiment'), undefined, 'must not throw on null parent');

// --- status mapping ---
assert.equal(toCallStatus(connected), 'completed', 'connectivity_status wins over completion_status');
assert.equal(toCallStatus(notConnected), 'failed');
assert.equal(toCallStatus(instantOutbound), 'completed', 'instant outbound uses `status`');
assert.equal(toCallStatus({ status: 'no_answer' }), 'no-answer');
assert.equal(toCallStatus({ status: 'busy' }), 'busy');
assert.equal(toCallStatus({}), 'failed', 'unknown outcome must not be recorded as a success');

// every mapped status must satisfy the calls.status CHECK constraint
const ALLOWED = ['queued', 'ringing', 'in-progress', 'completed', 'failed', 'no-answer', 'busy', 'canceled'];
for (const [from, to] of Object.entries(STATUS_MAP)) {
  assert.ok(ALLOWED.includes(String(to)), `STATUS_MAP['${from}'] -> '${to}' violates the calls.status CHECK`);
}

// --- direction ---
// documented payloads carry no direction field and are dial-out by definition
assert.equal(toDirection(connected), 'outbound');
assert.equal(toDirection(instantOutbound), 'outbound');
assert.equal(toDirection({}), 'outbound', 'unknown must default to outbound, not inbound');
// but an explicit inbound marker must be honoured wherever Sarvam puts it
assert.equal(toDirection({ direction: 'inbound' }), 'inbound');
assert.equal(toDirection({ call_direction: 'INBOUND' }), 'inbound');
assert.equal(toDirection({ channel_info: { direction: 'incoming' } }), 'inbound');

// --- transcript turns: { role: 'agent' | 'user', en_text } ---
assert.equal(toRole('agent'), 'ai');
assert.equal(toRole('user'), 'customer');
assert.equal(toRole(undefined), 'customer');
const turns = connected.interaction_transcript.map(t => ({ role: toRole(t.role), message: String(t.en_text ?? '') }));
assert.deepEqual(turns.map(t => t.role), ['ai', 'customer']);
assert.ok(turns.every(t => t.message.length > 0), 'en_text must be picked up as the message');

// --- phone normalization keys contacts, so formats must collapse to one key ---
assert.equal(normalizePhone('+91 98765 43210'), '9876543210');
assert.equal(normalizePhone('+919876543210'), '9876543210');
assert.equal(normalizePhone('098765-43210'), '9876543210');

// duration is a float in the payload but an INT column
assert.equal(Math.round(Number(connected.duration)), 43);
assert.equal(Math.round(Number(notConnected.duration || 0)), 0, 'null duration must not become NaN');

// --- analytics `attempts` rows (verbatim shape from the live API) ---
const inboundAttempt = {
  attempt_id: 'NO_JOB_ID',
  interaction_id: '20260726/33929b8c-12:56:10-f425a284',
  connectivity_status: 'connected',
  failure_reason: 'NO_FAILURE_REASON',
  duration_in_seconds: 9.503945350646973,
  end_datetime: '2026-07-26T07:26:17',
  language_name: 'Telugu',
  user_contact: '+919966659900',
  channel_direction: 'inbound',
  campaign_id: 'NO_CAMPAIGN_ID',
  audio_url: 'https://agents.sarvam.ai/media?x=1',
  agent_variables: { userName: 'Divya Nair' },
};

// every inbound attempt shares attempt_id "NO_JOB_ID", so it must never be the key
assert.equal(externalKey({ attempt_id: 'NO_JOB_ID' }), undefined, 'NO_JOB_ID must not be used as a key');
assert.equal(externalKey(inboundAttempt), '20260726/33929b8c-12:56:10-f425a284', 'interaction_id is the key');
assert.equal(externalKey({ attempt_id: 'real-attempt' }), 'real-attempt', 'falls back to a real attempt_id');
assert.equal(externalKey({}), undefined);

const m = fromAttempt(inboundAttempt, 'app-1')!;
assert.ok(m, 'a connected inbound attempt must map');
assert.equal(m.direction, 'inbound', 'channel_direction must drive direction');
assert.equal(m.status, 'completed');
assert.equal(m.phone, '+919966659900');
assert.equal(m.contactName, 'Divya Nair');
assert.equal(m.durationSeconds, 9.503945350646973);
assert.equal(m.recordingUrl, 'https://agents.sarvam.ai/media?x=1');
assert.equal(m.campaignName, 'Inbound Calls', 'NO_CAMPAIGN_ID must not become a campaign name');
assert.equal(m.keyNotes, undefined, 'NO_FAILURE_REASON is not a real failure');
// a row with neither key nor phone must be skipped, not stored half-formed
assert.equal(fromAttempt({ attempt_id: 'NO_JOB_ID' }, 'app-1'), null);

// two inbound calls must produce two different keys (the duplicate-row bug)
assert.notEqual(
  externalKey({ ...inboundAttempt, interaction_id: 'a' }),
  externalKey({ ...inboundAttempt, interaction_id: 'b' }),
);

console.log('sarvamWebhook mapping: all checks passed');
