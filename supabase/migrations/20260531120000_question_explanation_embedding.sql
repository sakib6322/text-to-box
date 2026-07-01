-- Explanation vectors for MCQ/SBA questions (text lives in payload jsonb)
alter table public.questions
  add column if not exists explanation_embedding vector(768);

create index if not exists questions_explanation_embedding_idx
  on public.questions using ivfflat (explanation_embedding vector_cosine_ops)
  with (lists = 100);
