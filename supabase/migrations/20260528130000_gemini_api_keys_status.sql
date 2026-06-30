-- Status tracking for Gemini API keys (active / quota / invalid)
alter table public.gemini_api_keys add column if not exists status text not null default 'idle';
alter table public.gemini_api_keys add column if not exists last_success_at timestamptz;
alter table public.gemini_api_keys add column if not exists last_error_at timestamptz;
alter table public.gemini_api_keys add column if not exists last_error_message text;
