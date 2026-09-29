"use client";

import { useState } from "react";
import { browserDb } from "@/lib/supabase/browser";
import { statuses, type RepairRequest, type RepairStatus } from "@/lib/types";

type MasterProfile = { full_name: string; phone: string | null };

export default function MasterDashboard() {
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<MasterProfile | null>(null);
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function load(accessToken: string) {
    const response = await fetch("/api/master/requests", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok)
      throw Error(result.error ?? "Не удалось загрузить выезды");
    setProfile(result.profile);
    setRequests(result.requests);
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
  async function update(request: RepairRequest, status: RepairStatus) {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/master/requests", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: request.id, status }),
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(result.error ?? "Не удалось изменить статус");
      setRequests((current) =>
        current.map((item) =>
          item.id === request.id
            ? { ...item, status: result.request.status }
            : item,
        ),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка подключения");
    } finally {
      setPending(false);
    }
  }
  if (!token)
    return (
      <div className="auth-grid">
        <div>
          <p className="eyebrow">СЛУЖЕБНЫЙ ДОСТУП</p>
          <h1>Кабинет мастера</h1>
          <p className="lead">
            Назначенные выезды, контакты клиента и изменение статуса ремонта.
          </p>
        </div>
        <form className="panel" onSubmit={login}>
          <h2>Вход мастера</h2>
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
          <p className="eyebrow">КАБИНЕТ МАСТЕРА</p>
          <h1>{profile?.full_name ?? "Мастер"}</h1>
          <p className="muted">Назначенные выезды и рабочие статусы.</p>
        </div>
        <div className="actions">
          <button
            className="button secondary"
            onClick={() => void load(token)}
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
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <div className="master-grid">
        {requests.map((request) => (
          <article className="panel master-card" key={request.id}>
            <div className="section-heading compact">
              <div>
                <span className={`badge ${request.status}`}>
                  {statuses[request.status]}
                </span>
                <h2>{request.appliance_type}</h2>
              </div>
              <span className="meta">{request.id.slice(0, 8)}</span>
            </div>
            <p>
              <strong>
                {request.appliance_brand} {request.appliance_model}
              </strong>
              <br />
              {request.issue_description}
            </p>
            <dl className="master-details">
              <dt>Клиент</dt>
              <dd>
                {request.customer_name},{" "}
                <a href={`tel:${request.customer_phone}`}>
                  {request.customer_phone}
                </a>
              </dd>
              <dt>Адрес</dt>
              <dd>{request.address}</dd>
              <dt>Выезд</dt>
              <dd>
                {request.preferred_date}, {request.preferred_time}
              </dd>
            </dl>
            <div className="master-actions">
              {request.status === "assigned" && (
                <button
                  className="button"
                  disabled={pending}
                  onClick={() => void update(request, "in_progress")}
                >
                  Начать работу
                </button>
              )}
              {["assigned", "in_progress", "waiting_part"].includes(
                request.status,
              ) && (
                <select
                  aria-label="Статус ремонта"
                  defaultValue={
                    request.status === "waiting_part"
                      ? "waiting_part"
                      : "in_progress"
                  }
                  disabled={pending}
                  onChange={(event) =>
                    void update(request, event.target.value as RepairStatus)
                  }
                >
                  <option value="in_progress">В работе</option>
                  <option value="waiting_part">Ожидает запчасть</option>
                  <option value="completed">Завершена</option>
                </select>
              )}
            </div>
          </article>
        ))}
      </div>
      {!requests.length && (
        <div className="panel empty">
          <h2>Нет назначенных заявок</h2>
          <p>Новые выезды появятся после назначения администратором.</p>
        </div>
      )}
    </>
  );
}
