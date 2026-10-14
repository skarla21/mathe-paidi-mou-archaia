-- Run this in Supabase SQL Editor to create all tables and RLS policies.
-- This is the canonical creation script — drop and recreate for a fresh environment.

-- ─── Tables ─────────────────────────────────────────────────────────────────

-- Users
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  name text,
  avatar_url text,
  "isAdmin" boolean not null default false,
  email_verified boolean not null default false,
  password_hash text,
  provider text not null default 'credentials',
  created_at timestamptz not null default now()
);

-- Verification tokens (magic link for email verification)
create table if not exists public.verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists verification_tokens_user_id_idx on public.verification_tokens(user_id);
create index if not exists verification_tokens_token_hash_idx on public.verification_tokens(token_hash);
create index if not exists verification_tokens_expires_at_idx on public.verification_tokens(expires_at);

-- Password reset tokens
create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists password_reset_tokens_token_hash_idx on public.password_reset_tokens(token_hash);
create index if not exists password_reset_tokens_user_id_idx on public.password_reset_tokens(user_id);
create index if not exists password_reset_tokens_expires_at_idx on public.password_reset_tokens(expires_at);

-- Grades
create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text,
  "order" int not null default 0
);
create index if not exists grades_order_idx on public.grades("order");

-- Subjects
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text,
  grade_id uuid not null references public.grades(id) on delete cascade,
  image_url text,
  "order" int not null default 0
);
create index if not exists subjects_grade_id_idx on public.subjects(grade_id);
create index if not exists subjects_order_idx on public.subjects("order");

-- Categories (miscellaneous content groupings, independent of grade/subject tree)
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text,
  description text,
  image_url text,
  "order" int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists categories_order_idx on public.categories("order");

-- Chapters (renamed from courses — organizational containers, no price)
create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text,
  description text,
  grade_id uuid not null references public.grades(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  image_url text,
  "order" int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists chapters_grade_id_idx on public.chapters(grade_id);
create index if not exists chapters_subject_id_idx on public.chapters(subject_id);
create index if not exists chapters_title_idx on public.chapters(title);

-- Lessons (universal content atom)
-- Lessons are placed into subjects, chapters, and/or categories via lesson_placements (many-to-many).
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text,
  content text,
  is_free boolean not null default true,
  price int not null default 0,
  content_url text,
  created_at timestamptz not null default now()
);
create index if not exists lessons_title_idx on public.lessons(title);

-- Lesson placements (many-to-many: a lesson can appear under subjects, chapters, and/or categories)
create table if not exists public.lesson_placements (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  "order" int not null default 0,
  created_at timestamptz not null default now(),
  constraint lesson_placements_parent_check check (
    (subject_id is not null)::int + (chapter_id is not null)::int + (category_id is not null)::int = 1
  )
);
create index if not exists lesson_placements_lesson_id_idx on public.lesson_placements(lesson_id);
create index if not exists lesson_placements_subject_id_idx on public.lesson_placements(subject_id);
create index if not exists lesson_placements_chapter_id_idx on public.lesson_placements(chapter_id);
create index if not exists lesson_placements_category_id_idx on public.lesson_placements(category_id);
create index if not exists lesson_placements_order_idx on public.lesson_placements("order");
create unique index if not exists lesson_placements_subject_unique
  on public.lesson_placements(lesson_id, subject_id) where subject_id is not null;
create unique index if not exists lesson_placements_chapter_unique
  on public.lesson_placements(lesson_id, chapter_id) where chapter_id is not null;
create unique index if not exists lesson_placements_category_unique
  on public.lesson_placements(lesson_id, category_id) where category_id is not null;

-- Purchases (per-lesson purchases, renamed from course_id to lesson_id)
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  stripe_session_id text,
  created_at timestamptz not null default now(),
  unique(stripe_session_id)
);
create index if not exists purchases_user_id_idx on public.purchases(user_id);
create index if not exists purchases_lesson_id_idx on public.purchases(lesson_id);
create index if not exists purchases_stripe_session_id_idx on public.purchases(stripe_session_id);

-- Downloads (renamed from lesson_downloads — tracks which lessons a user has downloaded)
create table if not exists public.downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  downloaded_at timestamptz not null default now(),
  unique(user_id, lesson_id)
);
create index if not exists downloads_user_id_idx on public.downloads(user_id);
create index if not exists downloads_lesson_id_idx on public.downloads(lesson_id);


