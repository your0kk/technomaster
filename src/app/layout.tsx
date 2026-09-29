import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui";
import { CartLink } from "@/components/cart";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "ТехноМастер — ремонт техники в Коченёво",
    template: "%s · ТехноМастер",
  },
  description:
    "Ремонт стиральных машин и бытовой техники в Коченёво и Новосибирской области. Каталог запчастей и вызов мастера.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <a className="skip" href="#main">
          К содержанию
        </a>
        <div className="region-bar">
          <div className="container">
            <span>Коченёво и Новосибирская область</span>
            <span>Ежедневно · 09:00–20:00</span>
          </div>
        </div>
        <header className="site-header">
          <div className="container header-inner">
            <Logo />
            <nav aria-label="Основная навигация">
              <Link href="/services">Услуги</Link>
              <Link href="/parts">Запчасти</Link>
              <CartLink />
              <Link href="/account">Личный кабинет</Link>
            </nav>
            <div className="header-contact">
              <a href="tel:+79529283307">+7 (952) 928-33-07</a>
              <small>Коченёво</small>
            </div>
            <Link className="button" href="/request">
              Вызвать мастера <span>↗</span>
            </Link>
          </div>
        </header>
        <main id="main">{children}</main>
        <footer>
          <div className="container footer-main">
            <Logo />
            <p>
              Ремонт рядом.
              <br />
              Коченёво и Новосибирская область
            </p>
            <Link href="/services">Услуги</Link>
            <Link href="/parts">Запчасти</Link>
            <Link href="/account">Личный кабинет</Link>
            <Link href="/admin">Кабинет администратора</Link>
            <Link href="/master">Кабинет мастера</Link>
          </div>
          <div className="container footer-bottom">
            <span>Учебный проект · ТехноМастер, 2026</span>
            <span>
              <a href="https://t.me/ATPABKA">Telegram: @ATPABKA</a>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
