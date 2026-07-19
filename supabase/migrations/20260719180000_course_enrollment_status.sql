-- Enrollment approval status for course_enrollments
alter table public.course_enrollments
  add column if not exists status text;

update public.course_enrollments
set status = 'approved'
where status is null or status = '';

alter table public.course_enrollments
  alter column status set default 'pending';

alter table public.course_enrollments
  alter column status set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'course_enrollments_status_check'
  ) then
    alter table public.course_enrollments
      add constraint course_enrollments_status_check
      check (status in ('pending', 'approved'));
  end if;
end $$;

create index if not exists course_enrollments_status_idx
  on public.course_enrollments (status);
