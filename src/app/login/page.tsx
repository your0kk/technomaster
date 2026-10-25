import AuthPanel from "@/components/auth-panel";

export const metadata = { robots: { index: false, follow: false }, title: "Вход и регистрация" };

export default function LoginPage() {
  return (
    <div className="container section">
      <AuthPanel />
    </div>
  );
}
