const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');
const sdk = require('@aws-sdk/client-s3');
const { createTypeScriptLoader } = require('./helpers/typescript.cjs');

function fixture(t, driver = 'r2') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'icm-storage-test-'));
  fs.mkdirSync(path.join(dir, 'uploads'));
  const objects = new Map(), calls = [];
  const env = { DATA_DIR: dir, STORAGE_DRIVER: driver, R2_ACCOUNT_ID: 'a'.repeat(32), R2_BUCKET: 'private-test', R2_PREFIX: 'test-project', R2_ACCESS_KEY_ID: 'test-access', R2_SECRET_ACCESS_KEY: 'test-secret' };
  const state = { fail: null };
  class Client {
    constructor(config) { assert.equal(config.region, 'auto'); assert.match(config.endpoint, /\.r2\.cloudflarestorage\.com$/); }
    async send(command) {
      calls.push(command);
      if (state.fail) throw state.fail;
      const p = command.input;
      assert.equal(p.Bucket, env.R2_BUCKET);
      assert.ok(p.Key.startsWith('test-project/'));
      if (command instanceof sdk.PutObjectCommand) {
        if (objects.has(p.Key) && p.IfNoneMatch === '*') throw Object.assign(new Error('exists'), { $metadata: { httpStatusCode: 412 } });
        objects.set(p.Key, Buffer.from(p.Body)); return {};
      }
      if (command instanceof sdk.DeleteObjectCommand) { objects.delete(p.Key); return {}; }
      if (!objects.has(p.Key)) throw Object.assign(new Error('missing'), { name: 'NoSuchKey', $metadata: { httpStatusCode: 404 } });
      return { Body: { transformToByteArray: async () => objects.get(p.Key) } };
    }
  }
  const load = createTypeScriptLoader({ Buffer, Response, Request, console: { error() {} }, process: { env, cwd: () => path.resolve(__dirname, '..') } }, { '@aws-sdk/client-s3': { ...sdk, S3Client: Client } });
  const source = (name) => load(path.resolve(__dirname, '../src/lib', name + '.ts'));
  t.after(() => {
    // Close the real fixture database if an upload cleanup initialized it.
    if (state.db) state.db.close();
    assert.equal(path.dirname(dir), os.tmpdir());
    assert.ok(path.basename(dir).startsWith('icm-storage-test-'));
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return { dir, objects, calls, env, state, source };
}

test('R2 writes and reads the same bytes with scoped keys and immutable metadata', async t => {
  const f = fixture(t), store = f.source('storage');
  await store.writeStoredFile('media/photo.webp', Buffer.from('photo'), 'image/webp');
  assert.equal((await store.readStoredFile('media/photo.webp')).toString(), 'photo');
  const put = f.calls.find(c => c instanceof sdk.PutObjectCommand).input;
  assert.equal(put.Key, 'test-project/media/photo.webp');
  assert.equal(put.ContentType, 'image/webp');
  assert.equal(put.Metadata.sha256, store.sha256(Buffer.from('photo')));
  assert.equal(put.IfNoneMatch, '*');
  assert.match(put.CacheControl, /immutable/);
  assert.equal(fs.existsSync(path.join(f.dir, 'uploads/photo.webp')), false);
});
test('missing legacy R2 images fall back locally; permission and network errors do not', async t => {
  const f = fixture(t), store = f.source('storage');
  fs.writeFileSync(path.join(f.dir, 'uploads/legacy.jpg'), 'legacy');
  assert.equal((await store.readStoredFile('media/legacy.jpg')).toString(), 'legacy');
  f.state.fail = Object.assign(new Error('denied'), { $metadata: { httpStatusCode: 403 } });
  await assert.rejects(store.readStoredFile('media/legacy.jpg'), /denied/);
  f.state.fail = new Error('offline');
  await assert.rejects(store.readStoredFile('media/legacy.jpg'), /offline/);
  f.state.fail = Object.assign(new Error('wrong bucket'), { name: 'NoSuchBucket', $metadata: { httpStatusCode: 404 } });
  await assert.rejects(store.readStoredFile('media/legacy.jpg'), /wrong bucket/);
});
test('R2 outages never silently write to the local disk', async t => {
  const f = fixture(t), store = f.source('storage'); f.state.fail = new Error('offline');
  await assert.rejects(store.writeStoredFile('media/photo.webp', Buffer.from('x'), 'image/webp'), /offline/);
  assert.deepEqual(fs.readdirSync(path.join(f.dir, 'uploads')), []);
});
test('incomplete R2 configuration fails explicitly without falling back locally', async t => {
  const f = fixture(t); delete f.env.R2_SECRET_ACCESS_KEY;
  await assert.rejects(f.source('storage').writeStoredFile('media/photo.webp', Buffer.from('x'), 'image/webp'), /R2_SECRET_ACCESS_KEY/);
  assert.equal(f.calls.length, 0);
});
test('file paths and project prefixes cannot traverse or escape their namespace', async t => {
  const f = fixture(t), store = f.source('storage');
  for (const key of ['media/../secret', '/media/a.jpg', 'media//a.jpg', 'media/a\\b.jpg']) {
    await assert.rejects(store.writeStoredFile(key, Buffer.from('x'), 'image/webp'), /no válido/);
  }
  assert.equal(f.calls.length, 0);
  const other = fixture(t); other.env.R2_PREFIX = '../other-project';
  assert.throws(() => other.source('storage').r2Storage(), /R2_PREFIX/);
  assert.throws(() => store.localPath('../a'), /no válido/);
});
test('local mode supports upload, read and delete without R2 credentials', async t => {
  const f = fixture(t, 'local'), store = f.source('storage');
  await store.writeStoredFile('media/local.webp', Buffer.from('local'), 'image/webp');
  assert.equal((await store.readStoredFile('media/local.webp')).toString(), 'local');
  await store.removeStoredFile('media/local.webp');
  assert.equal(fs.existsSync(path.join(f.dir, 'uploads/local.webp')), false);
  assert.equal(f.calls.length, 0);
});
test('image responses distinguish missing files from storage failure and preserve cache headers', async t => {
  const f = fixture(t), serve = f.source('serve-image').serveImage;
  f.objects.set('test-project/media/photo.webp', Buffer.from('photo'));
  const image = await serve('media/photo.webp');
  assert.equal(image.status, 200); assert.equal(await image.text(), 'photo');
  assert.equal(image.headers.get('content-type'), 'image/webp');
  assert.match(image.headers.get('cache-control'), /immutable/);
  assert.equal((await serve('media/missing.webp')).status, 404);
  assert.equal((await serve('media/app.db')).status, 404);
  f.state.fail = new Error('offline');
  const unavailable = await serve('media/photo.webp');
  assert.equal(unavailable.status, 503); assert.equal(unavailable.headers.get('cache-control'), 'no-store');
});
test('backup objects are private and are not in the image-serving namespace', async t => {
  const f = fixture(t), store = f.source('storage');
  await store.r2Storage().write('backups/snapshot/app.db', Buffer.from('db'), 'application/vnd.sqlite3');
  assert.equal(f.calls[0].input.CacheControl, 'private, no-store');
  assert.equal((await f.source('serve-image').serveImage('assets/backups/snapshot/app.db')).status, 404);
});
test('uploads process real pixels, keep referenced images and remove unused R2 objects', async t => {
  const f = fixture(t), uploads = f.source('uploads');
  const input = await sharp({ create: { width: 1600, height: 1000, channels: 3, background: '#aabbcc' } }).png().toBuffer();
  const name = await uploads.saveUpload(new File([input], 'image.png', { type: 'image/png' }), 'Test product');
  assert.match(name, /^testproduct-[a-f0-9]{24}\.webp$/);
  const bytes = f.objects.get('test-project/media/' + name);
  const meta = await sharp(bytes).metadata();
  assert.equal(meta.format, 'webp'); assert.equal(meta.width, 1200); assert.equal(meta.height, 750);
  const api = f.source('db'); f.state.db = api.db();
  const p = api.listProducts({ includeHidden: true })[0]; api.saveProduct(p.id, { ...p, image: name });
  await uploads.removeIfUnused(name); assert.ok(f.objects.has('test-project/media/' + name));
  api.saveProduct(p.id, { ...p, image: p.image });
  await uploads.removeIfUnused(name); assert.equal(f.objects.has('test-project/media/' + name), false);
});
test('invalid image contents and oversized uploads never reach R2', async t => {
  const f = fixture(t), uploads = f.source('uploads');
  await assert.rejects(uploads.saveUpload(new File(['not an image'], 'fake.jpg'), 'test'), /imagen válida/);
  await assert.rejects(uploads.saveUpload(new File([Buffer.alloc(6 * 1024 * 1024 + 1)], 'big.jpg'), 'test'), /6 MB/);
  assert.equal(f.calls.length, 0);
});
test('migration verifies bytes, skips identical files and refuses conflicting objects', async t => {
  const f = fixture(t), transfer = f.source('storage-transfer');
  assert.equal(await transfer.putVerified('media/a.webp', Buffer.from('original'), 'image/webp'), 'uploaded');
  assert.equal(await transfer.putVerified('media/a.webp', Buffer.from('original'), 'image/webp'), 'existing');
  await assert.rejects(transfer.putVerified('media/a.webp', Buffer.from('different'), 'image/webp'), /Conflicto/);
  assert.equal(f.objects.get('test-project/media/a.webp').toString(), 'original');
  assert.equal(f.calls.filter(c => c instanceof sdk.PutObjectCommand).length, 1);
});
test('SQLite snapshots include committed WAL changes and can be read independently', async t => {
  const f = fixture(t), { DatabaseSync } = require('node:sqlite');
  const sourceFile = path.join(f.dir, 'active.db'), destination = path.join(f.dir, 'backup.db');
  const active = new DatabaseSync(sourceFile); f.state.db = active;
  active.exec("PRAGMA journal_mode=WAL; CREATE TABLE proof (value TEXT); INSERT INTO proof VALUES ('committed')");
  f.source('storage-transfer').snapshotDatabase(sourceFile, destination);
  const restored = new DatabaseSync(destination, { readOnly: true });
  try { assert.equal(restored.prepare('SELECT value FROM proof').get().value, 'committed'); }
  finally { restored.close(); }
  active.exec("INSERT INTO proof VALUES ('later')");
  const oldSnapshot = new DatabaseSync(destination, { readOnly: true });
  try { assert.equal(oldSnapshot.prepare('SELECT COUNT(*) AS n FROM proof').get().n, 1); }
  finally { oldSnapshot.close(); }
});
test('failed cleanup preserves the object if database references cannot be checked', async t => {
  const f = fixture(t), uploads = f.source('uploads'), api = f.source('db');
  const db = api.db(); db.close();
  f.objects.set('test-project/media/unverified.webp', Buffer.from('photo'));
  await uploads.removeIfUnused('unverified.webp');
  assert.ok(f.objects.has('test-project/media/unverified.webp'));
  assert.equal(f.calls.length, 0);
});
