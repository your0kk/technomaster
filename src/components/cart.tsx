"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { Part } from "@/lib/types";
import { money } from "@/lib/types";
import { browserDb } from "@/lib/supabase/browser";

const storageKey = "technomaster-cart";
const changedEvent = "technomaster-cart-changed";

export type CartItem = Pick<
  Part,
  "id" | "title" | "article" | "price" | "stock_quantity"
> & { quantity: number };

const emptyCart: CartItem[] = [];
let cachedCart: CartItem[] = emptyCart;
let cachedValue: string | null = null;

function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const rawValue = localStorage.getItem(storageKey) ?? "[]";
    if (rawValue === cachedValue) return cachedCart;
    const value: unknown = JSON.parse(rawValue);
    if (!Array.isArray(value)) return [];
    cachedCart = value.filter(
      (item): item is CartItem =>
        typeof item === "object" &&
        item !== null &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.article === "string" &&
        typeof item.price === "number" &&
        typeof item.stock_quantity === "number" &&
        typeof item.quantity === "number" &&
        item.quantity > 0,
    );
    cachedValue = rawValue;
    return cachedCart;
  } catch {
    cachedCart = emptyCart;
    cachedValue = null;
    return [];
  }
}

function writeCart(items: CartItem[]) {
  const rawValue = JSON.stringify(items);
  cachedCart = items;
  cachedValue = rawValue;
  localStorage.setItem(storageKey, rawValue);
  window.dispatchEvent(new Event(changedEvent));
}

function subscribeToCart(callback: () => void) {
  window.addEventListener(changedEvent, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(changedEvent, callback);
    window.removeEventListener("storage", callback);
  };
}

function useCart() {
  return useSyncExternalStore(subscribeToCart, readCart, () => emptyCart);
}

export function CartLink() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const refresh = () =>
      setCount(readCart().reduce((sum, item) => sum + item.quantity, 0));
    refresh();
    window.addEventListener(changedEvent, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(changedEvent, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return <Link href="/cart">Корзина{count ? ` (${count})` : ""}</Link>;
}

export function AddToCart({ part }: { part: Part }) {
  const [added, setAdded] = useState(false);
  function add() {
    const items = readCart();
    const existing = items.find((item) => item.id === part.id);
    if (existing)
      existing.quantity = Math.min(existing.quantity + 1, part.stock_quantity);
    else
      items.push({
        id: part.id,
        title: part.title,
        article: part.article,
        price: part.price,
        stock_quantity: part.stock_quantity,
        quantity: 1,
      });
    writeCart(items);
    setAdded(true);
  }
  return (
    <button
      className="button full"
      type="button"
      onClick={add}
      disabled={part.stock_quantity < 1}
    >
      {part.stock_quantity < 1
        ? "Нет в наличии"
        : added
          ? "Добавлено в корзину"
          : "Добавить в корзину"}
    </button>
  );
}

export function CartContents() {
  const items = useCart();
  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );
  function update(id: string, quantity: number) {
    const next = items
      .map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: Math.min(Math.max(quantity, 0), item.stock_quantity),
            }
          : item,
      )
      .filter((item) => item.quantity > 0);
    writeCart(next);
  }
  if (!items.length)
    return (
      <div className="panel empty">
        <h1>Корзина пока пуста</h1>
        <p>Выберите запчасти в каталоге, и они появятся здесь.</p>
        <Link className="button" href="/parts">
          Перейти в каталог
        </Link>
      </div>
    );
  return (
    <div className="cart-layout">
      <section className="panel cart-items">
        <h1>Корзина</h1>
        {items.map((item) => (
          <article className="cart-row" key={item.id}>
            <div>
              <span className="meta">{item.article}</span>
              <h2>{item.title}</h2>
              <strong>{money(item.price)}</strong>
            </div>
            <div className="quantity" aria-label={`Количество: ${item.title}`}>
              <button
                type="button"
                onClick={() => update(item.id, item.quantity - 1)}
                aria-label="Уменьшить"
              >
                −
              </button>
              <span>{item.quantity}</span>
              <button
                type="button"
                onClick={() => update(item.id, item.quantity + 1)}
                disabled={item.quantity >= item.stock_quantity}
                aria-label="Увеличить"
              >
                +
              </button>
            </div>
            <strong>{money(item.price * item.quantity)}</strong>
            <button
              className="text-link"
              type="button"
              onClick={() => update(item.id, 0)}
            >
              Убрать
            </button>
          </article>
        ))}
      </section>
      <aside className="panel cart-summary">
        <p className="eyebrow">ИТОГО</p>
        <strong className="big-price">{money(total)}</strong>
        <p className="muted">Способ получения выберете на следующем шаге.</p>
        <Link className="button full" href="/checkout">
          Оформить заказ
        </Link>
        <p className="notice">
          Онлайн-оплата и кассовый чек будут доступны после подтверждения
          менеджером.
        </p>
      </aside>
    </div>
  );
}

