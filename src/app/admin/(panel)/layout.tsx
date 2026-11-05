import { assetUrl } from "@/lib/site";
import { requireAdmin } from "@/lib/auth";
import { logout } from "../actions";
import AdminNav from "../ui/AdminNav";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="adm-shell">
      <header className="adm-top">
        <a className="adm-brand" href="/admin/productos">
          <img src={assetUrl("/img/logo.png")} alt="" width={36} height={36} />
          <span><b>Import Corporal</b><small>Administración</small></span>
        </a>
        <AdminNav />
        <div className="adm-top-actions">
          <a href="/" target="_blank" rel="noopener">Ver sitio ↗</a>
          <form action={logout}><button type="submit">Salir</button></form>
        </div>
      </header>
      <main className="adm-main" id="main-content" tabIndex={-1}>{children}</main>
    </div>
  );
}
