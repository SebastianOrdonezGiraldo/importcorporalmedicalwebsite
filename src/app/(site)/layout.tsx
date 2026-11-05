import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { jsonLd, organizationData } from "@/lib/seo";
import "../legal.css";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main-content">Saltar al contenido</a>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>{children}</main>
      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organizationData()) }} />
    </>
  );
}
