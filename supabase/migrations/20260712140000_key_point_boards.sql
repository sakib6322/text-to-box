-- Per-key-point board mention counts (replaces concept-level aggregation for display/ranking).
create table if not exists public.key_point_boards (
  key_point_id uuid not null references public.key_points(id) on delete cascade,
  board_id uuid not null references public.boards(id) on delete cascade,
  mention_count int not null default 1,
  created_at timestamptz not null default now(),
  primary key (key_point_id, board_id)
);

create index if not exists key_point_boards_board_id_idx on public.key_point_boards (board_id);

alter table public.key_point_boards enable row level security;

do $$ begin
  create policy "public read key_point_boards" on public.key_point_boards for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public write key_point_boards" on public.key_point_boards for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public update key_point_boards" on public.key_point_boards for update using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public delete key_point_boards" on public.key_point_boards for delete using (true);
exception when duplicate_object then null; end $$;

-- Seed per-key-point rows from existing concept_board links (count 1 each; future approvals increment per key point).
insert into public.key_point_boards (key_point_id, board_id, mention_count)
select kp.id, cb.board_id, 1
from public.key_points kp
join public.concept_boards cb on cb.concept_id = kp.concept_id
on conflict (key_point_id, board_id) do nothing;
