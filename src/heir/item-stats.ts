// What one question or verse's page and its course's list show: how strong it is now, and how it has gone.
// Strength is the model's chance of recalling the whole item now (its weakest part), as on the lesson screens. It is
// not shown on a day the item was practised (it would only say "just now"); the page says "Today" instead.

import { itemChance, partMemories, recallChance, type PartMem } from './memory.ts';
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

// ---- The passage, word by word (a verse or answer with every word coloured by how reliably you recall it).
// From the typed, said and first-letter answers on the log: a part answered right with no misses shows every word in it recalled; an
// answer with word positions marks those words missed and the rest recalled; an answer with misses but no positions is unknown and skipped.
// Fill-in-the-blanks answers only ever count misses (not every word is asked). Newer answers weigh more.

export type WordBand = 'none' | 'red' | 'yellow' | 'light' | 'dark';
export interface WordCard { word: string; band: WordBand; tries: number; misses: number }

const WORD_KINDS = new Set(['type', 'say', 'letters']);
const RECENCY = 0.85;

export function wordCards(item: Item, track: Track, log: MemberProgress['log']): WordCard[] {
  const chunks = item.chunks[track];
  const words = chunks.join(' ').split(/\s+/).filter(Boolean);
  const seen: { hit: boolean; at: string }[][] = words.map(() => []);
  const units = new Map(unitsFor(item, track).map((u) => [u.key, u]));
  for (const e of log.filter((x) => x.itemId === item.id && x.part && (WORD_KINDS.has(x.kind) || x.kind === 'blanks'))) {
    const u = units.get(e.part!);
    if (!u) continue;
    const offset = chunks.slice(0, u.start).join(' ').split(/\s+/).filter(Boolean).length;
    const count = unitText(item, track, u).text.split(/\s+/).filter(Boolean).length;
    const missed = new Set(e.missed ?? []);
    const clean = (e.misses ?? (e.correct ? 0 : undefined)) === 0;
    if (!clean && !e.missed?.length) continue; // unknown which words
    for (let i = 0; i < count; i++) {
      const at = offset + i;
      if (at >= words.length) continue;
      if (missed.has(i)) seen[at].push({ hit: false, at: e.at });
      else if (WORD_KINDS.has(e.kind)) seen[at].push({ hit: true, at: e.at });
    }
  }
  return words.map((word, i) => {
    const obs = [...seen[i]].sort((a, b) => b.at.localeCompare(a.at));
    if (!obs.length) return { word, band: 'none' as const, tries: 0, misses: 0 };
    let w = 0, wMiss = 0, misses = 0;
    obs.forEach((o, k) => { const x = RECENCY ** k; w += x; if (!o.hit) { wMiss += x; misses++; } });
    const rate = wMiss / w;
    const band: WordBand = rate >= 0.5 ? 'red' : rate >= 0.25 ? 'yellow' : obs.length >= 3 && rate <= 0.08 ? 'dark' : 'light';
    return { word, band, tries: obs.length, misses };
  });
}

/** Times recited perfectly: lessons or reviews in which every part was typed or said right with no misses and no hints. */
export function recitedPerfectly(item: Item, track: Track, log: MemberProgress['log']): number {
  const parts = unitsFor(item, track).length;
  const by = new Map<string, Set<string>>();
  for (const e of log) {
    if (e.itemId !== item.id || !(e.kind === 'type' || e.kind === 'say') || !e.correct || e.hints || (e.misses ?? 0) > 0) continue;
    by.set(e.at, (by.get(e.at) ?? new Set()).add(e.part ?? '*'));
  }
  return [...by.values()].filter((set) => set.size >= parts || set.has('*')).length;
}

/** Times practised in all: separate lessons or reviews with any answer about it. */
export function timesPracticed(item: Item, log: MemberProgress['log']): number {
  return new Set(log.filter((e) => e.itemId === item.id && e.kind !== 'intro' && e.kind !== 'info' && e.kind !== 'verse').map((e) => e.at)).size;
}

/** Strength over time: the model's chance of recalling the whole item, replayed from the answers as they stood at each point (a point a day for a short history, a week after two months). */
export function strengthSeries(item: Item, log: MemberProgress['log'], now: Date): { at: number; chance: number }[] {
  const mine = log.filter((e) => e.itemId === item.id && e.part && e.kind !== 'intro');
  if (!mine.length) return [];
  const first = Math.min(...mine.map((e) => Date.parse(e.at)));
  const DAY = 86_400_000;
  const span = (now.getTime() - first) / DAY;
  const step = span <= 60 ? DAY : 7 * DAY;
  const out: { at: number; chance: number }[] = [];
  for (let t = first; t <= now.getTime() + step - 1; t += step) {
    const at = Math.min(t, now.getTime());
    const upTo = mine.filter((e) => Date.parse(e.at) <= at);
    if (!upTo.length) continue;
    const c = itemChance(item.id, partMemories(upTo), new Date(at));
    if (c !== null) out.push({ at, chance: c });
    if (at === now.getTime()) break;
  }
  return out.slice(-70);
}
