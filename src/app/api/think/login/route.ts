import { readJson, sameSecret } from '@/engine/server';
import { hasThinkAccess, THINK_ACCESS_COOKIE, typedCode } from '@/think/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/think/login: whether this device may use Deep Think without an account.
export function GET(request: Request) {
  return Response.json({ ok: hasThinkAccess(request) });
}

// POST /api/think/login: trade Deep Think's access code (or the listening app's) for a
// long-lived cookie on this device.
export async function POST(request: Request) {
  const think = process.env.THINK_ACCESS_CODE;
  const margin = process.env.MARGIN_API_TOKEN;
  if (!think && !margin) {
    if (process.env.NODE_ENV !== 'production') return Response.json({ ok: true });
    return Response.json({ ok: false, error: 'Deep Think isn’t set up yet: it has no access code.' }, { status: 503 });
  }
  const code = (await readJson<{ code?: string }>(request))?.code;
  const match = [think, margin].find((c) => !!c && !!code && sameSecret(typedCode(code), typedCode(c)));
  if (!match) {
    await new Promise((r) => setTimeout(r, 800));
    return Response.json({ ok: false, error: 'That code isn’t right.' }, { status: 401 });
  }
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return Response.json({ ok: true }, {
    headers: { 'set-cookie': `${THINK_ACCESS_COOKIE}=${encodeURIComponent(match)}; Path=/; Max-Age=34560000; HttpOnly; SameSite=Lax${secure}` },
  });
}
