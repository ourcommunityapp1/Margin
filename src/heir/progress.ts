// Each person's progress: which parts they have learned, when each item comes back (FSRS), and a log of
// every answer. Pure functions over plain JSON, so it can live on the phone now and in the database later.

import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade } from 'ts-fsrs';
import type { StepKind, Unit } from './lesson.ts';

// Day-sized intervals: same-day repetition happens inside the lesson itself.
// Fuzz spreads reviews by a day or so, so questions learned together don't all come due together.
const scheduler = fsrs(generatorParameters({ enable_fuzz: true, enable_short_term: false }));

export type SavedCard = Omit<Card, 'due' | 'last_review'> & { due: string; last_review?: string };

export interface LogEntry {
  at: string;
  itemId: string;
  kind: StepKind;
  correct: boolean;
  hints: number;
  ms: number;
  review: boolean;
}

export interface MemberProgress {
  // Unit keys learned ("wsc-1#1").
  units: string[];
  // Groups whose "lock it in" checkpoint is done ("westminster-shorter:1-5").
  checkpoints: string[];
  // One schedule per fully learned item.
  cards: Record<string, SavedCard>;
  lessons: number;
  // Lessons finished in each course (course id → count), for numbering: Welcome, Lesson 2, …
  courseLessons: Record<string, number>;
  // Highest stone level each item has earned (1 Amethyst … 6 Diamond). Levels never go down.
  levels: Record<string, number>;
  // Award id → ISO date it was first earned.
  awards: Record<string, string>;
  // Local dates (YYYY-MM-DD) with a finished lesson or review.
  days: string[];
  log: LogEntry[];
  // The last "When you lie down": when, which questions, and whether "When you rise" has followed it.
  night?: { at: string; items: string[]; risen?: boolean };
  // Related verses recalled from memory (passage → ISO date), toward Diamond. See related.ts.
  related?: Record<string, string>;
}

export type Progress = Record<string, MemberProgress>;

export const emptyProgress = (): MemberProgress => ({ units: [], checkpoints: [], cards: {}, lessons: 0, courseLessons: {}, levels: {}, awards: {}, days: [], log: [] });

export const memberProgress = (p: Progress, memberId: string | null | undefined): MemberProgress =>
  (memberId && p[memberId]) || emptyProgress();

export interface StepResult {
  itemId: string;
  kind: StepKind;
  // Right on the first try.
  correct: boolean;
  hints: number;
  ms: number;
  review: boolean;
}

export function localDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const toCard = (s: SavedCard): Card => ({ ...s, due: new Date(s.due), last_review: s.last_review ? new Date(s.last_review) : undefined });
const fromCard = (c: Card): SavedCard => ({ ...c, due: c.due.toISOString(), last_review: c.last_review ? c.last_review.toISOString() : undefined });

// Only producing the answer yourself counts as recall: typing it, saying it, or its first letters.
// Recognising it (word banks, matching, spotting a wrong word) teaches, but doesn't move the schedule.
export const RECALL_KINDS = new Set(['type', 'say', 'letters']);

// The four grades a recall can earn, in the words the app uses for them.
export const GRADES = {
  forgot: { rating: Rating.Again, word: 'Forgot', means: 'Couldn’t recall it' },
  shaky: { rating: Rating.Hard, word: 'Shaky', means: 'Recalled it with a slip or a hint' },
  solid: { rating: Rating.Good, word: 'Solid', means: 'Recalled it correctly' },
  effortless: { rating: Rating.Easy, word: 'Effortless', means: 'Recalled it perfectly, on a question you’ve already reviewed several times' },
} as const;

// How well an item was recalled in one session, or null if nothing in it was recall.
export function ratingFor(results: StepResult[], card?: Card): Grade | null {
  const recall = results.filter((r) => RECALL_KINDS.has(r.kind));
  if (!recall.length) return null;
  const misses = recall.filter((r) => !r.correct).length;
  const hints = recall.reduce((n, r) => n + r.hints, 0);
  if (misses === 0 && hints === 0) {
    const seasoned = !!card && card.state === State.Review && card.reps >= 3 && recall.every((r) => r.review);
    return seasoned ? GRADES.effortless.rating : GRADES.solid.rating;
  }
  if (misses <= 1) return GRADES.shaky.rating;
  return GRADES.forgot.rating;
}

// A newly learned question's first real recall waits for a night's sleep: the next morning, and never
// sooner than eight hours. Recall in the same sitting mostly measures short-term memory.
export function afterSleep(now: Date): Date {
  const morning = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 4);
  return new Date(Math.max(morning.getTime(), now.getTime() + 8 * 3_600_000));
}

// Learned, but not yet recalled after sleep.
export function waitingForSleep(p: MemberProgress, itemId: string, now: Date): boolean {
  const c = p.cards[itemId];
  return !!c && c.state === State.New && Date.parse(c.due) > now.getTime();
}

