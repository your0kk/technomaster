import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("order retries return one order, preserve stock and reject changed payload", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb not null default '{}'); create function auth.uid() returns uuid language sql as $$ select null::uuid $$; grant usage on schema public,auth to anon,authenticated,service_role;",
    );
    const folder = new URL("../supabase/migrations/", import.meta.url);
    for (const file of (await readdir(folder))
      .filter((file) => file.endsWith(".sql"))
      .sort()) {
      await db.exec(await readFile(new URL(file, folder), "utf8"));
    }
    const part = "20000000-0000-4000-8000-000000000001";
    await db.exec(
      `update public.parts set stock_quantity=1 where id='${part}'`,
    );
    await db.exec("set role service_role");
    const invoke = (key: string, hash: string) =>
      db.query<{ id: string }>(
        "select public.create_order_once($1::uuid,$2,null,'Тестовый покупатель','+79000000000','pickup',null,'',$3::jsonb) as id",
        [key, hash, JSON.stringify([{ part_id: part, quantity: 1 }])],
      );
    const key = "80000000-0000-4000-8000-000000000001";
    const first = await invoke(key, "a".repeat(64));
    const second = await invoke(key, "a".repeat(64));
    assert.equal(second.rows[0].id, first.rows[0].id);
    await assert.rejects(
      invoke(key, "b".repeat(64)),
      /Данные повторного заказа изменились/,
    );
    await assert.rejects(
      invoke("80000000-0000-4000-8000-000000000002", "a".repeat(64)),
    );
    await db.exec("reset role");
    const result = await db.query<{
      stock: number;
      attempts: number;
      orders: number;
    }>(
      `select (select stock_quantity from public.parts where id='${part}') as stock, (select count(*)::int from private.order_attempts) as attempts, (select count(*)::int from public.orders where customer_name='Тестовый покупатель') as orders`,
    );
    assert.deepEqual(result.rows[0], { stock: 0, attempts: 1, orders: 1 });
    await db.exec("set role anon");
    await assert.rejects(invoke(key, "a".repeat(64)), /permission denied/);
  } finally {
    await db.close();
  }
});
