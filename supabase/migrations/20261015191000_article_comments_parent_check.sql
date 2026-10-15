-- Enforce one-level replies and same-article parent at the database layer.

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
