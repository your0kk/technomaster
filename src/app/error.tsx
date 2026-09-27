"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="container section">
      <h1>Не удалось загрузить страницу</h1>
      <p>Проверьте подключение и повторите попытку.</p>
      <button className="button" onClick={reset}>
        Попробовать снова
      </button>
    </div>
  );
}
