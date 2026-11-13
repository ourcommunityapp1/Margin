import { aiAvailable, inferTitle } from '@/think/ai';
import { body, guard, MAX_NOTE_CHARS } from '@/think/server';
import { fallbackTitle } from '@/think/words';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/think/title: a short title for a note, worked out from its text. The app only
// applies it while the user hasn't edited the title themselves.
export async function POST(request: Request) {
  const denied = await guard(request);
  if (denied) return denied;
  const text = ((await body<{ text?: string }>(request))?.text ?? '').trim().slice(0, MAX_NOTE_CHARS);
  if (!text) return Response.json({ title: '' });
  if (!aiAvailable()) return Response.json({ title: fallbackTitle(text) });
  try {
    return Response.json({ title: await inferTitle(text, request.signal) });
  } catch {
    return Response.json({ title: fallbackTitle(text) });
  }
}
