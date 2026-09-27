import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("migration, FK/check constraints, timestamps and RLS", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb not null default '{}'); create function auth.uid() returns uuid language sql as $$ select null::uuid $$; grant usage on schema public,auth to anon,authenticated,service_role;",
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202609270001_technomaster.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20260927211158_client_accounts.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const count = await db.query<{ n: number }>(
      "select count(*)::int as n from public.parts",
    );
    assert.equal(count.rows[0].n, 10);
    await db.exec(
      `insert into auth.users(id,email,raw_user_meta_data)
       values ('70000000-0000-4000-8000-000000000001','new@example.com','{"full_name":"Новый клиент","phone":"+79000000005"}')`,
    );
    const client = await db.query<{ role: string; phone: string }>(
      "select role::text,phone from public.users where auth_user_id='70000000-0000-4000-8000-000000000001'",
    );
    assert.deepEqual(client.rows[0], { role: "client", phone: "+79000000005" });
    for (const sql of [
      "update public.parts set price=-1",
      "update public.parts set stock_quantity=-1",
      "insert into public.parts(title,article,category,price) values ('x','ASK-M231XP','x',1)",
      "update public.repair_requests set master_id='30000000-0000-4000-8000-000000000001'",
      "update public.repair_requests set service_id='99999999-0000-4000-8000-000000000001'",
      "update public.repair_requests set status='invalid'",
    ])
      await assert.rejects(db.exec(sql));
    await db.exec(
      "insert into public.orders(id,customer_name,customer_phone) values ('60000000-0000-4000-8000-000000000001','Тест','+79000000000')",
    );
    await assert.rejects(
      db.exec(
        "insert into public.order_items(order_id,part_id,quantity,price_at_order) values('60000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',0,1490)",
      ),
    );
    await db.exec(
      "update public.repair_requests set status='confirmed' where id='50000000-0000-4000-8000-000000000001'",
    );
    const stamp = await db.query<{ changed: boolean }>(
      "select updated_at>created_at as changed from public.repair_requests where id='50000000-0000-4000-8000-000000000001'",
    );
    assert.equal(stamp.rows[0].changed, true);
    await db.exec(
      "update public.parts set is_active=false where article='ASK-M231XP'; set role anon;",
    );
    const publicParts = await db.query<{ n: number }>(
      "select count(*)::int as n from public.parts",
    );
    assert.equal(publicParts.rows[0].n, 9);
    await assert.rejects(db.exec("select * from public.repair_requests"));
    await assert.rejects(db.exec("select * from public.users"));
    await assert.rejects(db.exec("update public.parts set price=0"));
    await db.exec("reset role; set role authenticated;");
    const profiles = await db.query("select * from public.users");
    assert.equal(profiles.rows.length, 0);
    await assert.rejects(db.exec("update public.users set role='admin'"));
  } finally {
    await db.close();
  }
});
