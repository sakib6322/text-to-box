-- Gemini API keys stored in DB; server rotates through them on quota/limit errors
create table if not exists public.gemini_api_keys (
  id uuid primary key default gen_random_uuid(),
  label text,
  api_key text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  last_used_at timestamptz,
  error_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gemini_api_keys_key_unique unique (api_key)
);

create index if not exists gemini_api_keys_sort_idx on public.gemini_api_keys (sort_order, created_at);

alter table public.gemini_api_keys enable row level security;

do $$ begin create policy "public read gemini_api_keys" on public.gemini_api_keys for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public write gemini_api_keys" on public.gemini_api_keys for insert with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public update gemini_api_keys" on public.gemini_api_keys for update using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "public delete gemini_api_keys" on public.gemini_api_keys for delete using (true); exception when duplicate_object then null; end $$;
