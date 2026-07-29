-- Sarvam Agents Platform integration.
-- Apply through InsForge (there is no migration runner in this repo).
--
-- calls.twilio_sid already holds the external provider call id (Sarvam attempt_id).
-- These two columns are what the analytics API needs to fetch a call's recording/transcript:
--   GET /api/analytics/v1/{org_id}/{workspace_id}/{app_id}/recordings/{interaction_id}
--   GET /api/analytics/v1/{org_id}/{workspace_id}/{app_id}/transcripts/{interaction_id}

ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS interaction_id TEXT;
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS sarvam_app_id TEXT;

CREATE INDEX IF NOT EXISTS calls_interaction_id_idx ON public.calls (interaction_id);
