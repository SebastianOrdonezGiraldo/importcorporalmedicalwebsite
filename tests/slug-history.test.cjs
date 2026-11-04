const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadDatabase } = require('./helpers/db.cjs');
const { createTypeScriptLoader } = require('./helpers/typescript.cjs');
const { withSearchParams } = createTypeScriptLoader()(path.resolve(__dirname, '../src/lib/redirect-url.ts'));

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'icm-slug-test-'));
  let api = loadDatabase(root, path.resolve(__dirname, '..'));
  let db = api.db();
  t.after(() => {
    db.close();
    assert.equal(path.dirname(root), os.tmpdir());
    assert.ok(path.basename(root).startsWith('icm-slug-test-'));
    fs.rmSync(root, { recursive: true, force: true });
  });
  return {
    get api() { return api; }, get db() { return db; },
    restart() { db.close(); api = loadDatabase(root, path.resolve(__dirname, '..')); db = api.db(); },
  };
}

for (const kind of ['products', 'categories']) {
  const isProduct = kind === 'products';
  const get = isProduct ? 'getProduct' : 'getCategory';
  const resolve = isProduct ? 'resolveProductSlug' : 'resolveCategorySlug';
  const save = isProduct ? 'saveProduct' : 'saveCategory';
  const remove = isProduct ? 'deleteProduct' : 'deleteCategory';
  const history = isProduct ? 'product_slug_history' : 'category_slug_history';
  const initial = (api) => isProduct ? api.listProducts()[0] : api.listCategories()[0];

  test(`${kind}: every previous slug resolves directly to the latest address after restart`, (t) => {
    const f = fixture(t);
    const original = initial(f.api);
    f.api[save](original.id, { ...original, slug: 'enlace-segundo' });
    f.api[save](original.id, { ...f.api[get]({ id: original.id }), slug: 'enlace-final' });
    f.restart();
    for (const slug of [original.slug, 'enlace-segundo', 'enlace-final']) {
      const current = f.api[resolve](slug);
      assert.equal(current.id, original.id);
      assert.equal(current.slug, 'enlace-final');
    }
    assert.equal(f.api[get]({ slug: original.slug }), null);
    assert.equal(f.db.prepare(`SELECT COUNT(*) AS n FROM ${history}`).get().n, 2);
  });

  test(`${kind}: changing the name preserves the slug and does not create a redirect`, (t) => {
    const { api, db } = fixture(t);
    const original = initial(api);
    api[save](original.id, { ...original, name: 'Nombre actualizado' });
    assert.equal(api[get]({ id: original.id }).slug, original.slug);
    assert.equal(api[resolve](original.slug).name, 'Nombre actualizado');
    assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM ${history}`).get().n, 0);
  });

  test(`${kind}: historical addresses cannot be reassigned or reused to create cached redirect loops`, (t) => {
    const { api } = fixture(t);
    const original = initial(api);
    api[save](original.id, { ...original, slug: 'nuevo-enlace' });
    assert.equal(api.slugTaken(kind, original.slug, null), true);
    assert.equal(api.slugTaken(kind, original.slug, original.id), true);
    assert.throws(() => api[save](original.id, { ...original }), /reservado/);
    assert.throws(() => api[save](null, { ...original }), /reservado/);
    assert.equal(api[resolve](original.slug).slug, 'nuevo-enlace');
  });

  test(`${kind}: deleting a record leaves its addresses reserved and stops resolution`, (t) => {
    const f = fixture(t);
    const original = initial(f.api);
    f.api[save](original.id, { ...original, slug: 'enlace-eliminado' });
    f.api[remove](original.id);
    f.restart();
    for (const slug of [original.slug, 'enlace-eliminado']) {
      assert.equal(f.api[resolve](slug), null);
      assert.equal(f.api.slugTaken(kind, slug, null), true);
      assert.throws(() => f.api[save](null, { ...original, slug }), /reservado/);
    }
  });

  test(`${kind}: failure to record history rolls back the rename and supports retry`, (t) => {
    const { api, db } = fixture(t);
    const original = initial(api);
    db.exec(`CREATE TRIGGER reject_slug_history BEFORE INSERT ON ${history} BEGIN SELECT RAISE(ABORT, 'simulated history failure'); END;`);
    assert.throws(() => api[save](original.id, { ...original, slug: 'fallo-atomico' }), /simulated history failure/);
    assert.equal(api[get]({ id: original.id }).slug, original.slug);
    assert.equal(api[resolve]('fallo-atomico'), null);
    assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM ${history}`).get().n, 0);
    db.exec('DROP TRIGGER reject_slug_history');
    api[save](original.id, { ...original, slug: 'fallo-atomico' });
    assert.equal(api[resolve](original.slug).slug, 'fallo-atomico');
  });
}

test('product and line URL namespaces remain independent', (t) => {
  const { api } = fixture(t);
  const product = api.listProducts()[0];
  const category = api.listCategories()[0];
  api.saveCategory(category.id, { ...category, slug: 'linea-actualizada' });
  api.saveProduct(product.id, { ...product, slug: category.slug });
  assert.equal(api.resolveProductSlug(category.slug).id, product.id);
  assert.equal(api.resolveCategorySlug(category.slug).id, category.id);
});

test('adding history to an existing catalog preserves its products and publication settings', (t) => {
  const f = fixture(t);
  f.db.exec('DROP TABLE product_slug_history; DROP TABLE category_slug_history; UPDATE products SET visible=0 WHERE id=1;');
  const before = JSON.stringify(f.db.prepare('SELECT * FROM products ORDER BY id').all());
  f.restart();
  assert.equal(JSON.stringify(f.db.prepare('SELECT * FROM products ORDER BY id').all()), before);
  assert.equal(f.api.listCategories({ includeHidden: true }).length, 8);
  assert.equal(f.api.listProducts({ includeHidden: true }).length, 32);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM product_slug_history').get().n, 0);
});

test('redirect URLs preserve searches, repeated tracking parameters and special characters', () => {
  const result = withSearchParams('/catalogo/linea-vigente', { q: 'TRACCIÓN & masaje', utm_source: ['correo', 'WhatsApp'], empty: '', missing: undefined });
  const url = new URL(result, 'https://example.test');
  assert.equal(url.pathname, '/catalogo/linea-vigente');
  assert.equal(url.searchParams.get('q'), 'TRACCIÓN & masaje');
  assert.deepEqual(url.searchParams.getAll('utm_source'), ['correo', 'WhatsApp']);
  assert.equal(url.searchParams.get('empty'), '');
  assert.equal(url.searchParams.has('missing'), false);
  assert.equal(withSearchParams('/producto/vigente', {}), '/producto/vigente');
});
