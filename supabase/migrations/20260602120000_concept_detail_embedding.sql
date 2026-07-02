-- Structured concept detail (summary, paragraphs, table) + vector for semantic search
alter table public.concepts
  add column if not exists detail_summary text,
  add column if not exists detail_paragraphs jsonb not null default '[]'::jsonb,
  add column if not exists detail_table jsonb,
  add column if not exists detail_embedding vector(768);

create index if not exists concepts_detail_embedding_idx
  on public.concepts using ivfflat (detail_embedding vector_cosine_ops)
  with (lists = 100);
