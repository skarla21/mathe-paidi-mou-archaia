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
  tags text[] not null default '{}',
  is_free boolean not null default true,
  price int not null default 0,
  content_url text,
  preview_url text,
  page_count int,
  file_bytes bigint,
  avg_rating numeric(3, 2) not null default 0,
  rating_count int not null default 0,
  created_at timestamptz not null default now(),
  constraint lessons_page_count_check check (page_count is null or page_count > 0),
  constraint lessons_file_bytes_check check (file_bytes is null or file_bytes > 0),
  constraint lessons_rating_count_check check (rating_count >= 0)
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

-- Saved lessons. A purchase inserts a row here; removing the bookmark does not remove the purchase.
create table if not exists public.lesson_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, lesson_id)
);
create index if not exists lesson_bookmarks_user_id_idx on public.lesson_bookmarks(user_id);
create index if not exists lesson_bookmarks_lesson_id_idx on public.lesson_bookmarks(lesson_id);

insert into public.lesson_bookmarks (user_id, lesson_id)
select distinct user_id, lesson_id
from public.purchases
on conflict (user_id, lesson_id) do nothing;

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

-- Lesson comments (threaded, article-parity)
create table if not exists public.lesson_comments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  lesson_id   uuid not null references public.lessons(id) on delete cascade,
  parent_id   uuid references public.lesson_comments(id) on delete cascade,
  body        text not null check (char_length(body) >= 1 and char_length(body) <= 2000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists lesson_comments_user_id_idx   on public.lesson_comments(user_id);
create index if not exists lesson_comments_lesson_id_idx on public.lesson_comments(lesson_id);
create index if not exists lesson_comments_parent_id_idx on public.lesson_comments(parent_id);
create index if not exists lesson_comments_lesson_created_idx on public.lesson_comments(lesson_id, created_at);

-- Articles (blog-style content)
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null,
  body text not null,
  tags text[] not null default '{}',
  reading_time_minutes smallint not null,
  published boolean not null default false,
  image_url text,
  like_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint articles_like_count_check check (like_count >= 0)
);
create index if not exists articles_published_idx on public.articles(published);
create index if not exists articles_created_at_idx on public.articles(created_at desc);
create unique index if not exists articles_slug_key on public.articles (slug);

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
  parent_id uuid references public.article_comments(id) on delete cascade,
  body text not null check (char_length(body) >= 1 and char_length(body) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists article_comments_user_id_idx on public.article_comments(user_id);
create index if not exists article_comments_article_id_idx on public.article_comments(article_id);
create index if not exists article_comments_parent_id_idx on public.article_comments(parent_id);
create index if not exists article_comments_article_created_idx on public.article_comments(article_id, created_at);

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
alter table public.lesson_bookmarks enable row level security;
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

-- Lessons: public read of catalog fields. content_url is revoked below.
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

-- Articles: published rows only. Drafts stay on the service role.
drop policy if exists "articles_select_all" on public.articles;
create policy "articles_select_published" on public.articles for select using (published = true);
create policy "article_likes_select_all" on public.article_likes for select using (true);
create policy "article_comments_select_all" on public.article_comments for select using (true);

-- Note: all admin/server writes use the service role key (supabaseServiceKey),
-- which bypasses RLS entirely. No insert/update/delete policies are needed for anon.

-- Lesson files live in a private bucket. The public uploads bucket cannot hide one folder.
insert into storage.buckets (id, name, public, file_size_limit)
values ('lesson-files', 'lesson-files', false, 52428800)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit;

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

revoke all on function public.get_top_downloaded_lessons(int) from public, anon, authenticated;
grant execute on function public.get_top_downloaded_lessons(int) to service_role;

-- Admin dashboard aggregates (service_role only — no full-table pulls in Node).
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

drop function if exists public.consume_password_reset(text, text);

create function public.consume_password_reset(
  p_token_hash text,
  p_password_hash text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_email text;
begin
  select user_id into v_user_id
  from public.password_reset_tokens
  where token_hash = p_token_hash
    and expires_at > now()
  limit 1;

  if v_user_id is null then
    return null;
  end if;

  perform 1 from public.users where id = v_user_id for update;

  perform 1 from public.password_reset_tokens
  where token_hash = p_token_hash
    and user_id = v_user_id
    and expires_at > now();

  if not found then
    return null;
  end if;

  update public.users
  set password_hash = p_password_hash
  where id = v_user_id;

  if not found then
    raise exception 'user missing for password reset';
  end if;

  select email into v_email
  from public.users
  where id = v_user_id;

  if v_email is null or length(trim(v_email)) = 0 then
    raise exception 'user email missing for password reset';
  end if;

  delete from public.password_reset_tokens
  where user_id = v_user_id;

  return v_email;
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

drop trigger if exists lesson_ratings_refresh_lesson_avg on public.lesson_ratings;
create trigger lesson_ratings_refresh_lesson_avg
  after insert or update of rating, lesson_id or delete
  on public.lesson_ratings
  for each row execute function public.lesson_ratings_refresh_lesson_avg();

create trigger lesson_comments_set_updated_at
  before update on public.lesson_comments
  for each row execute function public.set_updated_at();

-- Slugs for public URLs. Existing databases already have these tables.
alter table public.grades add column if not exists slug text;
alter table public.subjects add column if not exists slug text;
alter table public.chapters add column if not exists slug text;
alter table public.categories add column if not exists slug text;
alter table public.lessons add column if not exists slug text;
alter table public.articles add column if not exists slug text;
-- Safe fallback when applying schema patches without the dedicated article-slugs migration.
update public.articles
set slug = 'article-' || replace(id::text, '-', '')
where slug is null or slug = '';
create unique index if not exists grades_slug_key on public.grades (slug);
create unique index if not exists subjects_grade_slug_key on public.subjects (grade_id, slug);
create unique index if not exists chapters_subject_slug_key on public.chapters (subject_id, slug);
create unique index if not exists categories_slug_key on public.categories (slug);
create unique index if not exists articles_slug_key on public.articles (slug);

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

create or replace function public.article_comments_validate_parent()
returns trigger
language plpgsql
as $$
declare
  parent_article uuid;
  parent_parent uuid;
begin
  if new.parent_id is null then
    return new;
  end if;

  select article_id, parent_id
    into parent_article, parent_parent
  from public.article_comments
  where id = new.parent_id;

  if parent_article is null then
    raise exception 'invalid parent comment' using errcode = '23514';
  end if;

  if parent_article <> new.article_id then
    raise exception 'parent comment article mismatch' using errcode = '23514';
  end if;

  if parent_parent is not null then
    raise exception 'cannot reply to a reply' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists article_comments_validate_parent on public.article_comments;
create trigger article_comments_validate_parent
  before insert or update of parent_id, article_id
  on public.article_comments
  for each row execute function public.article_comments_validate_parent();

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

drop trigger if exists article_likes_refresh_like_count on public.article_likes;
create trigger article_likes_refresh_like_count
  after insert or delete
  on public.article_likes
  for each row execute function public.article_likes_refresh_like_count();

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

create or replace function public.fold_article_tags(tags text[])
returns text
language plpgsql
immutable
parallel safe
as $$
begin
  return public.fold_greek_search(coalesce(array_to_string(tags, ' '), ''));
end;
$$;

revoke all on function public.fold_article_tags(text[]) from public, anon, authenticated;
grant execute on function public.fold_article_tags(text[]) to service_role;

alter table public.lessons
  add column if not exists tags_folded text
  generated always as (public.fold_article_tags(tags)) stored;

create index if not exists lessons_tags_folded_idx on public.lessons (tags_folded);

alter table public.articles
  add column if not exists title_folded text
  generated always as (public.fold_greek_search(title)) stored;

alter table public.articles
  add column if not exists tags_folded text
  generated always as (public.fold_article_tags(tags)) stored;

create index if not exists articles_title_folded_idx on public.articles (title_folded);
create index if not exists articles_tags_folded_idx on public.articles (tags_folded);

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

-- Column grants run after title_folded, tags_folded, and name_sort exist.
-- A table-level SELECT covers every column, so replace it before hiding content_url and password_hash.
revoke select on table public.lessons from anon, authenticated;
grant select (
  id, title, content, is_free, price, created_at, slug, title_folded,
  preview_url, page_count, file_bytes, tags, tags_folded, avg_rating, rating_count
) on table public.lessons to anon, authenticated;

revoke select on table public.users from anon, authenticated;
grant select (
  id, email, name, avatar_url, "isAdmin", provider, created_at, email_verified, name_sort
) on table public.users to anon, authenticated;

-- Stored lesson files are object paths. Older rows kept the public uploads URL.
update public.lessons
set content_url = substring(content_url from '/(lesson-content/[^/?#]+)')
where content_url ~ '/storage/v1/object/public/uploads/lesson-content/';

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
