import MasterDashboard from "@/components/master-dashboard";
export const metadata = { robots: { index: false, follow: false }, title: "Кабинет мастера" };
export default function MasterPage() {
  return (
    <div className="container section">
      <MasterDashboard />
    </div>
  );
}
