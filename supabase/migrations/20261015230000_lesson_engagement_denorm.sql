-- Lesson avg rating / count, article like_count, lesson comment threads

-- ─── lessons: denormalized rating stats ─────────────────────────────────────

alter table public.lessons
  add column if not exists avg_rating numeric(3, 2) not null default 0;

alter table public.lessons
  add column if not exists rating_count int not null default 0;

alter table public.lessons
  drop constraint if exists lessons_rating_count_check;

alter table public.lessons
  add constraint lessons_rating_count_check check (rating_count >= 0);

create or replace function public.lesson_ratings_refresh_lesson_avg()
returns trigger
language plpgsql
as $$
declare
  target_lesson uuid;
begin
  target_lesson := coalesce(new.lesson_id, old.lesson_id);
  update public.lessons
  set
    rating_count = sub.cnt,
    avg_rating = sub.avg_r
  from (
    select
      count(*)::int as cnt,
      coalesce(round(avg(rating)::numeric, 2), 0) as avg_r
    from public.lesson_ratings
    where lesson_id = target_lesson
  ) as sub
  where id = target_lesson;
  return coalesce(new, old);
end;
$$;

drop trigger if exists lesson_ratings_refresh_lesson_avg on public.lesson_ratings;
create trigger lesson_ratings_refresh_lesson_avg
  after insert or update of rating, lesson_id or delete
  on public.lesson_ratings
  for each row execute function public.lesson_ratings_refresh_lesson_avg();

-- Backfill from any existing ratings
update public.lessons l
set
  rating_count = sub.cnt,
  avg_rating = sub.avg_r
from (
  select
    lesson_id,
    count(*)::int as cnt,
    coalesce(round(avg(rating)::numeric, 2), 0) as avg_r
  from public.lesson_ratings
  group by lesson_id
) as sub
where l.id = sub.lesson_id;

-- ─── articles: denormalized like_count ───────────────────────────────────────

alter table public.articles
  add column if not exists like_count int not null default 0;

alter table public.articles
  drop constraint if exists articles_like_count_check;

alter table public.articles
  add constraint articles_like_count_check check (like_count >= 0);

create or replace function public.article_likes_refresh_like_count()
returns trigger
language plpgsql
as $$
declare
  target_article uuid;
begin
  target_article := coalesce(new.article_id, old.article_id);
  update public.articles
  set like_count = (
    select count(*)::int from public.article_likes where article_id = target_article
  )
  where id = target_article;
  return coalesce(new, old);
end;
$$;

drop trigger if exists article_likes_refresh_like_count on public.article_likes;
create trigger article_likes_refresh_like_count
  after insert or delete
  on public.article_likes
  for each row execute function public.article_likes_refresh_like_count();

update public.articles a
set like_count = sub.cnt
from (
  select article_id, count(*)::int as cnt
  from public.article_likes
  group by article_id
) as sub
where a.id = sub.article_id;

-- ─── lesson_comments: article-parity threads ─────────────────────────────────

alter table public.lesson_comments
  drop constraint if exists lesson_comments_user_id_lesson_id_key;

alter table public.lesson_comments
  add column if not exists parent_id uuid references public.lesson_comments(id) on delete cascade;

create index if not exists lesson_comments_parent_id_idx
  on public.lesson_comments(parent_id);

create index if not exists lesson_comments_lesson_created_idx
  on public.lesson_comments(lesson_id, created_at);

create or replace function public.lesson_comments_validate_parent()
returns trigger
language plpgsql
as $$
declare
  parent_lesson uuid;
  parent_parent uuid;
begin
  if new.parent_id is null then
    return new;
  end if;

  select lesson_id, parent_id
    into parent_lesson, parent_parent
  from public.lesson_comments
  where id = new.parent_id;

  if parent_lesson is null then
    raise exception 'invalid parent comment' using errcode = '23514';
  end if;

  if parent_lesson <> new.lesson_id then
    raise exception 'parent comment lesson mismatch' using errcode = '23514';
  end if;

  if parent_parent is not null then
    raise exception 'cannot reply to a reply' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists lesson_comments_validate_parent on public.lesson_comments;
create trigger lesson_comments_validate_parent
  before insert or update of parent_id, lesson_id
  on public.lesson_comments
  for each row execute function public.lesson_comments_validate_parent();
