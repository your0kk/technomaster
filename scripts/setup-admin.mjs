// Создаёт только учебную учётную запись в Supabase Auth.
// Пароль сохраняется локально в исключённом из Git файле, не выводится.
import { randomBytes } from "node:crypto";
import { access, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
const file = new URL("../.admin-credentials.local.json", import.meta.url);
try { await access(file); console.log("Локальная учётная запись уже подготовлена."); process.exit(0); } catch {}
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw Error("Заполните .env.local перед настройкой администратора.");
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const profileId="30000000-0000-4000-8000-000000000001";
const {data:profile,error:profileError}=await db.from("users").select("id,auth_user_id,role").eq("id",profileId).single();
if(profileError||profile.role!=="admin")throw Error("Сначала примените SQL-миграцию.");
if(profile.auth_user_id)throw Error("У администратора уже есть учётная запись. Используйте существующий вход; пароль не изменён.");
const email="admin@technomaster.example",password=randomBytes(24).toString("base64url");
const {data,error}=await db.auth.admin.createUser({email,password,email_confirm:true});
if(error)throw Error("Не удалось создать учебный вход администратора. Проверьте Auth → Users; существующие учётные записи не изменены.");
// Сначала записываем результат: при ошибке привязки пароль не потеряется.
await writeFile(file,JSON.stringify({email,password,authUserId:data.user.id,profileId},null,2),{flag:"wx",mode:0o600});
// Миграция регистрации создаёт профиль клиента для любого нового auth.users.
// Для служебного входа удаляем только что созданный профиль перед привязкой администратора.
await db.from("users").delete().eq("auth_user_id",data.user.id).eq("role","client");
const {error:linkError}=await db.from("users").update({auth_user_id:data.user.id,email}).eq("id",profileId).is("auth_user_id",null);
if(linkError)throw Error("Вход создан. Завершите привязку auth_user_id по инструкции README; реквизиты сохранены локально.");
console.log("Учебный администратор создан и связан с профилем Ушакова Юрия Сергеевича. Реквизиты в .admin-credentials.local.json (не Git).");
