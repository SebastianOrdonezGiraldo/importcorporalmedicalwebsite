import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

export const IMAGE_TYPES: Record<string, string> = {
  ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".gif": "image/gif", ".avif": "image/avif", ".svg": "image/svg+xml",
};
export const isSafeName = (name: string) => /^[a-z0-9][a-z0-9._-]*$/i.test(name) && !name.includes("..");
export function validKey(key: string) {
  return key.length <= 1024 && key.split("/").every(isSafeName);
}
export function storageDriver() {
  const driver = process.env.STORAGE_DRIVER || "local";
  if (driver !== "local" && driver !== "r2") throw new Error("STORAGE_DRIVER debe ser local o r2.");
  return driver;
}
export function storagePrefix() {
  const prefix = process.env.R2_PREFIX || "import-corporal-medical";
  if (!validKey(prefix)) throw new Error("R2_PREFIX no es válido.");
  return prefix;
}
export function localPath(key: string) {
  if (!validKey(key)) throw new Error("Nombre de archivo no válido.");
  if (key.startsWith("media/")) return path.resolve(process.env.DATA_DIR || "./data", "uploads", key.slice(6));
  if (key.startsWith("assets/")) return path.resolve("public/img", key.slice(7));
  throw new Error("Ruta de archivo no válida.");
}
export const sha256 = (bytes: Uint8Array) => crypto.createHash("sha256").update(bytes).digest("hex");
export function isMissing(error: unknown) {
  const e = error as { code?: string; name?: string; $metadata?: { httpStatusCode?: number } };
  return e?.code === "ENOENT" || e?.name === "NoSuchKey" || (e?.$metadata?.httpStatusCode === 404 && e?.name !== "NoSuchBucket");
}

function createR2Storage() {
  const required = (name: string) => {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`Falta ${name} para conectar Cloudflare R2.`);
    return value;
  };
  const accountId = required("R2_ACCOUNT_ID");
  if (!/^[a-f0-9]{32}$/i.test(accountId)) throw new Error("R2_ACCOUNT_ID no es válido.");
  const bucket = required("R2_BUCKET");
  const prefix = storagePrefix();
  const client = new S3Client({
    region: "auto", endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: required("R2_ACCESS_KEY_ID"), secretAccessKey: required("R2_SECRET_ACCESS_KEY") },
    maxAttempts: 3, requestHandler: { connectionTimeout: 5000, requestTimeout: 20000 },
  });
  const objectKey = (key: string) => {
    if (!validKey(key)) throw new Error("Nombre de archivo no válido.");
    return `${prefix}/${key}`;
  };
  return {
    async read(key: string) {
      const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: objectKey(key) }));
      if (!result.Body) throw new Error("R2 devolvió un archivo vacío.");
      return Buffer.from(await result.Body.transformToByteArray());
    },
    async write(key: string, bytes: Uint8Array, contentType: string, createOnly = true) {
      await client.send(new PutObjectCommand({
        Bucket: bucket, Key: objectKey(key), Body: bytes, ContentType: contentType,
        CacheControl: key.startsWith("backups/") ? "private, no-store" : "public, max-age=31536000, immutable",
        Metadata: { sha256: sha256(bytes) }, ...(createOnly ? { IfNoneMatch: "*" } : {}),
      }));
    },
    async remove(key: string) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey(key) }));
    },
  };
}

let cachedR2: ReturnType<typeof createR2Storage> | undefined;
export function r2Storage() { return cachedR2 ??= createR2Storage(); }

/** Keep legacy local reads available during a staged migration. Never fall back on failed writes. */
export async function readStoredFile(key: string) {
  if (storageDriver() === "r2") {
    try { return await r2Storage().read(key); }
    catch (error) { if (!isMissing(error)) throw error; }
  }
  return fs.readFile(localPath(key));
}
export async function writeStoredFile(key: string, bytes: Uint8Array, contentType: string) {
  if (storageDriver() === "r2") return r2Storage().write(key, bytes, contentType);
  const file = localPath(key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, bytes, { flag: "wx" });
}
export async function removeStoredFile(key: string) {
  if (storageDriver() === "r2") return r2Storage().remove(key);
  await fs.rm(localPath(key), { force: true });
}
