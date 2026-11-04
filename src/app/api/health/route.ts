import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
  try {
    db().prepare('SELECT 1 FROM products LIMIT 1').get();
    return Response.json({ status: 'ok', version: process.env.APP_VERSION || 'development', revision: process.env.GIT_REVISION || 'unknown' }, { headers });
  } catch {
    console.error('Healthcheck: el catálogo no está disponible.');
    return Response.json({ status: 'unavailable' }, { status: 503, headers });
  }
}
