import { CheckoutForm } from "@/components/cart";
export const metadata = { robots: { index: false, follow: false }, title: "Оформление заказа" };
export default function CheckoutPage() {
  return (
    <div className="container section">
      <CheckoutForm />
    </div>
  );
}
