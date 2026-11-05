import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicConfig, productionConfig } from '../scripts/production-config.mjs';
const publicEnv = { SITE_URL: 'https://www.example.com', STORAGE_DRIVER: 'r2', GOOGLE_SITE_VERIFICATION: '' };
const build = { public: publicEnv };
const valid = { ...publicEnv, ADMIN_PASSWORD: 'a-strong-password-8173', SESSION_SECRET: 's'.repeat(64), TURNSTILE_SITE_KEY: 'site-key-fixture', TURNSTILE_SECRET_KEY: 'private-key-fixture', R2_ACCOUNT_ID: 'a'.repeat(32), R2_BUCKET: 'private', R2_ACCESS_KEY_ID: 'access', R2_SECRET_ACCESS_KEY: 'secret' };
test('producción exige origen HTTPS y configuración igual a la compilada', () => {
  assert.deepEqual(productionConfig(valid, build), publicEnv);
  for (const SITE_URL of ['', 'http://www.example.com', 'https://localhost', 'https://example.com/path', 'https://u:p@example.com', 'https://a.r2.cloudflarestorage.com']) {
    assert.throws(() => publicConfig({ ...publicEnv, SITE_URL }), /SITE_URL/);
  }
  for (const [key, value] of Object.entries({ SITE_URL: 'https://other.example.com', STORAGE_DRIVER: 'local', GOOGLE_SITE_VERIFICATION: 'changed' })) {
    assert.throws(() => productionConfig({ ...valid, [key]: value }, build), /difiere/);
  }
});
test('producción rechaza claves ausentes y mensajes no revelan valores', () => {
  for (const key of ['ADMIN_PASSWORD', 'SESSION_SECRET', 'TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY', 'R2_ACCOUNT_ID', 'R2_BUCKET', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']) {
    assert.throws(() => productionConfig({ ...valid, [key]: '' }, build), new RegExp(key));
  }
  assert.throws(() => productionConfig({ ...valid, ADMIN_PASSWORD: 'cambia-esta-contraseña' }, build), /ADMIN_PASSWORD/);
  assert.throws(() => productionConfig({ ...valid, SESSION_SECRET: 'secret' }, build), /SESSION_SECRET/);
});
test('configuración pública omitida se hereda de la imagen y local no exige R2', () => {
  const env = { ADMIN_PASSWORD: valid.ADMIN_PASSWORD, SESSION_SECRET: valid.SESSION_SECRET, TURNSTILE_SITE_KEY: valid.TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY: valid.TURNSTILE_SECRET_KEY };
  const local = { ...publicEnv, STORAGE_DRIVER: 'local' };
  assert.deepEqual(productionConfig(env, { public: local }), local);
});
test('producción rechaza las claves de prueba oficiales de Turnstile', () => {
  assert.throws(() => productionConfig({ ...valid, TURNSTILE_SITE_KEY: '1x00000000000000000000AA' }, build), /clave de prueba/);
  assert.throws(() => productionConfig({ ...valid, TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA' }, build), /clave de prueba/);
});
