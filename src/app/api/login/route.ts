import { ACCESS_COOKIE, hasAccess, readJson, sameSecret } from '@/engine/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/login — whether this device is signed in.
export function GET(request: Request) {
  return Response.json({ ok: hasAccess(request) });
}

// POST /api/login — trade the access code for a long-lived cookie, so the app (and the audio
// player, which can't send headers) is let in on every request after.
export async function POST(request: Request) {
  const token = process.env.MARGIN_API_TOKEN;
  if (!token) return Response.json({ ok: process.env.NODE_ENV !== 'production' }, { status: process.env.NODE_ENV === 'production' ? 503 : 200 });
  const code = (await readJson<{ code?: string }>(request))?.code?.trim();
  if (!code || !sameSecret(code, token)) {
    await new Promise((r) => setTimeout(r, 800));
    return Response.json({ ok: false, error: 'That code isn’t right.' }, { status: 401 });
  }
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return Response.json({ ok: true }, {
    headers: { 'set-cookie': `${ACCESS_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=34560000; HttpOnly; SameSite=Lax${secure}` },
  });
}
