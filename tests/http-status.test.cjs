const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Streaming fixes the status at 200 before a page can run. notFound() would then be a
// soft 404 and permanentRedirect() a client-side meta refresh instead of a real 308.
const app = path.resolve(__dirname, '../src/app');
const files = fs.readdirSync(app, { recursive: true }).map(String)
  .filter((file) => !file.split(path.sep).includes('admin'));

test('public pages have no loading boundary that would start streaming early', () => {
  assert.deepEqual(files.filter((file) => /^loading\.[jt]sx?$/.test(path.basename(file))), []);
});

test('public pages have no Suspense boundary that would start streaming early', () => {
  const pages = files.filter((file) => /\.[jt]sx$/.test(file));
  assert.ok(pages.length > 0);
  assert.deepEqual(pages.filter((file) => /\bSuspense\b/.test(fs.readFileSync(path.join(app, file), 'utf8'))), []);
});
