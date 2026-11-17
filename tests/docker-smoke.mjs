// Explicit opt-in: node tests/docker-smoke.mjs IMAGE_BUILT_WITH_STORAGE_DRIVER_LOCAL [PREVIOUS_IMAGE]
// Creates and removes only its own randomly named Compose project and volumes.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const image = process.argv[2];
if (!image) throw new Error('Indica una imagen de prueba compilada con STORAGE_DRIVER=local.');
const project = `icm-smoke-${crypto.randomBytes(6).toString('hex')}`;
const volume = `${project}-data`, snapshot = `${project}-snapshot`, imported = `${project}-import`;
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'icm-docker-test-'));
const envFile = path.join(temp, 'runtime.env');
const env = { ...process.env, APP_IMAGE: image, ICM_ENV_FILE: envFile, ICM_DATA_VOLUME: volume, ICM_HTTP_PORT: '3289' };
function docker(args, expected = 0) {
  const result = spawnSync('docker', args, { env, encoding: 'utf8', timeout: 180000 });
  assert.equal(result.status, expected, result.stdout + result.stderr);
  return result.stdout.trim();
}
function compose(...args) { return docker(['compose', '--env-file', envFile, '-p', project, ...args]); }
function exec(js) { return compose('exec', '-T', 'web', 'node', '-e', js); }
const build = JSON.parse(docker(['run', '--rm', '--network', 'none', image, 'cat', 'build-info.json']));
assert.equal(build.public.STORAGE_DRIVER, 'local', 'Esta prueba nunca utiliza credenciales R2.');
if (process.argv[3]) docker(['image', 'inspect', process.argv[3]]);
fs.writeFileSync(envFile, Object.entries({ ...build.public, ADMIN_PASSWORD: crypto.randomBytes(20).toString('hex'), SESSION_SECRET: crypto.randomBytes(32).toString('hex'), TURNSTILE_SITE_KEY: 'local-smoke-site-key', TURNSTILE_SECRET_KEY: 'local-smoke-secret-key', ALLOW_CATALOG_INITIALIZATION: 'true' }).map(([key, value]) => `${key}=${value}`).join('\n'));
Object.assign(env, build.public);
async function health() {
  const result = JSON.parse(exec("fetch('http://127.0.0.1:3000/api/health').then(async r=>console.log(JSON.stringify({code:r.status,cache:r.headers.get('cache-control'),...await r.json()})))"));
  assert.equal(result.code, 200);
  assert.equal(result.status, 'ok');
  assert.equal(result.version, build.version);
  assert.equal(result.cache, 'no-store');
}
try {
  compose('config', '--quiet');
  compose('up', '-d', '--no-build', '--wait', '--wait-timeout', '120', 'web');
  await health();
  console.log('PASS: arranque y salud.');
  assert.equal(exec('console.log(process.getuid())'), '1000');
  assert.match(exec("require('sharp')({create:{width:1,height:1,channels:3,background:'white'}}).webp().toBuffer().then(b=>console.log(b.length))"), /^\d+$/);
  const info = JSON.parse(exec("const d=new(require('node:sqlite').DatabaseSync)('/app/data/app.db'); console.log(JSON.stringify({count:d.prepare('SELECT COUNT(*) n FROM products').get().n,slug:d.prepare('SELECT slug FROM products LIMIT 1').get().slug})); d.close()"));
  assert.ok(info.count > 0);
  for (const url of ['/', '/catalogo', `/producto/${info.slug}`, '/admin/login', '/robots.txt', '/sitemap.xml']) {
    const response = await fetch(`http://127.0.0.1:3289${url}`);
    assert.equal(response.status, 200, url);
    await response.arrayBuffer();
  }
  // Missing records need a real status; streaming would turn these into soft 404s.
  for (const url of ['/producto/no-existe-prueba', '/catalogo/no-existe-prueba']) {
    const response = await fetch(`http://127.0.0.1:3289${url}`);
    assert.equal(response.status, 404, url);
    await response.arrayBuffer();
  }
  exec("const d=new(require('node:sqlite').DatabaseSync)('/app/data/app.db');d.exec(\"PRAGMA busy_timeout=5000; UPDATE products SET summary='PERSISTENCE_SMOKE_MARKER' WHERE id=(SELECT MIN(id) FROM products)\");d.close()");
  fs.writeFileSync(envFile, fs.readFileSync(envFile, 'utf8').replace('ALLOW_CATALOG_INITIALIZATION=true', 'ALLOW_CATALOG_INITIALIZATION=false'));
  compose('up', '-d', '--no-build', '--force-recreate', '--wait', '--wait-timeout', '120', 'web');
  await health();
  const verifyMarker = () => assert.equal(exec("const d=new(require('node:sqlite').DatabaseSync)('/app/data/app.db');console.log(d.prepare('SELECT summary FROM products ORDER BY id LIMIT 1').get().summary);d.close()"), 'PERSISTENCE_SMOKE_MARKER');
  verifyMarker();
  console.log('PASS: datos conservados al recrear el contenedor.');
  if (process.argv[3]) {
    env.APP_IMAGE = process.argv[3];
    compose('up', '-d', '--no-build', '--wait', '--wait-timeout', '120', 'web');
    verifyMarker();
    console.log('PASS: datos conservados al cambiar de imagen.');
    env.APP_IMAGE = image;
    compose('up', '-d', '--no-build', '--wait', '--wait-timeout', '120', 'web');
    await health();
    verifyMarker();
    console.log('PASS: datos conservados al volver a la imagen inicial.');
  }
  // Maintenance CLI must remain runnable after npm prune, without any R2 access.
  compose('exec', '-T', 'web', 'npm', 'run', 'storage:backup');
  compose('stop', 'web');
  docker(['volume', 'create', snapshot]);
  docker(['volume', 'create', imported]);
  docker(['run', '--rm', '--network', 'none', '--mount', `type=volume,source=${volume},target=/source,readonly`, '--mount', `type=volume,source=${snapshot},target=/app/data`, image, 'node', 'scripts/catalog-snapshot.mjs', 'export', '/source', '/app/data/snapshot']);
  docker(['run', '--rm', '--network', 'none', '--mount', `type=volume,source=${snapshot},target=/transfer,readonly`, '--mount', `type=volume,source=${imported},target=/app/data`, image, 'node', 'scripts/catalog-snapshot.mjs', 'import', '/transfer/snapshot', '/app/data']);
  const marker = docker(['run', '--rm', '--network', 'none', '--mount', `type=volume,source=${imported},target=/app/data`, image, 'node', '-e', "const d=new(require('node:sqlite').DatabaseSync)('/app/data/app.db');console.log(d.prepare('SELECT summary FROM products ORDER BY id LIMIT 1').get().summary);d.close()"]);
  assert.equal(marker, 'PERSISTENCE_SMOKE_MARKER');
  console.log('PASS: Docker sin root, rutas públicas, salud, sharp, CLI, recreación, traslado SQLite y persistencia' + (process.argv[3] ? ', actualización y retorno.' : '.'));
} finally {
  compose('down', '--remove-orphans');
  for (const owned of [volume, snapshot, imported]) {
    // Names are generated above; never use a caller-supplied persistent volume.
    if (!owned.startsWith(`${project}-`)) throw new Error('Volumen ajeno.');
    const result = spawnSync('docker', ['volume', 'rm', owned], { encoding: 'utf8' });
    if (result.status !== 0 && !result.stderr.toLowerCase().includes('no such volume')) console.error(result.stderr);
  }
  fs.rmSync(temp, { recursive: true, force: true });
}
