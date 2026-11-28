import { aiAvailable, suggest } from '@/think/ai';
import { looksDark } from '@/think/coach';
import { body, failed, guard, MAX_NOTE_CHARS, unavailable } from '@/think/server';
import type { Unclear } from '@/think/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/think/suggest: what the coach noticed in one note. Called only when the user opens
// Suggestions. Dark content returns { quiet: true } and nothing else.
export async function POST(request: Request) {
  const denied = await guard(request);
  if (denied) return denied;
  const b = await body<{ text?: string; title?: string; goals?: string[]; unclear?: Unclear[]; stuck?: 'point' | 'thought' }>(request);
  const text = (b?.text ?? '').trim();
  if (!text) return Response.json({ error: 'There is no note yet.' }, { status: 400 });
  if (text.length > MAX_NOTE_CHARS) return Response.json({ error: 'This note is too long to read in one go.' }, { status: 413 });
  if (looksDark(text)) return Response.json({ quiet: true, perspective: null, prompts: [], fixes: [], tip: null });
  if (!aiAvailable()) return unavailable('Prompts need the AI key (ANTHROPIC_API_KEY).');
  try {
    return Response.json(await suggest({
      text, title: b?.title, goals: (b?.goals ?? []).slice(0, 6), unclear: (b?.unclear ?? []).slice(0, 6),
      stuck: b?.stuck === 'point' || b?.stuck === 'thought' ? b.stuck : undefined, signal: request.signal,
    }));
  } catch (e) {
    return failed(e);
  }
}
