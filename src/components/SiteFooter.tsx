import Link from "next/link";
import { SITE, waUrl, assetUrl } from "@/lib/site";
import { Mail, Phone, WhatsApp } from "./Icons";

export default function SiteFooter() {
  return (
    <>
      <footer>
        <div className="wrap">
          <div className="foot-top">
            <div className="foot-brand rv">
              <Link className="brand" href="/"><img src={assetUrl("/img/logo.png")} alt="" width={48} height={48} /><span className="brand-word"><strong>IMPORT CORPORAL</strong><small>MEDICAL S.A.S</small></span></Link>
              <p>Equipos y soluciones terapéuticas para rehabilitación y fisioterapia en toda Colombia.</p>
            </div>
            <div className="rv" style={{ "--i": 1 } as React.CSSProperties}>
              <h4>Contacto</h4>
              <ul>
                <li><Phone /><span>Mayoristas: <a href={waUrl("Hola, quiero información para ser distribuidor de Import Corporal Medical.")} target="_blank" rel="noopener">{SITE.phoneLabel}</a></span></li>
                <li><Mail /><span>{SITE.email}</span></li>
              </ul>
            </div>
            <div className="rv" style={{ "--i": 2 } as React.CSSProperties}>
              <h4>Distribuidores</h4>
              <ul>
                <li><Link href="/#nosotros">Nosotros</Link></li>
                <li><Link href="/#marcas">Marcas</Link></li>
                <li><Link href="/catalogo">Catálogo</Link></li>
                <li><Link href="/#programa">Programa</Link></li>
                <li><Link href="/#registro">Registro</Link></li>
              </ul>
            </div>
            <div className="rv" style={{ "--i": 3 } as React.CSSProperties}>
              <h4>Legal</h4>
              <ul>
                <li><Link href="/politica-de-privacidad">Política de privacidad</Link></li>
                <li><Link href="/terminos-y-condiciones#identificacion">Aviso legal</Link></li>
                <li><Link href="/#registro">Contáctanos</Link></li>
                <li><Link href="/politica-de-privacidad#seccion-9">Política de cookies</Link></li>
                <li><Link href="/terminos-y-condiciones">Términos y condiciones</Link></li>
                <li><Link href="/cambios-devoluciones-y-garantias">Política de Cambios, Devoluciones, Derecho de Retracto y Garantías</Link></li>
              </ul>
            </div>
          </div>
          <div className="foot-bottom">
            <span>© {new Date().getFullYear()} {SITE.legalName}. Todos los derechos reservados.</span>
            <a className="sic" href="https://www.sic.gov.co/" target="_blank" rel="noopener">Superintendencia de Industria y Comercio</a>
          </div>
        </div>
      </footer>

      <a className="wa-float" href={waUrl("Hola, quiero información sobre el programa de distribuidores de Import Corporal Medical.")} target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">
        <span className="bubble-txt">¿Quieres ser distribuidor?</span>
        <span className="wa-ico"><WhatsApp /></span>
      </a>
    </>
  );
}
