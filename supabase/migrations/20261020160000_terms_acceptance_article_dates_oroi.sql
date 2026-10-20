-- Records terms acceptance, keeps article likes from rewriting updated_at,
-- and reserves the /oroi terms page from grade slugs.
-- Keep the reserved list aligned with RESERVED_GRADE_SLUGS in shared/utils/slugify.mjs.

alter table public.users
  add column if not exists terms_accepted_at timestamptz;

alter table public.purchases
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists immediate_access_accepted_at timestamptz;

drop function if exists public.register_credentials_user(text, text, text, text, timestamptz);

create or replace function public.register_credentials_user(
  p_email text,
  p_password_hash text,
  p_name text,
  p_token_hash text,
  p_expires_at timestamptz,
  p_terms_accepted_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  p_email := lower(trim(p_email));

  if p_terms_accepted_at is null then
    raise exception 'terms acceptance required';
  end if;

  if exists (select 1 from public.users where email = p_email) then
    return null;
  end if;

  begin
    insert into public.users (email, password_hash, name, email_verified, terms_accepted_at)
    values (p_email, p_password_hash, p_name, false, p_terms_accepted_at)
    returning id into v_user_id;
  exception
    when unique_violation then
      return null;
  end;

  perform public.issue_verification_token(v_user_id, p_token_hash, p_expires_at, 0);

  return v_user_id;
end;
$$;

revoke all on function public.register_credentials_user(text, text, text, text, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.register_credentials_user(text, text, text, text, timestamptz, timestamptz) to service_role;

create or replace function public.set_article_updated_at()
returns trigger
language plpgsql
as $$
begin
  if new.like_count is distinct from old.like_count
     and new.title is not distinct from old.title
     and new.slug is not distinct from old.slug
     and new.body is not distinct from old.body
     and new.tags is not distinct from old.tags
     and new.reading_time_minutes is not distinct from old.reading_time_minutes
     and new.published is not distinct from old.published
     and new.image_url is not distinct from old.image_url
     and new.created_at is not distinct from old.created_at
  then
    new.updated_at := old.updated_at;
  else
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at
  before update on public.articles
  for each row execute function public.set_article_updated_at();

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

drop trigger if exists grades_reject_reserved_slug on public.grades;
create trigger grades_reject_reserved_slug
  before insert or update of slug on public.grades
  for each row execute function public.reject_reserved_grade_slug();

update public.users
set terms_accepted_at = created_at
where terms_accepted_at is null;

alter table public.users
  alter column terms_accepted_at set not null;
