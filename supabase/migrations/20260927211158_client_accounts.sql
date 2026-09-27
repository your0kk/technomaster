begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create function private.create_client_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text;
  profile_phone text;
begin
  profile_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  if profile_name is null or length(profile_name) < 2 or length(profile_name) > 120 then
    profile_name := split_part(coalesce(new.email, 'Клиент'), '@', 1);
  end if;
  if length(profile_name) < 2 or length(profile_name) > 120 then
    profile_name := 'Клиент';
  end if;

  profile_phone := nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '');
  if profile_phone is not null and profile_phone !~ '^\+7[0-9]{10}$' then
    profile_phone := null;
  end if;

  insert into public.users (auth_user_id, full_name, phone, email, role)
  values (new.id, profile_name, profile_phone, new.email, 'client')
  on conflict (auth_user_id) do nothing;

  return new;
end;
$$;

revoke execute on function private.create_client_profile() from public, anon, authenticated;

create trigger create_client_profile_after_signup
after insert on auth.users
for each row execute function private.create_client_profile();

grant select on public.appliances, public.repair_requests, public.orders, public.order_items to authenticated;

create policy own_appliances_read
on public.appliances for select to authenticated
using (
  client_id in (
    select id from public.users where auth_user_id = (select auth.uid())
  )
);

create policy own_requests_read
on public.repair_requests for select to authenticated
using (
  client_id in (
    select id from public.users where auth_user_id = (select auth.uid())
  )
);

create policy own_orders_read
on public.orders for select to authenticated
using (
  client_id in (
    select id from public.users where auth_user_id = (select auth.uid())
  )
);

create policy own_order_items_read
on public.order_items for select to authenticated
using (
  order_id in (
    select orders.id
    from public.orders
    join public.users on users.id = orders.client_id
    where users.auth_user_id = (select auth.uid())
  )
);

commit;
