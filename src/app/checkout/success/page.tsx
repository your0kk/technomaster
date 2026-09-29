import Link from "next/link";
export const metadata = { title: "Заказ принят" };
export default async function Success({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  return (
    <div className="container section">
      <div className="panel success-panel">
        <span className="success-check">✓</span>
        <p className="eyebrow">ЗАКАЗ ПРИНЯТ</p>
        <h1>Спасибо, заказ оформлен.</h1>
        <p>Менеджер проверит наличие деталей и свяжется с вами по телефону.</p>
        {id && (
          <p className="notice">
            Номер заказа: <code>{id.slice(0, 8)}</code>
          </p>
        )}
        <div className="actions">
          <Link className="button" href="/parts">
            В каталог
          </Link>
          <Link className="button secondary" href="/account">
            Личный кабинет
          </Link>
        </div>
      </div>
    </div>
  );
}