-- Lesson ratings (independent 1-5 star ratings per user per lesson)
create table if not exists public.lesson_ratings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  lesson_id   uuid not null references public.lessons(id) on delete cascade,
  rating      smallint not null check (rating >= 1 and rating <= 5),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(user_id, lesson_id)
);
create index if not exists lesson_ratings_user_id_idx   on public.lesson_ratings(user_id);
create index if not exists lesson_ratings_lesson_id_idx on public.lesson_ratings(lesson_id);

-- Lesson comments (independent text comments per user per lesson)
create table if not exists public.lesson_comments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  lesson_id   uuid not null references public.lessons(id) on delete cascade,
  body        text not null check (char_length(body) >= 1 and char_length(body) <= 2000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(user_id, lesson_id)
);
create index if not exists lesson_comments_user_id_idx   on public.lesson_comments(user_id);
create index if not exists lesson_comments_lesson_id_idx on public.lesson_comments(lesson_id);

-- Articles (blog-style content)
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  tags text[] not null default '{}',
  reading_time_minutes smallint not null,
  published boolean not null default false,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists articles_published_idx on public.articles(published);
create index if not exists articles_created_at_idx on public.articles(created_at desc);

create table if not exists public.article_likes (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, article_id)
);
create index if not exists article_likes_article_id_idx on public.article_likes(article_id);
create index if not exists article_likes_user_id_idx on public.article_likes(user_id);

create table if not exists public.article_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  article_id uuid not null references public.articles(id) on delete cascade,
  body text not null check (char_length(body) >= 1 and char_length(body) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, article_id)
);
create index if not exists article_comments_user_id_idx on public.article_comments(user_id);
create index if not exists article_comments_article_id_idx on public.article_comments(article_id);

-- Admin in-app notifications (feed + read state + preferences)
create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in (
    'purchase', 'download', 'rating', 'comment', 'contact',
    'article_like', 'article_comment'
  )),
  payload jsonb not null default '{}',
  source_id uuid,
  created_at timestamptz not null default now(),
  read boolean not null default false,
  read_at timestamptz,
  constraint admin_notifications_read_at_check check (read = (read_at is not null))
);
create index if not exists admin_notifications_created_at_idx on public.admin_notifications(created_at desc);
create unique index if not exists admin_notifications_kind_source_unique
  on public.admin_notifications (kind, source_id) where source_id is not null;

create table if not exists public.admin_notification_preferences (
  admin_user_id uuid primary key references public.users(id) on delete cascade,
  notify_purchase boolean not null default true,
  notify_download boolean not null default true,
  notify_rating boolean not null default true,
  notify_comment boolean not null default true,
  notify_contact boolean not null default true,
  notify_article_like boolean not null default true,
  notify_article_comment boolean not null default true
);


-- ─── Row Level Security ─────────────────────────────────────────────────────

alter table public.users enable row level security;
alter table public.verification_tokens enable row level security;
alter table public.password_reset_tokens enable row level security;
alter table public.grades enable row level security;
alter table public.subjects enable row level security;
alter table public.categories enable row level security;
alter table public.chapters enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_placements enable row level security;
alter table public.purchases enable row level security;
alter table public.downloads enable row level security;
alter table public.lesson_ratings enable row level security;
alter table public.lesson_comments enable row level security;
alter table public.articles enable row level security;
alter table public.article_likes enable row level security;
alter table public.article_comments enable row level security;
alter table public.admin_notifications enable row level security;
alter table public.admin_notification_preferences enable row level security;

-- Grades & Subjects: public read
create policy "grades_select_all" on public.grades for select using (true);
create policy "subjects_select_all" on public.subjects for select using (true);

-- Categories: public read
create policy "categories_select_all" on public.categories for select using (true);

-- Chapters: public read
create policy "chapters_select_all" on public.chapters for select using (true);

-- Lessons: public read (content access / paid-content gate enforced in app layer)
create policy "lessons_select_all" on public.lessons for select using (true);

-- Lesson placements: public read
create policy "lesson_placements_select_all" on public.lesson_placements for select using (true);

-- Users: own row only
create policy "users_select_own" on public.users for select using (auth.uid() = id);
create policy "users_update_own" on public.users for update using (auth.uid() = id);

-- Purchases: own rows only
create policy "purchases_select_own" on public.purchases for select using (auth.uid() = user_id);

