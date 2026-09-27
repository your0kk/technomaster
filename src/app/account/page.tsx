import AccountDashboard from "@/components/account-dashboard";

export const metadata = { title: "Личный кабинет" };

export default function AccountPage() {
  return (
    <div className="container section">
      <AccountDashboard />
    </div>
  );
}
