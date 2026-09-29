"use client";
import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
import Link from "next/link";
export default function Receipt({ id }: { id: string }) {
  const state = useSyncExternalStore(
    subscribe,
    () => {
      try {
        const value = JSON.parse(
          sessionStorage.getItem(`tm-request:${id}`) ?? "null",
        );
        return value?.id === id && value?.status === "new"
          ? "found"
          : "missing";
      } catch {
        return "missing";
      }
    },
    () => "loading",
  );
  if (state === "loading") return <p role="status">Проверяем подтверждение…</p>;
  if (state === "missing")
    return (
      <div className="panel">
        <h1>Нет подтверждения заявки</h1>
        <p>
          Подтверждение доступно в том браузере, из которого отправляли форму.
          Новую заявку можно оформить ниже.
        </p>
        <Link href="/request" className="button">
          Перейти к форме
        </Link>
      </div>
    );
  return (
    <div className="success-layout">
      <div className="panel">
        <span className="success-check">✓</span>
        <p className="eyebrow">ЗАЯВКА СОХРАНЕНА</p>
        <h1>
          Принято.
          <br />
          Скоро свяжемся!
        </h1>
        <p className="lead">
          Менеджер уточнит детали поломки и подтвердит время визита.
        </p>
        <div className="notice">
          <strong>Номер заявки</strong>
          <code className="request-id">{id}</code>
          <span className="badge new">Новая</span>
        </div>
        <p>Ориентир для звонка — 15 минут в рабочее время, с 09:00 до 20:00.</p>
        <Link href="/" className="button">
          На главную →
        </Link>
      </div>
      <aside className="panel summary">
        <h2>Всегда на связи</h2>
        <p>Пока сообщим о визите по телефону.</p>
        <a className="text-link" href="https://t.me/ATPABKA">
          Написать в Telegram: @ATPABKA
        </a>
        <p className="muted">
          Автоматические уведомления появятся после подключения бота.
        </p>
      </aside>
    </div>
  );
}
