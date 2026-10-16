-- Lesson PDFs must not be readable with the public anon key.
-- The uploads bucket is public, so a folder policy cannot hide lesson-content.
-- Run this in the Supabase SQL editor on an existing database.

-- Table-level SELECT covers every column. Replace it so content_url and password_hash stay hidden.
revoke select on table public.lessons from anon, authenticated;
grant select (
  id, title, content, is_free, price, created_at, slug, title_folded,
  preview_url, page_count, file_bytes, tags, tags_folded, avg_rating, rating_count
) on table public.lessons to anon, authenticated;

revoke select on table public.users from anon, authenticated;
grant select (
  id, email, name, avatar_url, "isAdmin", provider, created_at, email_verified, name_sort
) on table public.users to anon, authenticated;

drop policy if exists "articles_select_all" on public.articles;
drop policy if exists "articles_select_published" on public.articles;
create policy "articles_select_published" on public.articles
  for select using (published = true);

revoke all on function public.get_top_downloaded_lessons(int) from public, anon, authenticated;
grant execute on function public.get_top_downloaded_lessons(int) to service_role;

insert into storage.buckets (id, name, public, file_size_limit)
values ('lesson-files', 'lesson-files', false, 52428800)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit;

notify pgrst, 'reload schema';
