-- TeluguAI Caller Database Schema
-- Migration 001: Core Tables

-- Users table (mirrors Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin')),
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'professional', 'enterprise')),
  credits_remaining INT DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read own data, admins can read all
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
  ));

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "users_insert_trigger" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Campaigns
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  total_contacts INT DEFAULT 0,
  called_count INT DEFAULT 0,
  connected_count INT DEFAULT 0,
  interested_count INT DEFAULT 0,
  voice_language TEXT DEFAULT 'te' CHECK (voice_language IN ('te', 'en', 'mixed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns_own" ON public.campaigns
  FOR ALL USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
  ));

-- Contacts
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_normalized TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'calling', 'connected', 'completed', 'failed', 'invalid', 'new', 'contacted', 'interested', 'follow-up', 'converted', 'not-interested')),
  call_attempts INT DEFAULT 0,
  last_called_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, phone_normalized)
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_own" ON public.contacts
  FOR ALL USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
  ));

-- Calls
CREATE TABLE IF NOT EXISTS public.calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id),
  contact_id UUID REFERENCES public.contacts(id),
  user_id UUID REFERENCES public.users(id),
  twilio_sid TEXT UNIQUE,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'ringing', 'in-progress', 'completed', 'failed', 'no-answer', 'busy', 'canceled')),
  duration_seconds INT DEFAULT 0,
  recording_url TEXT,
  recording_duration INT,
  direction TEXT DEFAULT 'outbound',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calls_own" ON public.calls
  FOR ALL USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
  ));

-- Transcripts
CREATE TABLE IF NOT EXISTS public.transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES public.calls(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('ai', 'customer')),
  message TEXT NOT NULL,
  original_language TEXT DEFAULT 'te',
  timestamp_seconds DECIMAL(10,3),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transcripts_via_call" ON public.transcripts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.calls WHERE id = call_id AND user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- Summaries
CREATE TABLE IF NOT EXISTS public.summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES public.calls(id) ON DELETE CASCADE UNIQUE,
  customer_intent TEXT,
  interest_level TEXT CHECK (interest_level IN ('high', 'medium', 'low', 'unknown')),
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  follow_up_required BOOLEAN DEFAULT false,
  key_notes TEXT,
  ai_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "summaries_via_call" ON public.summaries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.calls WHERE id = call_id AND user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- Follow-ups
CREATE TABLE IF NOT EXISTS public.followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES public.calls(id),
  campaign_id UUID REFERENCES public.campaigns(id),
  user_id UUID REFERENCES public.users(id),
  contact_id UUID REFERENCES public.contacts(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  scheduled_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "followups_own" ON public.followups
  FOR ALL USING (auth.uid() = user_id);

-- Subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) UNIQUE,
  plan TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  credits_total INT DEFAULT 10,
  credits_used INT DEFAULT 0,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_own" ON public.subscriptions
  FOR ALL USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
  ));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_user ON public.campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_contacts_campaign ON public.contacts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user ON public.contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON public.contacts(status);
CREATE INDEX IF NOT EXISTS idx_calls_campaign ON public.calls(campaign_id);
CREATE INDEX IF NOT EXISTS idx_calls_user ON public.calls(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON public.calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_twilio ON public.calls(twilio_sid);
CREATE INDEX IF NOT EXISTS idx_transcripts_call ON public.transcripts(call_id);
CREATE INDEX IF NOT EXISTS idx_followups_user ON public.followups(user_id);
CREATE INDEX IF NOT EXISTS idx_followups_date ON public.followups(scheduled_date);

-- Function: auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
