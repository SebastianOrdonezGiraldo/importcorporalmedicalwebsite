import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
const script = path.resolve('scripts/catalog-snapshot.mjs');
test('traslado conserva cambios WAL y fotos, y rechaza sobrescribir datos', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'icm-transfer-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = path.join(root, 'source');
  const exported = path.join(root, 'export');
  const imported = path.join(root, 'import');
  fs.mkdirSync(path.join(source, 'uploads'), { recursive: true });
  fs.writeFileSync(path.join(source, 'uploads', 'photo.webp'), 'photo');
  const db = new DatabaseSync(path.join(source, 'app.db'));
  try {
    db.exec('PRAGMA journal_mode=WAL; CREATE TABLE products(id INTEGER); CREATE TABLE categories(id INTEGER); INSERT INTO products VALUES(42);');
    const run = (command, from, to) => spawnSync(process.execPath, [script, command, from, to], { encoding: 'utf8' });
    assert.equal(run('export', source, exported).status, 0);
    fs.mkdirSync(imported);
    assert.equal(run('import', exported, imported).status, 0);
    const restored = new DatabaseSync(path.join(imported, 'app.db'), { readOnly: true });
    try { assert.equal(restored.prepare('SELECT id FROM products').get().id, 42); } finally { restored.close(); }
    assert.equal(fs.readFileSync(path.join(imported, 'uploads', 'photo.webp'), 'utf8'), 'photo');
    assert.equal(run('import', exported, imported).status, 1);
    assert.equal(run('export', source, exported).status, 1);
    assert.equal(db.prepare('SELECT id FROM products').get().id, 42);
    const invalid = path.join(root, 'invalid');
    fs.mkdirSync(invalid);
    fs.writeFileSync(path.join(invalid, 'app.db'), 'corrupt');
    const destination = path.join(root, 'failed');
    assert.equal(run('import', invalid, destination).status, 1);
    assert.equal(fs.existsSync(path.join(destination, 'app.db')), false);
  } finally { db.close(); }
});
