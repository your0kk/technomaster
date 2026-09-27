"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { browserDb } from "@/lib/supabase/browser";
import { money, statuses, type RepairStatus } from "@/lib/types";

type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  role: "client";
};
type ClientRequest = {
  id: string;
  appliance_type: string;
  appliance_brand: string;
  appliance_model: string;
  issue_description: string;
  preferred_date: string;
  preferred_time: string;
  status: RepairStatus;
  created_at: string;
};
type ClientOrder = {
  id: string;
  status: "new" | "confirmed" | "paid" | "completed" | "cancelled";
  total_amount: number;
  delivery_method: "pickup" | "delivery";
  created_at: string;
};
type AccountData = {
  profile: Profile;
  requests: ClientRequest[];
  orders: ClientOrder[];
};

const orderStatuses: Record<ClientOrder["status"], string> = {
  new: "Новый",
  confirmed: "Подтверждён",
  paid: "Оплачен",
  completed: "Получен",
  cancelled: "Отменён",
};

export default function AccountDashboard() {
  const router = useRouter();
  const [data, setData] = useState<AccountData | null>(null);
  const [pending, setPending] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  async function accessToken() {
    const db = browserDb();
    const { data: sessionData } = (await db?.auth.getSession()) ?? { data: { session: null } };
    return sessionData.session?.access_token ?? null;
  }

  useEffect(() => {
    let cancelled = false;
    async function openAccount() {
      const db = browserDb();
      const { data: sessionData } = (await db?.auth.getSession()) ?? {
        data: { session: null },
      };
      const token = sessionData.session?.access_token ?? null;
      if (!token) {
        router.replace("/login");
        return;
      }
      try {
        const response = await fetch("/api/account", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok) throw Error(result.error ?? "Не удалось открыть кабинет");
        if (!cancelled) setData(result);
      } catch (caught) {
        if (!cancelled)
          setError(caught instanceof Error ? caught.message : "Ошибка подключения");
      } finally {
        if (!cancelled) setPending(false);
      }
    }
    void openAccount();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data || saving) return;
    const token = await accessToken();
    if (!token) return router.replace("/login");
    setSaving(true);
    setError("");
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error ?? "Не удалось сохранить профиль");
      setData({ ...data, profile: result.profile });
      setEditing(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка подключения");
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await browserDb()?.auth.signOut();
    router.replace("/login");
  }

  if (pending) return <div className="panel account-loading">Загружаем личный кабинет…</div>;
  if (!data)
    return (
      <div className="panel empty">
        <h1>Личный кабинет</h1>
        <p>{error || "Не удалось загрузить данные."}</p>
        <Link className="button" href="/login">Вернуться ко входу</Link>
      </div>
    );

  return (
    <>
      <div className="account-heading">
        <div>
          <p className="eyebrow">ЛИЧНЫЙ КАБИНЕТ</p>
          <h1>Здравствуйте, {data.profile.full_name.split(" ")[0]}</h1>
          <p className="muted">Здесь хранятся ваши заявки и заказы.</p>
        </div>
        <div className="actions">
          <Link className="button" href="/request">Новая заявка</Link>
          <button className="text-link" onClick={logout}>Выйти</button>
        </div>
      </div>

      {error && <p className="notice error" role="alert">{error}</p>}

      <div className="account-grid">
        <div className="account-main">
          <section className="panel account-section">
            <div className="section-heading compact">
              <div>
                <h2>Заявки на ремонт</h2>
                <p className="muted">{data.requests.length} всего</p>
              </div>
            </div>
            {data.requests.length ? (
              <div className="request-list">
                {data.requests.map((request) => (
                  <article className="request-row" key={request.id}>
                    <div>
                      <span className="meta">Заявка {request.id.slice(0, 8)}</span>
                      <h3>
                        {request.appliance_type}
                        {request.appliance_brand && ` · ${request.appliance_brand}`}
                      </h3>
                      <p>{request.issue_description}</p>
                    </div>
                    <div className="request-visit">
                      <span className={`badge ${request.status}`}>{statuses[request.status]}</span>
                      <strong>{new Date(`${request.preferred_date}T00:00:00`).toLocaleDateString("ru-RU")}</strong>
                      <span>{request.preferred_time}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty account-empty">
                <p>У вас пока нет заявок.</p>
                <Link className="text-link" href="/request">Вызвать мастера</Link>
              </div>
            )}
          </section>

          <section className="panel account-section">
            <div className="section-heading compact">
              <div>
                <h2>Заказы запчастей</h2>
                <p className="muted">{data.orders.length} всего</p>
              </div>
              <Link className="text-link" href="/parts">Каталог</Link>
            </div>
            {data.orders.length ? (
              <div className="request-list">
                {data.orders.map((order) => (
                  <article className="request-row" key={order.id}>
                    <div>
                      <span className="meta">Заказ {order.id.slice(0, 8)}</span>
                      <h3>{money(order.total_amount)}</h3>
                      <p>{order.delivery_method === "pickup" ? "Самовывоз из Коченёво" : "Доставка"}</p>
                    </div>
                    <span className={`badge ${order.status}`}>{orderStatuses[order.status]}</span>
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted">Заказов пока нет.</p>
            )}
          </section>
        </div>

        <aside className="account-side">
          <section className="panel account-section">
            <div className="section-heading compact">
              <h2>Профиль</h2>
              {!editing && <button className="text-link" onClick={() => setEditing(true)}>Изменить</button>}
            </div>
            {editing ? (
              <form onSubmit={saveProfile}>
                <label>
                  Имя
                  <input name="full_name" defaultValue={data.profile.full_name} required />
                </label>
                <label>
                  Телефон
                  <input name="phone" type="tel" defaultValue={data.profile.phone ?? ""} required />
                </label>
                <button className="button full" disabled={saving}>{saving ? "Сохраняем…" : "Сохранить"}</button>
                <button type="button" className="text-link account-cancel" onClick={() => setEditing(false)}>Отмена</button>
              </form>
            ) : (
              <dl className="profile-details">
                <dt>Имя</dt><dd>{data.profile.full_name}</dd>
                <dt>Телефон</dt><dd>{data.profile.phone || "Не указан"}</dd>
                <dt>Почта</dt><dd>{data.profile.email}</dd>
              </dl>
            )}
          </section>
          <section className="panel account-section contact-card">
            <h2>Связь с сервисом</h2>
            <a href="tel:+73830000000" className="contact-phone">+7 (383) 000-00-00</a>
            <p className="meta">Демонстрационный номер</p>
            <hr />
            <p className="muted">
              Уведомления и переписку в Telegram подключим отдельным этапом.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
