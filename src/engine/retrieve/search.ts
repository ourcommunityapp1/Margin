// Topic search over passage units: each unit is a paragraph of Scripture plus Henry's note on it,
// so a question about "anxiety" can find Philippians 4:4–9 even when it names no verse.

import { BOOKS } from '../bible/canon.ts';
import type { Span } from '../bible/refs.ts';
import type { Corpus } from '../corpus/store.ts';
import { loose } from '../text.ts';
import { Bm25 } from './bm25.ts';

export class PassageIndex {
  private readonly bm25: Bm25<Span>;
  // Every verse's folded text and the unit it belongs to, for quoted-phrase lookups.
  private readonly verses: { text: string; unit: Span }[];

  private constructor(bm25: Bm25<Span>, verses: { text: string; unit: Span }[]) {
    this.bm25 = bm25;
    this.verses = verses;
  }

  // Reads every chapter once (a second or two on a server). Cache the result per process.
  static async build(corpus: Corpus): Promise<PassageIndex> {
    const bm25 = new Bm25<Span>();
    const verses: { text: string; unit: Span }[] = [];
    for (let bi = 0; bi < BOOKS.length; bi++) {
      for (let c = 1; c <= corpus.chapterCount(bi); c++) {
        const cd = await corpus.chapter(bi, c);
        for (const u of corpus.units(cd)) {
          const scripture = cd.verses.slice(u.a - 1, u.b).join(' ');
          const notes = cd.henry.filter((h) => h.reach >= u.a && h.span.a <= u.b).map((h) => h.text).join(' ');
          // Scripture counts twice so a passage outranks a note that merely mentions the topic.
          bm25.add(u, `${scripture} ${scripture} ${notes}`);
          for (let v = u.a; v <= u.b; v++) if (cd.verses[v - 1]) verses.push({ text: loose(cd.verses[v - 1]), unit: u });
        }
      }
    }
    return new PassageIndex(bm25, verses);
  }

  get size(): number { return this.bm25.size; }

  // A quoted line of Scripture ("the Lord is my shepherd") goes straight to its passage;
  // anything else is ranked by keywords.
  search(query: string, limit = 6): { span: Span; score: number }[] {
    const out: { span: Span; score: number }[] = [];
    const seen = new Set<Span>();
    const phrases = [...String(query).matchAll(/["“]([^"”]{8,})["”]/g)].map((m) => m[1]);
    phrases.push(query);
    for (const p of phrases) {
      const q = loose(p);
      if (q.split(' ').length < 4) continue;
      for (const v of this.verses) {
        if (out.length >= 3) break;
        if (v.text.includes(q) && !seen.has(v.unit)) { seen.add(v.unit); out.push({ span: v.unit, score: Infinity }); }
      }
    }
    for (const { item, score } of this.bm25.search(query, limit + out.length)) {
      if (!seen.has(item)) { seen.add(item); out.push({ span: item, score }); }
    }
    return out.slice(0, limit);
  }
}
