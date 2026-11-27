// What a person sees after an answer (ADR-003 Decision 7). Grace is in the words and colours only: whether the answer counts
// as right (the logged `correct`, stones, the memory grade) is decided strictly elsewhere and is not touched here.
//   Perfect: a strict pass with no slips ("Perfect!"; a whole answer from memory is celebrated).
//   Pass: a strict pass with a slip ("Correct!").
//   Good: not a strict pass, but 75% or more of the main words ("Good. We'll strengthen this.").
//   Growing: 50 to 75% of the main words ("Good job. We'll strengthen this.").
//   Learning: under 50% ("No problem, you're still learning.").

export type Band = 'perfect' | 'pass' | 'good' | 'growing' | 'learning';

// Small words carry little of the meaning; missing one barely counts.
const SMALL = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'as', 'is', 'are', 'be', 'it', 'that', 'this', 'which', 'who', 'whom', 'his', 'her', 'their', 'our', 'my', 'we', 'us', 'he', 'him', 'she', 'they', 'them', 'i', 'me', 'so', 'not', 'all', 'unto', 'thy', 'thee', 'thou', 'ye']);
const SMALL_WEIGHT = 0.25;

const bare = (w: string) => w.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');

/** The share of the answer's meaning recalled: main words count fully, small words a quarter. */
export function mainWordShare(tokens: string[], heard: boolean[]): number {
  let got = 0, all = 0;
  tokens.forEach((t, i) => {
    const w = SMALL.has(bare(t)) ? SMALL_WEIGHT : 1;
    all += w;
    if (heard[i]) got += w;
  });
  return all ? got / all : 0;
}

export function bandFor(o: { ok: boolean; slip?: boolean; misses?: number; share?: number; close?: boolean }): Band {
  if (o.ok) return o.slip || (o.misses ?? 0) > 0 ? 'pass' : 'perfect';
  const share = o.share ?? (o.close ? 0.6 : 0);
  return share >= 0.75 ? 'good' : share >= 0.5 ? 'growing' : 'learning';
}

export const BAND_WORDS: Record<Band, string> = {
  perfect: 'Perfect!',
  pass: 'Correct!',
  good: 'Good. We’ll strengthen this.',
  growing: 'Good job. We’ll strengthen this.',
  learning: 'No problem, you’re still learning.',
};
