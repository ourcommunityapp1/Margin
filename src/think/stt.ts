// Turning what the speech model heard into note text, and picking out the words it wasn't sure
// of. An unsure word is kept exactly as heard and raised as a "small fix" question for the user.

import type { Unclear } from './types.ts';

export interface Heard { text: string; logprob?: number }

// Below this the model was guessing (about a one-in-three chance or worse of being right).
export const UNSURE_LOGPROB = -1.1;
export const MAX_UNCLEAR_PER_CHUNK = 2;

export function unclearWords(words: Heard[], threshold = UNSURE_LOGPROB, max = MAX_UNCLEAR_PER_CHUNK): Unclear[] {
  const picked = words
    .map((w, i) => ({ w, i }))
    .filter(({ w }) => typeof w.logprob === 'number' && w.logprob < threshold && /\p{L}{3,}/u.test(w.text))
    .sort((a, b) => a.w.logprob! - b.w.logprob!)
    .slice(0, max)
    .sort((a, b) => a.i - b.i);
  return picked.map(({ w, i }) => ({
    word: w.text.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''),
    context: words.slice(Math.max(0, i - 3), i + 4).map((x) => x.text).join(' '),
  }));
}
