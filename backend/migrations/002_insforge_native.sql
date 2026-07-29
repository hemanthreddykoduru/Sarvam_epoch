-- ⚠️  NOT APPLIED — DO NOT ASSUME THIS SCHEMA IS LIVE.
--
-- The live database is built from 001_create_tables.sql plus 003/004/005. This file was never
-- applied and CONTRADICTS what is running, e.g.:
--   * campaigns.status here allows 'running'/'failed'; live allows 'active'/'cancelled'
--   * transcripts here are a JSONB column on calls; live uses the separate transcripts table
--
-- Code written against this file will break at runtime. Either apply it deliberately and migrate
-- the affected code, or delete it.

-- TeluguAI Caller - InsForge Native Schema
-- Migration 002: Rebuild for InsForge-native architecture
-- Drops old tables, creates new ones aligned with InsForge patterns

-- ============================================================
-- DROP OLD TABLES (InsForge manages auth.users, auth.sessions, etc.)
-- ============================================================
DROP TABLE IF EXISTS public.followups CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.summaries CASCADE;
DROP TABLE IF EXISTS public.transcripts CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ============================================================
-- CAMPAIGNS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'failed')),
  voice_language TEXT DEFAULT 'te' CHECK (voice_language IN ('te', 'en', 'mixed')),
  total_contacts INT DEFAULT 0,
  called_count INT DEFAULT 0,
  connected_count INT DEFAULT 0,
  interested_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  no_answer_count INT DEFAULT 0,
  busy_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns_select_own" ON public.campaigns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "campaigns_insert_own" ON public.campaigns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "campaigns_update_own" ON public.campaigns
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "campaigns_delete_own" ON public.campaigns
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- CONTACTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_normalized TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN (
    'new', 'calling', 'connected', 'completed', 'failed', 'invalid',
    'contacted', 'interested', 'follow-up', 'converted', 'not-interested'
  )),
  call_attempts INT DEFAULT 0,
  last_called_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, phone_normalized)
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_select_own" ON public.contacts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "contacts_insert_own" ON public.contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contacts_update_own" ON public.contacts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "contacts_delete_own" ON public.contacts
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- CALLS (replaces old calls + transcripts + summaries)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  twilio_sid TEXT UNIQUE,
  status TEXT DEFAULT 'queued' CHECK (status IN (
    'queued', 'ringing', 'in-progress', 'completed',
    'failed', 'no-answer', 'busy', 'canceled'
  )),
  direction TEXT DEFAULT 'outbound',
  duration_seconds INT DEFAULT 0,
  recording_url TEXT,
  recording_duration INT,
  -- Transcript stored as JSONB array
  transcript JSONB DEFAULT '[]'::jsonb,
  -- Summary fields (denormalized from old summaries table)
  customer_intent TEXT,
  interest_level TEXT CHECK (interest_level IN ('high', 'medium', 'low', 'unknown')),
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  follow_up_required BOOLEAN DEFAULT false,
  key_notes TEXT,
  ai_summary TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calls_select_own" ON public.calls
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "calls_insert_own" ON public.calls
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "calls_update_own" ON public.calls
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- CALL EVENTS (detailed event log for each call)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.call_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'status_change', 'recording', 'transcript', 'error'
  event_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.call_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "call_events_select_via_call" ON public.call_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.calls WHERE id = call_id AND user_id = auth.uid()
    )
  );

