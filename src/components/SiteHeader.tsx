import Link from "next/link";
import { SITE, waUrl, assetUrl } from "@/lib/site";
import { Phone } from "./Icons";
import HeaderEffects from "./HeaderEffects";

export default function SiteHeader() {
  return (
    <>
      <div className="infobar">
        <div className="wrap">
          <div className="items">
            <span><Phone />{SITE.phoneLabel} · Distribuidores</span>
          </div>
          <a className="pill" href={waUrl("Hola, quiero recibir el catálogo de distribuidor 2026.")} target="_blank" rel="noopener">
            Solicitar catálogo 2026
          </a>
        </div>
      </div>

      <header className="top" id="top">
        <div className="wrap head-row">
          <Link className="brand" href="/" aria-label="Import Corporal Medical, inicio">
            <img src={assetUrl("/img/logo.png")} alt="" width={48} height={48} />
            <span className="brand-word"><strong>IMPORT CORPORAL</strong><small>MEDICAL S.A.S</small></span>
          </Link>
          <button className="menu-btn" id="menuBtn" type="button" aria-expanded="false" aria-controls="mainNav">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>Menú
          </button>
          <nav className="main" id="mainNav" aria-label="Secciones">
            <ul>
              <li><Link href="/#nosotros">Nosotros</Link></li>
              <li><Link href="/#marcas">Marcas</Link></li>
              <li><Link href="/catalogo">Catálogo</Link></li>
              <li><Link href="/#programa">Distribuidores</Link></li>
              <li><Link href="/#cobertura">Cobertura</Link></li>
              <li><Link href="/#contacto">Contacto</Link></li>
              <li><Link className="btn btn-violet" href="/#registro">Quiero ser distribuidor</Link></li>
            </ul>
          </nav>
        </div>
      </header>
      <HeaderEffects />
    </>
  );
}
