import "server-only";
import crypto from "node:crypto";
import sharp, { type Metadata } from "sharp";
import { imageUnused } from "./db";
import { isSafeName, removeStoredFile, writeStoredFile } from "./storage";

export const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
const ACCEPTED = new Set(["jpeg", "png", "webp", "avif"]);

/**
 * Validates an uploaded photo, normalizes it (max 1200px, WebP, EXIF rotation applied, metadata stripped)
 * and stores it locally or in R2. Returns the stored file name, or null when no file was sent.
 */
export async function saveUpload(file: FormDataEntryValue | null, baseName: string): Promise<string | null> {
  if (!file || typeof file === "string" || file.size === 0) return null;
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("La imagen pesa más de 6 MB.");
  const input = Buffer.from(await file.arrayBuffer());
  let meta: Metadata;
  try {
    meta = await sharp(input).metadata();
  } catch {
    throw new Error("El archivo no es una imagen válida.");
  }
  if (!meta.format || !ACCEPTED.has(meta.format)) throw new Error("Formato no permitido. Usa JPG, PNG, WebP o AVIF.");
  let out: Buffer;
  try {
    out = await sharp(input)
    .rotate()
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .webp({ quality: 82 })
    .toBuffer();
  } catch { throw new Error("No se pudo procesar la imagen. Prueba con otro archivo JPG, PNG o WebP."); }
  const safeBase = baseName.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 50) || "img";
  const name = `${safeBase}-${crypto.randomBytes(12).toString("hex")}.webp`;
  try { await writeStoredFile(`media/${name}`, out, "image/webp"); }
  catch { throw new Error("No se pudo guardar la imagen. Revisa la conexión y la configuración del almacenamiento e inténtalo de nuevo."); }
  return name;
}

/** Deletes an image file once nothing in the catalog references it any more. */
export async function removeIfUnused(file: string | null | undefined) {
  if (!file || !isSafeName(file)) return;
  try {
    if (!imageUnused(file)) return;
    await removeStoredFile(`media/${file}`);
  } catch { console.error("[storage] Imagen pendiente de revisión y limpieza:", file); }
}
