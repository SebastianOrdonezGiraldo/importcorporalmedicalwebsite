import "server-only";
import path from "node:path";
import { IMAGE_TYPES, isMissing, readStoredFile, validKey } from "./storage";

export async function serveImage(key: string) {
  const type = IMAGE_TYPES[path.extname(key).toLowerCase()];
  if ((!key.startsWith("media/") && !key.startsWith("assets/")) || !validKey(key) || !type) return new Response("Not found", { status: 404 });
  try {
    const bytes = await readStoredFile(key);
    return new Response(new Uint8Array(bytes), { headers: {
      "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      ...(type === "image/svg+xml" ? { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox" } : {}),
    } });
  } catch (error) {
    if (isMissing(error)) return new Response("Not found", { status: 404 });
    console.error("[storage] No se pudo leer una imagen.");
    return new Response("Imagen temporalmente no disponible", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
