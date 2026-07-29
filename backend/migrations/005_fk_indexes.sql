-- Foreign keys with no index: JOINs full-scan, and ON DELETE CASCADE takes a full table lock
-- while it scans for referencing rows. Harmless at current size, ugly later.
CREATE INDEX IF NOT EXISTS idx_calls_contact_id       ON public.calls (contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_contact_id   ON public.crm_leads (contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_last_call_id ON public.crm_leads (last_call_id);
CREATE INDEX IF NOT EXISTS idx_followups_call_id      ON public.followups (call_id);
CREATE INDEX IF NOT EXISTS idx_followups_campaign_id  ON public.followups (campaign_id);
CREATE INDEX IF NOT EXISTS idx_followups_contact_id   ON public.followups (contact_id);
