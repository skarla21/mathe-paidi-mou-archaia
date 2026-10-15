-- Grade pages live at /:slug, so a grade cannot use a top-level route name.
-- Keep this list aligned with RESERVED_GRADE_SLUGS in shared/utils/slugify.mjs.
-- Adds `search` for the public lesson search results page.

create or replace function public.reject_reserved_grade_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug = any (array[
    'about',
    'admin',
    'api',
    'articles',
    'category',
    'dashboard',
    'login',
    'notes',
    'profile',
    'register',
    'reset-password',
    'search'
  ]) then
    raise exception 'reserved grade slug' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists grades_reject_reserved_slug on public.grades;
create trigger grades_reject_reserved_slug
  before insert or update of slug on public.grades
  for each row execute function public.reject_reserved_grade_slug();
