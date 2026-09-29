begin;

create index telegram_notifications_user_idx
on public.telegram_notifications(user_id);

commit;
