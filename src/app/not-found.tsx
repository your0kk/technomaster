import Link from "next/link";
export default function NotFound() {
  return (
    <div className="container section empty">
      <p className="eyebrow">404</p>
      <h1>Страница не найдена</h1>
      <p>Возможно, деталь снята с продажи или ссылка изменилась.</p>
      <Link className="button" href="/parts">
        Вернуться в каталог
      </Link>
    </div>
  );
}
