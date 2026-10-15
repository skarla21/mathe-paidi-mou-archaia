alter table public.lessons
  add column if not exists preview_url text,
  add column if not exists page_count int,
  add column if not exists file_bytes bigint;

alter table public.lessons drop constraint if exists lessons_page_count_check;
alter table public.lessons
  add constraint lessons_page_count_check check (page_count is null or page_count > 0);

alter table public.lessons drop constraint if exists lessons_file_bytes_check;
alter table public.lessons
  add constraint lessons_file_bytes_check check (file_bytes is null or file_bytes > 0);

create table if not exists public.lesson_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, lesson_id)
);

create index if not exists lesson_bookmarks_user_id_idx on public.lesson_bookmarks(user_id);
create index if not exists lesson_bookmarks_lesson_id_idx on public.lesson_bookmarks(lesson_id);

alter table public.lesson_bookmarks enable row level security;

insert into public.lesson_bookmarks (user_id, lesson_id)
select distinct user_id, lesson_id
from public.purchases
on conflict (user_id, lesson_id) do nothing;
