// What's in your memory, counted in words: one definition each, used on every screen.
//   learned: words of every part whose lesson you've finished (on your track);
//   at stage n (1 Recalled … 6 Rooted): words of every item whose stone is at least that level.

import { unitsFor, unitText } from './lesson.ts';
import type { MemberProgress } from './progress.ts';
import type { Item, Track } from './types.ts';

export const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

export interface Words { learned: number; atStage: number[]; inMemory: number }

export function wordsIn(items: Item[], track: Track, p: MemberProgress): Words {
  const learnedUnits = new Set(p.units);
  let learned = 0;
  const atStage = [0, 0, 0, 0, 0, 0, 0];
  for (const item of items) {
    for (const u of unitsFor(item, track)) if (learnedUnits.has(u.key)) learned += wordCount(unitText(item, track, u).text);
    const level = p.levels[item.id] ?? 0;
    const words = wordCount(item.chunks[track].join(' '));
    for (let n = 1; n <= Math.min(6, level); n++) atStage[n] += words;
  }
  atStage[0] = learned;
  return { learned, atStage, inMemory: atStage[1] };
}

/** Words learned in parts first practised in the last 7 days. */
export function wordsLearnedThisWeek(items: Item[], track: Track, p: MemberProgress, now: Date): number {
  const since = now.getTime() - 7 * 86_400_000;
  const firstSeen = new Map<string, number>();
  for (const e of p.log) { const t = Date.parse(e.at); if (!firstSeen.has(e.itemId) || t < firstSeen.get(e.itemId)!) firstSeen.set(e.itemId, t); }
  const learnedUnits = new Set(p.units);
  let n = 0;
  for (const item of items) {
    if ((firstSeen.get(item.id) ?? 0) < since) continue;
    for (const u of unitsFor(item, track)) if (learnedUnits.has(u.key)) n += wordCount(unitText(item, track, u).text);
  }
  return n;
}

export const MILESTONES = [10, 25, 50, 75, 100, 150, 250, 500, 750, 1000];

/** The milestones reached, and the next one (null past the last). */
export function milestones(inMemory: number): { reached: number[]; next: number | null } {
  return { reached: MILESTONES.filter((m) => inMemory >= m), next: MILESTONES.find((m) => inMemory < m) ?? null };
}
