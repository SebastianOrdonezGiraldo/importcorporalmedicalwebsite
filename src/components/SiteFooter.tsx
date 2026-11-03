import { SITE, waUrl } from "@/lib/site";
import { Mail, Phone, WhatsApp } from "./Icons";

export default function SiteFooter() {
  return (
    <>
      <footer>
        <div className="wrap">
          <div className="foot-top">
            <div className="foot-brand rv">
              <a className="brand" href="/"><img src="/img/logo.png" alt="" width={48} height={48} /><span className="brand-word"><strong>IMPORT CORPORAL</strong><small>MEDICAL S.A.S</small></span></a>
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
                <li><a href="/#nosotros">Nosotros</a></li>
                <li><a href="/#marcas">Marcas</a></li>
                <li><a href="/catalogo">Catálogo</a></li>
                <li><a href="/#programa">Programa</a></li>
                <li><a href="/#registro">Registro</a></li>
              </ul>
            </div>
            <div className="rv" style={{ "--i": 3 } as React.CSSProperties}>
              <h4>Legal</h4>
              <ul>
                <li><span>Política de privacidad</span></li>
                <li><span>Aviso legal</span></li>
                <li><a href="/#registro">Contáctanos</a></li>
                <li><span>Política de cookies</span></li>
                <li><span>Términos y condiciones</span></li>
                <li><span>Política de Cambios, Devoluciones, Derecho de Retracto y Garantías</span></li>
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
