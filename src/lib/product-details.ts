export type ProductDetails = {
  reference: string;
  manufacturer: string;
  specifications: { name: string; value: string }[];
  boxContents: string[];
  warranty: string;
  sanitaryRegistration: string;
  documents: { label: string; url: string }[];
  sourceNote: string;
};

export const emptyProductDetails = (): ProductDetails => ({
  reference: "", manufacturer: "", specifications: [], boxContents: [],
  warranty: "", sanitaryRegistration: "", documents: [], sourceNote: "",
});

export function isDocumentUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch { return false; }
}

/** Only render recognized fields, including when reading older or malformed data. */
export function parseProductDetails(json: string): ProductDetails {
  const result = emptyProductDetails();
  try {
    const data = JSON.parse(json);
    if (!data || typeof data !== "object" || Array.isArray(data)) return result;
    for (const field of ["reference", "manufacturer", "warranty", "sanitaryRegistration", "sourceNote"] as const) {
      if (typeof data[field] === "string") result[field] = data[field].trim();
    }
    if (Array.isArray(data.specifications)) result.specifications = data.specifications.filter(
      (item: unknown): item is { name: string; value: string } => !!item && typeof item === "object" &&
        "name" in item && typeof item.name === "string" && !!item.name.trim() &&
        "value" in item && typeof item.value === "string" && !!item.value.trim(),
    );
    if (Array.isArray(data.boxContents)) result.boxContents = data.boxContents.filter((item: unknown): item is string => typeof item === "string" && !!item.trim());
    if (Array.isArray(data.documents)) result.documents = data.documents.filter(
      (item: unknown): item is { label: string; url: string } => !!item && typeof item === "object" &&
        "label" in item && typeof item.label === "string" && !!item.label.trim() &&
        "url" in item && typeof item.url === "string" && isDocumentUrl(item.url),
    );
  } catch { /* Legacy products can have no structured details yet. */ }
  return result;
}

export function readProductDetails(fd: FormData): ProductDetails {
  const text = (key: string, label: string, max: number) => {
    const raw = fd.get(key);
    if (raw !== null && typeof raw !== "string") throw new Error(`${label}: el valor no es válido.`);
    const value = (raw ?? "").trim();
    if (value.length > max) throw new Error(`${label}: máximo ${max} caracteres.`);
    return value;
  };
  const pairs = (leftKey: string, rightKey: string, label: string, max: number, rightMax: number) => {
    const left = fd.getAll(leftKey), right = fd.getAll(rightKey);
    if (left.length !== right.length || left.length > max) throw new Error(`${label}: revisa las filas (máximo ${max}).`);
    return left.flatMap((raw, i) => {
      if (typeof raw !== "string" || typeof right[i] !== "string") throw new Error(`${label}: la fila ${i + 1} no es válida.`);
      const name = raw.trim(), value = (right[i] as string).trim();
      if (!name && !value) return [];
      if (!name || !value) throw new Error(`${label}: completa ambos campos de la fila ${i + 1}.`);
      if (name.length > 80 || value.length > rightMax) throw new Error(`${label}: la fila ${i + 1} supera la longitud permitida.`);
      return [{ name, value }];
    });
  };
  const documents = pairs("documentLabel", "documentUrl", "Documentos", 5, 2048).map(({ name, value }) => {
    if (!isDocumentUrl(value)) throw new Error("Los documentos deben tener un enlace HTTPS válido, sin credenciales.");
    return { label: name, url: value };
  });
  const boxContents = text("boxContents", "Contenido de la caja", 3000).split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (boxContents.length > 30 || boxContents.some((s) => s.length > 200)) throw new Error("Contenido de la caja: máximo 30 elementos de 200 caracteres.");
  return {
    reference: text("reference", "Referencia o modelo", 100),
    manufacturer: text("manufacturer", "Fabricante", 120),
    specifications: pairs("specificationName", "specificationValue", "Especificaciones", 20, 300),
    boxContents,
    warranty: text("warranty", "Garantía", 1500),
    sanitaryRegistration: text("sanitaryRegistration", "Registro sanitario", 200),
    documents,
    sourceNote: text("sourceNote", "Fuente de verificación", 1000),
  };
}
