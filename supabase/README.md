# База данных ТехноМастер

Проект: `technomaster`, организация `TechnoMaster`, регион `eu-central-1` (Frankfurt).
Project ref: `vgviitbgxstdjrdpijlr`.
Dashboard: https://supabase.com/dashboard/project/vgviitbgxstdjrdpijlr

Обе миграции из папки `migrations` уже применены к этому проекту. Первая создаёт таблицы и учебные данные, вторая добавляет регистрацию клиентов и доступ к личному кабинету.

## Как применить миграцию в новом проекте через SQL Editor

1. Создайте отдельный учебный проект в Supabase Dashboard. Сохраните пароль базы вне Git.
2. Откройте SQL Editor → New query.
3. Выполните файлы из `supabase/migrations` по порядку их имён.
4. Каждый скрипт работает в одной транзакции и не удаляет существующие таблицы.
5. В Table Editor проверьте `users`, `appliances`, `services`, `repair_requests`, `parts`, `orders`, `order_items`.
6. Выполните проверочные запросы из `verify.sql`. Ожидаются 4 услуги, 10 деталей, 3 начальные заявки; после тестирования заявок будет больше.

В миграции есть схема, индексы, CHECK/FK/UNIQUE, обновление `updated_at`, RLS и учебные данные. Все имена и контакты клиентов в seed вымышлены. Цены и совместимость приведены для учебного показа, не являются проверенным каталогом поставщика.

## Подключение приложения

Скопируйте `.env.example` в `.env.local` (если файл ещё не существует) и заполните:

| Переменная | Где взять |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Connect → Project URL либо Settings → Data API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings → API Keys → Publishable key или Legacy API Keys → anon. Название переменной сохранено по заданию, современный publishable key также поддерживается. |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API Keys → Legacy API Keys → service_role. Только сервер; не передавать в чат и не добавлять NEXT_PUBLIC_. |

После изменения окружения перезапустите Next.js. `.env.local` исключён из Git. Шаблон `.env.example` содержит только три пустые строки, без реальных ключей.

## Учебные входы

Записи `public.users` сами по себе не создают вход в Supabase Auth.

Для нового учебного проекта выполните один раз:

```powershell
node --env-file=.env.local scripts/setup-admin.mjs
node --env-file=.env.local scripts/setup-client.mjs
```

Первый скрипт связывает служебный вход с профилем Ушакова Юрия Сергеевича. Второй связывает клиентский вход с учебной заявкой. Пароли генерируются случайно и сохраняются только в локальных файлах, исключённых из Git.

Альтернатива: создайте пользователя через Authentication → Users → Add user, выберите свой адрес и пароль. В Table Editor откройте `public.users`, строку Ушакова, и заполните `auth_user_id` UUID созданного Auth-пользователя. Пароль не хранится в `public.users`. Не выдавайте право редактирования role из клиентского приложения.

## Доступ и ограничения MVP

Анонимное чтение — только активные `services` и `parts`. Все таблицы защищены RLS. Клиент читает только свой профиль, технику, заявки и заказы. Серверный `/api/repair-requests` проверяет данные и связывает заявку с клиентом, если тот вошёл. `/api/account` проверяет JWT и роль client, `/api/admin/requests` — роль admin.

Перед публичным запуском нужны ограничение частоты запросов, утверждённые условия обработки данных и политика хранения. Корзина, оплата, чеки и Telegram пока не реализованы.

Документация: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Защита данных](https://supabase.com/docs/guides/database/secure-data).
