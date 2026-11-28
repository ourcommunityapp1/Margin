import { aiAvailable, furtherReading } from '@/think/ai';
import { body, guard, MAX_NOTE_CHARS } from '@/think/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/think/links: one or two real pages to read further, found by a web search. Only
// URLs the search actually returned are passed on. Any failure simply means no links.
export async function POST(request: Request) {
  const denied = await guard(request);
  if (denied) return denied;
  const b = await body<{ text?: string; title?: string }>(request);
  const text = (b?.text ?? '').trim();
  if (!text || text.length > MAX_NOTE_CHARS || !aiAvailable()) return Response.json({ links: [] });
  try {
    return Response.json({ links: await furtherReading({ text, title: b?.title, signal: request.signal }) });
  } catch (e) {
    console.error('[think/links]', e instanceof Error ? e.message : e);
    return Response.json({ links: [] });
  }
}
