// The memory model, in one place: the chance of recalling something now, how a recall is graded, and each person's
// typical speed. Wraps FSRS-6 (ts-fsrs). Everything that asks "how well is this remembered?" asks here. See ADR-001.

import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade } from 'ts-fsrs';
import { allowedMisses, type LogEntry, type SavedCard, type StepResult } from './progress.ts';

/** Stamped on every answer with the chance the model gave just before it, so we can check the model is right. */
export const MODEL_VERSION = 'fsrs6-default-v1';

const DAY = 86_400_000;
const DECAY = generatorParameters().w[20];
const FACTOR = Math.pow(0.9, -1 / DECAY) - 1;

// ---- Calibration: the model's chance, corrected by how its predictions have actually turned out (calibrate.ts).
// `population` is fitted on everyone's answers and decides what is "in memory" (so the board stays fair); `person` is
// fitted on one person's own answers and only sharpens what to review next. Both default to no correction.
export interface Cal { a: number; b: number }
const IDENTITY: Cal = { a: 1, b: 0 };
let population: Cal = IDENTITY, person: Cal | null = null;
export const setPopulationCal = (c: Cal | null) => { population = c ?? IDENTITY; };
export const setPersonCal = (c: Cal | null) => { person = c; };
const logit = (p: number) => Math.log(p / (1 - p));
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const clamp = (p: number) => Math.min(0.999, Math.max(0.001, p));
/** A raw model chance corrected by a calibration. */
export const calibrate = (p: number, c: Cal = population) => (c === IDENTITY ? p : sigmoid(c.a * logit(clamp(p)) + c.b));
/** The raw model chance that a calibrated chance of `target` corresponds to (so thresholds stay in calibrated terms). */
export const rawFor = (target: number, c: Cal = population) => (c === IDENTITY ? target : sigmoid((logit(clamp(target)) - c.b) / c.a));

const rawChance = (last: number, s: number, now: Date) => Math.pow(1 + FACTOR * (Math.max(0, now.getTime() - last) / DAY / Math.max(0.1, s)), -DECAY);

/** The chance of recalling it now: 90% when the days since the last review equal its stability (the FSRS-6 curve),
 *  corrected by the person's own calibration when there is one, else the population's. */
export function recallChance(card: SavedCard, now: Date): number {
  const last = card.last_review ? Date.parse(card.last_review) : Date.parse(card.due) - card.scheduled_days * DAY;
  return calibrate(rawChance(last, card.stability, now), person ?? population);
}

/** The chance the model gives before an answer, for an item it has scheduled; null for one not yet recalled after sleep. */
// The raw model chance, never the calibrated one: it is what we later check and refit against.
export function predictedChance(card: SavedCard | undefined, now: Date): number | null {
  if (!card || card.state === State.New) return null;
  const last = card.last_review ? Date.parse(card.last_review) : Date.parse(card.due) - card.scheduled_days * DAY;
  return Math.round(rawChance(last, card.stability, now) * 1000) / 1000;
}

/** Days from `now` until the chance falls to `target`. */
export function daysUntil(card: SavedCard, target: number, now: Date): number {
  const last = card.last_review ? Date.parse(card.last_review) : now.getTime();
  return Math.max(0, (last + daysToChance(card.stability, target) * DAY - now.getTime()) / DAY);
}
/** Days after the last review until the (population-calibrated) chance falls to `target`. */
export const daysToChance = (stability: number, target: number) => (stability * (Math.pow(rawFor(target), -1 / DECAY) - 1)) / FACTOR;

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

// ---- Memory per part (ADR-001 Decisions 1 and 2): every line of a long answer has its own memory, rebuilt by replaying
// the answers in time order. Nothing is stored that can drift: the answers are the truth, so two phones that hold the
// same answers always agree. Answers the phone has trimmed are kept as a snapshot (see `foldTrimmed`).

export interface PartMem { s: number; d: number; last: string; reps: number; lapses: number; state: State }
export interface PartSnapshot { asOf: string; mem: Record<string, PartMem> }

// No fuzz: the same answers must always give the same memory.
const replayer = fsrs(generatorParameters({ enable_fuzz: false, enable_short_term: false }));
const GRADE = { again: Rating.Again, hard: Rating.Hard, good: Rating.Good } as const;

