begin;
create table private.order_attempts (
  request_key uuid primary key,
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  order_id uuid not null references public.orders(id),
  created_at timestamptz not null default now()
);
alter table private.order_attempts enable row level security;
revoke all on private.order_attempts from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert on private.order_attempts to service_role;

create function public.create_order_once(
  request_key uuid,
  request_hash text,
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
security invoker
set search_path = ''
as $$
declare
  previous private.order_attempts%rowtype;
  result_id uuid;
begin
  if request_key is null or request_hash is null or request_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Некорректный ключ заказа';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(request_key::text, 0));
  select * into previous from private.order_attempts attempt where attempt.request_key = create_order_once.request_key;
  if found then
    if previous.request_hash <> request_hash then
      raise exception 'Данные повторного заказа изменились';
    end if;
    return previous.order_id;
  end if;
  result_id := public.create_order(customer_id, customer_name_input, customer_phone_input,
    delivery_method_input, delivery_address_input, comment_input, items_input);
  insert into private.order_attempts(request_key, request_hash, order_id)
  values (request_key, request_hash, result_id);
  return result_id;
end;
$$;
revoke all on function public.create_order_once(uuid,text,uuid,text,text,public.delivery_method,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.create_order_once(uuid,text,uuid,text,text,public.delivery_method,text,text,jsonb) to service_role;
commit;
