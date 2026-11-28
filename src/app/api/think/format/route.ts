import { aiAvailable, formatTranscript, localFormat } from '@/think/ai';
import { body, guard, MAX_NOTE_CHARS } from '@/think/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/think/format: punctuate and space a stretch of spoken words. Only punctuation,
// capitals and paragraph breaks may be added; a result that changes any word is discarded and
// the plain local formatting is returned instead (accepted: false).
export async function POST(request: Request) {
  const denied = await guard(request);
  if (denied) return denied;
  const b = await body<{ text?: string; before?: string; noteSoFar?: string; wantTitle?: boolean }>(request);
  const text = (b?.text ?? '').trim();
  if (!text) return Response.json({ error: 'Nothing to format.' }, { status: 400 });
  if (text.length + (b?.noteSoFar?.length ?? 0) > MAX_NOTE_CHARS) return Response.json({ error: 'That is too long to format in one go.' }, { status: 413 });
  if (!aiAvailable()) return Response.json(localFormat(text));
  try {
    return Response.json(await formatTranscript({ text, before: b?.before, noteSoFar: b?.noteSoFar, wantTitle: !!b?.wantTitle, signal: request.signal }));
  } catch (e) {
    // The words are never held hostage by a failed call: fall back to the local formatting.
    console.error('[think/format]', e instanceof Error ? e.message : e);
    return Response.json(localFormat(text));
  }
}
