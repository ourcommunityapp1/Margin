import { VERSES } from '@/heir/content/verses';
import { tidyVerse, toUsfm, verseFromHtml } from '@/heir/usfm';
import { isRelatedPassage } from '@/heir/related';

export const runtime = 'nodejs';

// NASB 2020 on the YouVersion Platform (Bible 2692). The text is licensed: it's fetched here, on the server,
// so the app key never reaches the phone, and it isn't stored in the app.
const BIBLE = 2692;
const VERSION = 'NASB';
const DAY = 24 * 60 * 60 * 1000;
// Verses already fetched by this server instance, for a day, on top of the CDN's cache.
const memo = new Map<string, { text: string; at: number }>();

// GET /api/heir/verse?id=wsc-31: the NASB text of the verse chosen for that item. Only items with a verse are
// served, so this can't be used to fetch arbitrary passages. Answers are cached for a day.
// GET /api/heir/verse?ref=John 10:11: the NASB text of a related verse, for practicing it. Only passages that
// some item lists as related are served.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const id = params.get('id') ?? '';
  const ref = params.get('ref') ?? '';
  const verse = ref ? (isRelatedPassage(ref) ? { ref, text: '' } : undefined) : Object.hasOwn(VERSES, id) ? VERSES[id] : undefined;
  const usfm = verse && toUsfm(verse.ref);
  if (!verse || !usfm) return Response.json({ error: 'No verse for that item.' }, { status: 404 });
  const cacheHeaders = { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' };
  const key0 = ref || id;
  const hit = memo.get(key0);
  if (hit && Date.now() - hit.at < DAY) return Response.json({ ref: verse.ref, text: hit.text, version: VERSION }, { headers: cacheHeaders });
  const key = process.env.YOUVERSION_APP_KEY;
  if (!key) return Response.json({ error: 'Verses need the YouVersion key (YOUVERSION_APP_KEY).' }, { status: 503 });
  try {
    const r = await fetch(`https://api.youversion.com/v1/bibles/${BIBLE}/passages/${usfm}?format=html`, {
      headers: { 'X-YVP-App-Key': key }, signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return Response.json({ error: `YouVersion answered ${r.status}.` }, { status: 502 });
    const body = (await r.json()) as { content?: string };
    const text = tidyVerse(verseFromHtml(body.content ?? '', verse.ref));
    if (!text) return Response.json({ error: 'The verse came back empty.' }, { status: 502 });
    memo.set(key0, { text, at: Date.now() });
    return Response.json({ ref: verse.ref, text, version: VERSION }, { headers: cacheHeaders });
  } catch {
    return Response.json({ error: 'YouVersion could not be reached.' }, { status: 502 });
  }
}
