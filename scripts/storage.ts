import { loadEnvConfig } from "@next/env";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { putVerified, snapshotDatabase } from "../src/lib/storage-transfer";
import { IMAGE_TYPES, isSafeName, localPath, r2Storage, readStoredFile, sha256, validKey } from "../src/lib/storage";

loadEnvConfig(process.cwd());
const command = process.argv[2];
const apply = process.argv.includes("--apply");
const dataDir = path.resolve(process.env.DATA_DIR || "./data");

async function assets(dir = path.resolve("public/img"), prefix = "assets"): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const keys: string[] = [];
  for (const entry of entries) {
    if (!isSafeName(entry.name)) throw new Error("Hay un archivo con nombre no admitido.");
    if (entry.isDirectory()) keys.push(...await assets(path.join(dir, entry.name), `${prefix}/${entry.name}`));
    else if (entry.isFile()) keys.push(`${prefix}/${entry.name}`);
  }
  return keys;
}
function imageKeys(db: DatabaseSync) {
  const rows = db.prepare("SELECT image FROM products WHERE image IS NOT NULL UNION SELECT image FROM categories WHERE image IS NOT NULL").all() as { image: string }[];
  return rows.map(({ image }) => {
    if (!isSafeName(image)) throw new Error("Hay una referencia de imagen no válida en el catálogo.");
    return `media/${image}`;
  });
}
async function migrate() {
  const db = new DatabaseSync(path.join(dataDir, "app.db"), { readOnly: true });
  let refs: string[];
  try { refs = imageKeys(db); } finally { db.close(); }
  const localFiles = (await fs.readdir(path.join(dataDir, "uploads"), { withFileTypes: true }))
    .filter((entry) => entry.isFile()).map((entry) => `media/${entry.name}`);
  const keys = [...new Set([...refs, ...localFiles, ...await assets()])];
  // Preflight every local source before making any external changes.
  let totalBytes = 0;
  for (const key of keys) {
    if (!validKey(key)) throw new Error("Hay un nombre de archivo no válido.");
    totalBytes += (await fs.stat(localPath(key))).size;
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", files: keys.length, bytes: totalBytes, preservesLocalFiles: true }));
  if (!apply) { console.log("Repite con --apply para copiar y verificar los archivos en R2."); return; }
  let uploaded = 0;
  for (const key of keys) {
    const result = await putVerified(key, await fs.readFile(localPath(key)), IMAGE_TYPES[path.extname(key).toLowerCase()] || "application/octet-stream");
    if (result === "uploaded") uploaded++;
  }
  console.log(JSON.stringify({ verified: keys.length, uploaded, unchanged: keys.length - uploaded }));
}
async function backup() {
  if (!apply) { console.log("Respaldo: copiará una instantánea consistente de SQLite, las imágenes referenciadas y los recursos de public/img a R2. Usa --apply para ejecutarlo."); return; }
  r2Storage(); // Validate configuration before creating a snapshot.
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "icm-backup-"));
  try {
    const snapshot = path.join(temp, "app.db");
    snapshotDatabase(path.join(dataDir, "app.db"), snapshot);
    const db = new DatabaseSync(snapshot, { readOnly: true });
    let keys: string[];
    try {
      keys = [...imageKeys(db), ...await assets()];
    } finally { db.close(); }
    const id = new Date().toISOString().replace(/[:.]/g, "-") + "-" + crypto.randomBytes(4).toString("hex");
    const prefix = `backups/${id}`;
    const manifest: { key: string; sha256: string; bytes: number }[] = [];
    const upload = async (relative: string, bytes: Uint8Array, type: string) => {
      const key = `${prefix}/${relative}`;
      await putVerified(key, bytes, type);
      manifest.push({ key: relative, sha256: sha256(bytes), bytes: bytes.length });
    };
    await upload("app.db", await fs.readFile(snapshot), "application/vnd.sqlite3");
    for (const key of keys) await upload(key, await readStoredFile(key), IMAGE_TYPES[path.extname(key)] || "application/octet-stream");
    // Written last: a backup is complete only when this verified manifest exists.
    await putVerified(`${prefix}/manifest.json`, Buffer.from(JSON.stringify({ version: 1, createdAt: new Date().toISOString(), files: manifest }, null, 2)), "application/json");
    console.log(JSON.stringify({ complete: true, backup: prefix, verifiedFiles: manifest.length }));
  } finally {
    if (path.dirname(temp) !== os.tmpdir() || !path.basename(temp).startsWith("icm-backup-")) throw new Error("Ruta temporal inesperada.");
    await fs.rm(temp, { recursive: true, force: true });
  }
}
async function main() {
  if (command === "migrate") await migrate();
  else if (command === "backup") await backup();
  else throw new Error("Comando válido: migrate o backup.");
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "Falló el almacenamiento."); process.exitCode = 1; });
