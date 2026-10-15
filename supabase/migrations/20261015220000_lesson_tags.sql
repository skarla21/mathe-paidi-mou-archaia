-- Lesson content tags (same shape as articles.tags) + folded search key.

alter table public.lessons
  add column if not exists tags text[] not null default '{}';

alter table public.lessons
  add column if not exists tags_folded text
  generated always as (public.fold_article_tags(tags)) stored;

create index if not exists lessons_tags_folded_idx on public.lessons (tags_folded);

notify pgrst, 'reload schema';
