"use client";
import { useRef, useState, type FormEvent, type MouseEvent } from "react";
import { waUrl } from "@/lib/site";
import { ArrowRight, Check } from "@/components/Icons";
import { APPLICATION_LIMITS, BUSINESS_TYPES, prepareDistributorApplication, type ApplicationErrors, type ApplicationField } from "@/lib/distributor-application";

type Status = { kind: "ok"; href: string; message: string } | { kind: "error"; text: string } | null;

const fields = [
  { name: "company", label: "Empresa", placeholder: "Razón social o negocio", autoComplete: "organization", inputMode: "text", type: "text" },
  { name: "nit", label: "NIT o cédula", placeholder: "900123456-7", autoComplete: "off", inputMode: "text", type: "text" },
  { name: "name", label: "Contacto", placeholder: "Tu nombre", autoComplete: "name", inputMode: "text", type: "text" },
  { name: "phone", label: "Celular", placeholder: "300 000 0000", autoComplete: "tel", inputMode: "tel", type: "tel" },
  { name: "city", label: "Ciudad", placeholder: "Ej.: Medellín", autoComplete: "address-level2", inputMode: "text", type: "text" },
] as const;

/** Distributor registration: validates and builds a WhatsApp message (nothing is stored). */
export default function ApplyForm({ lines }: { lines: { name: string; img: string }[] }) {
  const [status, setStatus] = useState<Status>(null);
  const [errors, setErrors] = useState<ApplicationErrors>({});
  const formRef = useRef<HTMLFormElement>(null);

  function clearPreparedState() {
    if (status) setStatus(null);
    if (Object.keys(errors).length) setErrors({});
  }

  function showErrors(form: HTMLFormElement, nextErrors: ApplicationErrors) {
    setErrors(nextErrors);
    setStatus({ kind: "error", text: "Revisa los campos marcados antes de preparar la solicitud." });
    const first = Object.keys(nextErrors)[0];
    if (first === "lines") form.querySelector<HTMLInputElement>('input[name="lines"]')?.focus();
    else {
      const input = form.elements.namedItem(first);
      if (input instanceof HTMLElement) input.focus();
    }
  }

  const fieldError = (field: ApplicationField | "lines") => errors[field]
    ? <span className="field-error" id={`f-${field}-error`}>{errors[field]}</span>
    : null;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const result = prepareDistributorApplication(new FormData(form), lines.map((line) => line.name));
    if (!result.ok) {
      showErrors(form, result.errors);
      return;
    }
    setErrors({});
    setStatus({ kind: "ok", href: waUrl(result.message), message: result.message });
  }

  function verifyPreparedMessage(e: MouseEvent<HTMLAnchorElement>) {
    const form = formRef.current;
    if (!form || status?.kind !== "ok") { e.preventDefault(); return; }
    // Some autofill tools change values without emitting an input/change event.
    const current = prepareDistributorApplication(new FormData(form), lines.map((line) => line.name));
    if (!current.ok) { e.preventDefault(); showErrors(form, current.errors); }
    else if (current.message !== status.message) {
      e.preventDefault();
      setStatus({ kind: "error", text: "Los datos cambiaron. Prepara la solicitud de nuevo antes de abrir WhatsApp." });
    }
  }

  return (
    <form ref={formRef} className="apply rv l" id="applyForm" noValidate onSubmit={onSubmit} onChange={clearPreparedState} onReset={clearPreparedState}>
      <h3>Quiero ser distribuidor</h3>
      {fields.map(({ label, ...field }) => (
        <div className="field" key={field.name}>
          <label htmlFor={`f-${field.name}`}>{label} <em>*</em></label>
          <input {...field} id={`f-${field.name}`} required maxLength={APPLICATION_LIMITS[field.name]} aria-invalid={errors[field.name] ? true : undefined}
            aria-describedby={[field.name === "nit" ? "nit-hint" : "", errors[field.name] ? `f-${field.name}-error` : ""].filter(Boolean).join(" ") || undefined} />
          {field.name === "nit" && <span className="hint" id="nit-hint">NIT con o sin dígito de verificación, o tu cédula. Puedes usar puntos y guion.</span>}
          {fieldError(field.name)}
        </div>
      ))}
      <div className="field"><label htmlFor="f-type">Tipo de negocio</label>
        <select id="f-type" name="type" aria-invalid={errors.type ? true : undefined} aria-describedby={errors.type ? "f-type-error" : undefined}>
          {BUSINESS_TYPES.map((o) => <option key={o}>{o}</option>)}
        </select>
        {fieldError("type")}
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
        {fieldError("lines")}
      </fieldset>
      <div className="field full"><label htmlFor="f-msg">Comentarios</label><textarea id="f-msg" name="msg" placeholder="Opcional" maxLength={APPLICATION_LIMITS.msg} aria-invalid={errors.msg ? true : undefined} aria-describedby={errors.msg ? "f-msg-error" : undefined}></textarea>{fieldError("msg")}</div>
      <div className="actions">
        <button className="btn btn-violet" type="submit">Preparar solicitud <ArrowRight /></button>
        <span className={status ? "ok" : undefined} id="formOk" role="status" aria-live="polite" aria-atomic="true" style={status?.kind === "error" ? { color: "var(--magenta)" } : undefined}>
          {status?.kind === "ok"
            ? <>Mensaje preparado. <a href={status.href} onClick={verifyPreparedMessage} target="_blank" rel="noopener">Abrir WhatsApp para enviarlo</a></>
            : status?.text}
        </span>
      </div>
      <p className="legal-note">Preparar el mensaje no lo envía. Abre WhatsApp y envíalo para completar tu solicitud.</p>
      <p className="legal-note">Al enviar aceptas nuestra <a href="/politica-de-privacidad" target="_blank" rel="noopener">Política de privacidad</a>.</p>
    </form>
  );
}
