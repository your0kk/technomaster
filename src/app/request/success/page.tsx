import Receipt from "@/components/request-receipt";
export const metadata = { title: "Заявка отправлена" };
export default async function Success({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  return (
    <div className="container section">
      <Receipt id={id ?? ""} />
    </div>
  );
}
