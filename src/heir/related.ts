// Related verses: the Scripture a catechism answer rests on (its proof texts), or the verses a Bible verse
// goes with. They aren't stored in the app. A learner's phone fetches a related verse's NASB text when they
// practice it, and keeps it only on that phone. Recalling every one of an item's related verses, on top of
// Sapphire, earns Diamond.

import type { Item } from './types.ts';
import { toUsfm } from './usfm.ts';
import { collections } from './content/index.ts';

const DASH = /[–-]/;

/** One reference string ("Acts 15:14–15, 18"; "Psalm 103:1–5; 136") as separate passages ("Acts 15:14–15", "Acts 15:18").
 * Whole chapters and anything else the verse service can't look up are left out. */
export function passagesOf(ref: string): string[] {
  const out: string[] = [];
  let book = '', chapter = '';
  for (const part of ref.replace(/^cf\.\s*/i, '').split(';')) {
    part.split(',').map((s) => s.trim().replace(/(\d)[a-c]\b/g, '$1')).filter(Boolean).forEach((bit, i) => {
      const full = /^(.+?) (\d+):(\d+)(?:[–-](\d+))?$/.exec(bit);
      if (full) { book = full[1]; chapter = full[2]; out.push(`${book} ${chapter}:${full[3]}${full[4] ? `–${full[4]}` : ''}`); return; }
      const inChapter = /^(\d+)(?:[–-](\d+))?$/.exec(bit);
      if (inChapter && book && chapter && i > 0) { out.push(`${book} ${chapter}:${inChapter[1]}${inChapter[2] ? `–${inChapter[2]}` : ''}`); return; }
      const other = /^(\d+):(\d+)(?:[–-](\d+))?$/.exec(bit);
      if (other && book) { chapter = other[1]; out.push(`${book} ${chapter}:${other[2]}${other[3] ? `–${other[3]}` : ''}`); }
    });
  }
  return out.filter((p) => toUsfm(p) && !DASH.test(p.split(':')[0]));
}

/** An item's related passages, each once, in order. */
export function relatedFor(item: Item): string[] {
  return [...new Set(item.connected.flatMap(passagesOf))];
}

/** How many verses a passage holds ("John 3:16" 1, "Acts 15:14–15" 2). */
export function verseCount(passage: string): number {
  const m = /:(\d+)(?:[–-](\d+))?$/.exec(passage);
  return m ? (m[2] ? Number(m[2]) - Number(m[1]) + 1 : 1) : 1;
}

let known: Set<string> | null = null;
/** Every passage the app may fetch as a related verse: only these are served, so the verse service can't be used
 * to fetch arbitrary passages. */
export function isRelatedPassage(ref: string): boolean {
  known ??= new Set(collections.flatMap((c) => c.items.flatMap(relatedFor)));
  return known.has(ref);
}
