// Reads the library (Bible text plus commentary) and hands it out as attributed chunks.
// The on-disk format is the per-book JSON built by scripts/library/build_all.py.

import { BOOKS, PSALMS, type Versification } from '../bible/canon.ts';
import type { Span } from '../bible/refs.ts';
import { AUTHORS } from './sources.ts';

// Reads one corpus file ("index.json", "ROM.json", "PSA.3.json") and returns its parsed JSON.
export type Loader = (file: string) => Promise<unknown>;

export type WorkKey = 'mhcc' | 'tdavid' | 'catena' | 'npnf';

export interface Chunk {
  id: string;
  work: WorkKey;
  who: string;
  span: Span;
  // For Henry, where his note effectively runs to: up to the verse before his next section.
  reach: number;
  text: string;
  kind: 'section' | 'intro' | 'overview' | 'excerpt' | 'homily';
  // The source's own citation: an NPNF homily title or a Catena location like "Hom. in Matt., 56".
  label?: string;
  // Henry's Romans to Revelation were finished by others from his notes.
  posthumous?: boolean;
}

export interface ChapterData {
  bi: number;
  c: number;
  nv: number;
  // verses[v - 1]; an empty string where this copy of the BSB lacks the verse.
  verses: string[];
  henry: Chunk[];
  intro?: Chunk;
  outline?: [string, string][];
  spurgeon: Chunk[];
  spurgeonOverview?: Chunk;
  catena: Chunk[];
  fathers: Chunk[];
}

interface IndexFile {
  books: { code: string; name: string; v: number[]; files: [number, number, string][] }[];
  speakers: Record<string, string>;
}

interface BookFile {
  bsb: Record<string, string[]>;
  h?: { i?: string; c: Record<string, { o?: [string, string][]; s?: string; x?: [number, number, string][] }> };
  sp?: { c: Record<string, { o?: string; x?: [number, number, string][] }> };
  ca?: { c: Record<string, [number, number, [string, string, string][]][]> };
  f?: { c: Record<string, [number, number, string, string, string][]> };
}

const FIRST_POSTHUMOUS = BOOKS.findIndex((b) => b.code === 'ROM');

export class Corpus {
  readonly versification: Versification;
  private readonly load: Loader;
  private readonly index: IndexFile;
  private readonly files = new Map<string, Promise<BookFile>>();
  private readonly chaptersCache = new Map<string, Promise<ChapterData>>();

  private constructor(load: Loader, index: IndexFile) {
    this.load = load;
    this.index = index;
    this.versification = index.books.map((b) => b.v);
    // Catena speakers the registry doesn't describe still get a readable name.
    for (const [k, name] of Object.entries(index.speakers)) {
      if (!AUTHORS[k]) AUTHORS[k] = { name, tradition: 'fathers', label: 'early commentator', authorship: 'genuine' };
    }
  }

  static async open(load: Loader): Promise<Corpus> {
    return new Corpus(load, (await load('index.json')) as IndexFile);
  }

  private review?: Promise<Set<string>>;

  // Chunk ids flagged for possible polemic (scripts/audit-polemic.ts). Missing file means none.
  reviewFlags(): Promise<Set<string>> {
    this.review ??= this.load('review.json')
      .then((d) => new Set(((d as { polemic?: { id: string }[] }).polemic ?? []).map((f) => f.id)))
      .catch(() => new Set<string>());
    return this.review;
  }

  chapterCount(bi: number): number { return this.versification[bi]?.length ?? 0; }
  verseCount(bi: number, c: number): number { return this.versification[bi]?.[c - 1] ?? 0; }

  private file(bi: number, c: number): Promise<BookFile> {
    const entry = this.index.books[bi].files.find(([from, to]) => from <= c && c <= to);
    if (!entry) throw new Error(`No corpus file for ${BOOKS[bi].name} ${c}`);
    const name = entry[2];
    let p = this.files.get(name);
    if (!p) {
      p = this.load(name).then((d) => d as BookFile);
      p.catch(() => this.files.delete(name));
      this.files.set(name, p);
    }
    return p;
  }

