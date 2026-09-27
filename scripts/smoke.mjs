import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

// Ручная интеграционная проверка: оставляет одну учебную заявку в БД.
const base = 'http://127.0.0.1:3000';
const credentials = JSON.parse(await readFile(new URL('../.admin-credentials.local.json', import.meta.url), 'utf8'));
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {auth:{persistSession:false,autoRefreshToken:false}});
assert.equal((await fetch(`${base}/api/admin/requests`)).status, 401);
const denied = await db.from('repair_requests').select('id');
assert.ok(denied.error || denied.data.length === 0);
const response = await fetch(`${base}/api/repair-requests`, {method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({customer_name:'Учебная проверка',customer_phone:'+70000000000',address:'Коченёво, учебный адрес, дом 1',appliance_type:'Стиральная машина',appliance_brand:'Samsung',appliance_model:'Учебная модель',service_id:'10000000-0000-4000-8000-000000000001',issue_description:'Тестовая заявка: проверка сохранения, выезд не требуется.',preferred_date:new Date(Date.now()+86400000).toISOString().slice(0,10),preferred_time:'14:00–17:00',consent:true})});
const receipt = await response.json();
assert.equal(response.status,201,JSON.stringify(receipt));
assert.equal(receipt.status,'new');
const {data,error} = await db.auth.signInWithPassword({email:credentials.email,password:credentials.password});
assert.equal(error,null,'Вход администратора');
const admin = await fetch(`${base}/api/admin/requests`,{headers:{Authorization:`Bearer ${data.session.access_token}`}});
assert.equal(admin.status,200);
const list = await admin.json();
assert.ok(list.requests.some(row=>row.id===receipt.id && row.status==='new'));
await db.auth.signOut();
console.log(JSON.stringify({passed:true,requestId:receipt.id,status:receipt.status,adminSeesRequest:true,anonymousAccessDenied:true}));
