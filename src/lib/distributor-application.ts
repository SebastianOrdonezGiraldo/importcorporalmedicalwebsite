export const APPLICATION_LIMITS = { company: 120, nit: 16, name: 100, phone: 25, city: 80, type: 80, msg: 1000 } as const;
export const BUSINESS_TYPES = [
  "Tienda médica u ortopédica", "Droguería o farmacia", "Fisioterapeuta o consultorio",
  "Gimnasio o centro deportivo", "Tienda en línea o revendedor", "IPS o clínica", "Otro",
] as const;

export type ApplicationField = keyof typeof APPLICATION_LIMITS;
export type ApplicationErrors = Partial<Record<ApplicationField | "lines", string>>;
type ApplicationData = Record<ApplicationField, string> & { lines: string[] };
type ApplicationResult = { ok: false; errors: ApplicationErrors } | { ok: true; data: ApplicationData; message: string };

/** Validate and normalize before constructing a message; no data is sent or stored here. */
export function prepareDistributorApplication(fd: FormData, availableLines: readonly string[]): ApplicationResult {
  const errors: ApplicationErrors = {};
  const data = {} as ApplicationData;
  const required: Partial<Record<ApplicationField, string>> = {
    company: "Escribe la empresa o el nombre del negocio.", nit: "Escribe el NIT o la cédula.",
    name: "Escribe el nombre de contacto.", phone: "Escribe un teléfono de contacto.", city: "Escribe la ciudad.",
  };
  for (const field of Object.keys(APPLICATION_LIMITS) as ApplicationField[]) {
    const raw = fd.get(field);
    if (raw !== null && typeof raw !== "string") {
      errors[field] = "El valor no es válido.";
      data[field] = "";
      continue;
    }
    const value = (raw ?? "").trim();
    data[field] = field === "msg" ? value.replace(/\r\n?/g, "\n") : value.replace(/\s+/g, " ");
    if (typeof raw === "string" && raw.length > APPLICATION_LIMITS[field]) errors[field] = `Máximo ${APPLICATION_LIMITS[field]} caracteres.`;
    else if (required[field] && !data[field]) errors[field] = required[field];
  }

  if (!errors.nit) {
    const nit = data.nit.replace(/[.\s]/g, "");
    if (!/^(?:[0-9]{6,11}|[0-9]{6,10}-[0-9])$/.test(nit)) errors.nit = "Usa solo números y, si corresponde, un guion antes del dígito de verificación.";
    else data.nit = nit;
  }
  if (!errors.phone) {
    const phone = data.phone;
    const digits = phone.replace(/\D/g, "");
    if (!/^\+?[0-9\s().-]+$/.test(phone) || digits.length < 10 || digits.length > 15) {
      errors.phone = "Escribe entre 10 y 15 dígitos. Puedes usar + al inicio, espacios, paréntesis o guiones.";
    } else data.phone = (phone.startsWith("+") ? "+" : "") + digits;
  }
  if (data.type && !BUSINESS_TYPES.some((type) => type === data.type)) errors.type = "Selecciona un tipo de negocio de la lista.";
  const selected = fd.getAll("lines");
  if (selected.some((line) => typeof line !== "string" || !availableLines.includes(line))) errors.lines = "Selecciona las líneas de interés disponibles.";
  data.lines = [...new Set(selected.filter((line): line is string => typeof line === "string" && availableLines.includes(line)))];

  if (Object.keys(errors).length) return { ok: false, errors };
  const message = [
    "Hola, quiero ser distribuidor de Import Corporal Medical.",
    `Empresa: ${data.company}`, `NIT o cédula: ${data.nit}`, `Contacto: ${data.name}`,
    `Celular: ${data.phone}`, `Ciudad: ${data.city}`,
    data.type ? `Tipo de negocio: ${data.type}` : "",
    data.lines.length ? `Líneas de interés: ${data.lines.join(", ")}` : "",
    data.msg ? `Comentarios: ${data.msg}` : "",
  ].filter(Boolean).join("\n");
  return { ok: true, data, message };
}
