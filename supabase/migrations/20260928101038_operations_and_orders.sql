begin;

alter table public.orders
  add column delivery_address text,
  add column comment text not null default '' check (length(comment) <= 1000),
  add column updated_at timestamptz not null default now(),
  add constraint delivery_requires_address check (
    (delivery_method = 'pickup' and delivery_address is null)
    or (delivery_method = 'delivery' and length(trim(delivery_address)) between 8 and 500)
  );

create function public.touch_order_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;

create trigger orders_updated
before update on public.orders
for each row execute function public.touch_order_updated_at();

revoke execute on function public.touch_order_updated_at() from public, anon, authenticated;

create table public.telegram_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  event_type text not null check (event_type in ('repair_status_changed','order_status_changed')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','delivered','failed')),
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

create index telegram_notifications_pending_idx
on public.telegram_notifications(status, created_at)
where status = 'pending';

alter table public.telegram_notifications enable row level security;
revoke all on public.telegram_notifications from anon, authenticated;
grant all on public.telegram_notifications to service_role;

create function private.enqueue_repair_status_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
    and new.client_id is not null
    and exists (
      select 1 from public.users
      where id = new.client_id and telegram_chat_id is not null
    ) then
    insert into public.telegram_notifications (user_id, event_type, payload)
    values (
      new.client_id,
      'repair_status_changed',
      jsonb_build_object('request_id', new.id, 'status', new.status)
    );
  end if;
  return new;
end;
$$;

create trigger repair_status_notification
after update of status on public.repair_requests
for each row execute function private.enqueue_repair_status_notification();

revoke execute on function private.enqueue_repair_status_notification() from public, anon, authenticated;

create function public.create_order(
  customer_id uuid,
  customer_name_input text,
  customer_phone_input text,
  delivery_method_input public.delivery_method,
  delivery_address_input text,
  comment_input text,
  items_input jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_order_id uuid;
  item_count integer;
  available_count integer;
  valid_items boolean;
begin
  if jsonb_typeof(items_input) <> 'array' or jsonb_array_length(items_input) = 0 then
    raise exception 'Корзина пуста';
  end if;

  if customer_id is not null and not exists (
    select 1 from public.users where id = customer_id and role = 'client'
  ) then
    raise exception 'Некорректный клиент';
  end if;

  select bool_and(part_id is not null and quantity > 0)
  into valid_items
  from jsonb_to_recordset(items_input) as item(part_id uuid, quantity integer);

  if not coalesce(valid_items, false) then
    raise exception 'Некорректный состав заказа';
  end if;

  with requested as (
    select part_id, sum(quantity)::integer as quantity
    from jsonb_to_recordset(items_input) as item(part_id uuid, quantity integer)
    group by part_id
  )
  select count(*) into item_count from requested;

  perform 1
  from public.parts part
  join (
    select part_id, sum(quantity)::integer as quantity
    from jsonb_to_recordset(items_input) as item(part_id uuid, quantity integer)
    group by part_id
  ) requested on requested.part_id = part.id
  for update of part;

  with requested as (
    select part_id, sum(quantity)::integer as quantity
    from jsonb_to_recordset(items_input) as item(part_id uuid, quantity integer)
    group by part_id
  )
  select count(*) into available_count
  from public.parts part
  join requested on requested.part_id = part.id
  where part.is_active and requested.quantity > 0 and part.stock_quantity >= requested.quantity;

  if available_count <> item_count then
    raise exception 'Одна или несколько запчастей больше не доступны в нужном количестве';
  end if;

  insert into public.orders (
    client_id, customer_name, customer_phone, delivery_method, delivery_address, comment, total_amount
  )
  values (
    customer_id,
    trim(customer_name_input),
    trim(customer_phone_input),
    delivery_method_input,
    nullif(trim(coalesce(delivery_address_input, '')), ''),
    trim(coalesce(comment_input, '')),
    0
  )
  returning id into new_order_id;

  with requested as (
    select part_id, sum(quantity)::integer as quantity
    from jsonb_to_recordset(items_input) as item(part_id uuid, quantity integer)
    group by part_id
  )
  insert into public.order_items (order_id, part_id, quantity, price_at_order)
  select new_order_id, part.id, requested.quantity, part.price
  from public.parts part
  join requested on requested.part_id = part.id;

  update public.orders
  set total_amount = (
    select coalesce(sum(quantity * price_at_order), 0)
    from public.order_items
    where order_id = new_order_id
  )
  where id = new_order_id;

  with requested as (
    select part_id, sum(quantity)::integer as quantity
    from jsonb_to_recordset(items_input) as item(part_id uuid, quantity integer)
    group by part_id
  )
  update public.parts part
  set stock_quantity = part.stock_quantity - requested.quantity
  from requested
  where part.id = requested.part_id;

  return new_order_id;
end;
$$;

revoke all on function public.create_order(uuid, text, text, public.delivery_method, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_order(uuid, text, text, public.delivery_method, text, text, jsonb) to service_role;

commit;
