const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadDatabase } = require('./helpers/db.cjs');
const { renderCatalog } = require('./helpers/render-catalog.cjs');
const vm = require('node:vm');
const ts = require('typescript');
const visibilityModule = { exports: {} };
vm.runInNewContext(ts.transpileModule(
  fs.readFileSync(path.resolve(__dirname, '../src/lib/product-visibility.ts'), 'utf8'),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } },
).outputText, { module: visibilityModule, exports: visibilityModule.exports });
const { getProductPublicationState, isProductPublished } = visibilityModule.exports;

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'icm-catalog-test-'));
  const api = loadDatabase(root, path.resolve(__dirname, '..'));
  const db = api.db();
  t.after(() => {
    db.close();
    assert.equal(path.dirname(root), os.tmpdir());
    assert.ok(path.basename(root).startsWith('icm-catalog-test-'));
    fs.rmSync(root, { recursive: true, force: true });
  });
  const render = (query = {}, active = null) => renderCatalog({
    categories: api.listCategories(),
    products: api.listProducts(query),
    active,
    q: query.search || '',
    total: api.countPublicProducts(),
  });
  const first = api.listProducts()[0];
  return { api, db, render, first };
}

function cardCount(html) {
  return (html.match(/class="pcard rv"/g) || []).length;
}

function assertTotal(html, total) {
  assert.ok(html.includes(`Todas <small>${total}</small>`));
}

test('visible products without a line appear exactly once and count toward Todas', (t) => {
  const { api, db, render, first } = fixture(t);
  db.prepare('UPDATE products SET category_id=NULL WHERE id=?').run(first.id);
  const html = render();
  assert.equal(cardCount(html), 32);
  assert.equal((html.match(new RegExp(`href="/producto/${first.slug}"`, 'g')) || []).length, 1);
  assert.ok(html.includes('<h2 class="cat-group-title">Otros productos</h2>'));
  assertTotal(html, 32);
  assert.equal(api.countPublicProducts(), api.listProducts().length);
});

test('removing a line keeps all of its visible products in the general catalog', (t) => {
  const { api, render, first } = fixture(t);
  const formerMembers = api.listProducts({ categoryId: first.categoryId });
  api.deleteCategory(first.categoryId);
  const html = render();
  assert.equal(cardCount(html), 32);
  assertTotal(html, 32);
  assert.ok(!html.includes(`href="/catalogo/${first.categorySlug}"`));
  for (const p of formerMembers) assert.ok(html.includes(`href="/producto/${p.slug}"`));
});

test('a catalog with no lines still displays all visible products', (t) => {
  const { api, db, render } = fixture(t);
  db.exec('DELETE FROM categories');
  assert.equal(api.listCategories().length, 0);
  const html = render();
  assert.equal(cardCount(html), 32);
  assertTotal(html, 32);
  assert.ok(html.includes('Otros productos'));
  assert.ok(!html.includes('class="cat-empty"'));
});

test('hidden unassigned products and products in hidden lines stay excluded from display and totals', (t) => {
  const { api, db, render, first } = fixture(t);
  db.prepare('UPDATE products SET category_id=NULL, visible=0 WHERE id=?').run(first.id);
  db.prepare('UPDATE categories SET visible=0 WHERE id=?').run(first.categoryId);
  const visible = api.listProducts();
  assert.ok(visible.length < 31);
  assert.equal(api.countPublicProducts(), visible.length);
  const html = render();
  assert.equal(cardCount(html), visible.length);
  assertTotal(html, visible.length);
  assert.ok(!html.includes(`href="/producto/${first.slug}"`));
  assert.ok(!html.includes('Otros productos'));
});

test('search finds unassigned products and preserves the full public total', (t) => {
  const { db, render, first } = fixture(t);
  db.prepare('UPDATE products SET category_id=NULL WHERE id=?').run(first.id);
  const html = render({ search: first.name });
  assert.equal(cardCount(html), 1);
  assert.ok(html.includes(`href="/producto/${first.slug}"`));
  assertTotal(html, 32);
  assert.ok(!html.includes('Otros productos'));
});

test('line filters exclude unassigned products without reducing the Todas total', (t) => {
  const { api, db, render, first } = fixture(t);
  const active = api.getCategory({ id: first.categoryId });
  const previousCount = api.listProducts({ categoryId: active.id }).length;
  db.prepare('UPDATE products SET category_id=NULL WHERE id=?').run(first.id);
  const html = render({ categoryId: active.id }, active);
  assert.equal(cardCount(html), previousCount - 1);
  assertTotal(html, 32);
  assert.ok(!html.includes(`href="/producto/${first.slug}"`));
});