  chapter(bi: number, c: number): Promise<ChapterData> {
    const key = `${bi}:${c}`;
    let p = this.chaptersCache.get(key);
    if (!p) {
      p = this.file(bi, c).then((d) => this.build(bi, c, d));
      p.catch(() => this.chaptersCache.delete(key));
      this.chaptersCache.set(key, p);
    }
    return p;
  }

  private build(bi: number, c: number, d: BookFile): ChapterData {
    const code = BOOKS[bi].code;
    const nv = this.verseCount(bi, c);
    const ch = String(c);
    const span = (a: number, b: number): Span => ({ bi, c, a, b: Math.max(a, b) });
    const posthumous = bi >= FIRST_POSTHUMOUS;

    const h = d.h?.c?.[ch];
    const xs = h?.x ?? [];
    const henry: Chunk[] = xs.map(([a, b, text], i) => ({
      id: `mhcc:${code}.${c}.${a}-${b}`, work: 'mhcc', who: 'henry', span: span(a, b),
      reach: Math.min(nv, Math.max(b, i + 1 < xs.length ? xs[i + 1][0] - 1 : nv)),
      text, kind: 'section', posthumous,
    }));
    const intro: Chunk | undefined = c === 1 && d.h?.i
      ? { id: `mhcc:${code}.intro`, work: 'mhcc', who: 'henry', span: span(1, nv), reach: nv, text: d.h.i, kind: 'intro', posthumous }
      : undefined;

    const sp = d.sp?.c?.[ch];
    const spurgeon: Chunk[] = (sp?.x ?? []).map(([a, b, text]) => ({
      id: `tdavid:${code}.${c}.${a}-${b}`, work: 'tdavid', who: 'spurgeon', span: span(a, b), reach: Math.max(a, b), text, kind: 'section',
    }));
    const spurgeonOverview: Chunk | undefined = sp?.o
      ? { id: `tdavid:${code}.${c}.overview`, work: 'tdavid', who: 'spurgeon', span: span(1, nv), reach: nv, text: sp.o, kind: 'overview' }
      : undefined;

    const catena: Chunk[] = [];
    for (const [a, b, items] of d.ca?.c?.[ch] ?? []) {
      items.forEach(([who, label, text], i) => catena.push({
        id: `catena:${code}.${c}.${a}-${b}.${i}`, work: 'catena', who, span: span(a, b), reach: Math.max(a, b),
        text, kind: 'excerpt', label: label || undefined,
      }));
    }
    const fathers: Chunk[] = (d.f?.c?.[ch] ?? []).map(([a, b, who, title, text], i) => ({
      id: `npnf:${code}.${c}.${a}-${b}.${who}.${i}`, work: 'npnf', who, span: span(a, b), reach: Math.max(a, b),
      text, kind: 'homily', label: title,
    }));

    return {
      bi, c, nv, verses: Array.from({ length: nv }, (_, i) => d.bsb?.[ch]?.[i] ?? ''),
      henry, intro, outline: h?.o, spurgeon, spurgeonOverview, catena, fathers,
    };
  }

  // Passage units: the paragraphs Henry divides a chapter into, or twelve-verse windows where he
  // has no sections. Answers and sessions read whole units rather than lone verses.
  units(cd: ChapterData): Span[] {
    const out: Span[] = [];
    let at = 1;
    for (const s of cd.henry) {
      if (s.span.a > at) out.push({ bi: cd.bi, c: cd.c, a: at, b: s.span.a - 1 });
      const a = Math.max(at, s.span.a);
      if (s.reach >= a) out.push({ bi: cd.bi, c: cd.c, a, b: s.reach });
      at = Math.max(at, s.reach + 1);
    }
    if (at <= cd.nv) {
      for (let a = at; a <= cd.nv; a += 12) out.push({ bi: cd.bi, c: cd.c, a, b: Math.min(cd.nv, a + 11) });
    }
    return out;
  }

  // Every commentary chunk whose range touches the span.
  static touching(cd: ChapterData, a: number, b: number): Chunk[] {
    const hit = (k: Chunk) => k.reach >= a && k.span.a <= b;
    return [...cd.henry, ...cd.spurgeon, ...cd.catena, ...cd.fathers].filter(hit);
  }

  static isPsalm = (bi: number): boolean => bi === PSALMS;
}
