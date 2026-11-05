const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createTypeScriptLoader } = require('./helpers/typescript.cjs');
const { loadDatabase } = require('./helpers/db.cjs');
const sourceRoot = path.resolve(__dirname, '../src');
const domain = 'https://www.importcorporalmedical.com';

function seoFixture(env = {}) {
  const load = createTypeScriptLoader({ process: { env: { SITE_URL: domain, ...env } } });
  return load(path.join(sourceRoot, 'lib/seo.ts'));
}
function catalogFixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'icm-seo-test-'));
  const api = loadDatabase(dir, path.resolve(__dirname, '..')); const db = api.db();
  t.after(() => { db.close(); assert.equal(path.dirname(dir), os.tmpdir()); assert.ok(path.basename(dir).startsWith('icm-seo-test-')); fs.rmSync(dir, { recursive: true, force: true }); });
  return { api, db };
}

test('public metadata agrees on canonical, Open Graph and Twitter URLs', () => {
  const seo = seoFixture();
  const meta = seo.pageMetadata({ title: 'Catálogo', description: 'Equipos públicos', pathname: '/catalogo' });
  assert.equal(meta.alternates.canonical, domain + '/catalogo');
  assert.equal(meta.openGraph.url, meta.alternates.canonical);
  assert.equal(meta.openGraph.title, meta.twitter.title);
  assert.equal(meta.openGraph.description, meta.description);
  assert.equal(meta.twitter.images[0], domain + '/img/seo/site-card.png');
  assert.equal(meta.openGraph.images[0].width, 1200);
  assert.equal(meta.openGraph.images[0].height, 630);
  assert.equal(meta.robots.index, true);
});
test('search metadata is noindex and still allows following public links', () => {
  const meta = seoFixture().pageMetadata({ title: 'Búsqueda', description: 'Resultados', pathname: '/catalogo/masaje', noindex: true });
  assert.equal(meta.robots.index, false); assert.equal(meta.robots.follow, true);
  assert.equal(meta.alternates.canonical, domain + '/catalogo/masaje');
});
test('sitemap includes exactly the current public catalog with UTC modification dates', t => {
  const { api } = catalogFixture(t), seo = seoFixture();
  const sitemap = seo.buildSitemap(api.listCategories(), api.listProducts());
  assert.equal(sitemap.length, 45); assert.equal(new Set(sitemap.map(e => e.url)).size, 45);
  assert.ok(sitemap.every(e => e.url.startsWith(domain + '/') && !e.url.includes('?') && !e.url.includes('/admin')));
  const product = api.listProducts()[0];
  const item = sitemap.find(e => e.url === domain + '/producto/' + product.slug);
  assert.equal(item.lastModified.toISOString(), product.updatedAt.replace(' ', 'T') + '.000Z');
  assert.equal(item.images[0], domain + '/media/' + encodeURIComponent(product.image));
  assert.ok(!sitemap[0].lastModified); // Never fabricate a modification date for static content.
});
test('sitemap excludes hidden products and lines while retaining published uncategorized products', t => {
  const { api, db } = catalogFixture(t), seo = seoFixture();
  const first = api.listProducts()[0];
  db.prepare('UPDATE categories SET visible=0 WHERE id=?').run(first.categoryId);
  const other = api.listProducts()[0]; db.prepare('UPDATE products SET visible=0 WHERE id=?').run(other.id);
  const unassigned = api.listProducts()[0]; db.prepare('UPDATE products SET category_id=NULL WHERE id=?').run(unassigned.id);
  const sitemap = seo.buildSitemap(api.listCategories({ includeHidden: true }), api.listProducts({ includeHidden: true }));
  assert.ok(!sitemap.some(e => e.url.endsWith('/producto/' + first.slug)));
  assert.ok(!sitemap.some(e => e.url.endsWith('/producto/' + other.slug)));
  assert.ok(!sitemap.some(e => e.url.endsWith('/catalogo/' + first.categorySlug)));
  assert.ok(sitemap.some(e => e.url.endsWith('/producto/' + unassigned.slug)));
});
test('sitemap immediately reflects renamed and deleted records without historical URLs', t => {
  const { api } = catalogFixture(t), seo = seoFixture();
  const p = api.listProducts()[0]; api.saveProduct(p.id, { ...p, slug: 'nuevo-enlace-seo' });
  let sitemap = seo.buildSitemap(api.listCategories(), api.listProducts());
  assert.ok(sitemap.some(e => e.url.endsWith('/producto/nuevo-enlace-seo')));
  assert.ok(!sitemap.some(e => e.url.endsWith('/producto/' + p.slug)));
  api.deleteProduct(p.id);
  sitemap = seo.buildSitemap(api.listCategories(), api.listProducts());
  assert.ok(!sitemap.some(e => e.url.endsWith('/producto/nuevo-enlace-seo')));
});
test('robots advertises the sitemap and permits reading noindex directives', () => {
  const seo = seoFixture();
  const load = createTypeScriptLoader({}, { '@/lib/seo': seo });
  const robots = load(path.join(sourceRoot, 'app/robots.ts')).default();
  assert.equal(robots.rules.allow, '/'); assert.equal(robots.rules.disallow, undefined);
  assert.equal(robots.sitemap, domain + '/sitemap.xml');
});
test('structured breadcrumbs have ordered positions and canonical absolute addresses', () => {
  const data = seoFixture().breadcrumbData([{ name: 'Inicio', pathname: '/' }, { name: 'Catálogo', pathname: '/catalogo' }]);
  assert.equal(data['@type'], 'BreadcrumbList');
  assert.equal(data.itemListElement[0].position, 1); assert.equal(data.itemListElement[1].position, 2);
  assert.equal(data.itemListElement[1].item, domain + '/catalogo');
});
test('JSON-LD escapes HTML script boundaries without changing the public text', () => {
  const seo = seoFixture(), data = { name: '</script><script>alert(1)</script>' };
  const encoded = seo.jsonLd(data);
  assert.ok(!encoded.includes('<')); assert.equal(JSON.parse(encoded).name, data.name);
});
test('production rejects missing, local and R2 site URLs', () => {
  assert.throws(() => seoFixture({ NODE_ENV: 'production', SITE_URL: '' }), /SITE_URL/);
  assert.throws(() => seoFixture({ NODE_ENV: 'production', SITE_URL: 'http://localhost:3000' }), /SITE_URL/);
  assert.throws(() => seoFixture({ SITE_URL: 'https://' + 'a'.repeat(32) + '.r2.cloudflarestorage.com/bucket' }), /SITE_URL/);
  assert.equal(seoFixture({ NODE_ENV: 'production' }).absoluteUrl('/catalogo'), domain + '/catalogo');
});
test('R2 public image routes are shared by social metadata and organization markup', () => {
  const seo = seoFixture({ STORAGE_DRIVER: 'r2' });
  const meta = seo.pageMetadata({ title: 'Inicio', description: 'Catálogo', pathname: '/' });
  assert.equal(meta.twitter.images[0], domain + '/assets/seo/site-card.png');
  assert.equal(seo.organizationData().logo, domain + '/assets/logo.png');
});
