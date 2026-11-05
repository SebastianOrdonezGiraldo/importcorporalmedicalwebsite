import 'server-only';

export const TURNSTILE_LOGIN_ACTION = 'admin_login';

export function turnstileSiteKey(): string {
  const siteKey = process.env.TURNSTILE_SITE_KEY?.trim() || '';
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim() || '';
  if (!siteKey && !secret && process.env.NODE_ENV !== 'production') return '';
  if (!siteKey || !secret) throw new Error('Falta configurar Turnstile para el acceso administrativo.');
  return siteKey;
}

export async function verifyLoginChallenge(token: FormDataEntryValue | null, remoteIp?: string): Promise<boolean> {
  try {
    if (!turnstileSiteKey()) return true; // Local development only, with neither key configured.
    if (typeof token !== 'string' || !token || token.length > 2048) return false;
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY!.trim(), response: token,
        ...(remoteIp ? { remoteip: remoteIp } : {}),
      }),
      cache: 'no-store', signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return false;
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object') return false;
    const result = data as { success?: unknown; hostname?: unknown; action?: unknown };
    const hostname = new URL(process.env.SITE_URL || 'http://localhost:3000').hostname;
    return result.success === true && result.hostname === hostname && result.action === TURNSTILE_LOGIN_ACTION;
  } catch {
    // Never authenticate when the verification service or configuration fails.
    return false;
  }
}
