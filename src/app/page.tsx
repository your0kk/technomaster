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
            Вернём технику
            <br />в привычный
            <br />
            <span>ритм жизни.</span>
          </h1>
          <p className="lead">
            Стиральная машина снова подводит?
            <br />
            Разберёмся с поломкой и приедем к вам домой — в Коченёво и по
            Новосибирской области.
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
            Согласуем время визита и стоимость до начала работ
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
              <strong>Техника должна работать.</strong>
              <span>Об остальном позаботимся мы.</span>
            </div>
            <span className="serial">01 /</span>
          </div>
        </div>
      </section>
      <section className="section white">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ЧЕМ ПОМОЖЕМ</p>
              <h2>Знакомая техника. Понятный ремонт.</h2>
            </div>
            <Link className="text-link" href="/services">
              Все услуги ↗
            </Link>
          </div>
          <DataNotice {...data} />
          <div className="service-grid">
            {data.services.map((s, i) => (
              <Link
                href={`/request?service=${s.id}`}
                className="service-card"
                key={s.id}
              >
                <span className="number">0{i + 1}</span>
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
          <h2>Спокойно на каждом этапе</h2>
          <div className="three-grid">
            {[
              [
                "01",
                "Сначала согласуем цену",
                "После диагностики объясним причину поломки и предложим решение.",
              ],
              [
                "02",
                "Подберём нужную деталь",
                "Сверим совместимость по модели и сервисному коду техники.",
              ],
              [
                "03",
                "Останемся на связи",
                "Уточним время визита и ответим на вопросы о ремонте.",
              ],
            ].map(([n, t, d]) => (
              <div key={n}>
                <span className="number">{n} /</span>
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
            <h2>Нужная деталь — рядом</h2>
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
