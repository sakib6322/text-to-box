-- Add optional taxonomy fields to concepts
alter table public.concepts
  add column if not exists subject text,
  add column if not exists system text,
  add column if not exists topic text;

-- Vector similarity match function for key_points.
-- Accepts embedding as text like "[0.1,0.2,...]" to avoid client-side vector typing issues.
create or replace function public.match_key_points(
  query_embedding text,
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  content text,
  concept_id uuid,
  increment_count int,
  similarity float
)
language sql
stable
as $$
  select
    kp.id,
    kp.content,
    kp.concept_id,
    kp.increment_count,
    1 - (kp.embedding <=> (query_embedding::vector(768))) as similarity
  from public.key_points kp
  where kp.embedding is not null
    and 1 - (kp.embedding <=> (query_embedding::vector(768))) >= match_threshold
  order by kp.embedding <=> (query_embedding::vector(768))
  limit match_count;
$$;
