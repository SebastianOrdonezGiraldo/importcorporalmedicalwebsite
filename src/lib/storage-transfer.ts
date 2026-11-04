import "server-only";
import { DatabaseSync } from "node:sqlite";
import { isMissing, r2Storage, sha256 } from "./storage";

/** Re-runs skip byte-identical objects and refuse to overwrite different content. */
export async function putVerified(key: string, bytes: Uint8Array, contentType: string) {
  const r2 = r2Storage();
  try {
    const existing = await r2.read(key);
    if (sha256(existing) !== sha256(bytes)) throw new Error(`Conflicto: el objeto ${key} tiene otro contenido. No se sobrescribió.`);
    return "existing";
  } catch (error) { if (!isMissing(error)) throw error; }
  try { await r2.write(key, bytes, contentType); }
  catch (error) {
    // The upload may have completed even if its HTTP response was lost.
    if (sha256(await r2.read(key)) !== sha256(bytes)) throw error;
  }
  if (sha256(await r2.read(key)) !== sha256(bytes)) throw new Error(`Falló la verificación de ${key}.`);
  return "uploaded";
}

/** VACUUM INTO creates a consistent snapshot, including committed WAL data. */
export function snapshotDatabase(sourceFile: string, destination: string) {
  const source = new DatabaseSync(sourceFile, { readOnly: true });
  try { source.prepare("VACUUM INTO ?").run(destination); } finally { source.close(); }
  const db = new DatabaseSync(destination, { readOnly: true });
  try {
    const check = db.prepare("PRAGMA integrity_check").get() as { integrity_check: string };
    if (check.integrity_check !== "ok") throw new Error("La instantánea de SQLite no superó la verificación.");
  } finally { db.close(); }
}
