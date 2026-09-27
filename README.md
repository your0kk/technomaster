# ТехноМастер

Учебный сайт сервиса ремонта бытовой техники в Коченёво и Новосибирской области.

Работают каталог, вызов мастера, регистрация, личный кабинет клиента и кабинет администратора. Данные хранятся в Supabase.

## Запуск

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Переменные для `.env.local` и порядок применения миграций описаны в [supabase/README.md](supabase/README.md). Для учебных входов есть `scripts/setup-admin.mjs` и `scripts/setup-client.mjs`.

Сайт откроется по адресу http://127.0.0.1:3000.

Проверка проекта:

```powershell
npm run lint
npm test
npm run build
```

[Отчёт по проекту](output/technomaster-report.pdf)
