import AccountDashboard from "@/components/account-dashboard";

export const metadata = { robots: { index: false, follow: false }, title: "Личный кабинет" };

export default function AccountPage() {
  return (
    <div className="container section">
      <AccountDashboard />
    </div>
  );
}
