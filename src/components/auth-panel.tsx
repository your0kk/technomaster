"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { browserDb } from "@/lib/supabase/browser";
import { registrationSchema } from "@/lib/validation";

type Mode = "login" | "register";

export default function AuthPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setMessage("");
    setFields({});
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const db = browserDb();
    if (!db) {
      setError("Подключение к Supabase не настроено.");
      return;
    }

    setPending(true);
    setError("");
    setMessage("");
    setFields({});

    try {
      const form = new FormData(event.currentTarget);
      if (mode === "login") {
        const { error: authError } = await db.auth.signInWithPassword({
          email: String(form.get("email") ?? "").trim(),
          password: String(form.get("password") ?? ""),
        });
        if (authError) throw Error("Неверная почта или пароль.");
        router.replace("/account");
        return;
      }

      const parsed = registrationSchema.safeParse(Object.fromEntries(form));
      if (!parsed.success) {
        setFields(parsed.error.flatten().fieldErrors);
        setError("Проверьте поля формы.");
        return;
      }

      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = await response.json();
      if (!response.ok) {
        setFields(result.fields ?? {});
        throw Error(result.error ?? "Не удалось зарегистрироваться. Попробуйте ещё раз.");
      }
      const { error: signInError } = await db.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
      if (signInError) throw Error("Учётная запись создана, но войти не удалось. Повторите вход.");
      router.replace("/account");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка подключения");
    } finally {
      setPending(false);
    }
  }

  const fieldError = (name: string) =>
    fields[name] ? (
      <small className="field-error">{fields[name][0]}</small>
    ) : null;

  return (
    <div className="auth-grid">
      <div>
        <p className="eyebrow">ЛИЧНЫЙ КАБИНЕТ</p>
        <h1>Заявки и заказы в одном месте</h1>
        <p className="lead">
          После входа можно проверить статус ремонта и посмотреть прошлые
          обращения. Новая заявка, отправленная из кабинета, сразу привязывается
          к вашему профилю.
        </p>
        <ul className="plain-list">
          <li>статус и время визита мастера;</li>
          <li>история заявок и заказов;</li>
          <li>контактные данные без повторного ввода.</li>
        </ul>
      </div>
      <div className="panel auth-panel">
        <div className="auth-tabs" role="tablist" aria-label="Вход или регистрация">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => switchMode("login")}
          >
            Вход
          </button>
          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => switchMode("register")}
          >
            Регистрация
          </button>
        </div>
        <form onSubmit={submit}>
          <h2>{mode === "login" ? "Войти в кабинет" : "Создать аккаунт"}</h2>
          {mode === "register" && (
            <>
              <label>
                Имя
                <input name="full_name" autoComplete="name" required />
                {fieldError("full_name")}
              </label>
              <label>
                Телефон
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+7 900 000-00-00"
                  required
                />
                {fieldError("phone")}
              </label>
            </>
          )}
          <label>
            Электронная почта
            <input name="email" type="email" autoComplete="email" required />
            {fieldError("email")}
          </label>
          <label>
            Пароль
            <input
              name="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={8}
              required
            />
            {fieldError("password")}
          </label>
          {mode === "register" && (
            <label>
              Повторите пароль
              <input
                name="password_confirm"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
              {fieldError("password_confirm")}
            </label>
          )}
          {error && <p className="notice error" role="alert">{error}</p>}
          {message && <p className="notice" role="status">{message}</p>}
          <button className="button full" disabled={pending}>
            {pending
              ? "Подождите…"
              : mode === "login"
                ? "Войти"
                : "Зарегистрироваться"}
          </button>
          {mode === "register" && (
            <p className="meta auth-note">
              Регистрируясь, вы соглашаетесь на обработку данных, необходимых
              для работы сервиса.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
