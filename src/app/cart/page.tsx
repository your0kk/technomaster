import { CartContents } from "@/components/cart";
export const metadata = { robots: { index: false, follow: false }, title: "Корзина" };
export default function CartPage() {
  return (
    <div className="container section">
      <CartContents />
    </div>
  );
}
