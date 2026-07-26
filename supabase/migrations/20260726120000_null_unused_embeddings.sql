-- Reclaim storage from unused content embeddings (UI only uses key_points.embedding).
-- Columns/indexes kept so features can be re-enabled via EMBED_UNUSED_CONTENT=true.

update public.concepts
set detail_embedding = null
where detail_embedding is not null;

update public.questions
set
  embedding = null,
  explanation_embedding = null
where embedding is not null
   or explanation_embedding is not null;

update public.exams
set title_embedding = null
where title_embedding is not null;



