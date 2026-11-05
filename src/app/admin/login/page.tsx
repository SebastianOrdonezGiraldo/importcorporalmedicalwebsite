import { assetUrl } from "@/lib/site";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import LoginForm from "./LoginForm";
import { turnstileSiteKey } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin/productos");
  return (
    <main className="adm-login" id="main-content" tabIndex={-1}>
      <div className="adm-login-card">
        <img src={assetUrl("/img/logo.png")} alt="" width={64} height={64} />
        <h1>Panel de administración</h1>
        <p>Import Corporal Medical</p>
        <LoginForm siteKey={turnstileSiteKey()} />
        <a className="adm-back" href="/">← Volver al sitio</a>
      </div>
    </main>
  );
}
