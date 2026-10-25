import Admin from "@/components/admin-dashboard";
export const metadata = { robots: { index: false, follow: false }, title: "Кабинет администратора" };
export default function Page() {
  return (
    <div className="container section">
      <Admin />
    </div>
  );
}
