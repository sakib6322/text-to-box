-- Exam system: schedules, attempts, grading (questions keep existing vector embeddings)
create extension if not exists vector;

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  duration_minutes int not null default 60 check (duration_minutes > 0),
  total_marks numeric not null default 0,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'active', 'completed', 'cancelled')),
  title_embedding vector(768),
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  position int not null default 0,
  marks numeric not null default 1,
  created_at timestamptz not null default now(),
  unique (exam_id, question_id)
);

create index if not exists exam_questions_exam_idx on public.exam_questions (exam_id, position);
create index if not exists exam_questions_question_idx on public.exam_questions (question_id);

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  user_email text not null,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  submitted_at timestamptz,
  score numeric not null default 0,
  total_marks numeric not null default 0,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'expired')),
  created_at timestamptz not null default now()
);

create index if not exists exam_attempts_exam_idx on public.exam_attempts (exam_id, user_email);
create index if not exists exam_attempts_user_idx on public.exam_attempts (user_email, created_at desc);

create table if not exists public.exam_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  answer jsonb not null default '{}'::jsonb,
  is_correct boolean not null default false,
  marks_earned numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

create index if not exists exam_answers_attempt_idx on public.exam_answers (attempt_id);

create index if not exists exams_title_embedding_idx
  on public.exams using ivfflat (title_embedding vector_cosine_ops) with (lists = 50);

alter table public.exams enable row level security;
alter table public.exam_questions enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.exam_answers enable row level security;

do $$ begin
  create policy "public read exams" on public.exams for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public write exams" on public.exams for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public update exams" on public.exams for update using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public delete exams" on public.exams for delete using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "public read exam_questions" on public.exam_questions for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public write exam_questions" on public.exam_questions for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public update exam_questions" on public.exam_questions for update using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public delete exam_questions" on public.exam_questions for delete using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "public read exam_attempts" on public.exam_attempts for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public write exam_attempts" on public.exam_attempts for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public update exam_attempts" on public.exam_attempts for update using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "public read exam_answers" on public.exam_answers for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public write exam_answers" on public.exam_answers for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public update exam_answers" on public.exam_answers for update using (true);
exception when duplicate_object then null; end $$;
