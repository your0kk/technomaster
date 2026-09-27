// Создаёт учебный вход клиента и связывает его с заявкой из seed.
// Пароль сохраняется только в локальном файле, исключённом из Git.
import { randomBytes } from "node:crypto";
import { access, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const file = new URL("../.client-credentials.local.json", import.meta.url);
try {
  await access(file);
  console.log("Локальная учётная запись клиента уже подготовлена.");
  process.exit(0);
} catch {}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw Error("Заполните .env.local перед настройкой клиента.");

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const profileId = "30000000-0000-4000-8000-000000000003";
const { data: profile, error: profileError } = await db
  .from("users")
  .select("id,auth_user_id,role,full_name,phone")
  .eq("id", profileId)
  .single();
if (profileError || profile.role !== "client")
  throw Error("Сначала примените миграции Supabase.");
if (profile.auth_user_id)
  throw Error("Учебный клиент уже связан с учётной записью.");

const email = "client@technomaster.example";
const password = randomBytes(24).toString("base64url");
const { data, error } = await db.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: profile.full_name, phone: profile.phone },
});
if (error) throw Error("Не удалось создать учебный вход клиента.");

await writeFile(
  file,
  JSON.stringify({ email, password, authUserId: data.user.id, profileId }, null, 2),
  { flag: "wx", mode: 0o600 },
);
await db
  .from("users")
  .delete()
  .eq("auth_user_id", data.user.id)
  .neq("id", profileId)
  .eq("role", "client");
const { error: linkError } = await db
  .from("users")
  .update({ auth_user_id: data.user.id, email })
  .eq("id", profileId)
  .is("auth_user_id", null);
if (linkError)
  throw Error("Вход создан, но профиль не связан. Реквизиты сохранены локально.");

console.log("Учебный клиент создан. Реквизиты сохранены в локальном файле.");