test('publication states agree with public queries for every product and line visibility combination', (t) => {
  const { api, db, first } = fixture(t);
  for (const categoryVisible of [true, false, null]) {
    for (const visible of [true, false]) {
      db.prepare('UPDATE products SET visible=?, category_id=? WHERE id=?').run(visible ? 1 : 0, categoryVisible === null ? null : first.categoryId, first.id);
      if (categoryVisible !== null) db.prepare('UPDATE categories SET visible=? WHERE id=?').run(categoryVisible ? 1 : 0, first.categoryId);
      const p = api.getProduct({ id: first.id });
      assert.equal(p.categoryVisible, categoryVisible);
      assert.equal(api.getProduct({ slug: first.slug }).categoryVisible, categoryVisible);
      assert.equal(getProductPublicationState(p), !visible ? 'hidden' : categoryVisible === false ? 'hidden-by-category' : 'published');
      assert.equal(api.listProducts().some((item) => item.id === p.id), isProductPublished(p));
      const adminProducts = api.listProducts({ includeHidden: true });
      assert.equal(adminProducts.filter(isProductPublished).length, api.countPublicProducts());
      assert.equal(adminProducts.find((item) => item.id === p.id).categoryVisible, categoryVisible);
    }
  }
});

test('deleting a hidden line keeps its products hidden and preserves the rest of the catalog', (t) => {
  const { api, db, render, first } = fixture(t);
  const members = api.listProducts({ categoryId: first.categoryId });
  db.prepare('UPDATE categories SET visible=0 WHERE id=?').run(first.categoryId);
  db.prepare('UPDATE products SET visible=0 WHERE id=?').run(first.id);
  const before = api.countPublicProducts();
  const deleted = api.deleteCategory(first.categoryId);
  assert.equal(deleted.visible, false);
  assert.equal(api.getCategory({ id: first.categoryId }), null);
  assert.equal(api.countPublicProducts(), before);
  const html = render();
  for (const member of members) {
    const p = api.getProduct({ id: member.id });
    assert.equal(p.categoryId, null);
    assert.equal(p.categoryVisible, null);
    assert.equal(p.visible, false);
    assert.equal(p.name, member.name);
    assert.equal(p.image, member.image);
    assert.ok(!html.includes(`href="/producto/${p.slug}"`));
  }
  // Republishing is a deliberate individual action after deletion.
  api.toggleProductVisibility(first.id);
  assert.equal(isProductPublished(api.getProduct({ id: first.id })), true);
  assert.equal(api.countPublicProducts(), before + 1);
});

test('deleting a visible line preserves each product individual publication choice', (t) => {
  const { api, db, first } = fixture(t);
  const members = api.listProducts({ categoryId: first.categoryId });
  assert.ok(members.length > 1);
  db.prepare('UPDATE products SET visible=0 WHERE id=?').run(first.id);
  const before = api.countPublicProducts();
  assert.equal(api.deleteCategory(first.categoryId).visible, true);
  assert.equal(api.countPublicProducts(), before);
  assert.equal(api.getProduct({ id: first.id }).visible, false);
  for (const member of members.filter((p) => p.id !== first.id)) {
    const p = api.getProduct({ id: member.id });
    assert.equal(p.categoryId, null);
    assert.equal(isProductPublished(p), true);
  }
});

test('a failed line deletion rolls back changes to product visibility', (t) => {
  const { api, db, first } = fixture(t);
  db.prepare('UPDATE categories SET visible=0 WHERE id=?').run(first.categoryId);
  const before = JSON.stringify(db.prepare('SELECT * FROM products ORDER BY id').all());
  db.exec("CREATE TRIGGER reject_category_deletion BEFORE DELETE ON categories BEGIN SELECT RAISE(ABORT, 'simulated deletion failure'); END;");
  assert.throws(() => api.deleteCategory(first.categoryId), /simulated deletion failure/);
  assert.equal(JSON.stringify(db.prepare('SELECT * FROM products ORDER BY id').all()), before);
  assert.equal(api.getCategory({ id: first.categoryId }).visible, false);
  db.exec('DROP TRIGGER reject_category_deletion');
  assert.equal(api.deleteCategory(first.categoryId).visible, false);
});

test('individual activation cannot publish through a hidden line or overwrite other product fields', (t) => {
  const { api, db, first } = fixture(t);
  db.prepare('UPDATE categories SET visible=0 WHERE id=?').run(first.categoryId);
  db.prepare("UPDATE products SET visible=0, summary='Updated independently' WHERE id=?").run(first.id);
  api.toggleProductVisibility(first.id);
  let p = api.getProduct({ id: first.id });
  assert.equal(p.visible, true);
  assert.equal(getProductPublicationState(p), 'hidden-by-category');
  assert.equal(p.summary, 'Updated independently');
  assert.ok(!api.listProducts().some((item) => item.id === p.id));
  api.toggleProductVisibility(first.id);
  p = api.getProduct({ id: first.id });
  assert.equal(getProductPublicationState(p), 'hidden');
  assert.equal(p.summary, 'Updated independently');
});

