-- Additive progress plan: Step 1 slide progress + resume cursors
ALTER TABLE public.user_study_progress
  ADD COLUMN IF NOT EXISTS step1_max_slide_index int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS step1_slide_total int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resume_step int,
  ADD COLUMN IF NOT EXISTS resume_key_point_id text,
  ADD COLUMN IF NOT EXISTS resume_self_qa_id text,
  ADD COLUMN IF NOT EXISTS resume_practice_set_id text;














