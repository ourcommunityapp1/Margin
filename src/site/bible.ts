// Scripture for the public pages, from the Berean Standard Bible (BSB) text bundled in data/corpus. The BSB is
// published by its owners as public domain, so it can appear on public, indexable pages. The NASB the app shows
// to signed-in learners does NOT appear on public pages (Lockman's terms for public sites are unconfirmed).
// Verse text is returned exactly as stored; nothing is reworded here.

import path from 'node:path';
import { Corpus } from '../engine/corpus/store.ts';
import { fileLoader } from '../engine/corpus/loaders.ts';
import { BOOKS, bookLabel, findBook } from '../engine/bible/canon.ts';
import { passagesOf } from '../heir/related.ts';

export const BIBLE_VERSION = 'Berean Standard Bible';
export const BIBLE_NOTICE = 'Scripture quotations are from the Berean Standard Bible (BSB), which is in the public domain.';

export interface PassageText {
  /** "Romans 3:23" or "Acts 15:14–15". */
  ref: string;
  verses: { n: number; text: string }[];
  /** Verses in the range that this text does not contain. */
  missing: number[];
}

let corpus: Promise<Corpus> | null = null;
const open = () => (corpus ??= Corpus.open(fileLoader(path.join(process.cwd(), 'data', 'corpus'))));

/** One passage within a chapter ("Romans 3:23", "Psalm 73:25–28"), or null if it can't be looked up. */
export async function passageText(ref: string): Promise<PassageText | null> {
  const m = /^(.+?) (\d+):(\d+)(?:[–-](\d+))?$/.exec(ref.trim());
  if (!m) return null;
  const bi = findBook(m[1]);
  if (bi < 0) return null;
  const c = Number(m[2]), a = Number(m[3]), b = m[4] ? Number(m[4]) : a;
  const corp = await open();
  if (c < 1 || c > corp.chapterCount(bi) || a < 1 || b < a || b > corp.verseCount(bi, c)) return null;
  const { verses } = await corp.chapter(bi, c);
  const out: PassageText = { ref: `${bookLabel(bi)} ${c}:${a}${b > a ? `–${b}` : ''}`, verses: [], missing: [] };
  for (let v = a; v <= b; v++) {
    const text = verses[v - 1];
    if (text) out.verses.push({ n: v, text }); else out.missing.push(v);
  }
  return out.verses.length ? out : null;
}

/** An item's proof texts: each passage with its text where it can be looked up, and the references that can't be
 * shown as text (whole chapters and the like) listed by reference only. */
export async function proofTexts(connected: string[]): Promise<{ shown: PassageText[]; refsOnly: string[] }> {
  const shown: PassageText[] = [];
  const seen = new Set<string>();
  for (const ref of connected) {
    for (const p of passagesOf(ref)) {
      const t = await passageText(p);
      if (t && !seen.has(t.ref)) { seen.add(t.ref); shown.push(t); }
    }
  }
  // A reference with parts the lookup can't show (a whole chapter, a range across chapters) is also listed by reference.
  const refsOnly = connected.filter((ref) => passagesOf(ref).length < ref.replace(/^cf\.\s*/i, '').split(/[;,]/).length);
  return { shown, refsOnly };
}

export const bookNames = BOOKS.map((b) => b.name);
