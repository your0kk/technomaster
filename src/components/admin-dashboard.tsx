"use client";
import { useState } from "react";
import { browserDb } from "@/lib/supabase/browser";
import { statuses, type RepairRequest } from "@/lib/types";
export default function Admin() {
  const [token, setToken] = useState("");
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [updated, setUpdated] = useState("");
  async function load(accessToken: string) {
    const response = await fetch("/api/admin/requests", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok) throw Error(result.error ?? "Не удалось получить заявки");
    setRequests(result.requests);
    setUpdated(new Date().toLocaleTimeString("ru"));
  }
  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setError("");
    try {
      const db = browserDb();
      if (!db)
        throw Error(
          "Сначала подключите Supabase и создайте учётную запись администратора по инструкции supabase/README.md.",
        );
      const { data: auth, error } = await db.auth.signInWithPassword({
        email: String(data.get("email")),
        password: String(data.get("password")),
      });
      if (error || !auth.session)
        throw Error("Не удалось войти. Проверьте почту и пароль.");
      await load(auth.session.access_token);
      setToken(auth.session.access_token);
      form.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка подключения");
    } finally {
      setPending(false);
    }
  }
  async function refresh() {
    setPending(true);
    setError("");
    try {
      await load(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка подключения");
    } finally {
      setPending(false);
    }
  }
  const visible = requests.filter((r) => !filter || r.status === filter);
  return (
    <>
      {!token ? (
        <div className="auth-grid">
          <div>
            <p className="eyebrow">СЛУЖЕБНЫЙ ДОСТУП</p>
            <h1>
              Рабочий день
              <br />
              под контролем.
            </h1>
            <p className="lead">
              Заявки клиентов, время выезда и текущий статус ремонта — в одном
              списке.
            </p>
            <p className="notice">
              Вход через Supabase Auth. Доступ к списку есть только у
              пользователя с ролью admin.
            </p>
          </div>
          <form className="panel" onSubmit={login}>
            <h2>Вход администратора</h2>
            <label>
              Электронная почта
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
              />
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
              {pending ? "Проверяем доступ…" : "Войти →"}
            </button>
          </form>
        </div>
      ) : (
        <>
          <div className="section-heading">
            <div>
              <p className="eyebrow">ПАНЕЛЬ АДМИНИСТРАТОРА</p>
              <h1>Заявки сервиса</h1>
              <p className="muted">
                Последние 100 обращений · обновлено {updated}
              </p>
            </div>
            <div className="actions">
              <button
                className="button secondary"
                onClick={refresh}
                disabled={pending}
              >
                {pending ? "Загружаем…" : "Обновить"}
              </button>
              <button
                className="text-link"
                onClick={() => {
                  setToken("");
                  setRequests([]);
                  setError("");
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
                {requests.filter((r) => r.status === "new").length}
              </strong>
              <span>Новых заявок</span>
            </div>
            <div className="panel">
              <strong>
                {
                  requests.filter(
                    (r) =>
                      !r.master_id &&
                      !["completed", "cancelled"].includes(r.status),
                  ).length
                }
              </strong>
              <span>Без назначенного мастера</span>
            </div>
          </div>
          <label className="filter-label">
            Статус
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
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
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <code title={r.id}>{r.id.slice(0, 8)}</code>
                      <strong>{r.appliance_type}</strong>
                      <span>
                        {r.appliance_brand} {r.appliance_model}
                      </span>
                      <p>{r.issue_description}</p>
                    </td>
                    <td>
                      <strong>{r.customer_name}</strong>
                      <span>{r.customer_phone}</span>
                      <p>{r.address}</p>
                    </td>
                    <td>
                      {r.preferred_date}
                      <br />
                      {r.preferred_time}
                    </td>
                    <td>
                      <span className={`badge ${r.status}`}>
                        {statuses[r.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visible.length && (
              <p className="empty">Заявок с таким статусом пока нет.</p>
            )}
          </div>
          <p className="meta">
            В этом этапе доступен просмотр. Назначение мастера и смена статусов
            — следующий этап.
          </p>
        </>
      )}
    </>
  );
}
