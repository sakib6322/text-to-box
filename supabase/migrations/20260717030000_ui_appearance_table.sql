-- Dedicated UI Master / Appearance config (per-device JSON)
create table if not exists public.ui_appearance (
  id text primary key default 'default',
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.ui_appearance enable row level security;

do $$ begin
  create policy "public read ui_appearance" on public.ui_appearance for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "public insert ui_appearance" on public.ui_appearance for insert with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "public update ui_appearance" on public.ui_appearance for update using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "public delete ui_appearance" on public.ui_appearance for delete using (true);
exception when duplicate_object then null; end $$;

insert into public.ui_appearance (id, config, updated_at)
values ('default', '{}'::jsonb, now())
on conflict (id) do nothing;
