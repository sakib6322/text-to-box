-- Exam boards (managed in Settings); linked to concepts for filtering Suggestions.
create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  constraint boards_name_unique unique (name)
);

create table if not exists public.concept_boards (
  concept_id uuid not null references public.concepts(id) on delete cascade,
  board_id uuid not null references public.boards(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (concept_id, board_id)
);

create index if not exists concept_boards_board_id_idx on public.concept_boards (board_id);

alter table public.boards enable row level security;
alter table public.concept_boards enable row level security;

do $$ begin
  create policy "public read boards" on public.boards for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public write boards" on public.boards for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public update boards" on public.boards for update using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public delete boards" on public.boards for delete using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "public read concept_boards" on public.concept_boards for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public write concept_boards" on public.concept_boards for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public delete concept_boards" on public.concept_boards for delete using (true);
exception when duplicate_object then null; end $$;
