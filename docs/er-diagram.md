# Реляционная модель «ТехноМастер»

Семь прикладных таблиц находятся в схеме `public`. Обозначения: `PK` — первичный ключ, `FK` — внешний, `UK` — уникальное значение; `||` — ровно один, `o|` — ноль или один, `o{` — ноль или много, `|{` — один или много.

```mermaid
erDiagram
    users ||--o{ appliances : "клиент владеет"
    users o|--o{ repair_requests : "client_id"
    users o|--o{ repair_requests : "master_id"
    appliances o|--o{ repair_requests : "объект ремонта"
    services ||--o{ repair_requests : "выбранная услуга"
    users o|--o{ orders : "оформляет"
    orders ||--o{ order_items : "содержит"
    parts ||--o{ order_items : "заказывается"
    users {
        uuid id PK
        uuid auth_user_id FK,UK "nullable, auth.users.id"
        text full_name
        text phone "nullable"
        text email "nullable"
        user_role role "client | master | admin"
        bigint telegram_chat_id "nullable"
        timestamptz created_at
    }
    appliances {
        uuid id PK
        uuid client_id FK
        text appliance_type
        text brand
        text model
        timestamptz created_at
    }
    services {
        uuid id PK
        text title
        text description
        numeric price_from
        boolean is_active
        timestamptz created_at
    }
    repair_requests {
        uuid id PK
        uuid client_id FK "nullable"
        uuid appliance_id FK "nullable"
        uuid service_id FK
        uuid master_id FK "nullable"
        text customer_name
        text customer_phone
        text address
        text appliance_type "снимок техники гостя"
        text appliance_brand
        text appliance_model
        text issue_description
        date preferred_date
        text preferred_time
        repair_status status
        timestamptz created_at
        timestamptz updated_at
    }
    parts {
        uuid id PK
        text title
        text article UK
        text category
        text brand
        text_array compatible_models
        numeric price
        integer stock_quantity
        text image_url "nullable"
        boolean is_active
        timestamptz created_at
    }
    orders {
        uuid id PK
        uuid client_id FK "nullable"
        text customer_name
        text customer_phone
        delivery_method delivery_method "pickup | delivery"
        order_status status
        numeric total_amount
        timestamptz created_at
    }
    order_items {
        uuid id PK
        uuid order_id FK "UK вместе с part_id"
        uuid part_id FK "UK вместе с order_id"
        integer quantity
        numeric price_at_order
    }
```

`auth.users` — служебная таблица Supabase Auth, не восьмая прикладная сущность. Необязательный `users.auth_user_id` связывает профиль сотрудника с его входом. Учебные профили можно создать до учётных записей Auth. FK с UNIQUE означает связь 0..1 профиля с одной учётной записью.

Гость создаёт заявку без регистрации (`client_id` и `appliance_id` равны NULL). Чтобы не потерять тип, марку и модель, заявка хранит снимок этих полей. После регистрации `appliances` может использоваться как справочник техники клиента. FK не заменяет проверку ролей: триггер заявки проверяет, что `master_id` относится к мастеру, `client_id` — к клиенту, а техника принадлежит указанному клиенту.

Допустимые статусы ремонта: `new`, `confirmed`, `assigned`, `in_progress`, `waiting_part`, `completed`, `cancelled`. У заказа: `new`, `confirmed`, `paid`, `completed`, `cancelled`. В назначенных, выполняемых и завершённых заявках мастер обязателен.

Цены, сумма заказа и остатки неотрицательны; количество позиции строго положительно. `article` уникален. Одна деталь встречается в одном заказе один раз. Заказ пока может не иметь позиций: оформление заказа и транзакционный расчёт суммы/списание остатков относятся к следующему этапу, API заказа в MVP отсутствует.

Индексы: статус заявки, дата создания, дата визита, FK, категория детали; UNIQUE автоматически индексирует артикул. `updated_at` меняется триггером при UPDATE заявки. Удаление справочных записей с зависимыми данными блокируется RESTRICT; позиции заказа удаляются вместе с заказом (CASCADE).

RLS: анонимно читаются только активные услуги и запчасти. Пользователь Auth может прочитать только свой профиль и не может изменить роль. Клиентские данные напрямую из браузера не доступны. Запись заявки идёт через сервер с service role; административный список требует валидный JWT и роль `admin`, проверенную на сервере.
