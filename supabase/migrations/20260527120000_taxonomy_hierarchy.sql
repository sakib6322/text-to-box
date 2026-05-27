-- Academic taxonomy: subject → system → chapter → topic
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  constraint subjects_name_unique unique (name)
);

create table if not exists public.systems (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  constraint systems_subject_name_unique unique (subject_id, name)
);

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references public.systems(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  constraint chapters_system_name_unique unique (system_id, name)
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  constraint topics_chapter_name_unique unique (chapter_id, name)
);

create index if not exists systems_subject_id_idx on public.systems (subject_id);
create index if not exists chapters_system_id_idx on public.chapters (system_id);
create index if not exists topics_chapter_id_idx on public.topics (chapter_id);

alter table public.subjects enable row level security;
alter table public.systems enable row level security;
alter table public.chapters enable row level security;
alter table public.topics enable row level security;

do $$ begin create policy "public read subjects" on public.subjects for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public write subjects" on public.subjects for insert with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public update subjects" on public.subjects for update using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public delete subjects" on public.subjects for delete using (true); exception when duplicate_object then null; end $$;

do $$ begin create policy "public read systems" on public.systems for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public write systems" on public.systems for insert with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public update systems" on public.systems for update using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public delete systems" on public.systems for delete using (true); exception when duplicate_object then null; end $$;

do $$ begin create policy "public read chapters" on public.chapters for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public write chapters" on public.chapters for insert with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public update chapters" on public.chapters for update using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public delete chapters" on public.chapters for delete using (true); exception when duplicate_object then null; end $$;

do $$ begin create policy "public read topics" on public.topics for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public write topics" on public.topics for insert with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public update topics" on public.topics for update using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public delete topics" on public.topics for delete using (true); exception when duplicate_object then null; end $$;

-- Chapter on concepts / questions / papers (denormalized text for display & filters)
alter table public.concepts add column if not exists chapter text;
alter table public.questions add column if not exists chapter text;
alter table public.question_papers add column if not exists chapter text;

-- Optional FK links for strict taxonomy joins
alter table public.concepts add column if not exists topic_id uuid references public.topics(id) on delete set null;
create index if not exists concepts_topic_id_idx on public.concepts (topic_id);

-- Board mention count for ranking on Suggestions when filtered by board
alter table public.concept_boards add column if not exists mention_count int not null default 1;