export function CheckoutForm() {
  const router = useRouter();
  const items = useCart();
  const [method, setMethod] = useState<"pickup" | "delivery">("pickup");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!items.length || pending) return;
    setPending(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const session = await browserDb()?.auth.getSession();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (session?.data.session?.access_token)
      headers.Authorization = `Bearer ${session.data.session.access_token}`;
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...values,
          delivery_method: method,
          items: items.map(({ id, quantity }) => ({ part_id: id, quantity })),
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(result.error ?? "Не удалось оформить заказ");
      writeCart([]);
      router.push(`/checkout/success?id=${encodeURIComponent(result.id)}`);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Не удалось оформить заказ",
      );
    } finally {
      setPending(false);
    }
  }

  if (!items.length)
    return (
      <div className="panel empty">
        <h1>Нечего оформлять</h1>
        <Link className="button" href="/parts">
          В каталог
        </Link>
      </div>
    );
  return (
    <div className="checkout-layout">
      <form className="panel" onSubmit={submit}>
        <p className="eyebrow">ОФОРМЛЕНИЕ ЗАКАЗА</p>
        <h1>Контакты и получение</h1>
        <div className="two-grid">
          <label>
            Имя
            <input name="customer_name" required autoComplete="name" />
          </label>
          <label>
            Телефон
            <input
              name="customer_phone"
              type="tel"
              required
              autoComplete="tel"
              placeholder="+7 (900) 000-00-00"
            />
          </label>
        </div>
        <fieldset disabled={pending}>
          <legend>Способ получения</legend>
          <label className="choice">
            <input
              type="radio"
              checked={method === "pickup"}
              onChange={() => setMethod("pickup")}
            />
            Самовывоз из Коченёво
          </label>
          <label className="choice">
            <input
              type="radio"
              checked={method === "delivery"}
              onChange={() => setMethod("delivery")}
            />
            Доставка
          </label>
        </fieldset>
        {method === "delivery" && (
          <label>
            Адрес доставки
            <input
              name="delivery_address"
              required
              placeholder="Населённый пункт, улица, дом"
            />
          </label>
        )}
        <label>
          Комментарий
          <textarea
            name="comment"
            rows={4}
            maxLength={1000}
            placeholder="Например, позвонить перед доставкой"
          />
        </label>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <button className="button full" disabled={pending}>
          {pending ? "Оформляем…" : "Подтвердить заказ"}
        </button>
      </form>
      <aside className="panel summary">
        <h2>Ваш заказ</h2>
        {items.map((item) => (
          <p key={item.id}>
            {item.title} × {item.quantity}
          </p>
        ))}
        <hr />
        <strong className="big-price">{money(total)}</strong>
        <p className="notice">
          Менеджер подтвердит наличие, способ оплаты и выдаст кассовый чек.
        </p>
      </aside>
    </div>
  );
}
