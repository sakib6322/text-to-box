-- Progress Plan module: concept steps, self-QA, admin practice sets, mistakes

-- Extend user_study_progress with 4-step fields
ALTER TABLE public.user_study_progress
  ADD COLUMN IF NOT EXISTS step1_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS step2_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS step3_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS step4_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS self_qa_seen_ids jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Concept self-QA (Step 3 content)
CREATE TABLE IF NOT EXISTS public.concept_self_qa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id uuid NOT NULL,
  question text NOT NULL DEFAULT '',
  answer text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_concept_self_qa_concept ON public.concept_self_qa (concept_id, sort_order);

-- Admin-managed progress practice sets
CREATE TABLE IF NOT EXISTS public.progress_practice_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  scope_type text NOT NULL CHECK (scope_type IN ('concept', 'chapter', 'system', 'subject', 'course')),
  scope_id uuid,
  set_kind text NOT NULL CHECK (set_kind IN (
    'concept_practice', 'chapter_exam', 'system_exam', 'subject_final', 'final_mock', 'exam_night_pyq'
  )),
  title text NOT NULL DEFAULT '',
  question_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  pass_percent int NOT NULL DEFAULT 70,
  sort_order int NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT true,
  publish_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_progress_sets_course ON public.progress_practice_sets (course_id, scope_type, set_kind);

-- Student attempts on admin sets
CREATE TABLE IF NOT EXISTS public.user_progress_set_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  set_id uuid NOT NULL REFERENCES public.progress_practice_sets(id) ON DELETE CASCADE,
  score int NOT NULL DEFAULT 0,
  total int NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  answers jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_user_set_attempts_user ON public.user_progress_set_attempts (user_id, set_id);

-- Review Mistakes bank
CREATE TABLE IF NOT EXISTS public.user_mistake_questions (
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  question_id uuid NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  source_set_id uuid,
  wrong_count int NOT NULL DEFAULT 1,
  last_wrong_at timestamptz NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  PRIMARY KEY (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_user_mistakes_active ON public.user_mistake_questions (user_id, active);

ALTER TABLE public.concept_self_qa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_practice_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress_set_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mistake_questions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "open concept_self_qa" ON public.concept_self_qa FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "open progress_practice_sets" ON public.progress_practice_sets FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "open user_progress_set_attempts" ON public.user_progress_set_attempts FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "open user_mistake_questions" ON public.user_mistake_questions FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