-- ============================================================
-- CRM LEADS (auto-updated from call outcomes)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'new' CHECK (status IN (
    'new', 'contacted', 'interested', 'follow-up', 'converted', 'not-interested'
  )),
  interest_level TEXT CHECK (interest_level IN ('high', 'medium', 'low', 'unknown')),
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  last_call_id UUID REFERENCES public.calls(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, contact_id)
);

ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_leads_select_own" ON public.crm_leads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "crm_leads_insert_own" ON public.crm_leads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "crm_leads_update_own" ON public.crm_leads
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_campaigns_user ON public.campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_contacts_campaign ON public.contacts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user ON public.contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON public.contacts(status);
CREATE INDEX IF NOT EXISTS idx_calls_campaign ON public.calls(campaign_id);
CREATE INDEX IF NOT EXISTS idx_calls_user ON public.calls(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON public.calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_twilio ON public.calls(twilio_sid);
CREATE INDEX IF NOT EXISTS idx_call_events_call ON public.call_events(call_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_user ON public.crm_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON public.crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_campaign ON public.crm_leads(campaign_id);

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_crm_leads_updated_at
  BEFORE UPDATE ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- RPC: Get campaign stats
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_campaign_stats(campaign_uuid UUID)
RETURNS TABLE (
  total_contacts BIGINT,
  called_count BIGINT,
  connected_count BIGINT,
  failed_count BIGINT,
  no_answer_count BIGINT,
  interested_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_contacts,
    COUNT(*) FILTER (WHERE c.status != 'new')::BIGINT as called_count,
    COUNT(*) FILTER (WHERE c.status = 'connected')::BIGINT as connected_count,
    COUNT(*) FILTER (WHERE c.status = 'failed')::BIGINT as failed_count,
    COUNT(*) FILTER (WHERE c.status = 'not-interested')::BIGINT as no_answer_count,
    COUNT(*) FILTER (WHERE c.status = 'interested')::BIGINT as interested_count
  FROM public.contacts c
  WHERE c.campaign_id = campaign_uuid;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RPC: Get dashboard stats for a user
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(user_uuid UUID)
RETURNS TABLE (
  total_campaigns BIGINT,
  total_calls BIGINT,
  connected_calls BIGINT,
  interested_leads BIGINT,
  follow_up_leads BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.campaigns WHERE user_id = user_uuid)::BIGINT,
    (SELECT COUNT(*) FROM public.calls WHERE user_id = user_uuid)::BIGINT,
    (SELECT COUNT(*) FROM public.calls WHERE user_id = user_uuid AND status = 'completed')::BIGINT,
    (SELECT COUNT(*) FROM public.crm_leads WHERE user_id = user_uuid AND status = 'interested')::BIGINT,
    (SELECT COUNT(*) FROM public.crm_leads WHERE user_id = user_uuid AND status = 'follow-up')::BIGINT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RPC: Get analytics overview
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_analytics_overview(user_uuid UUID)
RETURNS TABLE (
  total_calls BIGINT,
  completed_calls BIGINT,
  failed_calls BIGINT,
  no_answer_calls BIGINT,
  busy_calls BIGINT,
  total_campaigns BIGINT,
  avg_duration NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'no-answer')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'busy')::BIGINT,
    (SELECT COUNT(*) FROM public.campaigns WHERE user_id = user_uuid)::BIGINT,
    COALESCE(AVG(duration_seconds) FILTER (WHERE status = 'completed'), 0)::NUMERIC
  FROM public.calls
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RPC: Get daily calls for last N days
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_daily_calls(user_uuid UUID, days INT DEFAULT 30)
RETURNS TABLE (
  date DATE,
  total BIGINT,
  completed BIGINT,
  failed BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d::DATE,
    COUNT(c.id)::BIGINT,
    COUNT(c.id) FILTER (WHERE c.status = 'completed')::BIGINT,
    COUNT(c.id) FILTER (WHERE c.status = 'failed')::BIGINT
  FROM generate_series(CURRENT_DATE - (days || ' days')::INTERVAL, CURRENT_DATE, '1 day') d
  LEFT JOIN public.calls c ON c.created_at::DATE = d AND c.user_id = user_uuid
  GROUP BY d
  ORDER BY d;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RPC: Get campaign performance
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_campaign_performance(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  status TEXT,
  total_contacts BIGINT,
  called_count BIGINT,
  connected_count BIGINT,
  interested_count BIGINT,
  call_rate NUMERIC,
  connect_rate NUMERIC,
  interest_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    camp.id,
    camp.name,
    camp.status,
    COUNT(c.id)::BIGINT,
    COUNT(c.id) FILTER (WHERE c.status != 'queued')::BIGINT,
    COUNT(c.id) FILTER (WHERE c.status = 'completed')::BIGINT,
    COUNT(cl.id) FILTER (WHERE cl.status = 'interested')::BIGINT,
    CASE WHEN COUNT(c.id) > 0
      THEN ROUND(COUNT(c.id) FILTER (WHERE c.status != 'queued')::NUMERIC / COUNT(c.id) * 100, 1)
      ELSE 0 END,
    CASE WHEN COUNT(c.id) FILTER (WHERE c.status != 'queued') > 0
      THEN ROUND(COUNT(c.id) FILTER (WHERE c.status = 'completed')::NUMERIC / COUNT(c.id) FILTER (WHERE c.status != 'queued') * 100, 1)
      ELSE 0 END,
    CASE WHEN COUNT(c.id) FILTER (WHERE c.status = 'completed') > 0
      THEN ROUND(COUNT(cl.id) FILTER (WHERE cl.status = 'interested')::NUMERIC / COUNT(c.id) FILTER (WHERE c.status = 'completed') * 100, 1)
      ELSE 0 END
  FROM public.campaigns camp
  LEFT JOIN public.calls c ON c.campaign_id = camp.id
  LEFT JOIN public.crm_leads cl ON cl.campaign_id = camp.id
  WHERE camp.user_id = user_uuid
  GROUP BY camp.id, camp.name, camp.status
  ORDER BY camp.created_at DESC;
END;
$$ LANGUAGE plpgsql;
