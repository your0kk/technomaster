import { OrderReceipt } from "@/components/cart";
export const metadata = {
  robots: { index: false, follow: false },
  title: "Заказ принят",
};
export default async function Success({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  return (
    <div className="container section">
      <OrderReceipt id={id ?? ""} />
    </div>
  );
}
