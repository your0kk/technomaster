import Link from "next/link";
import Image from "next/image";
import type { Part } from "@/lib/types";
import { money } from "@/lib/types";
export function Logo() {
  return (
    <Link className="logo" href="/" aria-label="ТехноМастер — главная">
      <svg
        width="35"
        height="38"
        viewBox="0 0 35 38"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="2"
          y="2"
          width="31"
          height="34"
          rx="5"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path d="M7 8h5m10 0h5" stroke="currentColor" strokeWidth="2" />
        <circle cx="17.5" cy="23" r="9" stroke="currentColor" strokeWidth="2" />
        <path d="M10 22c5-5 10 7 15 1" stroke="currentColor" strokeWidth="2" />
      </svg>
      <span>ТехноМастер</span>
    </Link>
  );
}
export function Intro({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="intro">
      <p className="eyebrow">{label}</p>
      <h1>{title}</h1>
      <div className="lead">{children}</div>
    </div>
  );
}
export function DataNotice({ demo, error }: { demo: boolean; error: boolean }) {
  return error ? (
    <p className="notice error" role="alert">
      Не удалось загрузить данные Supabase. Проверьте настройки и применённую
      миграцию.
    </p>
  ) : demo ? (
    <p className="notice">
      Учебный просмотр · каталог содержит примеры. Для сохранения заявок
      подключите Supabase.
    </p>
  ) : null;
}
export function PartPhoto({
  part,
  large = false,
}: {
  part: Part;
  large?: boolean;
}) {
  const safe = part.image_url?.startsWith("/images/") ? part.image_url : null;
  return (
    <div className={large ? "part-photo large" : "part-photo"}>
      {safe ? (
        <Image
          src={safe}
          alt={part.title}
          width={large ? 560 : 300}
          height={large ? 420 : 200}
          unoptimized
        />
      ) : (
        <span className="placeholder">Фотография уточняется</span>
      )}
    </div>
  );
}
export function PartCard({ part }: { part: Part }) {
  return (
    <Link className="part-card" href={`/parts/${part.id}`}>
      <PartPhoto part={part} />
      <div className="part-body">
        <span className="meta">
          {part.category} · {part.article}
        </span>
        <h3>{part.title}</h3>
        <span className={part.stock_quantity > 0 ? "stock" : "muted"}>
          {part.stock_quantity > 0
            ? `В наличии · ${part.stock_quantity} шт.`
            : "Под заказ"}
        </span>
        <div className="price-row">
          <strong>{money(part.price)}</strong>
          <span aria-hidden="true">↗</span>
        </div>
      </div>
    </Link>
  );
}
