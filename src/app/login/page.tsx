import AuthPanel from "@/components/auth-panel";

export const metadata = { title: "Вход и регистрация" };

export default function LoginPage() {
  return (
    <div className="container section">
      <AuthPanel />
    </div>
  );
}
