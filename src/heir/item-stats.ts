// What one question or verse's page and its course's list show: how strong it is now, and how it has gone.
// Strength is the model's chance of recalling the whole item now (its weakest part), as on the lesson screens. It is
// not shown on a day the item was practised (it would only say "just now"); the page says "Today" instead.

import { itemChance, recallChance, type PartMem } from './memory.ts';
import { unitsFor, unitText } from './lesson.ts';
import { localDay, type MemberProgress } from './progress.ts';
import type { Item, Track } from './types.ts';

export function itemStrength(p: MemberProgress, itemId: string, now: Date, parts: Record<string, PartMem>): number | null {
  const card = p.cards[itemId];
  const byPart = itemChance(itemId, parts, now);
  if (!card) return byPart;
  return Math.min(recallChance(card, now), byPart ?? 1);
}

export const practisedToday = (p: MemberProgress, itemId: string, now: Date) => {
  const day = localDay(now);
  return p.log.some((e) => e.itemId === itemId && (e.day ?? localDay(new Date(e.at))) === day);
};

export interface ItemStats {
  learnedAt: Date | null;
  /** Answers given: how many, and how many right. */
  practised: number;
  right: number;
  last: Date | null;
  lastRight: boolean | null;
  /** The word missed most often (at least twice), as written. */
  oftenMissed: string | null;
  /** When it's next due for a review. */
  due: Date | null;
}

export function itemStats(item: Item, p: MemberProgress, track: Track): ItemStats {
  const log = p.log.filter((e) => e.itemId === item.id);
  const answers = log.filter((e) => e.kind !== 'intro');
  const last = answers.at(-1) ?? null;
  const units = new Map(unitsFor(item, track).map((u) => [u.key, unitText(item, track, u).text.split(/\s+/)]));
  const misses = new Map<string, { n: number; word: string }>();
  for (const e of answers) {
    if (!e.part || !e.missed?.length) continue;
    const words = units.get(e.part);
    if (!words) continue;
    for (const at of new Set(e.missed)) {
      const word = words[at]?.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
      if (!word) continue;
      const key = word.toLowerCase();
      misses.set(key, { n: (misses.get(key)?.n ?? 0) + 1, word });
    }
  }
  const top = [...misses.values()].sort((a, b) => b.n - a.n)[0];
  const card = p.cards[item.id];
  return {
    learnedAt: log.length ? new Date(log[0].at) : null,
    practised: answers.length,
    right: answers.filter((e) => e.correct).length,
    last: last ? new Date(last.at) : null,
    lastRight: last ? last.correct : null,
    oftenMissed: top && top.n >= 2 ? top.word : null,
    due: card ? new Date(card.due) : null,
  };
}

/** Strong (85% and up), fading (70 to 85%), or weak (under 70%): the colour of a strength. */
export const strengthBand = (s: number) => (s >= 0.85 ? 'strong' : s >= 0.7 ? 'fading' : 'weak');