-- Downloads: own rows only
create policy "downloads_select_own" on public.downloads for select using (auth.uid() = user_id);
create policy "downloads_insert_own" on public.downloads for insert with check (auth.uid() = user_id);

-- Lesson ratings: public read
create policy "lesson_ratings_select_all" on public.lesson_ratings for select using (true);

-- Lesson comments: public read
create policy "lesson_comments_select_all" on public.lesson_comments for select using (true);

-- Articles & engagement: public read (draft filtering in app layer)
create policy "articles_select_all" on public.articles for select using (true);
create policy "article_likes_select_all" on public.article_likes for select using (true);
create policy "article_comments_select_all" on public.article_comments for select using (true);

-- Note: all admin/server writes use the service role key (supabaseServiceKey),
-- which bypasses RLS entirely. No insert/update/delete policies are needed for anon.

-- ─── Functions (admin stats) ─────────────────────────────────────────────────

create or replace function public.get_top_downloaded_lessons(lim int default 10)
returns table(lesson_id uuid, title text, count bigint)
language sql stable
security definer
as $$
  select d.lesson_id, l.title, count(*)::bigint
  from public.downloads d
  join public.lessons l on l.id = d.lesson_id
  group by d.lesson_id, l.title
  order by count(*) desc
  limit lim;
$$;

-- ─── Functions (auth tokens) ─────────────────────────────────────────────────
-- Called only from server routes with the service role. Each function is one
-- transaction and only touches the user it is given. Run this whole block in
-- the Supabase SQL editor on an existing database before deploying the routes.
-- It deletes reset rows that were only marked used, then drops used_at and
-- email_sent, adds sent_at, enables row-level security on both token tables, ensures the
-- verification hash index, and creates a unique index on users.email. It stops
-- if two users share an email. The non-unique users_email_idx is removed because
-- users_email_unique replaces it.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'password_reset_tokens'
      and column_name = 'used_at'
  ) then
    delete from public.password_reset_tokens where used_at is not null;
    alter table public.password_reset_tokens drop column used_at;
  end if;
end $$;

alter table public.password_reset_tokens drop column if exists email_sent;
alter table public.password_reset_tokens add column if not exists sent_at timestamptz;

drop index if exists public.users_email_idx;

alter table public.verification_tokens enable row level security;
alter table public.password_reset_tokens enable row level security;

create index if not exists verification_tokens_token_hash_idx on public.verification_tokens(token_hash);

update public.users
set email = lower(trim(email))
where email is distinct from lower(trim(email));

do $$
declare
  dup text;
begin
  select email into dup
  from public.users
  where email is not null
  group by email
  having count(*) > 1
  limit 1;

  if dup is not null then
    raise exception 'duplicate users.email values must be resolved before users_email_unique: %', dup;
  end if;
end $$;

create unique index if not exists users_email_unique on public.users (email);

-- Reset issue is a three-way result. Do not collapse these:
--   busy     = unsent row younger than the lease. Do not delete it. Route returns 500.
--   cooldown = sent_at inside the cooldown. Route returns 200 and does not send.
--   issued   = new unsent row. Route sends, then mark_password_reset_sent must return true
--              before 200. A failed send deletes that hash and returns 500.
-- 200 for a credentials user is only cooldown, or issued + accepted email + mark true.
-- Do not treat an unsent row as cooldown. Do not set sent_at before the email is accepted.
-- Do not delete an unsent row younger than the lease.

drop function if exists public.issue_password_reset_token(uuid, text, timestamptz);
drop function if exists public.issue_password_reset_token(uuid, text, timestamptz, int);

create or replace function public.issue_password_reset_token(
  p_user_id uuid,
  p_token_hash text,
  p_expires_at timestamptz,
  p_cooldown_seconds int,
  p_lease_seconds int
)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  perform 1 from public.users where id = p_user_id for update;
  if not found then
    raise exception 'user missing for password reset';
  end if;

  if exists (
    select 1 from public.password_reset_tokens
    where user_id = p_user_id
      and sent_at is null
      and created_at > now() - (p_lease_seconds * interval '1 second')
  ) then
    return 'busy';
  end if;

  if exists (
    select 1 from public.password_reset_tokens
    where user_id = p_user_id
      and sent_at is not null
      and sent_at > now() - (p_cooldown_seconds * interval '1 second')
  ) then
    return 'cooldown';
  end if;

  insert into public.password_reset_tokens (user_id, token_hash, expires_at)
  values (p_user_id, p_token_hash, p_expires_at);

  delete from public.password_reset_tokens
  where user_id = p_user_id
    and token_hash <> p_token_hash;

  return 'issued';
