-- Unlimited article comments + one-level reply threads

alter table public.article_comments
  drop constraint if exists article_comments_user_id_article_id_key;

alter table public.article_comments
  add column if not exists parent_id uuid references public.article_comments(id) on delete cascade;

create index if not exists article_comments_parent_id_idx
  on public.article_comments(parent_id);

create index if not exists article_comments_article_created_idx
  on public.article_comments(article_id, created_at);
