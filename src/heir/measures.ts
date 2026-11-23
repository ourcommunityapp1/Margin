// What's in your memory, counted in words: one definition each, used on every screen.
//   recited (stage 0): words of every item you've typed in full with no hints at its lesson (or that has a stone);
//   at stage n (1 Remembered … 6 Lifelong): words of every item whose stone is at least that level.
// "In your memory" is stage 1 and up: recalled unaided after at least a night's sleep.

import { recited } from './levels.ts';
import type { MemberProgress } from './progress.ts';
import type { Item, Track } from './types.ts';

export const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

export interface Words { recited: number; atStage: number[]; inMemory: number }

const itemWords = (item: Item, track: Track) => wordCount(item.chunks[track].join(' '));

export function wordsIn(items: Item[], track: Track, p: MemberProgress): Words {
  const atStage = [0, 0, 0, 0, 0, 0, 0];
  for (const item of items) {
    const level = p.levels[item.id] ?? 0;
    if (!level && !recited(item, track, p.log)) continue;
    const words = itemWords(item, track);
    for (let n = 0; n <= Math.min(6, level); n++) atStage[n] += words;
  }
  return { recited: atStage[0], atStage, inMemory: atStage[1] };
}

/** Words of items first recited in the last 7 days. */
export function wordsRecitedThisWeek(items: Item[], track: Track, p: MemberProgress, now: Date): number {
  const since = now.getTime() - 7 * 86_400_000;
  const firstSeen = new Map<string, number>();
  for (const e of p.log) { const t = Date.parse(e.at); if (!firstSeen.has(e.itemId) || t < firstSeen.get(e.itemId)!) firstSeen.set(e.itemId, t); }
  let n = 0;
  for (const item of items) {
    if ((firstSeen.get(item.id) ?? 0) < since) continue;
    if ((p.levels[item.id] ?? 0) > 0 || recited(item, track, p.log)) n += itemWords(item, track);
  }
  return n;
}

export const MILESTONES = [10, 25, 50, 75, 100, 150, 250, 500, 750, 1000];

/** The milestones reached, and the next one (null past the last). */
export function milestones(inMemory: number): { reached: number[]; next: number | null } {
  return { reached: MILESTONES.filter((m) => inMemory >= m), next: MILESTONES.find((m) => inMemory < m) ?? null };
}
