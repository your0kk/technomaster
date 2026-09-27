-- Учебный ТехноМастер. Выполнять один раз в новом проекте Supabase.
-- Намеренно без DROP / TRUNCATE / CREATE OR REPLACE: существующая схема не перезаписывается.
begin;

create type public.user_role as enum ('client','master','admin');
create type public.repair_status as enum ('new','confirmed','assigned','in_progress','waiting_part','completed','cancelled');
create type public.delivery_method as enum ('pickup','delivery');
create type public.order_status as enum ('new','confirmed','paid','completed','cancelled');

create table public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null check (length(trim(full_name)) between 2 and 120),
  phone text,
  email text,
  role public.user_role not null default 'client',
  telegram_chat_id bigint,
  created_at timestamptz not null default now()
);
create table public.appliances (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.users(id) on delete restrict,
  appliance_type text not null,
  brand text not null default '',
  model text not null default '',
  created_at timestamptz not null default now()
);
create table public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  price_from numeric(12,2) not null check (price_from >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.repair_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.users(id) on delete restrict,
  appliance_id uuid references public.appliances(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  master_id uuid references public.users(id) on delete restrict,
  customer_name text not null check (length(trim(customer_name)) between 2 and 120),
  customer_phone text not null check (customer_phone ~ '^\+7[0-9]{10}$'),
  address text not null check (length(trim(address)) between 8 and 500),
  -- Снимок техники гостя: регистрация и appliances не обязательны для заявки.
  appliance_type text not null,
  appliance_brand text not null default '',
  appliance_model text not null default '',
  issue_description text not null check (length(trim(issue_description)) between 10 and 2000),
  preferred_date date not null,
  preferred_time text not null check (preferred_time in ('09:00–12:00','12:00–14:00','14:00–17:00','17:00–19:00')),
  status public.repair_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assigned_requires_master check (status not in ('assigned','in_progress','waiting_part','completed') or master_id is not null)
);
create table public.parts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  article text not null unique,
  category text not null,
  brand text not null default '',
  compatible_models text[] not null default '{}',
  price numeric(12,2) not null check (price >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.users(id) on delete restrict,
  customer_name text not null,
  customer_phone text not null,
  delivery_method public.delivery_method not null default 'pickup',
  status public.order_status not null default 'new',
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  created_at timestamptz not null default now()
);
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  part_id uuid not null references public.parts(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  price_at_order numeric(12,2) not null check (price_at_order >= 0),
  unique (order_id, part_id)
);
create index appliances_client_idx on public.appliances(client_id);
create index requests_status_idx on public.repair_requests(status);
create index requests_created_idx on public.repair_requests(created_at desc);
create index requests_date_idx on public.repair_requests(preferred_date);
create index requests_client_idx on public.repair_requests(client_id);
create index requests_master_idx on public.repair_requests(master_id);
create index requests_service_idx on public.repair_requests(service_id);
create index requests_appliance_idx on public.repair_requests(appliance_id);
create index parts_category_idx on public.parts(category);
-- UNIQUE(article) уже создаёт B-tree индекс parts_article_key.
create index orders_client_idx on public.orders(client_id);
create index order_items_part_idx on public.order_items(part_id);
-- UNIQUE(order_id, part_id) покрывает поиск по order_id.

create function public.touch_request_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = clock_timestamp(); return new; end;
$$;
create trigger requests_updated before update on public.repair_requests
for each row execute function public.touch_request_updated_at();

create function public.check_request_roles() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.master_id is not null and not exists(select 1 from public.users where id=new.master_id and role='master') then
    raise exception 'master_id должен ссылаться на пользователя с ролью master';
  end if;
  if new.client_id is not null and not exists(select 1 from public.users where id=new.client_id and role='client') then
    raise exception 'client_id должен ссылаться на пользователя с ролью client';
  end if;
  if new.appliance_id is not null and (new.client_id is null or not exists(select 1 from public.appliances where id=new.appliance_id and client_id=new.client_id)) then
    raise exception 'Техника должна принадлежать клиенту заявки';
  end if;
  return new;
end;
$$;
create trigger requests_check_roles before insert or update on public.repair_requests
for each row execute function public.check_request_roles();
revoke execute on function public.touch_request_updated_at() from public, anon, authenticated;
revoke execute on function public.check_request_roles() from public, anon, authenticated;

-- RLS включён на всех семи таблицах. Личные данные доступны только серверу.
alter table public.users enable row level security;
alter table public.appliances enable row level security;
alter table public.services enable row level security;
alter table public.repair_requests enable row level security;
alter table public.parts enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
revoke all on public.users,public.appliances,public.services,public.repair_requests,public.parts,public.orders,public.order_items from anon, authenticated;
grant select on public.services,public.parts to anon,authenticated;
grant select on public.users to authenticated;
grant all on public.users,public.appliances,public.services,public.repair_requests,public.parts,public.orders,public.order_items to service_role;
create policy active_services_read on public.services for select to anon,authenticated using(is_active);
create policy active_parts_read on public.parts for select to anon,authenticated using(is_active);
create policy own_profile_read on public.users for select to authenticated using(auth_user_id=(select auth.uid()));
-- Нет INSERT/UPDATE policies для anon/authenticated. Роль admin нельзя присвоить из браузера.

-- Фиксированные учебные UUID, не ссылки на случайно сгенерированные идентификаторы.
insert into public.users(id,full_name,phone,email,role) values
('30000000-0000-4000-8000-000000000001','Ушаков Юрий Сергеевич',null,null,'admin'),
('30000000-0000-4000-8000-000000000002','Иванов Иван Иванович','+79000000001',null,'master'),
('30000000-0000-4000-8000-000000000003','Тестовый клиент','+79000000002','client@example.com','client');
insert into public.services(id,title,description,price_from) values
('10000000-0000-4000-8000-000000000001','Ремонт стиральных машин','Диагностика, ремонт системы слива, нагрева и управления.',1800),
('10000000-0000-4000-8000-000000000002','Ремонт посудомоечных машин','Подача воды, нагрев и сушка посуды.',1800),
('10000000-0000-4000-8000-000000000003','Ремонт холодильников','Охлаждение, датчики и автоматика.',2000),
('10000000-0000-4000-8000-000000000004','Ремонт духовых шкафов','Нагрев, термостат и управление.',2200);
insert into public.parts(id,title,article,category,brand,compatible_models,price,stock_quantity,image_url) values
('20000000-0000-4000-8000-000000000001','Сливной насос Askoll M231 XP','ASK-M231XP','Насосы','Askoll',array['Indesit WISL 82','Ariston AVL 100'],1490,8,'/images/pump.jpg'),
('20000000-0000-4000-8000-000000000002','ТЭН 1900 Вт с отверстием','HTR-1900','ТЭНы','Samsung',array['Samsung WF60F1R0E2W'],1290,5,'/images/heater.jpg'),
('20000000-0000-4000-8000-000000000003','Манжета люка Bosch','BOS-MAXX-01','Манжеты люка','Bosch',array['Bosch Maxx 5'],2690,3,'/images/seal.jpg'),
('20000000-0000-4000-8000-000000000004','Подшипник 6204 2RS','BRG-6204','Подшипники','SKF',array['По размерам узла'],390,18,'/images/bearing.jpg'),
('20000000-0000-4000-8000-000000000005','Ремень 1270 J5','BLT-1270J5','Ремни','Indesit',array['Indesit WISL 103'],690,12,'/images/belt.jpg'),
('20000000-0000-4000-8000-000000000006','Плата управления LG','PCB-LG-01','Платы управления','LG',array['LG F1096'],6490,0,'/images/board.jpg'),
('20000000-0000-4000-8000-000000000007','Сливной насос универсальный 30 Вт','PMP-30W','Насосы','Askoll',array['Подбор по креплению'],1590,6,'/images/pump.jpg'),
('20000000-0000-4000-8000-000000000008','ТЭН 2000 Вт','HTR-2000','ТЭНы','Bosch',array['Bosch WLG'],1790,4,'/images/heater.jpg'),
('20000000-0000-4000-8000-000000000009','Подшипник 6205 2RS','BRG-6205','Подшипники','SKF',array['По размерам узла'],490,10,'/images/bearing.jpg'),
('20000000-0000-4000-8000-000000000010','Ремень 1228 H7','BLT-1228H7','Ремни','Samsung',array['Samsung WF60'],790,7,'/images/belt.jpg');
insert into public.appliances(id,client_id,appliance_type,brand,model) values
('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000003','Стиральная машина','Samsung','WF60F1R0E2W');
insert into public.repair_requests(id,client_id,appliance_id,service_id,master_id,customer_name,customer_phone,address,appliance_type,appliance_brand,appliance_model,issue_description,preferred_date,preferred_time,status) values
('50000000-0000-4000-8000-000000000001',null,null,'10000000-0000-4000-8000-000000000001',null,'Тестовая заявка 1','+79000000003','Коченёво, ул. Примерная, 12','Стиральная машина','Indesit','WISL 82','Не сливает воду после стирки.',current_date+1,'14:00–17:00','new'),
('50000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','Тестовый клиент','+79000000002','Коченёво, ул. Учебная, 5','Стиральная машина','Samsung','WF60F1R0E2W','Не нагревает воду во время стирки.',current_date+1,'09:00–12:00','assigned'),
('50000000-0000-4000-8000-000000000003',null,null,'10000000-0000-4000-8000-000000000002',null,'Тестовая заявка 3','+79000000004','Новосибирский район, ул. Примерная, 8','Посудомоечная машина','Bosch','Не знаю','Останавливается в середине программы.',current_date+2,'12:00–14:00','confirmed');
commit;
