const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createTypeScriptLoader } = require('./helpers/typescript.cjs');
const env = { NODE_ENV: 'production', SITE_URL: 'https://www.importcorporalmedical.com', TURNSTILE_SITE_KEY: 'public-fixture', TURNSTILE_SECRET_KEY: 'private-fixture' };
const valid = { success: true, hostname: 'www.importcorporalmedical.com', action: 'admin_login' };
function fixture(reply = valid, extra = {}, fetchOverride) {
  const requests = [];
  const fetch = fetchOverride || (async (url, options) => { requests.push({ url, options }); return { ok: true, json: async () => reply }; });
  const api = createTypeScriptLoader({ process: { env: { ...env, ...extra } }, fetch, AbortSignal })(path.resolve('src/lib/turnstile.ts'));
  return { ...api, requests };
}
test('Turnstile valida token en Cloudflare y exige dominio y acción de login', async () => {
  const f = fixture(); assert.equal(await f.verifyLoginChallenge('token', '203.0.113.10'), true);
  assert.equal(f.requests.length, 1);
  const { url, options } = f.requests[0];
  assert.equal(url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
  assert.equal(options.method, 'POST'); assert.equal(options.cache, 'no-store');
  assert.equal(options.body.get('secret'), env.TURNSTILE_SECRET_KEY);
  assert.equal(options.body.get('remoteip'), '203.0.113.10');
  for (const reply of [{ ...valid, hostname: 'attacker.example' }, { ...valid, action: 'another_form' }, { ...valid, action: undefined }, { ...valid, success: 'true' }, { success: false, 'error-codes': ['timeout-or-duplicate'] }, null]) {
    assert.equal(await fixture(reply).verifyLoginChallenge('token'), false);
  }
});
test('Turnstile rechaza tokens ausentes, archivos y tamaño excesivo sin llamar a Cloudflare', async () => {
  const f = fixture();
  for (const token of [null, '', new Blob(['not a token']), 'x'.repeat(2049)]) assert.equal(await f.verifyLoginChallenge(token), false);
  assert.equal(f.requests.length, 0);
});
test('Turnstile falla cerrado ante errores de red, HTTP o JSON y configuración incompleta', async () => {
  for (const fetch of [async () => { throw new Error('timeout'); }, async () => ({ ok: false }), async () => ({ ok: true, json: async () => { throw new Error('invalid json'); } })]) {
    assert.equal(await fixture(valid, {}, fetch).verifyLoginChallenge('token'), false);
  }
  assert.equal(await fixture(valid, { TURNSTILE_SECRET_KEY: '' }).verifyLoginChallenge('token'), false);
  assert.equal(await fixture(valid, { TURNSTILE_SITE_KEY: '', TURNSTILE_SECRET_KEY: '' }).verifyLoginChallenge('token'), false);
  const local = fixture(valid, { NODE_ENV: 'development', TURNSTILE_SITE_KEY: '', TURNSTILE_SECRET_KEY: '' });
  assert.equal(await local.verifyLoginChallenge(null), true); assert.equal(local.requests.length, 0);
});
function loginFixture(challengeValid) {
  const calls = { password: 0, session: 0, challenge: 0 }; let passwordValid = true;
  const overrides = {
    'next/headers': { headers: async () => new Map([['x-forwarded-for', '203.0.113.20']]) },
    'next/navigation': { redirect: () => { throw new Error('REDIRECT'); } },
    'next/cache': {}, '@/lib/db': {}, '@/lib/uploads': {}, '@/lib/slug': {}, '@/lib/product-details': {},
    '@/lib/auth': { checkPassword: () => { calls.password++; return passwordValid; }, createSession: async () => { calls.session++; } },
    '@/lib/turnstile': { verifyLoginChallenge: async () => { calls.challenge++; return challengeValid; } },
  };
  const api = createTypeScriptLoader({}, overrides)(path.resolve('src/app/admin/actions.ts'));
  return { ...api, calls, wrongPassword: () => { passwordValid = false; } };
}
test('login no comprueba contraseña ni crea sesión si Turnstile falla', async () => {
  const f = loginFixture(false); const result = await f.login(undefined, new FormData());
  assert.match(result.error, /verificación/); assert.equal(f.calls.password, 0); assert.equal(f.calls.session, 0);
});
test('login exige también contraseña correcta después de Turnstile y conserva límite de intentos', async () => {
  const f = loginFixture(true); f.wrongPassword();
  for (let i = 0; i < 8; i++) assert.match((await f.login(undefined, new FormData())).error, /Contraseña incorrecta/);
  assert.match((await f.login(undefined, new FormData())).error, /Demasiados intentos/);
  assert.equal(f.calls.challenge, 8); assert.equal(f.calls.session, 0);
  const success = loginFixture(true);
  await assert.rejects(() => success.login(undefined, new FormData()), /REDIRECT/);
  assert.equal(success.calls.session, 1);
});
