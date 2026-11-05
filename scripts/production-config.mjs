export function publicConfig(env) {
  let origin;
  try {
    const url = new URL(env.SITE_URL);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
        ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.hostname.endsWith('.r2.cloudflarestorage.com')) throw new Error();
    origin = url.origin;
  } catch { throw new Error('SITE_URL debe ser el origen HTTPS público del portal.'); }
  const storage = env.STORAGE_DRIVER || 'r2';
  if (!['local', 'r2'].includes(storage)) throw new Error('STORAGE_DRIVER debe ser local o r2.');
  return { SITE_URL: origin, STORAGE_DRIVER: storage, GOOGLE_SITE_VERIFICATION: env.GOOGLE_SITE_VERIFICATION || '' };
}

export function productionConfig(env, build) {
  const config = publicConfig({ ...build.public, ...env });
  for (const key of Object.keys(config)) {
    if (config[key] !== build.public[key]) throw new Error(`${key} difiere de la imagen compilada; construye otra versión.`);
  }
  if (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 12 || /cambia|change.?me|example/i.test(env.ADMIN_PASSWORD)) {
    throw new Error('ADMIN_PASSWORD debe ser propia y tener al menos 12 caracteres.');
  }
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET debe tener al menos 32 caracteres aleatorios.');
  for (const key of ['TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY']) {
    if (!env[key]?.trim()) throw new Error(`Falta ${key} para proteger el acceso administrativo.`);
    if (/^[123]x0{10,}/.test(env[key])) throw new Error(`${key} no puede ser una clave de prueba en producción.`);
  }
  if (config.STORAGE_DRIVER === 'r2') {
    for (const key of ['R2_ACCOUNT_ID', 'R2_BUCKET', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']) {
      if (!env[key]?.trim()) throw new Error(`Falta ${key}.`);
    }
    if (!/^[a-f0-9]{32}$/i.test(env.R2_ACCOUNT_ID)) throw new Error('R2_ACCOUNT_ID no es válido.');
  }
  return config;
}
