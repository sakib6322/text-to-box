-- Course Mapping Module
-- courses, syllabus topics, date-based system unlocks, enrollments

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists courses_status_sort_idx on public.courses (status, sort_order, name);

create table if not exists public.course_topics (
  course_id uuid not null references public.courses (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (course_id, topic_id)
);

create index if not exists course_topics_topic_idx on public.course_topics (topic_id);

create table if not exists public.course_routines (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  system_id uuid not null references public.systems (id) on delete cascade,
  publish_date date not null,
  label text not null default '',
  created_at timestamptz not null default now(),
  unique (course_id, system_id)
);

create index if not exists course_routines_course_date_idx
  on public.course_routines (course_id, publish_date);

create table if not exists public.course_enrollments (
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null references public.app_users (id) on delete cascade,
  source text not null default 'self' check (source in ('self', 'admin')),
  enrolled_at timestamptz not null default now(),
  primary key (course_id, user_id)
);

create index if not exists course_enrollments_user_idx on public.course_enrollments (user_id);