export function finishSession(p: MemberProgress, o: { results: StepResult[]; learned?: Unit | Unit[] | null; checkpoint?: string | null; courseId?: string; now: Date }): MemberProgress {
  const newUnits = o.learned ? (Array.isArray(o.learned) ? o.learned : [o.learned]) : [];
  const cards = { ...p.cards };
  const byItem = new Map<string, StepResult[]>();
  for (const r of o.results) byItem.set(r.itemId, [...(byItem.get(r.itemId) ?? []), r]);
  for (const [itemId, rs] of byItem) {
    const existing = cards[itemId];
    const finishesItem = newUnits.some((u) => u.itemId === itemId && u.part === u.of);
    if (!existing) {
      // Just learned: it isn't rated from this sitting. Its first recall comes after a night's sleep.
      if (finishesItem) cards[itemId] = fromCard({ ...createEmptyCard(o.now), due: afterSleep(o.now) });
      continue;
    }
    const card = toCard(existing);
    // Still waiting for its first night: practice today is welcome, but doesn't count yet.
    if (card.state === State.New && o.now < card.due) continue;
    const grade = ratingFor(rs, card);
    if (grade === null) continue;
    cards[itemId] = fromCard(scheduler.next(card, o.now, grade).card);
  }
  const at = o.now.toISOString();
  const day = localDay(o.now);
  return {
    units: [...p.units, ...newUnits.map((u) => u.key).filter((k) => !p.units.includes(k))],
    checkpoints: o.checkpoint && !p.checkpoints.includes(o.checkpoint) ? [...p.checkpoints, o.checkpoint] : p.checkpoints,
    cards,
    lessons: p.lessons + 1,
    courseLessons: o.courseId ? { ...p.courseLessons, [o.courseId]: (p.courseLessons[o.courseId] ?? lessonsBefore(p, o)) + 1 } : p.courseLessons,
    levels: p.levels,
    awards: p.awards,
    days: p.days.includes(day) ? p.days : [...p.days, day].slice(-400),
    log: [...p.log, ...o.results.map((r) => ({ ...r, at }))].slice(-1500),
  };
}

// How many separate sessions each item has been practiced in (a session's answers share one timestamp).
export function seenCounts(p: MemberProgress): Map<string, number> {
  const sessions = new Map<string, Set<string>>();
  for (const e of p.log) {
    if (e.kind === 'intro') continue;
    const set = sessions.get(e.itemId) ?? new Set<string>();
    set.add(e.at);
    sessions.set(e.itemId, set);
  }
  return new Map([...sessions].map(([id, set]) => [id, set.size]));
}

// Older progress had no per-course count: start from the sessions already logged for the items in this one.
function lessonsBefore(p: MemberProgress, o: { results: StepResult[] }): number {
  const ids = new Set(o.results.map((r) => r.itemId));
  return new Set(p.log.filter((e) => ids.has(e.itemId)).map((e) => e.at)).size;
}

export interface DueCard { itemId: string; due: Date; strength: number }

export function dueCards(p: MemberProgress, now: Date, itemIds?: Set<string>): DueCard[] {
  return Object.entries(p.cards)
    .filter(([id]) => !itemIds || itemIds.has(id))
    .map(([itemId, c]) => ({ itemId, due: new Date(c.due), strength: c.stability }))
    .filter((c) => c.due <= now)
    .sort((a, b) => a.due.getTime() - b.due.getTime());
}

// When nothing is due, the weakest learned items are the best to practice.
export function weakestCards(p: MemberProgress, itemIds?: Set<string>, count = 4): DueCard[] {
  return Object.entries(p.cards)
    .filter(([id]) => !itemIds || itemIds.has(id))
    .map(([itemId, c]) => ({ itemId, due: new Date(c.due), strength: c.stability }))
    .sort((a, b) => a.strength - b.strength)
    .slice(0, count);
}

export function parseProgress(raw: string | null): Progress {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
    const out: Progress = {};
    for (const [id, m] of Object.entries(v as Record<string, Partial<MemberProgress>>)) {
      if (!m || typeof m !== 'object') continue;
      out[id] = {
        units: Array.isArray(m.units) ? m.units.filter((u) => typeof u === 'string') : [],
        checkpoints: Array.isArray(m.checkpoints) ? m.checkpoints.filter((u) => typeof u === 'string') : [],
        cards: m.cards && typeof m.cards === 'object' ? m.cards : {},
        lessons: Number(m.lessons) || 0,
        courseLessons: m.courseLessons && typeof m.courseLessons === 'object' ? m.courseLessons : {},
        levels: m.levels && typeof m.levels === 'object' ? m.levels : {},
        awards: m.awards && typeof m.awards === 'object' ? m.awards : {},
        days: Array.isArray(m.days) ? m.days : [],
        log: Array.isArray(m.log) ? m.log : [],
        ...(m.night && typeof m.night.at === 'string' && Array.isArray(m.night.items)
          ? { night: { at: m.night.at, items: m.night.items.filter((i) => typeof i === 'string'), ...(m.night.risen ? { risen: true } : {}) } }
          : {}),
        ...(m.related && typeof m.related === 'object' && !Array.isArray(m.related)
          ? { related: Object.fromEntries(Object.entries(m.related).filter(([, v]) => typeof v === 'string')) }
          : {}),
      };
    }
    return out;
  } catch {
    return {};
  }
}

// "When you lie down" is graded like any lesson (finishSession). Afterwards, remember which questions it
// held, so "When you rise" can recall them in the morning.
export const markNight = (p: MemberProgress, items: string[], now: Date): MemberProgress => ({ ...p, night: { at: now.toISOString(), items } });

// After "When you rise".
export const markRisen = (p: MemberProgress): MemberProgress => (p.night ? { ...p, night: { ...p.night, risen: true } } : p);

/** Record that a related verse was recalled from memory. */
export function recallRelated(p: MemberProgress, passage: string, now: Date): MemberProgress {
  return p.related?.[passage] ? p : { ...p, related: { ...p.related, [passage]: now.toISOString() } };
}
