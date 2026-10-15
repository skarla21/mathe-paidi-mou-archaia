-- Folded article title/tags for accent-insensitive public search (same key as lessons.title_folded).
-- tags_folded cannot call array_to_string() directly in a generated column (STABLE),
-- so fold_article_tags wraps it as IMMUTABLE plpgsql.

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

alter table public.articles
  add column if not exists title_folded text
  generated always as (public.fold_greek_search(title)) stored;

alter table public.articles
  add column if not exists tags_folded text
  generated always as (public.fold_article_tags(tags)) stored;

create index if not exists articles_title_folded_idx on public.articles (title_folded);
create index if not exists articles_tags_folded_idx on public.articles (tags_folded);

notify pgrst, 'reload schema';
