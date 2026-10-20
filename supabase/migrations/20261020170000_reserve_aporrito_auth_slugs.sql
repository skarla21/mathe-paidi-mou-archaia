-- Reserves /aporrito and /auth from grade slugs.
-- Keep the list aligned with RESERVED_GRADE_SLUGS in shared/utils/slugify.mjs.

create or replace function public.reject_reserved_grade_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug = any (array[
    'about',
    'admin',
    'api',
    'aporrito',
    'articles',
    'auth',
    'category',
    'dashboard',
    'login',
    'notes',
    'oroi',
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
