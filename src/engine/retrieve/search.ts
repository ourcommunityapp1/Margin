// Topic search over passage units: each unit is a paragraph of Scripture plus Henry's note on it,
// so a question about "anxiety" can find Philippians 4:4–9 even when it names no verse.

import { BOOKS } from '../bible/canon.ts';
import type { Span } from '../bible/refs.ts';
import type { Corpus } from '../corpus/store.ts';
import { loose } from '../text.ts';
import { Bm25 } from './bm25.ts';

interface Verse { text: string; unit: Span; n: number }

export interface SearchOptions {
  // Books the question names without a chapter ("Philippians says…"): their passages rank first.
  books?: number[];
}

// A quotation in the question, in any quote style. Single quotes count only around a run of words,
// so the apostrophes in "don't" or "God's" don't open one.
const QUOTED = /["“]([^"”]{8,})["”]|(?:^|[\s(])['‘]([^'’]{8,}?)['’](?=[\s.,;:!?)]|$)/g;

// Lines of Scripture a listener recalls without quotation marks ("lean not on your own
// understanding") are found by matching runs of four words against every verse.
const WINDOW = 4;

export class PassageIndex {
  private readonly bm25: Bm25<Span>;
  // Every verse's folded text and the unit it belongs to, for phrase lookups.
  private readonly verses: Verse[];
  // Folded word → the verses that contain it, so a phrase is checked only against likely verses.
  private readonly postings: Map<string, number[]>;

  private constructor(bm25: Bm25<Span>, verses: Verse[], postings: Map<string, number[]>) {
    this.bm25 = bm25;
    this.verses = verses;
    this.postings = postings;
  }

  // Reads every chapter once (a second or two on a server). Cache the result per process.
  static async build(corpus: Corpus): Promise<PassageIndex> {
    const bm25 = new Bm25<Span>();
    const verses: Verse[] = [];
    const postings = new Map<string, number[]>();
    for (let bi = 0; bi < BOOKS.length; bi++) {
      for (let c = 1; c <= corpus.chapterCount(bi); c++) {
        const cd = await corpus.chapter(bi, c);
        for (const u of corpus.units(cd)) {
          const scripture = cd.verses.slice(u.a - 1, u.b).join(' ');
          const notes = cd.henry.filter((h) => h.reach >= u.a && h.span.a <= u.b).map((h) => h.text).join(' ');
          // Scripture counts twice so a passage outranks a note that merely mentions the topic.
          bm25.add(u, `${scripture} ${scripture} ${notes}`);
          for (let v = u.a; v <= u.b; v++) {
            if (!cd.verses[v - 1]) continue;
            const text = loose(cd.verses[v - 1]);
            for (const w of new Set(text.split(' '))) {
              let p = postings.get(w);
              if (!p) postings.set(w, (p = []));
              p.push(verses.length);
            }
            verses.push({ text, unit: u, n: v });
          }
        }
      }
    }
    return new PassageIndex(bm25, verses, postings);
  }

  get size(): number { return this.bm25.size; }

  // Quoted or recalled lines of Scripture go straight to their passages; anything else is ranked
  // by keywords, with passages from any book the question names first.
  // A quoted or remembered line also returns its verse, which the question is plainly about.
  search(query: string, limit = 6, opts: SearchOptions = {}): { span: Span; score: number; verse?: number }[] {
    const out: { span: Span; score: number; verse?: number }[] = [];
    const seen = new Set<Span>();
    const add = (span: Span, score: number, verse?: number) => { if (!seen.has(span)) { seen.add(span); out.push({ span, score, verse }); } };
    const inBooks = (s: Span) => !opts.books?.length || opts.books.includes(s.bi);

    // Quoted phrases, and the whole query, which is often just a remembered line.
    const phrases = [...String(query).matchAll(QUOTED)].map((m) => m[1] ?? m[2]).concat(query);
    for (const p of phrases) {
      const q = loose(p);
      if (q.split(' ').length < 4) continue;
      const hits = this.verses.filter((v) => v.text.includes(q));
      for (const v of [...hits.filter((h) => inBooks(h.unit)), ...hits].slice(0, 3)) add(v.unit, Infinity, v.n);
    }
    for (const v of this.recalled(query).sort((x, y) => Number(inBooks(y.unit)) - Number(inBooks(x.unit))).slice(0, 3)) add(v.unit, Infinity, v.n);

    const ranked = this.bm25.search(query, opts.books?.length ? 400 : limit + out.length);
    if (opts.books?.length) for (const { item, score } of ranked.filter((r) => opts.books!.includes(r.item.bi)).slice(0, 2)) add(item, score);
    for (const { item, score } of ranked.slice(0, limit + out.length)) add(item, score);
    return out.slice(0, limit);
  }

  // Verses sharing a run of five or more words with the query, or four including a rare word.
  private recalled(query: string): Verse[] {
    const words = loose(query).split(' ').filter(Boolean);
    // Names capitalized mid-sentence ("Paul and Silas") are rare words, not a remembered line.
    const names = new Set([...String(query).matchAll(/(?<![.!?]\s*|^\s*)\b([A-Z][a-z]+)/g)].map((m) => m[1].toLowerCase()));
    const runs = new Map<number, number>();
    for (let i = 0; i + WINDOW <= words.length; i++) {
      const phrase = words.slice(i, i + WINDOW);
      const lists = phrase.map((w) => this.postings.get(w) ?? []);
      const at = lists.reduce((best, l, j) => (l.length < lists[best].length ? j : best), 0);
      const rarest = lists[at];
      if (!rarest.length || rarest.length > 2000) continue;
      const text = phrase.join(' ');
      for (const id of rarest) {
        if (!this.verses[id].text.includes(text)) continue;
        // A one-window match counts only when the phrase has a word found in few verses.
        runs.set(id, (runs.get(id) ?? 0) + (rarest.length <= 40 && !names.has(phrase[at]) ? 2 : 1));
      }
    }
    return [...runs].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(([id]) => this.verses[id]);
  }
}
