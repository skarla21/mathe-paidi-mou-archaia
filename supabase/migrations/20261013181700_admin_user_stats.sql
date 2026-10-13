-- Admin user pages. download_count and purchase_count are real columns so
-- /api/admin/users can sort them before limiting a page to 20 rows.

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
  (select count(*)::int from public.downloads d where d.user_id = u.id) as download_count,
  (select count(*)::int from public.purchases p where p.user_id = u.id) as purchase_count
from public.users u;

revoke all on table public.admin_user_stats from public, anon, authenticated;
grant select on table public.admin_user_stats to service_role;

notify pgrst, 'reload schema';
