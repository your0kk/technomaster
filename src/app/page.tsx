import Image from "next/image";
import Link from "next/link";
import { catalogData } from "@/lib/catalog";
import { DataNotice, PartCard } from "@/components/ui";
import { money } from "@/lib/types";
export const dynamic = "force-dynamic";
export default async function Home() {
  const data = await catalogData();
  return (
    <>
      <section className="container hero">
        <div>
          <p className="eyebrow">МЕСТНЫЙ СЕРВИС · КОЧЕНЁВО</p>
          <h1>
            Ремонт бытовой
            <br />
            <span>техники на дому</span>
          </h1>
          <p className="lead">
            Мастер приедет в Коченёво или по Новосибирской области, проведёт
            диагностику и согласует стоимость ремонта до начала работ.
          </p>
          <div className="actions">
            <Link className="button" href="/request">
              Вызвать мастера <span>↗</span>
            </Link>
            <Link className="text-link" href="/services">
              Узнать стоимость →
            </Link>
          </div>
          <p className="meta">
            Ежедневно с 09:00 до 20:00
          </p>
        </div>
        <div className="hero-image">
          <Image
            src="/images/laundry.jpg"
            alt="Стиральная машина в светлой домашней прачечной"
            width={640}
            height={560}
            priority
          />
          <div className="image-note">
            <span className="mini-drum">◎</span>
            <div>
              <strong>Выезд мастера от 700 ₽</strong>
              <span>Диагностика от 500 ₽</span>
            </div>
            <span className="serial">•</span>
          </div>
        </div>
      </section>
      <section className="section white">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ЧЕМ ПОМОЖЕМ</p>
              <h2>Основные услуги</h2>
            </div>
            <Link className="text-link" href="/services">
              Все услуги ↗
            </Link>
          </div>
          <DataNotice {...data} />
          <div className="service-grid">
            {data.services.map((s) => (
              <Link
                href={`/request?service=${s.id}`}
                className="service-card"
                key={s.id}
              >
                <span className="card-mark" aria-hidden="true">◌</span>
                <h3>{s.title}</h3>
                <p>{s.description}</p>
                <div className="price-row">
                  <strong>от {money(s.price_from)}</strong>
                  <span>↗</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="trust">
        <div className="container">
          <h2>Как проходит ремонт</h2>
          <div className="three-grid">
            {[
              [
                "◎",
                "Диагностика и цена",
                "После диагностики объясним причину поломки и предложим решение.",
              ],
              [
                "◍",
                "Подбор запчасти",
                "Сверим совместимость по модели и сервисному коду техники.",
              ],
              [
                "↗",
                "Связь с сервисом",
                "Уточним время визита и ответим на вопросы о ремонте.",
              ],
            ].map(([mark, t, d]) => (
              <div className="trust-item" key={t}>
                <span className="trust-mark" aria-hidden="true">{mark}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="container section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ЗАПЧАСТИ ДЛЯ СТИРАЛЬНЫХ МАШИН</p>
            <h2>Популярные запчасти</h2>
          </div>
          <Link className="text-link" href="/parts">
            Весь каталог ↗
          </Link>
        </div>
        <div className="four-grid">
          {data.parts.slice(0, 4).map((p) => (
            <PartCard key={p.id} part={p} />
          ))}
        </div>
      </section>
    </>
  );
}
