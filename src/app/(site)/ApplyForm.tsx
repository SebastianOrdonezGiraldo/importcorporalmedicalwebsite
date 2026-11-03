"use client";
import { useState, type FormEvent } from "react";
import { waUrl } from "@/lib/site";
import { ArrowRight, Check } from "@/components/Icons";

type Status = { kind: "ok"; href: string } | { kind: "error"; text: string } | null;

/** Distributor registration: validates and builds a WhatsApp message (nothing is stored). */
export default function ApplyForm({ lines }: { lines: { name: string; img: string }[] }) {
  const [status, setStatusRaw] = useState<Status>(null);
  const [nonce, setNonce] = useState(0);
  const setStatus = (s: Status) => { setStatusRaw(s); setNonce((n) => n + 1); };

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      const bad = form.querySelector(":invalid");
      setStatus({ kind: "error", text: bad?.id === "f-nit" ? "Revisa el NIT: solo números y el dígito de verificación." : "Completa los campos obligatorios." });
      return;
    }
    const fd = new FormData(form);
    const v = (k: string) => String(fd.get(k) ?? "").trim();
    const chosen = fd.getAll("lines").map(String);
    const msg = [
      "Hola, quiero ser distribuidor de Import Corporal Medical.",
      `Empresa: ${v("company")}`,
      `NIT: ${v("nit")}`,
      `Contacto: ${v("name")}`,
      `Celular: ${v("phone")}`,
      `Ciudad: ${v("city")}`,
      `Tipo de negocio: ${v("type")}`,
      chosen.length ? `Líneas de interés: ${chosen.join(", ")}` : "",
      v("msg") ? `Comentarios: ${v("msg")}` : "",
    ].filter(Boolean).join("\n");
    setStatus({ kind: "ok", href: waUrl(msg) });
  }

  return (
    <form className="apply rv l" id="applyForm" noValidate onSubmit={onSubmit}>
      <h3>Quiero ser distribuidor</h3>
      <div className="field"><label htmlFor="f-company">Empresa <em>*</em></label><input id="f-company" name="company" required autoComplete="organization" placeholder="Razón social o negocio" /></div>
      <div className="field"><label htmlFor="f-nit">NIT <em>*</em></label><input id="f-nit" name="nit" required inputMode="numeric" pattern="[0-9]{6,10}(-?[0-9])?" placeholder="900123456-7" aria-describedby="nit-hint" /><span className="hint" id="nit-hint">Con dígito de verificación, o tu cédula.</span></div>
      <div className="field"><label htmlFor="f-name">Contacto <em>*</em></label><input id="f-name" name="name" required autoComplete="name" placeholder="Tu nombre" /></div>
      <div className="field"><label htmlFor="f-phone">Celular <em>*</em></label><input id="f-phone" name="phone" required inputMode="tel" autoComplete="tel" pattern="[0-9 +]{10,15}" placeholder="300 000 0000" /></div>
      <div className="field"><label htmlFor="f-city">Ciudad <em>*</em></label><input id="f-city" name="city" required autoComplete="address-level2" placeholder="Ej.: Medellín" /></div>
      <div className="field"><label htmlFor="f-type">Tipo de negocio</label>
        <select id="f-type" name="type">
          {["Tienda médica u ortopédica", "Droguería o farmacia", "Fisioterapeuta o consultorio", "Gimnasio o centro deportivo", "Tienda en línea o revendedor", "IPS o clínica", "Otro"].map((o) => <option key={o}>{o}</option>)}
        </select>
      </div>
      <fieldset className="field full">
        <legend>Líneas de interés</legend>
        <div className="checks" id="lineChecks">
          {lines.map((l, n) => (
            <label key={l.name} className="pick-tile">
              <input type="checkbox" id={`ln-${n}`} name="lines" value={l.name} />
              <span className="thumb"><img src={l.img} alt="" loading="lazy" /></span><span className="nm">{l.name}</span>
              <span className="tick" aria-hidden="true"><Check w={3.4} /></span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="field full"><label htmlFor="f-msg">Comentarios</label><textarea id="f-msg" name="msg" placeholder="Opcional"></textarea></div>
      <div className="actions">
        <button className="btn btn-violet" type="submit">Solicitar lista de precios <ArrowRight /></button>
        {status && (
          <span className="ok" id="formOk" key={nonce} style={status.kind === "error" ? { color: "var(--magenta)" } : undefined}>
            {status.kind === "ok"
              ? <>Tu solicitud está lista. <a href={status.href} target="_blank" rel="noopener">Abrir WhatsApp para enviarla</a></>
              : status.text}
          </span>
        )}
      </div>
      <p className="legal-note">Al enviar aceptas nuestra Política de privacidad.</p>
    </form>
  );
}
