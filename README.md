# ТехноМастер

Учебный сайт сервиса ремонта бытовой техники в Коченёво и Новосибирской области.

Работают вызов мастера, каталог, корзина и оформление заказа, регистрация, личный кабинет клиента, кабинеты администратора и мастера. Данные хранятся в Supabase.

## Запуск

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

В `.env.local` нужны `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` и `SUPABASE_SERVICE_ROLE_KEY`. Миграции из `supabase/migrations` применяются по порядку.

Учебные входы создают локально:

```powershell
node --env-file=.env.local scripts/setup-admin.mjs
node --env-file=.env.local scripts/setup-client.mjs
node --env-file=.env.local scripts/setup-master.mjs
```

Пароли сохраняются в локальных файлах и не попадают в Git.

Сайт откроется по адресу http://127.0.0.1:3000.

Проверка проекта:

```powershell
npm run lint
npm test
npm run build
```

[Отчёт по проекту](output/technomaster-report.pdf)
