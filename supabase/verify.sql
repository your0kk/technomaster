-- Только чтение: для отчёта и проверки применения миграции.
select tablename, rowsecurity from pg_tables
where schemaname='public' and tablename in ('users','appliances','services','repair_requests','parts','orders','order_items') order by tablename;
select 'services' as entity,count(*) from public.services
union all select 'parts',count(*) from public.parts
union all select 'repair_requests',count(*) from public.repair_requests;
select id,customer_name,appliance_type,appliance_model,status,created_at,updated_at
from public.repair_requests order by created_at desc limit 10;
select table_name,constraint_name,constraint_type from information_schema.table_constraints
where table_schema='public' order by table_name,constraint_type;
select tablename,indexname,indexdef from pg_indexes where schemaname='public' order by tablename,indexname;