/** Replay answers (any order) on top of `start`. Only the first graded recall of a part on a given day moves its memory. */
export function replayParts(entries: LogEntry[], start: Record<string, PartMem> = {}): Record<string, PartMem> {
  const mem: Record<string, PartMem> = { ...start };
  // Group by part and session; one mark per part per session (the worst), and the first session of each day counts.
  const sessions = new Map<string, { part: string; at: string; day: string; marks: Mark[] }>();
  for (const e of entries) {
    if (!e.part || !RECALL.has(e.kind)) continue;
    const key = `${e.part}|${e.at}`;
    const s = sessions.get(key) ?? { part: e.part, at: e.at, day: e.day ?? e.at.slice(0, 10), marks: [] };
    s.marks.push(markOf(e as StepResult));
    sessions.set(key, s);
  }
  const seenDay = new Set<string>();
  for (const s of [...sessions.values()].sort((a, b) => a.at.localeCompare(b.at))) {
    const m = mem[s.part];
    if (m && s.at <= m.last) continue;
    if (seenDay.has(`${s.part}|${s.day}`) || (m && (m.last.slice(0, 10) === s.day))) continue;
    seenDay.add(`${s.part}|${s.day}`);
    const mark: Mark = s.marks.includes('again') ? 'again' : s.marks.includes('hard') ? 'hard' : 'good';
    const at = new Date(s.at);
    const card: Card = m
      ? { ...createEmptyCard(new Date(m.last)), stability: m.s, difficulty: m.d, reps: m.reps, lapses: m.lapses, state: m.state, last_review: new Date(m.last), due: new Date(Date.parse(m.last) + m.s * DAY) }
      : createEmptyCard(at);
    const next = replayer.next(card, at, GRADE[mark]).card;
    mem[s.part] = { s: next.stability, d: next.difficulty, last: s.at, reps: next.reps, lapses: next.lapses, state: next.state };
  }
  return mem;
}

/** Every part's memory now: the snapshot, then the answers after it. */
export function partMemories(log: LogEntry[], snap?: PartSnapshot): Record<string, PartMem> {
  // Each part skips answers older than its own last review, so a snapshot never double counts, and an answer for a part
  // the snapshot doesn't know is still replayed.
  return replayParts(log, snap?.mem ?? {});
}

/** When the phone trims old answers, fold them into the snapshot first so no part forgets its history. */
export function foldTrimmed(dropped: LogEntry[], snap?: PartSnapshot): PartSnapshot | undefined {
  const graded = dropped.filter((e) => e.part && (!snap || e.at > snap.asOf));
  if (!graded.length) return snap;
  const asOf = graded.reduce((m, e) => (e.at > m ? e.at : m), snap?.asOf ?? '');
  return { asOf, mem: replayParts(graded, snap?.mem) };
}

/** The chance of recalling one part now. */
export const partChance = (m: PartMem, now: Date) => calibrate(rawChance(Date.parse(m.last), m.s, now), person ?? population);

/** An item's chance is its weakest part's (when its parts have memories). */
export function itemChance(itemId: string, parts: Record<string, PartMem>, now: Date): number | null {
  let min: number | null = null;
  for (const [k, m] of Object.entries(parts)) if (k.startsWith(`${itemId}#`)) { const c = partChance(m, now); if (min === null || c < min) min = c; }
  return min;
}

/** Parts to ask first: last recalled wrong, or with a chance under `below`. */
export function weakPartsNow(log: LogEntry[], parts: Record<string, PartMem>, now: Date, below = 0.85): Set<string> {
  const out = weakParts(log);
  for (const [k, m] of Object.entries(parts)) if (partChance(m, now) < below) out.add(k);
  return out;
}

/** Two phones' snapshots: each part keeps whichever memory was reviewed most recently. */
export const mergeSnapshot = (a?: PartSnapshot, b?: PartSnapshot): PartSnapshot | undefined => {
  if (!a || !b) return a ?? b;
  const mem: Record<string, PartMem> = { ...a.mem };
  for (const [k, m] of Object.entries(b.mem)) if (!mem[k] || m.last > mem[k].last) mem[k] = m;
  return { asOf: a.asOf >= b.asOf ? a.asOf : b.asOf, mem };
};