test('deleting an absent line is harmless and leaves no transaction open', (t) => {
  const { api, first } = fixture(t);
  assert.equal(api.deleteCategory(-1), null);
  assert.equal(api.countPublicProducts(), 32);
  assert.ok(api.deleteCategory(first.categoryId));
  assert.equal(api.countPublicProducts(), 32);
});

test('product search matches accents, uppercase and decomposed Unicode consistently', (t) => {
  const { api } = fixture(t);
  const expected = api.listProducts({ search: 'tracción' }).map((p) => p.id).join(',');
  assert.ok(expected);
  for (const search of ['traccion', 'TRACCIÓN', 'TrAcCiÓn', 'traccio\u0301n', '  TRACCION  ']) {
    assert.equal(api.listProducts({ search }).map((p) => p.id).join(','), expected, search);
  }
  assert.equal(api.listProducts({ search: 'BAÑERA' })[0].slug, 'banera-de-hielo');
  assert.equal(api.listProducts({ search: 'banera' })[0].slug, 'banera-de-hielo');
  assert.equal(api.listProducts({ search: 'ELIPTICA' })[0].slug, 'mini-eliptica');
});

test('brand and summary searches use the same normalization without rewriting product data', (t) => {
  const { api, db, first } = fixture(t);
  db.prepare('UPDATE products SET brand=?, summary=? WHERE id=?').run('Áurea Médica', 'MÁXIMA precisión para evaluación', first.id);
  for (const search of ['AUREA MEDICA', 'máxima precisión', 'MAXIMA PRECISION', 'evaluacion']) {
    assert.ok(api.listProducts({ search }).some((p) => p.id === first.id), search);
  }
  const p = api.getProduct({ id: first.id });
  assert.equal(p.brand, 'Áurea Médica');
  assert.equal(p.summary, 'MÁXIMA precisión para evaluación');
});

test('search normalizes repeated whitespace and safely handles products with no brand', (t) => {
  const { api, db, first } = fixture(t);
  db.prepare('UPDATE products SET name=?, brand=NULL, summary=? WHERE id=?').run('Equipo   de\n Tracción', '', first.id);
  assert.equal(api.listProducts({ search: 'equipo\tde traccion' })[0].id, first.id);
  assert.equal(api.listProducts({ search: '   \t ' }).length, api.listProducts().length);
});

test('search treats wildcard and quote characters as literal text', (t) => {
  const { api, db, first } = fixture(t);
  assert.equal(api.listProducts({ search: '%' }).length, 0);
  assert.equal(api.listProducts({ search: '_' }).length, 0);
  assert.equal(api.listProducts({ search: "%' OR 1=1 --" }).length, 0);
  db.prepare('UPDATE products SET name=? WHERE id=?').run('Equipo 50%_A', first.id);
  for (const search of ['%', '_', '50%_a']) {
    const matches = api.listProducts({ search });
    assert.equal(matches.length, 1);
    assert.equal(matches[0].id, first.id);
  }
});

test('normalized search preserves category filters and product and category visibility rules', (t) => {
  const { api, db } = fixture(t);
  const p = api.listProducts({ search: 'traccion' })[0];
  const query = { search: 'TRACCIÓN', categoryId: p.categoryId };
  assert.equal(api.listProducts(query)[0].id, p.id);
  assert.equal(api.listProducts({ ...query, categoryId: -1 }).length, 0);
  db.prepare('UPDATE categories SET visible=0 WHERE id=?').run(p.categoryId);
  assert.equal(api.listProducts(query).length, 0);
  assert.equal(api.listProducts({ ...query, includeHidden: true })[0].id, p.id);
  db.prepare('UPDATE categories SET visible=1 WHERE id=?').run(p.categoryId);
  db.prepare('UPDATE products SET visible=0 WHERE id=?').run(p.id);
  assert.equal(api.listProducts(query).length, 0);
  assert.equal(api.listProducts({ ...query, includeHidden: true })[0].id, p.id);
});

