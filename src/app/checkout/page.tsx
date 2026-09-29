import { CheckoutForm } from "@/components/cart";
export const metadata = { title: "Оформление заказа" };
export default function CheckoutPage() {
  return (
    <div className="container section">
      <CheckoutForm />
    </div>
  );
}
