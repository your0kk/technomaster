import Link from "next/link";
import { Intro, DataNotice, PartCard } from "@/components/ui";
import { catalogData } from "@/lib/catalog";
export const dynamic = "force-dynamic";
export const metadata = { title: "Каталог запчастей" };
export default async function Parts({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const data = await catalogData();
  const query = await searchParams;
  const q = (query.q ?? "").trim().toLocaleLowerCase("ru");
  const category = query.category ?? "";
  const parts = data.parts.filter(
    (p) =>
      (!category || p.category === category) &&
      `${p.title} ${p.article} ${p.category}`
        .toLocaleLowerCase("ru")
        .includes(q),
  );
  return (
    <div className="container section">
      <Intro label="КАТАЛОГ ЗАПЧАСТЕЙ" title="Найдём деталь. Вернём в строй.">
        Насосы, ТЭНы и другие детали для стиральных машин. Перед покупкой
        проверим совместимость с вашей техникой.
      </Intro>
      <DataNotice {...data} />
      <form className="search-bar" action="/parts">
        <label>
          Поиск по названию, артикулу и категории
          <input
            type="search"
            name="q"
            maxLength={100}
            defaultValue={query.q}
            placeholder="Например, насос или ASK-M231XP"
          />
        </label>
        <label>
          Категория
          <select name="category" defaultValue={category}>
            <option value="">Все запчасти</option>
            {Array.from(new Set(data.parts.map((p) => p.category))).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <button className="button">Найти →</button>
      </form>
      <div className="section-heading">
        <p className="muted">Найдено: {parts.length}</p>
        <span className="meta">Наличие уточним при обращении</span>
      </div>
      {parts.length ? (
        <div className="parts-grid">
          {parts.map((p) => (
            <PartCard part={p} key={p.id} />
          ))}
        </div>
      ) : (
        <div className="panel empty">
          <h2>По вашему запросу ничего не найдено</h2>
          <p>Попробуйте другое название или выберите все категории.</p>
          <Link className="button secondary" href="/parts">
            Сбросить поиск
          </Link>
        </div>
      )}
    </div>
  );
}
