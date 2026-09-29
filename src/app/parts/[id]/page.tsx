import { notFound } from "next/navigation";
import Link from "next/link";
import { catalogData } from "@/lib/catalog";
import { DataNotice, PartPhoto } from "@/components/ui";
import { money } from "@/lib/types";
import { AddToCart } from "@/components/cart";
export const dynamic = "force-dynamic";
export default async function Part({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await catalogData();
  const p = data.parts.find((p) => p.id === id);
  if (data.error)
    return (
      <div className="container section">
        <DataNotice {...data} />
      </div>
    );
  if (!p) notFound();
  return (
    <div className="container section">
      <p className="breadcrumb">
        <Link href="/parts">Каталог</Link> / {p.category}
      </p>
      <DataNotice {...data} />
      <div className="product-layout">
        <div className="panel">
          <PartPhoto part={p} large />
          <p className="meta">
            Фотография иллюстрирует тип детали. Исполнение уточним по модели.
          </p>
        </div>
        <div>
          <p className="eyebrow">
            {p.brand} / {p.article}
          </p>
          <h1>{p.title}</h1>
          <p className="stock">
            {p.stock_quantity > 0
              ? `В наличии · ${p.stock_quantity} шт.`
              : "Под заказ"}
          </p>
          <p className="big-price">{money(p.price)}</p>
          <h3>Совместимые модели</h3>
          <ul className="model-list">
            {p.compatible_models.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          <p className="muted">Совместимость проверим по модели техники перед выдачей.</p>
          <AddToCart part={p} />
          <Link className="button full" href="/request">
            Нужна помощь с подбором ↗
          </Link>
          <div className="notice">Онлайн-оплата и кассовый чек будут доступны после подтверждения менеджером.</div>
        </div>
      </div>
    </div>
  );
}
