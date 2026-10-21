// Parsing, validating and formatting Bible references against the corpus versification.

import { BOOKS, bookLabel, findBook, PSALMS, type Versification } from './canon.ts';
import { spokenNumber } from '../text.ts';

export interface Ref {
  bi: number;
  c1: number;
  v1?: number;
  c2?: number;
  v2?: number;
}

// One contiguous run of verses inside a single chapter.
export interface Span {
  bi: number;
  c: number;
  a: number;
  b: number;
}

const chapters = (vs: Versification, bi: number): number => vs[bi]?.length ?? 0;
const verses = (vs: Versification, bi: number, c: number): number => vs[bi]?.[c - 1] ?? 0;

const REF = /^(.+?)\s*(\d+)?(?:\s*[:.]\s*(\d+))?(?:\s*[-–—]\s*(\d+)(?:\s*[:.]\s*(\d+))?)?\s*$/;

// Parses "Romans 3:21–26", "Ps 23", "1 Cor 13", "John 3:16-4:2" or "Jude 3". Returns null when the
// book is unknown or any chapter or verse falls outside the versification.
export function parseRef(input: string, vs: Versification): Ref | null {
  const s = String(input || '').trim().replace(/\bchapter\s+/i, '').replace(/\s+verses?\s+/i, ':');
  if (!s) return null;
  const m = s.match(REF);
  if (!m || !/[a-z]/i.test(m[1])) return null;
  const bi = findBook(m[1]);
  if (bi < 0) return null;
  let c1 = m[2] ? +m[2] : 1;
  let v1 = m[3] ? +m[3] : undefined;
  let c2: number | undefined;
  let v2: number | undefined;
  if (m[4]) {
    if (m[5]) { c2 = +m[4]; v2 = +m[5]; } else if (v1) { v2 = +m[4]; } else { c2 = +m[4]; }
  }
  // Single-chapter books are cited by verse: "Jude 3" means Jude 1:3.
  if (chapters(vs, bi) === 1 && m[2] && !m[3] && !m[4]) { v1 = c1; c1 = 1; }
  if (!m[2] && chapters(vs, bi) > 1) return null;
  const ref: Ref = { bi, c1, v1, c2, v2 };
  return validRef(ref, vs) ? ref : null;
}

export function validRef(r: Ref, vs: Versification): boolean {
  if (r.c1 < 1 || r.c1 > chapters(vs, r.bi)) return false;
  if (r.v1 !== undefined && (r.v1 < 1 || r.v1 > verses(vs, r.bi, r.c1))) return false;
  if (r.c2 !== undefined && (r.c2 < r.c1 || r.c2 > chapters(vs, r.bi))) return false;
  const endChapter = r.c2 ?? r.c1;
  if (r.v2 !== undefined) {
    if (r.v2 < 1 || r.v2 > verses(vs, r.bi, endChapter)) return false;
    if (r.c2 === undefined && r.v1 !== undefined && r.v2 < r.v1) return false;
  }
  return true;
}

// Expands a reference into per-chapter verse runs.
export function spans(r: Ref, vs: Versification): Span[] {
  const last = r.c2 ?? r.c1;
  const out: Span[] = [];
  for (let c = r.c1; c <= last; c++) {
    const a = c === r.c1 && r.v1 ? r.v1 : 1;
    let b = verses(vs, r.bi, c);
    if (c === last && r.v2) b = r.v2;
    else if (c === r.c1 && r.v1 && !r.c2) b = r.v2 ?? r.v1;
    out.push({ bi: r.bi, c, a, b });
  }
  return out;
}

export function formatSpan(s: Span, vs?: Versification): string {
  const whole = vs && s.a === 1 && s.b === verses(vs, s.bi, s.c);
  if (whole) return `${bookLabel(s.bi)} ${s.c}`;
  return `${bookLabel(s.bi)} ${s.c}:${s.a}${s.b !== s.a ? '–' + s.b : ''}`;
}

export function formatRef(r: Ref): string {
  let label = `${bookLabel(r.bi)} ${r.c1}`;
  if (r.v1) label += `:${r.v1}`;
  if (r.v2) label += '–' + (r.c2 && r.c2 !== r.c1 ? `${r.c2}:` : '') + r.v2;
  else if (r.c2 && r.c2 !== r.c1) label += `–${r.c2}`;
  return label;
}

// "Romans chapter three, verses twenty-one to twenty-six", for the voice engine.
export function spokenSpan(s: Span, vs?: Versification): string {
  const book = s.bi === PSALMS ? 'Psalm' : BOOKS[s.bi].name;
  const head = s.bi === PSALMS ? `${book} ${spokenNumber(s.c)}` : `${book} chapter ${spokenNumber(s.c)}`;
  if (vs && s.a === 1 && s.b === verses(vs, s.bi, s.c)) return head;
  return s.a === s.b ? `${head}, verse ${spokenNumber(s.a)}` : `${head}, verses ${spokenNumber(s.a)} to ${spokenNumber(s.b)}`;
}

export const spanKey = (s: Span): string => `${BOOKS[s.bi].code}.${s.c}.${s.a}-${s.b}`;

export const overlaps = (x: Span, y: Span): boolean => x.bi === y.bi && x.c === y.c && x.a <= y.b && y.a <= x.b;

// Finds references written in free text ("as Paul says in Romans 4:5"), for checking what an answer cites.
const BOOK_PATTERN = '(?:Song of (?:Songs|Solomon)|(?:[123]\\s?)?[A-Z][a-z]+)';
const IN_TEXT = new RegExp(`\\b(${BOOK_PATTERN})\\.?\\s(\\d{1,3})(?::(\\d{1,3})(?:\\s?[-–—]\\s?(\\d{1,3}))?)?\\b`, 'g');

const IN_SPEECH = new RegExp(IN_TEXT.source.replace('[A-Z][a-z]+', '[A-Za-z][a-z]{2,}'), 'gi');

// `loose` also accepts lowercase book names ("what does psalm 23 mean"), as typed or dictated
// questions often have them; it skips two-letter words so "is 5" isn't read as Isaiah 5.
export function findRefs(text: string, vs: Versification, loose = false): { raw: string; ref: Ref | null }[] {
  const out: { raw: string; ref: Ref | null }[] = [];
  for (const m of String(text).matchAll(loose ? IN_SPEECH : IN_TEXT)) {
    if (findBook(m[1]) < 0) continue;
    const raw = m[0];
    out.push({ raw, ref: parseRef(raw, vs) });
  }
  return out;
}
