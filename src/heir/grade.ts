// Grading the way a patient teacher would: strict about which words, forgiving about capitals, punctuation,
// a slip of one letter in a long word, and speech that splits a word ("for ever" for "forever").

import { normalizeWord, words } from './words.ts';

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const keep = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = keep;
    }
  }
  return row[b.length];
}

// One typed word against the expected word. Short words must be exact; long ones allow one slip.
export function wordMatches(typed: string, expected: string): boolean {
  const t = normalizeWord(typed).replace(/'/g, ''), e = normalizeWord(expected).replace(/'/g, '');
  if (!t) return false;
  if (t === e) return true;
  return e.length >= 6 && editDistance(t, e) <= 1;
}

// A near miss: the right word with a spelling slip that is more than wordMatches allows.
export function closeWord(typed: string, expected: string): boolean {
  const t = normalizeWord(typed).replace(/'/g, ''), e = normalizeWord(expected).replace(/'/g, '');
  if (!t || wordMatches(typed, expected)) return false;
  // Same length give or take a letter, so a different word ("glory" for "glorify") is not a typo.
  return e.length >= 4 && Math.abs(t.length - e.length) <= 1 && editDistance(t, e) <= (e.length >= 7 ? 2 : 1);
}

// What went wrong in a word-bank answer, in words a person can use.
export interface OrderCheck { ok: boolean; close: boolean; extra: string[]; missing: string[]; outOfPlace: number }
export function checkOrder(picked: string[], tiles: string[]): OrderCheck {
  const p = picked.map(normalizeWord), t = tiles.map(normalizeWord);
  if (p.join(' ') === t.join(' ')) return { ok: true, close: false, extra: [], missing: [], outOfPlace: 0 };
  const left = [...t];
  const extra: string[] = [];
  picked.forEach((w, i) => { const k = left.indexOf(p[i]); if (k >= 0) left.splice(k, 1); else extra.push(w); });
  const missing = tiles.filter((w) => left.includes(normalizeWord(w)));
  const outOfPlace = p.filter((w, i) => w !== t[i]).length;
  const close = extra.length <= 1 && outOfPlace <= 2;
  return { ok: false, close, extra, missing, outOfPlace };
}

// The first letter a person would type for a word ("Man’s" → "m").
export function firstLetter(word: string): string {
  return normalizeWord(word).replace(/'/g, '')[0] ?? '';
}

export interface SpokenResult {
  // For each expected word, whether it was heard.
  heard: boolean[];
  score: number;
}

// Lines up what was said with what was expected, in order, allowing skipped or extra words and words the
// recognizer split in two. Score is the share of expected words heard.
export function gradeSpoken(expectedText: string, said: string): SpokenResult {
  const expected = words(expectedText).map((w) => w.replace(/'/g, ''));
  const got = words(said).map((w) => w.replace(/'/g, ''));
  const heard = expected.map(() => false);
  let g = 0;
  for (let e = 0; e < expected.length && g < got.length; e++) {
    for (let k = g; k < Math.min(got.length, g + 4); k++) {
      if (wordMatches(got[k], expected[e])) { heard[e] = true; g = k + 1; break; }
      if (k + 1 < got.length && wordMatches(got[k] + got[k + 1], expected[e])) { heard[e] = true; g = k + 2; break; }
    }
  }
  const score = expected.length ? heard.filter(Boolean).length / expected.length : 0;
  return { heard, score };
}

// Enough of the words, in order, to count as said.
export const SPOKEN_PASS = 0.8;
// Typing has no recognizer to blame, so it asks for nearly every word.
export const TYPED_PASS = 0.9;
// Below passing but most of the way there.
export const NEARLY = 0.7;
