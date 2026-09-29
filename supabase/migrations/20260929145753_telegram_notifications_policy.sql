begin;

create policy telegram_notifications_service_only
on public.telegram_notifications
as restrictive
for all
to service_role
using (true)
with check (true);

commit;