export function parseSnapshot(v: unknown): PartSnapshot | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const s = v as Partial<PartSnapshot>;
  if (typeof s.asOf !== 'string' || !s.mem || typeof s.mem !== 'object') return undefined;
  const mem = Object.fromEntries(Object.entries(s.mem).filter(([, m]) => m && typeof m.s === 'number' && typeof m.d === 'number' && typeof m.last === 'string'));
  return { asOf: s.asOf, mem };
}

// ---- Look-alikes: verses and answers that share many words get confused, so a review keeps them apart.

const words = (t: string) => new Set(t.toLowerCase().replace(/[^a-z\s']/g, ' ').split(/\s+/).filter((w) => w.length > 3));
/** Share of distinctive words two texts have in common (0 to 1). */
export function overlap(a: string, b: string): number {
  const x = words(a), y = words(b);
  if (!x.size || !y.size) return 0;
  let n = 0; for (const w of x) if (y.has(w)) n++;
  return n / Math.min(x.size, y.size);
}

/** Reorder so no two neighbours are look-alikes (overlap of 0.5 or more), keeping the order otherwise. */
export function spreadApart<T>(list: T[], text: (t: T) => string): T[] {
  const left = [...list], out: T[] = [];
  while (left.length) {
    const prev = out[out.length - 1];
    const i = prev === undefined ? 0 : left.findIndex((x) => overlap(text(prev), text(x)) < 0.5);
    out.push(...left.splice(i === -1 ? 0 : i, 1));
  }
  return out;
}

// ---- Why a review is here, in a few plain words, shown on the review: how it went last time, or how long it has been,
// and how strong it is now.
export function whyNow(itemId: string, log: LogEntry[], chance: number | null, now: Date): string | null {
  let last: LogEntry | undefined;
  for (const e of log) if (e.itemId === itemId && RECALL.has(e.kind) && (!last || e.at > last.at)) last = e;
  // The model only knows memory across nights: on the day something was last practiced its chance means little (it was
  // just seen), so no number is shown then.
  const sameDay = !!last && (now.getTime() - Date.parse(last.at)) < 20 * 3_600_000;
  const strength = chance === null || sameDay ? '' : ` · strength ${Math.round(chance * 100)}%`;
  if (!last) return chance === null ? null : `Strength ${Math.round(chance * 100)}%`;
  if (!last.correct || last.hints) {
    const off = last.misses ? `${last.misses} ${last.misses === 1 ? 'word' : 'words'} off last time` : last.hints ? 'Needed a hint last time' : 'Missed last time';
    return `${off}${strength}`;
  }
  const days = Math.floor((now.getTime() - Date.parse(last.at)) / DAY);
  const ago = days <= 0 ? 'Practiced today' : days === 1 ? 'Last practiced yesterday' : `Last practiced ${days} days ago`;
  return `${ago}${strength}`;
}

/** Items recalled (typed, said or first letters) in the last `hours`: not picked again for a review so soon. */
export function recalledRecently(log: LogEntry[], now: Date, hours = 16): Set<string> {
  const since = now.getTime() - hours * 3_600_000;
  return new Set(log.filter((e) => RECALL.has(e.kind) && Date.parse(e.at) >= since).map((e) => e.itemId));
}


// ---- In memory, from the model (ADR-001 Decision 6). An item stays in your count until its weakest line's chance has
// been under 70% for a week. A line's chance only falls between reviews, so that is a date: when it crosses 70%, plus 7 days.
export const OUT_BELOW = 0.7;
export const OUT_AFTER_DAYS = 7;
export const STRONG_ABOVE = 0.8;

/** The memories of every part of an item, or null if any part has none yet (then the old fixed windows apply). */
export function itemParts(unitKeys: string[], parts: Record<string, PartMem>): PartMem[] | null {
  const mems = unitKeys.map((k) => parts[k]);
  return mems.length && mems.every(Boolean) ? mems : null;
}

/** When the item leaves your count if nothing more is recalled: its weakest line crossing 70%, plus a week. */
export function outAt(mems: PartMem[]): Date {
  return new Date(Math.min(...mems.map((m) => Date.parse(m.last) + (daysToChance(m.s, OUT_BELOW) + OUT_AFTER_DAYS) * DAY)));
}

/** When the item's weakest line falls to 80%: "strong until about" this date. */
export function strongUntil(mems: PartMem[]): Date {
  return new Date(Math.min(...mems.map((m) => Date.parse(m.last) + daysToChance(m.s, STRONG_ABOVE) * DAY)));
}
