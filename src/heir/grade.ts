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
