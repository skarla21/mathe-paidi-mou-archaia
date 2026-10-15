-- Admin dashboard aggregates so stats.get never pulls full purchases/ratings/placements.

create or replace function public.admin_purchase_revenue(
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(l.price), 0)::numeric
  from public.purchases p
  join public.lessons l on l.id = p.lesson_id
  where not l.is_free
    and (p_from is null or p.created_at >= p_from)
    and (p_to is null or p.created_at < p_to);
$$;

create or replace function public.admin_avg_lesson_rating()
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(round(avg(rating)::numeric, 2), 0)
  from public.lesson_ratings;
$$;

create or replace function public.admin_lessons_by_grade()
returns table(grade text, count bigint)
language sql
stable
security definer
set search_path = public
as $$
  with placed as (
    select
      lp.lesson_id,
      coalesce(c.grade_id, s.grade_id) as grade_id
    from public.lesson_placements lp
    left join public.chapters c on c.id = lp.chapter_id
    left join public.subjects s on s.id = lp.subject_id
    where coalesce(c.grade_id, s.grade_id) is not null
  )
  select g.name as grade, count(distinct p.lesson_id)::bigint as count
  from placed p
  join public.grades g on g.id = p.grade_id
  group by g.id, g.name
  order by count(distinct p.lesson_id) desc, g.name asc;
$$;

revoke all on function public.admin_purchase_revenue(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.admin_avg_lesson_rating() from public, anon, authenticated;
revoke all on function public.admin_lessons_by_grade() from public, anon, authenticated;
grant execute on function public.admin_purchase_revenue(timestamptz, timestamptz) to service_role;
grant execute on function public.admin_avg_lesson_rating() to service_role;
grant execute on function public.admin_lessons_by_grade() to service_role;

notify pgrst, 'reload schema';
