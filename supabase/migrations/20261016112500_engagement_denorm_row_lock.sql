-- Lock parent rows before denorm recounts (fixes concurrent undercount).
-- Safe to re-run after 20261015230000; also re-backfills counts.

create or replace function public.lesson_ratings_refresh_lesson_avg()
returns trigger
language plpgsql
as $$
declare
  target_lesson uuid;
  other_lesson uuid;
begin
  target_lesson := coalesce(new.lesson_id, old.lesson_id);
  perform 1 from public.lessons where id = target_lesson for update;

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

  if tg_op = 'UPDATE'
     and old.lesson_id is distinct from new.lesson_id then
    other_lesson := old.lesson_id;
    if other_lesson is not null and other_lesson is distinct from target_lesson then
      perform 1 from public.lessons where id = other_lesson for update;
      update public.lessons
      set
        rating_count = sub.cnt,
        avg_rating = sub.avg_r
      from (
        select
          count(*)::int as cnt,
          coalesce(round(avg(rating)::numeric, 2), 0) as avg_r
        from public.lesson_ratings
        where lesson_id = other_lesson
      ) as sub
      where id = other_lesson;
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function public.article_likes_refresh_like_count()
returns trigger
language plpgsql
as $$
declare
  target_article uuid;
begin
  target_article := coalesce(new.article_id, old.article_id);
  perform 1 from public.articles where id = target_article for update;
  update public.articles
  set like_count = (
    select count(*)::int from public.article_likes where article_id = target_article
  )
  where id = target_article;
  return coalesce(new, old);
end;
$$;

-- Reconcile denorm columns after the function swap (quiet/dev window preferred).
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

update public.lessons
set rating_count = 0, avg_rating = 0
where id not in (select distinct lesson_id from public.lesson_ratings)
  and (rating_count <> 0 or avg_rating <> 0);

update public.articles a
set like_count = sub.cnt
from (
  select article_id, count(*)::int as cnt
  from public.article_likes
  group by article_id
) as sub
where a.id = sub.article_id;

update public.articles
set like_count = 0
where id not in (select distinct article_id from public.article_likes)
  and like_count <> 0;
