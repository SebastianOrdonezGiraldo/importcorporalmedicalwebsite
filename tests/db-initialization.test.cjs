const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { DatabaseSync } = require('node:sqlite');
const { loadDatabase } = require('./helpers/db.cjs');
const { createTypeScriptLoader } = require('./helpers/typescript.cjs');

const runFile = promisify(execFile);
const projectRoot = path.resolve(__dirname, '..');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'icm-db-test-'));
  const dataDir = path.join(root, 'data');
  const imagesDir = path.join(root, 'seed', 'images');
  const seedFile = path.join(root, 'seed', 'data.json');
  fs.mkdirSync(imagesDir, { recursive: true });
  fs.writeFileSync(path.join(imagesDir, 'shared.jpg'), 'seed shared image');
  fs.writeFileSync(path.join(imagesDir, 'second.jpg'), 'seed second image');
  const seed = {
    categories: [{ slug: 'linea', name: 'Línea', tags: [], image: 'shared.jpg' }],
    products: [
      { slug: 'uno', name: 'Uno', category: 'linea', image: 'shared.jpg' },
      { slug: 'dos', name: 'Dos', category: 'linea', image: 'second.jpg' },
    ],
  };
  const writeSeed = () => fs.writeFileSync(seedFile, JSON.stringify(seed));
  writeSeed();
  const handles = [];
  const open = (workingDir = root) => {
    const db = loadDatabase(dataDir, workingDir).db();
    handles.push(db);
    return db;
  };
  const close = (db) => {
    db.close();
    handles.splice(handles.indexOf(db), 1);
  };
  t.after(() => {
    for (const db of handles) db.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  return { root, dataDir, imagesDir, seedFile, seed, writeSeed, open, close };
}

function counts(db) {
  return {
    categories: db.prepare('SELECT COUNT(*) AS n FROM categories').get().n,
    products: db.prepare('SELECT COUNT(*) AS n FROM products').get().n,
  };
}

test('new database imports the real catalog and all referenced photos once', (t) => {
  const f = fixture(t);
  let db = f.open(projectRoot);
  assert.deepEqual(counts(db), { categories: 8, products: 32 });
  assert.equal(db.prepare("SELECT value FROM app_metadata WHERE key='catalog_initialized'").get().value, 'seeded');
  assert.equal(db.prepare('PRAGMA foreign_key_check').all().length, 0);
  const images = db.prepare('SELECT image FROM products UNION SELECT image FROM categories').all();
  for (const { image } of images) assert.ok(fs.existsSync(path.join(f.dataDir, 'uploads', image)));
  f.close(db);
  // Once initialized, the seed files are no longer required.
  db = f.open(path.join(f.root, 'no-seed-here'));
  assert.deepEqual(counts(db), { categories: 8, products: 32 });
});

test('deleting every category preserves uncategorized products across restarts', (t) => {
  const f = fixture(t);
  let db = f.open();
  db.exec('DELETE FROM categories');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM products WHERE category_id IS NULL').get().n, 2);
  f.close(db);
  db = f.open();
  assert.deepEqual(counts(db), { categories: 0, products: 2 });
});

test('deleting the entire catalog does not resurrect the initial records', (t) => {
  const f = fixture(t);
  let db = f.open();
  db.exec('DELETE FROM categories; DELETE FROM products');
  f.close(db);
  db = f.open();
  assert.deepEqual(counts(db), { categories: 0, products: 0 });
});

for (const state of ['populated', 'uncategorized', 'empty']) {
  test(`legacy database migration preserves a ${state} catalog and its photos`, (t) => {
    const f = fixture(t);
    let db = f.open();
    db.exec('DROP TABLE app_metadata');
    db.exec("UPDATE products SET name='Editado', visible=0 WHERE slug='uno'");
    if (state !== 'populated') db.exec('DELETE FROM categories');
    if (state === 'empty') db.exec('DELETE FROM products');
    const before = JSON.stringify(db.prepare('SELECT * FROM products ORDER BY id').all());
    const beforeCounts = counts(db);
    const photo = path.join(f.dataDir, 'uploads', 'shared.jpg');
    fs.writeFileSync(photo, 'custom existing photo');
    f.close(db);
    fs.rmSync(f.seedFile);
    db = f.open();
    assert.deepEqual(counts(db), beforeCounts);
    assert.equal(JSON.stringify(db.prepare('SELECT * FROM products ORDER BY id').all()), before);
    assert.equal(fs.readFileSync(photo, 'utf8'), 'custom existing photo');
    assert.equal(db.prepare("SELECT value FROM app_metadata WHERE key='catalog_initialized'").get().value, 'existing');
    f.close(db);
    db = f.open();
    assert.deepEqual(counts(db), beforeCounts);
  });
}

test('a failed import rolls back records and new photos, preserving existing files, and can retry', (t) => {
  const f = fixture(t);
  const uploads = path.join(f.dataDir, 'uploads');
  fs.mkdirSync(uploads, { recursive: true });
  fs.writeFileSync(path.join(uploads, 'shared.jpg'), 'existing photo');
  f.seed.products.push({ ...f.seed.products[1] });
  f.writeSeed();
  assert.throws(() => f.open(), /UNIQUE constraint failed: products.slug/);
  assert.deepEqual(fs.readdirSync(uploads), ['shared.jpg']);
  assert.equal(fs.readFileSync(path.join(uploads, 'shared.jpg'), 'utf8'), 'existing photo');
  const inspection = new DatabaseSync(path.join(f.dataDir, 'app.db'));
  try {
    assert.equal(inspection.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table'").get().n, 0);
  } finally { inspection.close(); }
  f.seed.products.pop();
  f.writeSeed();
  assert.deepEqual(counts(f.open()), { categories: 1, products: 2 });
});

for (const missing of ['data.json', 'image']) {
  test(`missing seed ${missing} fails without completing initialization and supports retry`, (t) => {
    const f = fixture(t);
    const missingPath = missing === 'data.json' ? f.seedFile : path.join(f.imagesDir, 'second.jpg');
    const content = fs.readFileSync(missingPath);
    fs.rmSync(missingPath);
    assert.throws(() => f.open(), /ENOENT/);
    assert.deepEqual(fs.readdirSync(path.join(f.dataDir, 'uploads')), []);
    fs.writeFileSync(missingPath, content);
    assert.deepEqual(counts(f.open()), { categories: 1, products: 2 });
  });
}

test('simultaneous server processes initialize a shared database only once', async (t) => {
  const f = fixture(t);
  const results = await Promise.all(Array.from({ length: 4 }, () => runFile(process.execPath, [
    path.join(__dirname, 'helpers', 'db.cjs'), f.dataDir, f.root,
  ])));
  for (const result of results) assert.deepEqual(JSON.parse(result.stdout), { n: 2 });
  assert.deepEqual(counts(f.open()), { categories: 1, products: 2 });
});

test('cached legacy connection is upgraded before the first query after a module reload', (t) => {
  const f = fixture(t);
  const cached = f.open();
  cached.exec("UPDATE products SET name='Nombre conservado', visible=0 WHERE slug='uno'; DROP TABLE product_slug_history; DROP TABLE category_slug_history; ALTER TABLE products DROP COLUMN details;");
  const before = JSON.stringify(cached.prepare('SELECT id, slug, name, visible, image, category_id FROM products ORDER BY id').all());
  const api = createTypeScriptLoader({
    process: { env: { DATA_DIR: f.dataDir }, cwd: () => f.root },
    globalThis: { __icmDb: cached },
  })(path.join(projectRoot, 'src/lib/db.ts'));
  const products = api.listProducts({ includeHidden: true });
  assert.equal(products.length, 2);
  assert.equal(api.db(), cached);
  assert.ok(cached.prepare('PRAGMA table_info(products)').all().some((c) => c.name === 'details'));
  assert.equal(JSON.stringify(cached.prepare('SELECT id, slug, name, visible, image, category_id FROM products ORDER BY id').all()), before);
  assert.equal(api.listProducts({ search: 'DOS' })[0].slug, 'dos');
  assert.equal(api.slugTaken('products', 'new-address', null), false);
});

test('a reloaded module refreshes connection functions and preserves an intentionally empty catalog', (t) => {
  const f = fixture(t);
  const cached = f.open();
  cached.exec('DELETE FROM products; DELETE FROM categories; ALTER TABLE products DROP COLUMN details;');
  cached.function('icm_normalize_search', () => { throw new Error('outdated search function'); });
  const api = createTypeScriptLoader({
    process: { env: { DATA_DIR: f.dataDir }, cwd: () => f.root },
    globalThis: { __icmDb: cached },
  })(path.join(projectRoot, 'src/lib/db.ts'));
  assert.equal(api.listProducts().length, 0);
  assert.equal(api.listCategories().length, 0);
  assert.equal(cached.prepare("SELECT icm_normalize_search('TRACCIÓN') AS value").get().value, 'traccion');
  assert.equal(api.db(), cached);
});
