-- User study & practice progress (persisted in database, not server filesystem)
CREATE TABLE IF NOT EXISTS public.user_study_progress (
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  concept_id uuid NOT NULL,
  concept_name text NOT NULL DEFAULT '',
  studied_key_point_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_key_points int NOT NULL DEFAULT 0,
  last_studied_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, concept_id)
);

CREATE TABLE IF NOT EXISTS public.user_practice_sessions (
  id text NOT NULL,
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  concept_id uuid NOT NULL,
  concept_name text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  question_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  answers jsonb,
  score int,
  total int,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_user_practice_sessions_user_created
  ON public.user_practice_sessions (user_id, created_at DESC);

ALTER TABLE public.user_study_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_practice_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "open user_study_progress" ON public.user_study_progress FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "open user_practice_sessions" ON public.user_practice_sessions FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
