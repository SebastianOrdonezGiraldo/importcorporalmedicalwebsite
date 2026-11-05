import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

// Explicit paths only: never loads .env or modifies the source database.
const [command, sourceArg, targetArg] = process.argv.slice(2);
try {
  if (!['export', 'import'].includes(command) || !sourceArg || !targetArg) throw new Error('Uso: node scripts/catalog-snapshot.mjs export|import DIRECTORIO_ORIGEN DIRECTORIO_DESTINO');
  const source = path.resolve(sourceArg);
  const target = path.resolve(targetArg);
  if (fs.existsSync(target) && (command === 'export' || fs.readdirSync(target).length)) throw new Error('El destino debe ser nuevo o, al importar, un volumen vacío. No se sobrescriben datos.');
  const db = new DatabaseSync(path.join(source, 'app.db'), { readOnly: true });
  try {
    if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw new Error('SQLite no pasó integrity_check.');
    db.prepare('SELECT id FROM products LIMIT 1').get();
    db.prepare('SELECT id FROM categories LIMIT 1').get();
    fs.mkdirSync(target, { recursive: true });
    const pending = path.join(target, 'catalog.pending');
    db.prepare('VACUUM INTO ?').run(pending);
    // Complete the media copy before making app.db visible to the server.
    if (fs.existsSync(path.join(source, 'uploads'))) fs.cpSync(path.join(source, 'uploads'), path.join(target, 'uploads'), { recursive: true, errorOnExist: true, force: false });
    fs.renameSync(pending, path.join(target, 'app.db'));
  } finally { db.close(); }
  console.log('Catálogo copiado sin sobrescribir el origen. Las imágenes R2 permanecen en su bucket.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Falló la copia del catálogo.');
  process.exitCode = 1;
}
