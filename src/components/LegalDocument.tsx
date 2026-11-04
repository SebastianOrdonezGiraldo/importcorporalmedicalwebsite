import type { ReactNode } from "react";
import { legalDocuments, type LegalDocumentContent } from "@/lib/legal";

function linkedText(text: string): ReactNode {
  return text.split(/(Política de Cambios, Devoluciones, Derecho de Retracto y Garantías|Política de Privacidad(?: y Protección de Datos(?: Personales)?)?|Política de Cookies|Términos y Condiciones|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\+57 321 238 7916)/gi).map((part, i) => {
    const lower = part.toLowerCase();
    let href: string | undefined;
    if (lower.startsWith("política de cambios")) href = legalDocuments.returns.path;
    else if (lower.startsWith("política de privacidad")) href = legalDocuments.privacy.path;
    else if (lower === "política de cookies") href = `${legalDocuments.privacy.path}#seccion-9`;
    else if (lower === "términos y condiciones") href = legalDocuments.terms.path;
    else if (/^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(part)) href = `mailto:${part}`;
    else if (part === "+57 321 238 7916") href = "tel:+573212387916";
    return href ? <a key={i} href={href}>{part}</a> : part;
  });
}

export default function LegalDocument({ document }: { document: LegalDocumentContent }) {
  return (
    <div className="legal-page" id="documento">
      <header className="legal-heading">
        <div className="wrap">
          <nav className="crumbs dark" aria-label="Ruta"><a href="/">Inicio</a><span aria-hidden="true">/</span><span>Información legal</span></nav>
          <span className="legal-kicker">Import Corporal Medical S.A.S.</span>
          <h1>{document.title}</h1>
          <p className="legal-date">Última actualización: {document.updated}</p>
        </div>
      </header>

      <div className="wrap legal-layout">
        <aside className="legal-index">
          <nav aria-label="Contenido del documento">
            <h2>En este documento</h2>
            <ol>{document.sections.map((section) => <li key={section.id}><a href={`#${section.id}`}>{section.title.replace(/^\d+\. /, "")}</a></li>)}</ol>
          </nav>
        </aside>

        <article className="legal-copy" aria-label={document.navTitle}>
          {document.intro.length > 0 && <div className="legal-intro" id="identificacion">{document.intro.map((p, i) => <p key={i}>{linkedText(p)}</p>)}</div>}
          {document.sections.map((section) => (
            <section key={section.id} id={section.id} className="legal-section" aria-labelledby={`${section.id}-titulo`}>
              <h2 id={`${section.id}-titulo`}>{section.title}</h2>
              {section.paragraphs.map((p, i) => <p key={i}>{linkedText(p)}</p>)}
            </section>
          ))}
          <a className="legal-back" href="#documento">Volver al inicio del documento ↑</a>
        </article>
      </div>

      <nav className="wrap legal-related" aria-label="Políticas relacionadas">
        <h2>Documentos relacionados</h2>
        <div>{Object.values(legalDocuments).filter((d) => d.path !== document.path).map((d) => <a key={d.path} href={d.path}>{d.navTitle}<span aria-hidden="true"> →</span></a>)}</div>
      </nav>
    </div>
  );
}
