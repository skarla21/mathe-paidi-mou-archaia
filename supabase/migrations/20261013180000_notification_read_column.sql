-- One owner reads the inbox, so read state lives on the notification.

alter table public.admin_notifications
  add column if not exists read boolean not null default false,
  add column if not exists read_at timestamptz;

update public.admin_notifications n
set
  read = true,
  read_at = sub.read_at
from (
  select notification_id, max(read_at) as read_at
  from public.admin_notification_reads
  group by notification_id
) sub
where sub.notification_id = n.id;

alter table public.admin_notifications
  drop constraint if exists admin_notifications_read_at_check;

alter table public.admin_notifications
  add constraint admin_notifications_read_at_check
  check (read = (read_at is not null));

drop table if exists public.admin_notification_reads;
