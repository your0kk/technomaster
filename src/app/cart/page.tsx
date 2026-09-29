import { CartContents } from "@/components/cart";
export const metadata = { title: "Корзина" };
export default function CartPage() {
  return (
    <div className="container section">
      <CartContents />
    </div>
  );
}
