import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin/productos");
  return (
    <div className="adm-login">
      <div className="adm-login-card">
        <img src="/img/logo.png" alt="" width={64} height={64} />
        <h1>Panel de administración</h1>
        <p>Import Corporal Medical</p>
        <LoginForm />
        <a className="adm-back" href="/">← Volver al sitio</a>
      </div>
    </div>
  );
}
