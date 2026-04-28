-- Ensure pgvector exists
create extension if not exists vector;

-- A question paper groups multiple generated questions
create table if not exists public.question_papers (
  id uuid primary key default gen_random_uuid(),
  concept text,
  subject text,
  system text,
  topic text,
  metadata jsonb not null default '{}'::jsonb,
  source jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Questions table stores MCQ/SBA with vector embedding for retrieval
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid null references public.question_papers(id) on delete set null,
  source_point_id uuid null references public.key_points(id) on delete set null,
  question_mode text not null check (question_mode in ('mcq', 'sba')),
  stem text not null,
  payload jsonb not null default '{}'::jsonb,
  embedding vector(768),
  status text not null default 'published',
  difficulty text not null default 'medium',
  marks numeric not null default 1,
  concept text,
  subject text,
  system text,
  topic text,
  created_at timestamptz not null default now()
);

create index if not exists questions_created_at_idx on public.questions (created_at desc);
create index if not exists questions_mode_idx on public.questions (question_mode);
create index if not exists questions_embedding_idx
  on public.questions using ivfflat (embedding vector_cosine_ops) with (lists = 100);

alter table public.question_papers enable row level security;
alter table public.questions enable row level security;

do $$ begin
  create policy "public read question_papers" on public.question_papers for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public write question_papers" on public.question_papers for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public update question_papers" on public.question_papers for update using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public delete question_papers" on public.question_papers for delete using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "public read questions" on public.questions for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public write questions" on public.questions for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public update questions" on public.questions for update using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public delete questions" on public.questions for delete using (true);
exception when duplicate_object then null; end $$;
