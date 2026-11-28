// What a step shows about memory, in one place. Every step a person answers is evidence, but not equal evidence:
// typing or saying the whole thing is the strongest; a quick step (fill the blanks, pick the next phrase, put phrases in order,
// spot the wrong word, match the question) shows less, by how much it makes you find the words yourself. These weights are
// used by the memory model (memory.ts), the stones (levels.ts) and the word-by-word view (item-stats.ts), so they never disagree.
// Pure: no state, no dates.

import { keptRecall } from './progress.ts';

/** How much of a whole answer each quick step proves (a whole answer is 1). */
export const LIGHT_WEIGHT: Record<string, number> = { match: 0.4, spot: 0.5, order: 0.5, next: 0.6, blanks: 0.75, letters: 0.9 };
/** Steps that recognise rather than produce words: right the first time or not at all. */
export const EASY = new Set(['match', 'spot', 'order', 'next']);
/** Quick steps that are not already graded as recall (type, say, letters are). These feed the memory only in reviews. */
export const LIGHT_ONLY = new Set(['match', 'spot', 'order', 'next', 'blanks']);

type Result = { kind: string; correct: boolean; hints: number; misses?: number; words?: number; review?: boolean; part?: string };

/** A quick step answered right: easy ones need the first try; fill-in-the-blanks allows the same slack as a typed answer. */
export const lightPass = (e: Result): boolean => !e.hints && (EASY.has(e.kind) ? e.correct : keptRecall(e));

/** One quick-steps-only session of an item (or one of its parts), reduced to a mark and a weight, or null if it had none.
 *  `good` with the weight of the kinds passed (each kind once, at most 1); `again` when any kind was missed, with the weight
 *  of the worst miss, halved: one slip on an easy step is weak evidence of forgetting. Only review steps count (in a lesson the
 *  words are still on the screen). */
export function lightMark(entries: Result[]): { mark: 'good' | 'again'; weight: number } | null {
  const light = entries.filter((e) => e.review !== false && LIGHT_ONLY.has(e.kind));
  if (!light.length) return null;
  const kinds = [...new Set(light.map((e) => e.kind))];
  const missed = kinds.filter((k) => !light.some((e) => e.kind === k && lightPass(e)));
  if (missed.length) return { mark: 'again', weight: Math.max(...missed.map((k) => LIGHT_WEIGHT[k])) / 2 };
  return { mark: 'good', weight: Math.min(1, kinds.reduce((n, k) => n + LIGHT_WEIGHT[k], 0)) };
}

/** Word positions (0-based, in the step's text) a step actually tested, or null when it tests the whole text. */
export function testedPositions(step: { kind: string; blanks?: number[]; wrongIndex?: number }): number[] | null {
  if (step.kind === 'blanks' && step.blanks) return step.blanks;
  if (step.kind === 'spot' && typeof step.wrongIndex === 'number') return [step.wrongIndex];
  return null;
}
