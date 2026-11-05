export type PageSearchParams = Record<string, string | string[] | undefined>;

export function withSearchParams(path: string, values: PageSearchParams): string {
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(values)) {
    if (Array.isArray(value)) value.forEach((item) => query.append(name, item));
    else if (value !== undefined) query.append(name, value);
  }
  const encoded = query.toString();
  return encoded ? `${path}?${encoded}` : path;
}
