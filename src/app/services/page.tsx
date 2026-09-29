import Link from "next/link";
import { Intro, DataNotice } from "@/components/ui";
import { catalogData } from "@/lib/catalog";
import { money } from "@/lib/types";
export const dynamic = "force-dynamic";
export const metadata = { title: "Услуги и стоимость" };
export default async function Services() {
  const data = await catalogData();
  return (
    <div className="container section">
      <Intro label="УСЛУГИ" title="Ремонт, который возвращает комфорт">
        От диагностики до проверки результата. В приоритете — стиральные машины;
        также помогаем с другой бытовой техникой.
      </Intro>
      <DataNotice {...data} />
      <div className="service-grid">
        {data.services.map((s) => (
          <article className="service-card" key={s.id}>
            <span className="card-mark" aria-hidden="true">◌</span>
            <h2>{s.title}</h2>
            <p>{s.description}</p>
            <strong>от {money(s.price_from)}</strong>
            <Link className="text-link" href={`/request?service=${s.id}`}>
              Оставить заявку →
            </Link>
          </article>
        ))}
      </div>
      <section className="pricing panel">
        <p className="eyebrow">БЕЗ СЮРПРИЗОВ</p>
        <h2>Ориентировочная стоимость</h2>
        {[
          ["Диагностика", 500],
          ["Выезд мастера", 700],
          ["Замена сливного насоса", 1800],
          ["Замена ТЭНа", 2200],
        ].map(([title, price]) => (
          <div className="price-line" key={title}>
            <span>{title}</span>
            <strong>от {money(Number(price))}</strong>
          </div>
        ))}
        <p className="meta">
          Указана стоимость работ без запчастей. Окончательную цену мастер
          согласует после диагностики. Для другой техники уточните возможность
          ремонта в заявке.
        </p>
        <Link className="button" href="/request">
          Не знаю причину поломки — вызвать мастера ↗
        </Link>
      </section>
    </div>
  );
}
