"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Service } from "@/lib/types";
import { bookingSchema, timeSlots, localDate } from "@/lib/validation";
import { browserDb } from "@/lib/supabase/browser";
export default function BookingForm({
  services,
  initialService,
}: {
  services: Service[];
  initialService?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [service, setService] = useState(
    services.find((s) => s.id === initialService)?.id ?? services[0]?.id ?? "",
  );
  const [slot, setSlot] = useState<string>(timeSlots[2]);
  const [completed, setCompleted] = useState(0);
  const selected = services.find((s) => s.id === service);
  function updateProgress(form: HTMLFormElement) {
    const d = new FormData(form);
    setCompleted(
      [
        "customer_name",
        "customer_phone",
        "address",
        "appliance_model",
        "issue_description",
        "preferred_date",
      ].filter((k) => String(d.get(k) ?? "").trim()).length,
    );
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError("");
    setFields({});
    const f = new FormData(e.currentTarget);
    const values = {
      ...Object.fromEntries(f),
      consent: f.get("consent") === "on",
    };
    const parsed = bookingSchema.safeParse(values);
    if (!parsed.success) {
      setFields(parsed.error.flatten().fieldErrors);
      setError("Проверьте отмеченные поля.");
      return;
    }
    setPending(true);
    try {
      const { data: sessionData } = (await browserDb()?.auth.getSession()) ?? {
        data: { session: null },
      };
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (sessionData.session?.access_token)
        headers.Authorization = `Bearer ${sessionData.session.access_token}`;
      const response = await fetch("/api/repair-requests", {
        method: "POST",
        headers,
        body: JSON.stringify(parsed.data),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Не удалось отправить заявку");
        setFields(result.fields ?? {});
        return;
      }
      sessionStorage.setItem(
        `tm-request:${result.id}`,
        JSON.stringify({ id: result.id, status: result.status }),
      );
      router.push(`/request/success?id=${encodeURIComponent(result.id)}`);
    } catch {
      setError(
        "Связь с сервером прервалась. Проверьте интернет и повторите отправку.",
      );
    } finally {
      setPending(false);
    }
  }
  function input(
    name: string,
    title: string,
    type = "text",
    placeholder = "",
    required = true,
  ) {
    return (
      <label>
        {title}
        <input
          name={name}
          type={type}
          placeholder={placeholder}
          required={required}
          maxLength={
            name === "address" ? 500 : name === "customer_phone" ? 30 : 120
          }
          min={type === "date" ? localDate() : undefined}
          autoComplete={
            name === "customer_name"
              ? "name"
              : name === "customer_phone"
                ? "tel"
                : name === "address"
                  ? "street-address"
                  : undefined
          }
          aria-invalid={!!fields[name]}
          aria-describedby={fields[name] ? `${name}-error` : undefined}
        />
        {fields[name] && (
          <small className="field-error" id={`${name}-error`}>
            {fields[name][0]}
          </small>
        )}
      </label>
    );
  }
  return (
    <form
      className="booking-layout"
      onSubmit={submit}
      onChange={(e) => updateProgress(e.currentTarget)}
    >
      <div className="panel">
        <div className="form-progress">
          <span>01 Контакты · 02 Техника · 03 Визит</span>
          <small>Заполнено {completed} из 6</small>
        </div>
        <progress value={completed} max={6} aria-label="Заполнение формы" />
        <fieldset disabled={pending}>
          <legend>Ваши контакты</legend>
          <div className="two-grid">
            {input("customer_name", "Имя *", "text", "Как к вам обращаться")}
            {input("customer_phone", "Телефон *", "tel", "+7 (900) 000-00-00")}
          </div>
          {input(
            "address",
            "Адрес выезда *",
            "text",
            "Населённый пункт, улица, дом, квартира",
          )}
        </fieldset>
        <fieldset disabled={pending}>
          <legend>Что будем ремонтировать</legend>
          <label>
            Услуга
            <select
              name="service_id"
              value={service}
              onChange={(e) => setService(e.target.value)}
              required
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Тип техники
            <select name="appliance_type">
              <option>Стиральная машина</option>
              <option>Посудомоечная машина</option>
              <option>Холодильник</option>
              <option>Духовой шкаф</option>
              <option>Другая техника</option>
            </select>
          </label>
          <div className="two-grid">
            {input(
              "appliance_brand",
              "Марка",
              "text",
              "Например, Samsung",
              false,
            )}
            {input(
              "appliance_model",
              "Модель *",
              "text",
              "Модель или «Не знаю»",
            )}
          </div>
          <label>
            Описание неисправности *
            <textarea
              name="issue_description"
              rows={4}
              minLength={10}
              maxLength={2000}
              required
              placeholder="Что происходит с техникой? Есть ли код ошибки?"
              aria-invalid={!!fields.issue_description}
            />
            {fields.issue_description && (
              <small className="field-error">
                {fields.issue_description[0]}
              </small>
            )}
          </label>
        </fieldset>
        <fieldset disabled={pending}>
          <legend>Когда вам удобно</legend>
          {input("preferred_date", "Желаемая дата *", "date")}
          <div className="time-slots" role="group" aria-label="Время визита">
            {timeSlots.map((t) => (
              <label key={t} className={slot === t ? "selected" : ""}>
                <input
                  type="radio"
                  name="preferred_time"
                  value={t}
                  checked={slot === t}
                  onChange={() => setSlot(t)}
                />
                {t}
              </label>
            ))}
          </div>
          <label className="consent">
            <input name="consent" type="checkbox" required />Я согласен на
            обработку указанных данных для оформления и выполнения заявки.
            Данные доступны сотрудникам сервиса.
          </label>
          {fields.consent && <p className="field-error">{fields.consent[0]}</p>}
        </fieldset>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <button className="button full" disabled={pending || !services.length}>
          {pending ? "Сохраняем заявку…" : "Отправить заявку →"}
        </button>
        <p className="meta">
          Дата и время предварительные — подтвердим по телефону.
        </p>
      </div>
      <aside className="panel summary">
        <p className="eyebrow">РЕЗЮМЕ ОБРАЩЕНИЯ</p>
        <h2>Ваша заявка</h2>
        <dl>
          <dt>Услуга</dt>
          <dd>{selected?.title ?? "Не выбрана"}</dd>
          <dt>Время</dt>
          <dd>{slot}</dd>
          <dt>Регион</dt>
          <dd>Коченёво и область</dd>
        </dl>
        <hr />
        <h3>Выезд от 700 ₽</h3>
        <p>Диагностика от 500 ₽</p>
        <p className="muted">
          Стоимость ремонта согласуем после диагностики. Запчасти оплачиваются
          отдельно.
        </p>
        <div className="summary-contact">
          Нужна помощь?<strong>+7 (383) 000-00-00</strong>
          <small>Демонстрационный номер</small>
        </div>
      </aside>
    </form>
  );
}
