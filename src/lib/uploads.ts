import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp, { type Metadata } from "sharp";
import { UPLOAD_DIR, imageUnused } from "./db";

export const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
const ACCEPTED = new Set(["jpeg", "png", "webp", "avif", "gif", "heif"]);

/**
 * Validates an uploaded photo, normalizes it (max 1200px, WebP, EXIF rotation applied, metadata stripped)
 * and stores it under DATA_DIR/uploads. Returns the stored file name, or null when no file was sent.
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
  if (!meta.format || !ACCEPTED.has(meta.format)) throw new Error("Formato no permitido. Usa JPG, PNG o WebP.");
  const out = await sharp(input)
    .rotate()
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .webp({ quality: 82 })
    .toBuffer();
  const name = `${baseName.slice(0, 50) || "img"}-${crypto.randomBytes(4).toString("hex")}.webp`;
  await fs.writeFile(path.join(UPLOAD_DIR, name), out);
  return name;
}

/** Deletes an image file once nothing in the catalog references it any more. */
export async function removeIfUnused(file: string | null | undefined) {
  if (!file || !isSafeName(file) || !imageUnused(file)) return;
  await fs.rm(path.join(UPLOAD_DIR, file), { force: true });
}

export const isSafeName = (f: string) => /^[a-z0-9][a-z0-9._-]*$/i.test(f) && !f.includes("..");
