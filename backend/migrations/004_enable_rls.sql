-- Enable row-level security on the seven tables that had none.
--
-- Before this, `anon` and `authenticated` both held full CRUD on these tables with no row
-- filtering, so any signed-up user could read or delete every other user's agents, prompts,
-- knowledge base, call recordings and activity logs.
--
-- Safe for this app: the backend talks to Postgres with the service key (which bypasses RLS),
-- and the only table the frontend queries directly through the user's JWT is `users`.

ALTER TABLE public.agents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recordings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_library   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs   ENABLE ROW LEVEL SECURITY;

-- These seven store user_id as text (unlike calls.user_id, which is uuid), so auth.uid()
-- must be cast — same idiom as the existing users policies.
-- Owner-scoped access. FOR ALL covers select/insert/update/delete; WITH CHECK stops a user
-- writing a row owned by someone else.
DROP POLICY IF EXISTS agents_own ON public.agents;
CREATE POLICY agents_own ON public.agents
  FOR ALL USING ((auth.uid())::text = user_id) WITH CHECK ((auth.uid())::text = user_id);

DROP POLICY IF EXISTS prompts_own ON public.prompts;
CREATE POLICY prompts_own ON public.prompts
  FOR ALL USING ((auth.uid())::text = user_id) WITH CHECK ((auth.uid())::text = user_id);

DROP POLICY IF EXISTS knowledge_base_own ON public.knowledge_base;
CREATE POLICY knowledge_base_own ON public.knowledge_base
  FOR ALL USING ((auth.uid())::text = user_id) WITH CHECK ((auth.uid())::text = user_id);

DROP POLICY IF EXISTS recordings_own ON public.recordings;
CREATE POLICY recordings_own ON public.recordings
  FOR ALL USING ((auth.uid())::text = user_id) WITH CHECK ((auth.uid())::text = user_id);

DROP POLICY IF EXISTS voice_library_own ON public.voice_library;
CREATE POLICY voice_library_own ON public.voice_library
  FOR ALL USING ((auth.uid())::text = user_id) WITH CHECK ((auth.uid())::text = user_id);

DROP POLICY IF EXISTS activity_logs_own ON public.activity_logs;
CREATE POLICY activity_logs_own ON public.activity_logs
  FOR ALL USING ((auth.uid())::text = user_id) WITH CHECK ((auth.uid())::text = user_id);

-- prompt_versions has no user_id; it inherits ownership from its parent prompt.
-- Note: prompt_versions.prompt_id is TEXT while prompts.id is UUID, hence the cast.
DROP POLICY IF EXISTS prompt_versions_own ON public.prompt_versions;
CREATE POLICY prompt_versions_own ON public.prompt_versions
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.prompts p WHERE p.id::text = prompt_versions.prompt_id AND p.user_id = (auth.uid())::text))
  WITH CHECK (EXISTS (SELECT 1 FROM public.prompts p WHERE p.id::text = prompt_versions.prompt_id AND p.user_id = (auth.uid())::text));
