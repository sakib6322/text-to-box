
-- Enable pgvector
create extension if not exists vector;

-- Concepts (a saved book section/page)
create table public.concepts (
  id uuid primary key default gen_random_uuid(),
  title text,
  source_image_path text,
  detected_language text,
  raw_extraction jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Key points (boxes)
create table public.key_points (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references public.concepts(id) on delete cascade,
  content text not null,
  language text,
  position int not null default 0,
  embedding vector(768),
  increment_count int not null default 0,
  created_at timestamptz not null default now()
);

create index key_points_concept_id_idx on public.key_points(concept_id);
create index key_points_embedding_idx on public.key_points using ivfflat (embedding vector_cosine_ops) with (lists = 100);

alter table public.concepts enable row level security;
alter table public.key_points enable row level security;

-- Open admin policies for now (no auth yet); tighten later when roles added
create policy "public read concepts" on public.concepts for select using (true);
create policy "public write concepts" on public.concepts for insert with check (true);
create policy "public update concepts" on public.concepts for update using (true);
create policy "public delete concepts" on public.concepts for delete using (true);

create policy "public read key_points" on public.key_points for select using (true);
create policy "public write key_points" on public.key_points for insert with check (true);
create policy "public update key_points" on public.key_points for update using (true);
create policy "public delete key_points" on public.key_points for delete using (true);

-- Storage bucket for book images
insert into storage.buckets (id, name, public) values ('book-images', 'book-images', true)
on conflict (id) do nothing;

create policy "public read book-images"
  on storage.objects for select using (bucket_id = 'book-images');
create policy "public upload book-images"
  on storage.objects for insert with check (bucket_id = 'book-images');
create policy "public update book-images"
  on storage.objects for update using (bucket_id = 'book-images');
create policy "public delete book-images"
  on storage.objects for delete using (bucket_id = 'book-images');
