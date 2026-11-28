import { aiAvailable, Declined, reformat } from '@/think/ai';
import { localVersions } from '@/think/reformat';
import { body, guard, MAX_NOTE_CHARS } from '@/think/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/think/reformat: up to three arrangements of the note's own sentences. Versions that
// contain any wording not found in the note are dropped before they get here; if fewer than
// three survive (or there is no AI), the built-in arrangements fill in.
export async function POST(request: Request) {
  const denied = await guard(request);
  if (denied) return denied;
  const b = await body<{ paragraphs?: string[]; title?: string }>(request);
  const paragraphs = (b?.paragraphs ?? []).filter((p) => typeof p === 'string' && p.trim());
  const text = paragraphs.join('\n\n');
  if (!text) return Response.json({ error: 'There is no note yet.' }, { status: 400 });
  if (text.length > MAX_NOTE_CHARS) return Response.json({ error: 'This note is too long to reformat in one go.' }, { status: 413 });
  const local = localVersions(paragraphs);
  if (!aiAvailable()) return Response.json({ versions: local, source: 'local' });
  try {
    const versions = await reformat({ text, title: b?.title, signal: request.signal });
    const labels = new Set(versions.map((v) => v.label.toLowerCase()));
    const filled = [...versions, ...local.filter((v) => !labels.has(v.label.toLowerCase()))].slice(0, 3);
    return Response.json({ versions: filled, source: versions.length ? 'ai' : 'local' });
  } catch (e) {
    if (!(e instanceof Declined)) console.error('[think/reformat]', e instanceof Error ? e.message : e);
    return Response.json({ versions: local, source: 'local' });
  }
}
