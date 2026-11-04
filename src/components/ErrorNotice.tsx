"use client";

import { useEffect, useId, useRef, useTransition } from "react";

export default function ErrorNotice({ retry, admin = false }: { retry: () => void; admin?: boolean }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const [pending, startTransition] = useTransition();
  useEffect(() => { heading.current?.focus(); }, []);
  const buttonStyle = { display: "inline-block", padding: "12px 20px", borderRadius: 24, font: "inherit", fontWeight: 700, textDecoration: "none", cursor: "pointer" } as const;

  return (
    <section aria-labelledby={id} style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px", minHeight: "45vh", color: "#231b26", fontFamily: "system-ui, sans-serif" }}>
      <meta name="robots" content="noindex, nofollow" />
      <h1 ref={heading} id={id} tabIndex={-1} style={{ fontSize: "clamp(26px, 4vw, 38px)", lineHeight: 1.2, margin: "0 0 18px" }}>No pudimos mostrar esta página</h1>
      <p style={{ lineHeight: 1.6 }}>Ocurrió un problema al cargar el contenido. Puedes volver a intentarlo.</p>
      {admin && <p style={{ marginTop: 16, lineHeight: 1.6 }}>Si estabas guardando cambios, revisa el listado antes de repetir la operación: podría haberse completado.</p>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 24 }}>
        <button type="button" disabled={pending} onClick={() => startTransition(() => retry())} style={{ ...buttonStyle, border: "2px solid #6e2378", background: "#6e2378", color: "#fff" }}>{pending ? "Reintentando…" : "Reintentar"}</button>
        <a href={admin ? "/admin/productos" : "/catalogo"} style={{ ...buttonStyle, border: "2px solid #6e2378", color: "#6e2378", background: "#fff" }}>{admin ? "Ir al listado" : "Ir al catálogo"}</a>
        <a href="/" style={{ ...buttonStyle, color: "#6e2378", border: "2px solid transparent" }}>Ir al inicio</a>
      </div>
    </section>
  );
}