end;
$$;

create or replace function public.mark_password_reset_sent(p_token_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.password_reset_tokens
  set sent_at = now()
  where token_hash = p_token_hash
    and sent_at is null
    and expires_at > now();

  return found;
end;
$$;

create or replace function public.consume_password_reset(
  p_token_hash text,
  p_password_hash text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id
  from public.password_reset_tokens
  where token_hash = p_token_hash
    and expires_at > now()
  limit 1;

  if v_user_id is null then
    return false;
  end if;

  perform 1 from public.users where id = v_user_id for update;

  perform 1 from public.password_reset_tokens
  where token_hash = p_token_hash
    and user_id = v_user_id
    and expires_at > now();

  if not found then
    return false;
  end if;

  update public.users
  set password_hash = p_password_hash
  where id = v_user_id;

  if not found then
    raise exception 'user missing for password reset';
  end if;

  delete from public.password_reset_tokens
  where user_id = v_user_id;

  return true;
end;
$$;

create or replace function public.password_reset_token_active(p_token_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.password_reset_tokens
    where token_hash = p_token_hash
      and expires_at > now()
  );
end;
$$;

drop function if exists public.issue_verification_token(uuid, text, timestamptz);

create or replace function public.issue_verification_token(
  p_user_id uuid,
  p_token_hash text,
  p_expires_at timestamptz,
  p_cooldown_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform 1 from public.users where id = p_user_id for update;
  if not found then
    raise exception 'user missing for verification';
  end if;

  if p_cooldown_seconds > 0 and exists (
    select 1 from public.verification_tokens
    where user_id = p_user_id
      and created_at > now() - (p_cooldown_seconds * interval '1 second')
  ) then
    return false;
  end if;

  insert into public.verification_tokens (user_id, token_hash, expires_at)
  values (p_user_id, p_token_hash, p_expires_at);

  delete from public.verification_tokens
  where user_id = p_user_id
    and token_hash <> p_token_hash;

  return true;
end;
$$;

create or replace function public.register_credentials_user(
  p_email text,
  p_password_hash text,
  p_name text,
  p_token_hash text,
  p_expires_at timestamptz
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

  if exists (select 1 from public.users where email = p_email) then
    return null;
  end if;

  begin
    insert into public.users (email, password_hash, name, email_verified)
    values (p_email, p_password_hash, p_name, false)
    returning id into v_user_id;
  exception
    when unique_violation then
      return null;
  end;

  perform public.issue_verification_token(v_user_id, p_token_hash, p_expires_at, 0);

  return v_user_id;
end;
$$;

create or replace function public.consume_verification_token(p_token_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id
  from public.verification_tokens
  where token_hash = p_token_hash
    and expires_at > now()
  limit 1;

  if v_user_id is null then
    return false;
  end if;

  perform 1 from public.users where id = v_user_id for update;

  perform 1 from public.verification_tokens
  where token_hash = p_token_hash
    and user_id = v_user_id
    and expires_at > now();

  if not found then
    return false;
  end if;

  update public.users
  set email_verified = true
  where id = v_user_id;

  if not found then
    raise exception 'user missing for verification';
  end if;

  delete from public.verification_tokens
  where user_id = v_user_id;

  return true;
end;
$$;

revoke all on function public.issue_password_reset_token(uuid, text, timestamptz, int, int) from public, anon, authenticated;
revoke all on function public.mark_password_reset_sent(text) from public, anon, authenticated;
revoke all on function public.consume_password_reset(text, text) from public, anon, authenticated;
revoke all on function public.password_reset_token_active(text) from public, anon, authenticated;
revoke all on function public.issue_verification_token(uuid, text, timestamptz, int) from public, anon, authenticated;
revoke all on function public.register_credentials_user(text, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.consume_verification_token(text) from public, anon, authenticated;

grant execute on function public.issue_password_reset_token(uuid, text, timestamptz, int, int) to service_role;
grant execute on function public.mark_password_reset_sent(text) to service_role;
grant execute on function public.consume_password_reset(text, text) to service_role;
grant execute on function public.password_reset_token_active(text) to service_role;
grant execute on function public.issue_verification_token(uuid, text, timestamptz, int) to service_role;
grant execute on function public.register_credentials_user(text, text, text, text, timestamptz) to service_role;
grant execute on function public.consume_verification_token(text) to service_role;

-- ─── Triggers (auto-update updated_at) ──────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger lesson_ratings_set_updated_at
  before update on public.lesson_ratings
  for each row execute function public.set_updated_at();

create trigger lesson_comments_set_updated_at
  before update on public.lesson_comments
  for each row execute function public.set_updated_at();

-- Slugs for public URLs. Existing databases already have these tables.
alter table public.grades add column if not exists slug text;
alter table public.subjects add column if not exists slug text;
alter table public.chapters add column if not exists slug text;
alter table public.categories add column if not exists slug text;
alter table public.lessons add column if not exists slug text;
create unique index if not exists grades_slug_key on public.grades (slug);
create unique index if not exists subjects_grade_slug_key on public.subjects (grade_id, slug);
create unique index if not exists chapters_subject_slug_key on public.chapters (subject_id, slug);
create unique index if not exists categories_slug_key on public.categories (slug);

create or replace function public.assert_lesson_slug_available()
returns trigger
language plpgsql
as $$
declare
  conflict boolean;
  lesson_slug text;
begin
  if tg_table_name = 'lessons' then
    if tg_op = 'UPDATE' and new.slug is not distinct from old.slug then
      return new;
    end if;
    if new.slug is null or new.slug = '' then
      return new;
    end if;
    select exists (
      select 1
      from public.lesson_placements mine
      join public.lesson_placements other
        on other.lesson_id <> new.id
       and (
         (mine.chapter_id is not null and other.chapter_id = mine.chapter_id)
         or (mine.subject_id is not null and other.subject_id = mine.subject_id)
         or (mine.category_id is not null and other.category_id = mine.category_id)
       )
      join public.lessons other_lesson on other_lesson.id = other.lesson_id
      where mine.lesson_id = new.id
        and other_lesson.slug = new.slug
    ) into conflict;
    if conflict then
      raise exception 'lesson slug taken' using errcode = '23505';
    end if;
    return new;
  end if;

  select lessons.slug into lesson_slug from public.lessons where lessons.id = new.lesson_id;
  if lesson_slug is null or lesson_slug = '' then
    return new;
  end if;
  select exists (
    select 1
    from public.lesson_placements other
    join public.lessons other_lesson on other_lesson.id = other.lesson_id
    where other.lesson_id <> new.lesson_id
      and other_lesson.slug = lesson_slug
      and (
        (new.chapter_id is not null and other.chapter_id = new.chapter_id)
        or (new.subject_id is not null and other.subject_id = new.subject_id)
        or (new.category_id is not null and other.category_id = new.category_id)
      )
  ) into conflict;
  if conflict then
    raise exception 'lesson slug taken' using errcode = '23505';
  end if;
  return new;
end;
$$;

drop trigger if exists lessons_slug_available on public.lessons;
create trigger lessons_slug_available
  before update of slug on public.lessons
  for each row execute function public.assert_lesson_slug_available();

drop trigger if exists lesson_placements_slug_available on public.lesson_placements;
create trigger lesson_placements_slug_available
  before insert or update of lesson_id, subject_id, chapter_id, category_id
  on public.lesson_placements
  for each row execute function public.assert_lesson_slug_available();

create trigger articles_set_updated_at
  before update on public.articles
  for each row execute function public.set_updated_at();

create trigger article_comments_set_updated_at
  before update on public.article_comments
  for each row execute function public.set_updated_at();

-- Grade pages live at /:slug, so a grade cannot use a top-level route name.
-- Keep this list aligned with RESERVED_GRADE_SLUGS in shared/utils/slugify.mjs.

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
    'reset-password'
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

-- Plain-Greek search key. Keep in step with foldGreekSearch in shared/utils/foldGreekSearch.mjs:
-- NFD, lowercase, map ypogegrammeni to iota, drop combining marks, map final sigma
-- to sigma, then drop spacing breathings and accents.
-- Stored title_folded values are computed on write, so recompute them after replacing the function.

create or replace function public.fold_greek_search(input text)
returns text
language sql
immutable
parallel safe
strict
as $$
  select translate(
    replace(
      regexp_replace(
        replace(
          replace(
            lower(normalize(input, nfd)),
            chr(837),
            'ι'
          ),
          chr(890),
          'ι'
        ),
        '[' || chr(768) || '-' || chr(879) || ']',
        '',
        'g'
      ),
      'ς',
      'σ'
    ),
    chr(96) || chr(168) || chr(180) || chr(900) || chr(8125) || chr(8127) || chr(8128) || chr(8190),
    ''
  );
$$;

revoke all on function public.fold_greek_search(text) from public, anon, authenticated;
grant execute on function public.fold_greek_search(text) to service_role;

-- Unique plain-Greek names. Same key as foldGreekName in shared/utils/foldGreekSearch.mjs.
-- Subjects are unique within a grade. Chapters are unique within a subject.
-- Does not rename or delete existing rows. Rename the listed duplicates, then run again.

create or replace function public.fold_greek_name(input text)
returns text
language sql
immutable
parallel safe
strict
as $$
  select public.fold_greek_search(
    btrim(
      regexp_replace(
        translate(
          translate(
            input,
            chr(8203) || chr(8204) || chr(8205) || chr(8288) || chr(65279),
            ''
          ),
          chr(9) || chr(10) || chr(11) || chr(12) || chr(13) || chr(160) || chr(5760)
            || chr(8192) || chr(8193) || chr(8194) || chr(8195) || chr(8196)
            || chr(8197) || chr(8198) || chr(8199) || chr(8200) || chr(8201) || chr(8202)
            || chr(8232) || chr(8233) || chr(8239) || chr(8287) || chr(12288),
          '                       '
        ),
        ' +',
        ' ',
        'g'
      )
    )
  );
$$;

revoke all on function public.fold_greek_name(text) from public, anon, authenticated;
grant execute on function public.fold_greek_name(text) to service_role;

do $$
declare
  dupes text;
begin
  lock table public.subjects in share row exclusive mode;
  select string_agg(grade_id::text || ': ' || names, '; ' order by grade_id::text)
  into dupes
  from (
    select grade_id, string_agg(distinct name, ', ' order by name) as names
    from public.subjects
    group by grade_id, public.fold_greek_name(name)
    having count(*) > 1
  ) duplicates;
  if dupes is not null then
    raise exception 'Duplicate subject names exist under the same grade. Rename them, then run this migration again: %', dupes;
  end if;
  execute 'create unique index if not exists subjects_grade_name_folded_key on public.subjects (grade_id, (public.fold_greek_name(name)))';
end
$$;

do $$
declare
  dupes text;
begin
  lock table public.chapters in share row exclusive mode;
  select string_agg(subject_id::text || ': ' || titles, '; ' order by subject_id::text)
  into dupes
  from (
    select subject_id, string_agg(distinct title, ', ' order by title) as titles
    from public.chapters
    group by subject_id, public.fold_greek_name(title)
    having count(*) > 1
  ) duplicates;
  if dupes is not null then
    raise exception 'Duplicate chapter titles exist under the same subject. Rename them, then run this migration again: %', dupes;
  end if;
  execute 'create unique index if not exists chapters_subject_title_folded_key on public.chapters (subject_id, (public.fold_greek_name(title)))';
end
$$;

alter table public.chapters
  add column if not exists title_folded text
  generated always as (public.fold_greek_search(title)) stored;

alter table public.lessons
  add column if not exists title_folded text
  generated always as (public.fold_greek_search(title)) stored;

update public.chapters set title = title;
update public.lessons set title = title;

notify pgrst, 'reload schema';

-- Admin user pages. The counts are computed in the view so a page of 20
-- can be sorted by downloads or purchases. name_sort folds a blank name
-- to the email with fold_greek_search.
-- On an existing database, run supabase/migrations/20261013184500_admin_name_sort.sql
-- before deploying the user and download sorts.

alter table public.users
  add column if not exists name_sort text
  generated always as (
    public.fold_greek_search(
      case
        when name is null or btrim(name) = '' then email
        else name
      end
    )
  ) stored;

create index if not exists users_name_sort_idx on public.users (name_sort);

drop view if exists public.admin_user_stats;

create view public.admin_user_stats
with (security_invoker = true) as
select
  u.id,
  u.name,
  u.email,
  u.avatar_url,
  u."isAdmin",
  u.created_at,
  u.name_sort,
  (select count(*)::int from public.downloads d where d.user_id = u.id) as download_count,
  (select count(*)::int from public.purchases p where p.user_id = u.id) as purchase_count
from public.users u;

revoke all on table public.admin_user_stats from public, anon, authenticated;
grant select on table public.admin_user_stats to service_role;

notify pgrst, 'reload schema';
