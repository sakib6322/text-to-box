-- App settings (editable prompts, etc.)
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

do $$ begin create policy "public read app_settings" on public.app_settings for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public write app_settings" on public.app_settings for insert with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public update app_settings" on public.app_settings for update using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public delete app_settings" on public.app_settings for delete using (true); exception when duplicate_object then null; end $$;


