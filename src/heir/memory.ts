// The memory model, in one place: the chance of recalling something now, how a recall is graded, and each person's
// typical speed. Wraps FSRS-6 (ts-fsrs). Everything that asks "how well is this remembered?" asks here. See ADR-001.

import { generatorParameters, Rating, State, type Grade } from 'ts-fsrs';
import { allowedMisses, type LogEntry, type SavedCard, type StepResult } from './progress.ts';

/** Stamped on every answer with the chance the model gave just before it, so we can check the model is right. */
export const MODEL_VERSION = 'fsrs6-default-v1';

const DAY = 86_400_000;
const DECAY = generatorParameters().w[20];
const FACTOR = Math.pow(0.9, -1 / DECAY) - 1;

/** The chance of recalling it now: 90% when the days since the last review equal its stability (the FSRS-6 curve). */
export function recallChance(card: SavedCard, now: Date): number {
  const last = card.last_review ? Date.parse(card.last_review) : Date.parse(card.due) - card.scheduled_days * DAY;
  const days = Math.max(0, (now.getTime() - last) / DAY);
  const s = Math.max(0.1, card.stability);
  return Math.pow(1 + FACTOR * (days / s), -DECAY);
}

/** The chance the model gives before an answer, for an item it has scheduled; null for one not yet recalled after sleep. */
export function predictedChance(card: SavedCard | undefined, now: Date): number | null {
  if (!card || card.state === State.New) return null;
  return Math.round(recallChance(card, now) * 1000) / 1000;
}

/** Days from `now` until the chance falls to `target`. */
export function daysUntil(card: SavedCard, target: number, now: Date): number {
  const last = card.last_review ? Date.parse(card.last_review) : now.getTime();
  const t = (card.stability * (Math.pow(target, -1 / DECAY) - 1)) / FACTOR;
  return Math.max(0, (last + t * DAY - now.getTime()) / DAY);
}

// ---- Speed: each person's own typical seconds per word, by kind of answer.

export interface Speed { msPerWord: number; n: number }
const FULL = new Set(['type', 'say']);

/** The median time per word of right, unaided full recalls, for typing and for saying. Speed is only ever compared to your own. */
export function speedBaseline(log: LogEntry[]): Record<string, Speed> {
  const by: Record<string, number[]> = {};
  for (const e of log) if (FULL.has(e.kind) && e.correct && !e.hints && e.words && e.ms > 0) (by[e.kind] ??= []).push(e.ms / e.words);
  return Object.fromEntries(Object.entries(by).map(([k, v]) => { const s = [...v].sort((a, b) => a - b); return [k, { msPerWord: s[Math.floor(s.length / 2)], n: s.length }]; }));
}

// ---- Grading.

export type Mark = 'again' | 'hard' | 'good';

/** How one recall went. Typed or said in full: right and unaided is good; a slip or two (within the allowance), a hint, or a
 *  single misheard word in a spoken answer is hard; more is again. First letters is cued recall: at best hard. */
export function markOf(r: StepResult): Mark {
  if (r.kind === 'letters') return r.correct ? 'hard' : 'again';
  if (r.correct && !r.hints) return 'good';
  if (r.correct) return 'hard';
  if (r.misses !== undefined && r.misses <= allowedMisses(r.words) && !r.hints) return 'hard';
  if (r.kind === 'say' && r.misses === 1) return 'hard';
  return 'again';
}

const RECALL = new Set(['type', 'say', 'letters']);

/**
 * One item's grade for a session (the first try at each recall counts). The worst recall sets it. Easy needs every recall
 * right and unaided, the item reviewed at least twice before, and full recalls faster than this person's usual pace
 * (once there are 20 earlier answers to know it by). Null when nothing in the session was recall.
 */
export function gradeRecall(results: StepResult[], card: { state: State; reps: number } | undefined, speed: Record<string, Speed> = {}): Grade | null {
  const recall = results.filter((r) => RECALL.has(r.kind));
  if (!recall.length) return null;
  const marks = recall.map(markOf);
  if (marks.includes('again')) return Rating.Again;
  if (marks.includes('hard')) return Rating.Hard;
  const seasoned = !!card && card.state === State.Review && card.reps >= 2 && recall.every((r) => r.review);
  const full = recall.filter((r) => FULL.has(r.kind) && r.words);
  const fast = full.length > 0 && full.every((r) => { const b = speed[r.kind]; return !!b && b.n >= 20 && r.ms / r.words! < b.msPerWord; });
  return seasoned && fast ? Rating.Easy : Rating.Good;
}

// ---- Parts: which line of a long answer is weak.

/** Parts whose most recent recall was wrong (or hinted): the lines a review should ask for first. */
export function weakParts(log: LogEntry[]): Set<string> {
  const last = new Map<string, boolean>();
  for (const e of [...log].sort((a, b) => a.at.localeCompare(b.at))) if (e.part && RECALL.has(e.kind)) last.set(e.part, e.correct && !e.hints);
  return new Set([...last].filter(([, ok]) => !ok).map(([k]) => k));
}

/** Typical seconds for one review step, from this person's answers (25 s until there are enough). */
export function stepSeconds(log: LogEntry[]): number {
  const ms = log.filter((e) => e.review && e.ms > 0 && e.ms < 180_000).map((e) => e.ms).sort((a, b) => a - b);
  return ms.length >= 20 ? Math.max(8, ms[Math.floor(ms.length / 2)] / 1000) : 25;
}
