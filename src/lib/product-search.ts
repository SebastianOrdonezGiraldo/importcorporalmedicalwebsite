/** Fold accents and case for matching only; keep the original catalog text intact. */
export function normalizeProductSearch(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim().replace(/\s+/gu, " ");
}
