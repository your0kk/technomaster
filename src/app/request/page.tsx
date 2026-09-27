import BookingForm from "@/components/booking-form";
import { Intro, DataNotice } from "@/components/ui";
import { catalogData } from "@/lib/catalog";
export const dynamic = "force-dynamic";
export const metadata = { title: "Вызвать мастера" };
export default async function Request({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const data = await catalogData();
  const { service } = await searchParams;
  return (
    <div className="container section">
      <Intro label="ЗАЯВКА НА РЕМОНТ" title="Расскажите, что случилось">
        Заполнение займёт около двух минут. Уточним детали и согласуем удобное
        время визита.
      </Intro>
      <DataNotice {...data} />
      <BookingForm services={data.services} initialService={service} />
    </div>
  );
}
