"use client";

import { useEffect, useState } from "react";
import { browserDb } from "@/lib/supabase/browser";
import {
  money,
  statuses,
  type RepairRequest,
  type RepairStatus,
} from "@/lib/types";

const orderStatuses = {
  new: "Новый",
  confirmed: "Подтверждён",
  paid: "Оплачен",
  completed: "Получен",
  cancelled: "Отменён",
};
type Order = {
  id: string;
  customer_name: string;
  customer_phone: string;
  delivery_method: string;
  delivery_address: string | null;
  comment: string | null;
  total_amount: number;
  status: keyof typeof orderStatuses;
  order_items: {
    quantity: number;
    unit_price: number;
    parts: { title: string; article: string } | null;
  }[];
};

type Master = { id: string; full_name: string; phone: string | null };

export default function AdminDashboard() {
  const [token, setToken] = useState("");
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [masters, setMasters] = useState<Master[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [updated, setUpdated] = useState("");

  async function currentToken() {
    const { data } = await browserDb()!.auth.getSession();
    if (!data.session) throw Error("Сессия истекла. Войдите снова.");
    return data.session.access_token;
  }

  useEffect(() => {
    let active = true;
    const db = browserDb();
    if (!db) return;
    void db.auth
      .getSession()
      .then(async ({ data }) => {
        if (!data.session) return;
        try {
          await load(data.session.access_token);
          if (active) setToken(data.session.access_token);
        } catch (caught) {
          if (active)
            setError(
              caught instanceof Error ? caught.message : "Ошибка подключения",
            );
        }
      })
      .catch(() => {
        if (active) setError("Не удалось восстановить сессию");
      });
    const { data: listener } = db.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "TOKEN_REFRESHED") setToken(session?.access_token ?? "");
      if (event === "SIGNED_OUT") setToken("");
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function refresh() {
    setPending(true);
    setError("");
    try {
      await load(await currentToken());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка подключения");
    } finally {
      setPending(false);
    }
  }

  async function load(accessToken: string) {
    const response = await fetch("/api/admin/requests", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok) throw Error(result.error ?? "Не удалось получить заявки");
    setRequests(result.requests);
    setMasters(result.masters);
    setOrders(result.orders ?? []);
    setUpdated(new Date().toLocaleTimeString("ru"));
  }

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const db = browserDb();
      if (!db) throw Error("Supabase ещё не настроен");
      const { data, error: authError } = await db.auth.signInWithPassword({
        email: String(values.get("email")),
        password: String(values.get("password")),
      });
      if (authError || !data.session)
        throw Error("Не удалось войти. Проверьте почту и пароль.");
      await load(data.session.access_token);
      setToken(data.session.access_token);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка подключения");
    } finally {
      setPending(false);
    }
  }

  async function save(request: RepairRequest, form: HTMLFormElement) {
    const data = new FormData(form);
    const master = String(data.get("master_id") ?? "");
    const status = String(data.get("status")) as RepairStatus;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/admin/requests", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${await currentToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: request.id,
          master_id: master || null,
          status,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(result.error ?? "Не удалось сохранить заявку");
      setRequests((current) =>
        current.map((item) =>
          item.id === request.id ? { ...item, ...result.request } : item,
        ),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка подключения");
    } finally {
      setPending(false);
    }
  }

  async function saveOrder(order: Order) {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/admin/requests", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${await currentToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kind: "order",
          id: order.id,
          status: order.status,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(result.error ?? "Не удалось сохранить заказ");
      await load(await currentToken());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка подключения");
    } finally {
      setPending(false);
    }
  }

  const visible = requests.filter(
    (request) => !filter || request.status === filter,
  );
  if (!token)
    return (
      <div className="auth-grid">
        <div>
          <p className="eyebrow">СЛУЖЕБНЫЙ ДОСТУП</p>
          <h1>Кабинет администратора</h1>
          <p className="lead">
            Заявки клиентов, назначение мастеров и контроль текущих работ.
          </p>
        </div>
        <form className="panel" onSubmit={login}>
          <h2>Вход администратора</h2>
          <label>
            Электронная почта
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label>
            Пароль
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <button className="button full" disabled={pending}>
            {pending ? "Проверяем доступ…" : "Войти"}
          </button>
        </form>
      </div>
    );

  return (
    <>
      <div className="section-heading">
        <div>
          <p className="eyebrow">ПАНЕЛЬ АДМИНИСТРАТОРА</p>
          <h1>Заявки сервиса</h1>
          <p className="muted">Последние 100 обращений. Обновлено {updated}</p>
        </div>
        <div className="actions">
          <button
            className="button secondary"
            onClick={() => void refresh()}
            disabled={pending}
          >
            Обновить
          </button>
          <button
            className="text-link"
            onClick={async () => {
              await browserDb()?.auth.signOut();
              setToken("");
              setRequests([]);
            }}
          >
            Выйти
          </button>
        </div>
      </div>
      <div className="three-grid metrics">
        <div className="panel">
          <strong>{requests.length}</strong>
          <span>Обращений в списке</span>
        </div>
        <div className="panel">
          <strong>
            {requests.filter((request) => request.status === "new").length}
          </strong>
          <span>Новых заявок</span>
        </div>
        <div className="panel">
          <strong>
            {
              requests.filter(
                (request) =>
                  !request.master_id &&
                  !["completed", "cancelled"].includes(request.status),
              ).length
            }
          </strong>
          <span>Без назначенного мастера</span>
        </div>
      </div>
      <label className="filter-label">
        Статус
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="">Все статусы</option>
          {Object.entries(statuses).map(([value, title]) => (
            <option key={value} value={value}>
              {title}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <div className="table-wrap">
        <table>
          <caption>Заявки на ремонт</caption>
          <thead>
            <tr>
              <th>Заявка / техника</th>
              <th>Клиент / адрес</th>
              <th>Визит</th>
              <th>Назначение и статус</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((request) => (
              <tr key={request.id}>
                <td>
                  <code title={request.id}>{request.id.slice(0, 8)}</code>
                  <strong>{request.appliance_type}</strong>
                  <span>
                    {request.appliance_brand} {request.appliance_model}
                  </span>
                  <p>{request.issue_description}</p>
                </td>
                <td>
                  <strong>{request.customer_name}</strong>
                  <span>{request.customer_phone}</span>
                  <p>{request.address}</p>
                </td>
                <td>
                  {request.preferred_date}
                  <br />
                  {request.preferred_time}
                </td>
                <td>
                  <form
                    className="request-controls"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void save(request, event.currentTarget);
                    }}
                  >
                    <select
                      name="master_id"
                      value={request.master_id ?? ""}
                      aria-label="Назначенный мастер"
                      onChange={(event) =>
                        setRequests((items) =>
                          items.map((item) =>
                            item.id === request.id
                              ? {
                                  ...item,
                                  master_id: event.target.value || null,
                                }
                              : item,
                          ),
                        )
                      }
                    >
                      <option value="">Не назначен</option>
                      {masters.map((master) => (
                        <option value={master.id} key={master.id}>
                          {master.full_name}
                        </option>
                      ))}
                    </select>
                    <select
                      name="status"
                      value={request.status}
                      aria-label="Статус заявки"
                      onChange={(event) =>
                        setRequests((items) =>
                          items.map((item) =>
                            item.id === request.id
                              ? {
                                  ...item,
                                  status: event.target.value as RepairStatus,
                                }
                              : item,
                          ),
                        )
                      }
                    >
                      {Object.entries(statuses).map(([value, title]) => (
                        <option key={value} value={value}>
                          {title}
                        </option>
                      ))}
                    </select>
                    <button className="button secondary" disabled={pending}>
                      Сохранить
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && (
          <p className="empty">Заявок с таким статусом пока нет.</p>
        )}
      </div>
      <section className="section">
        <h2>Заказы запчастей</h2>
        <p className="muted">
          Последние 100 заказов. При отмене резерв остается до проверки деталей
          сотрудником.
        </p>
        {!orders.length && <p>Заказов пока нет.</p>}
        {orders.map((order) => (
          <article className="panel" key={order.id}>
            <h3>Заказ {order.id.slice(0, 8)}</h3>
            <p>
              {order.customer_name}, {order.customer_phone}
            </p>
            <p>
              {order.delivery_method === "pickup"
                ? "Самовывоз из Коченёво"
                : `Доставка: ${order.delivery_address}`}
            </p>
            {order.comment && <p>{order.comment}</p>}
            <ul>
              {order.order_items.map((item, index) => (
                <li key={index}>
                  {item.parts?.title ?? "Запчасть"} ({item.parts?.article}) —{" "}
                  {item.quantity} шт., {money(item.unit_price)}
                </li>
              ))}
            </ul>
            <strong>Итого {money(order.total_amount)}</strong>
            <form
              className="request-controls"
              onSubmit={(event) => {
                event.preventDefault();
                void saveOrder(order);
              }}
            >
              <label>
                Статус заказа
                <select
                  value={order.status}
                  disabled={pending}
                  onChange={(event) =>
                    setOrders((items) =>
                      items.map((item) =>
                        item.id === order.id
                          ? {
                              ...item,
                              status: event.target.value as Order["status"],
                            }
                          : item,
                      ),
                    )
                  }
                >
                  {Object.entries(orderStatuses).map(([value, title]) => (
                    <option key={value} value={value}>
                      {title}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button secondary" disabled={pending}>
                Сохранить заказ
              </button>
            </form>
          </article>
        ))}
      </section>
    </>
  );
}