test('normalized search immediately sees edits and keeps featured and limit filters', (t) => {
  const { api, db, first } = fixture(t);
  db.prepare('UPDATE products SET name=?, featured=1 WHERE id=?').run('Referencia técnica única', first.id);
  assert.equal(api.listProducts({ search: 'REFERENCIA TECNICA UNICA', featured: true, limit: 1 })[0].id, first.id);
  db.prepare('UPDATE products SET name=?, featured=0 WHERE id=?').run('Referencia actualizada', first.id);
  assert.equal(api.listProducts({ search: 'REFERENCIA TECNICA UNICA' }).length, 0);
  assert.equal(api.listProducts({ search: 'referencia actualizada', featured: true }).length, 0);
  assert.equal(api.listProducts({ search: 'referencia actualizada' })[0].id, first.id);
});


test('category links preserve special search characters and clearing stays in the active category', t => {
  const { api, render, first } = fixture(t);
  const active = api.getCategory({ id: first.categoryId });
  const search = 'tracción & 50% + equipo?';
  const html = render({ search, categoryId: active.id }, active);
  const encoded = new URLSearchParams({ q: search }).toString();
  assert.ok(html.includes('href="/catalogo?' + encoded + '"'));
  for (const category of api.listCategories()) {
    assert.ok(html.includes('href="/catalogo/' + category.slug + '?' + encoded + '"'));
  }
  assert.ok(html.includes('href="/catalogo/' + active.slug + '">Quitar búsqueda</a>'));
  assert.ok(html.includes('href="/catalogo/' + active.slug + '">Limpiar búsqueda</a>'));
});

test('empty search offers a broader search and WhatsApp with the exact query and category', t => {
  const { api, render, first } = fixture(t);
  const active = api.getCategory({ id: first.categoryId });
  const search = 'Referencia inexistente & especial';
  const html = render({ search, categoryId: active.id }, active);
  assert.ok(html.includes('No encontramos resultados para esta búsqueda'));
  assert.ok(html.includes('Buscar en todo el catálogo'));
  const contact = html.match(/href="([^"]+)"[^>]*>Consultar por WhatsApp/);
  assert.ok(contact);
  const url = new URL(contact[1].replaceAll('&amp;', '&'));
  assert.equal(url.hostname, 'wa.me');
  const message = url.searchParams.get('text');
  assert.ok(message.includes(search));
  assert.ok(message.includes(active.name));
  assert.equal(cardCount(html), 0);
  assertTotal(html, api.countPublicProducts());
});

test('a line without published products differs from an empty catalog and from a failed search', t => {
  const { api, db, render, first } = fixture(t);
  const active = api.getCategory({ id: first.categoryId });
  db.prepare('UPDATE products SET visible=0 WHERE category_id=?').run(active.id);
  const lineHtml = render({ categoryId: active.id }, active);
  assert.ok(lineHtml.includes('Esta línea todavía no tiene productos publicados'));
  assert.ok(lineHtml.includes('Ver todo el catálogo'));
  assert.ok(!lineHtml.includes('Limpiar búsqueda'));
  assert.ok(!lineHtml.includes('No encontramos resultados para esta búsqueda'));
  db.exec('UPDATE products SET visible=0');
  const catalogHtml = render();
  assert.ok(catalogHtml.includes('Todavía no hay productos publicados'));
  assert.ok(catalogHtml.includes('Consultar por WhatsApp'));
  assert.ok(!catalogHtml.includes('Buscar en todo el catálogo'));
});


test('admin line list offers public links only for visible categories', async t => {
  const { api, db, first } = fixture(t);
  db.prepare('UPDATE categories SET visible=0 WHERE id=?').run(first.categoryId);
  const hidden = api.getCategory({ id: first.categoryId });
  const { createElement } = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const module = { exports: {} };
  const source = path.resolve(__dirname, '../src/app/admin/(panel)/lineas/page.tsx');
  const compiled = ts.transpileModule(fs.readFileSync(source, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(compiled, { module, exports: module.exports, require: name => {
    if (name === '@/lib/db') return api;
    if (name === '@/lib/site') return { mediaUrl: file => '/media/' + file };
    if (name === '../../actions') return { deleteCategoryAction: () => {} };
    if (name === '../../ui/ConfirmSubmit') return { default: ({ children }) => createElement('button', { type: 'submit' }, children) };
    if (name === '../../ui/Flash') return { default: () => null };
    return require(name);
  } }, { filename: source });
  const html = renderToStaticMarkup(await module.exports.default({ searchParams: Promise.resolve({}) }));
  assert.ok(!html.includes('href="/catalogo/' + hidden.slug + '"'));
  assert.ok(html.includes('href="/admin/lineas/' + hidden.id + '"'));
  for (const category of api.listCategories()) {
    assert.ok(html.includes('href="/catalogo/' + category.slug + '"'));
  }
  assert.ok(html.includes('Ver en el sitio'));
});
