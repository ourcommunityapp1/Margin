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
  // For each expected word, whether it was heard in its place.
  heard: boolean[];
  // Expected words that were said, but somewhere else (a swap like "true and living" for "living and true").
  moved: boolean[];
  score: number;
}

// Small words are matched first when there is a choice, so a swap is blamed on the words that carry meaning.
const SMALL = new Set(['the', 'and', 'of', 'to', 'in', 'is', 'a', 'an', 'that', 'by', 'for', 'with', 'who', 'which', 'as', 'unto', 'all', 'but', 'be']);

// Lines up what was said with what was expected by best fit (a weighted longest common subsequence),
// after rejoining words the recognizer split ("for ever"). Score is the share of expected words heard.
export function gradeSpoken(expectedText: string, said: string): SpokenResult {
  const expected = words(expectedText).map((w) => w.replace(/'/g, ''));
  const raw = words(said).map((w) => w.replace(/'/g, ''));
  const got: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    const joined = raw[i] + (raw[i + 1] ?? '');
    if (i + 1 < raw.length && !expected.some((e) => wordMatches(raw[i], e)) && expected.some((e) => wordMatches(joined, e))) { got.push(joined); i++; }
    else got.push(raw[i]);
  }
  const E = expected.length, G = got.length;
  const weight = (w: string) => (SMALL.has(w) ? 1.1 : 1);
  const dp: number[][] = Array.from({ length: E + 1 }, () => new Array<number>(G + 1).fill(0));
  for (let i = 1; i <= E; i++) {
    for (let j = 1; j <= G; j++) {
      const take = wordMatches(got[j - 1], expected[i - 1]) ? dp[i - 1][j - 1] + weight(expected[i - 1]) : -1;
      dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1], take);
    }
  }
  const heard = expected.map(() => false);
  const used = got.map(() => false);
  for (let i = E, j = G; i > 0 && j > 0;) {
    if (wordMatches(got[j - 1], expected[i - 1]) && dp[i][j] === dp[i - 1][j - 1] + weight(expected[i - 1])) { heard[i - 1] = true; used[j - 1] = true; i--; j--; }
    else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  const moved = expected.map((e, i) => {
    if (heard[i]) return false;
    const k = got.findIndex((g, j) => !used[j] && wordMatches(g, e));
    if (k < 0) return false;
    used[k] = true;
    return true;
  });
  const score = E ? heard.filter(Boolean).length / E : 0;
  return { heard, moved, score };
}

// Enough of the words, in order, to count as said.
export const SPOKEN_PASS = 0.8;
// Typing has no recognizer to blame, so it asks for nearly every word.
export const TYPED_PASS = 0.9;
// Below passing but most of the way there.
export const NEARLY = 0.7;
