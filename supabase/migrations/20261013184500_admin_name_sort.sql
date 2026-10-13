-- Sort admin names with the same Greek folding as search. A blank name
-- sorts by email. The view column lets /api/admin/users order before
-- the page limit. Run this after 20261013181700_admin_user_stats.sql.

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
