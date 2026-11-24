// Each person's progress: which parts they have learned, when each item comes back (FSRS), and a log of
// every answer. Pure functions over plain JSON, so it can live on the phone now and in the database later.

import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade } from 'ts-fsrs';
import type { StepKind, Unit } from './lesson.ts';
import { clampDue } from './keep.ts';

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
  // Added Nov 2026, so answers can be kept one by one on the server. Older entries have none of these.
  // `id`: unique per answer (the same answer is never stored twice; two answers in one lesson are never mistaken for one).
  id?: string;
  // The part of the item this answer was about ("wsc-1#2"); only set for text answers (type, say, letters, blanks).
  part?: string;
  // How many parts the item had (so a lesson that recalled every part is a whole-item recall).
  of?: number;
  // Words wrong or missing in a typed or spoken answer (0 for a perfect one), and how many words the text had.
  misses?: number;
  words?: number;
  // The phone's local date when it was answered, so days are never worked out in another time zone.
  day?: string;
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
  // Related verses recalled from memory (passage → ISO date), toward Mastered. See related.ts.
  related?: Record<string, string>;
  // Items explained in your own words and checked against the notes (item id → ISO date): Understood.
  explained?: Record<string, string>;
  // Per item, when it was last recalled from memory (typed or said) right with no hints (`good`), and when last not
  // (`miss`). Kept apart from the answer log, which the phone trims, so "when did I last recall this" is never lost.
  keep?: Record<string, Keep>;
}

// `good`/`miss`: last time any part was recalled right / not. `full`: last time every part of the item was recalled right in
// one lesson (the whole verse or answer): the recall the keeping rules will eventually ask for.
export interface Keep { good?: string; miss?: string; full?: string }

export type Progress = Record<string, MemberProgress>;

export const emptyProgress = (): MemberProgress => ({ units: [], checkpoints: [], cards: {}, lessons: 0, courseLessons: {}, levels: {}, awards: {}, days: [], log: [] });

export const memberProgress = (p: Progress, memberId: string | null | undefined): MemberProgress =>
  (memberId && p[memberId]) || emptyProgress();

export interface StepResult {
  itemId: string;
  kind: StepKind;
  part?: string;
  // How many parts the item has (so a lesson that recalled every part can be told from one that recalled one).
  of?: number;
  // Words in the text recalled, so a couple of slips in a long text can still keep it (see `allowedMisses`).
  words?: number;
  misses?: number;
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

export function finishSession(p: MemberProgress, o: { results: StepResult[]; learned?: Unit | Unit[] | null; checkpoint?: string | null; courseId?: string; now: Date; newId?: () => string; keepRules?: { tz?: string | null } }): MemberProgress {
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
  const keep = updateKeep(p.keep ?? keepFromLog(p.log), o.results, o.now.toISOString());
  // With the keeping rules on, no review is set later than two weeks before its window ends, or past the day after a miss.
  if (o.keepRules) {
    for (const itemId of byItem.keys()) {
      const c = cards[itemId], level = p.levels[itemId] ?? 0;
      if (c && level >= 1) cards[itemId] = { ...c, due: clampDue(new Date(c.due), level, keep[itemId], o.now, o.keepRules.tz, 'whole').toISOString() };
    }
  }
  const at = o.now.toISOString();
  const day = localDay(o.now);
  const newId = o.newId ?? (() => crypto.randomUUID());
  return {
    units: [...p.units, ...newUnits.map((u) => u.key).filter((k) => !p.units.includes(k))],
    checkpoints: o.checkpoint && !p.checkpoints.includes(o.checkpoint) ? [...p.checkpoints, o.checkpoint] : p.checkpoints,
    cards,
    lessons: p.lessons + 1,
    courseLessons: o.courseId ? { ...p.courseLessons, [o.courseId]: (p.courseLessons[o.courseId] ?? lessonsBefore(p, o)) + 1 } : p.courseLessons,
    levels: p.levels,
    awards: p.awards,
    days: p.days.includes(day) ? p.days : [...p.days, day].slice(-400),
    log: [...p.log, ...o.results.map((r) => ({ ...r, at, id: newId(), day }))].slice(-1500),
    keep,
  };
}

const FULL_RECALL = new Set(['type', 'say']);

/** Wrong or missing words that still count as keeping a verse or answer ("Nearly"): 1 in a short text, 2 in a longer one. Never earns a stone. */
export const allowedMisses = (words?: number): number => (words !== undefined && words < 12 ? 1 : 2);

/** Whether a typed or said answer keeps the item: no hints, and right, or "Nearly" (a couple of slips). */
export const keptRecall = (r: { correct: boolean; hints: number; misses?: number; words?: number }): boolean =>
  !r.hints && (r.correct || (r.misses !== undefined && r.misses <= allowedMisses(r.words)));

/** Fold one lesson's typed and said answers into the keep record. */
export function updateKeep(keep: Record<string, Keep> | undefined, results: StepResult[], at: string): Record<string, Keep> {
  const out = { ...keep };
  const rightParts = new Map<string, { parts: Set<string>; of: number }>();
  for (const r of results) {
    if (!FULL_RECALL.has(r.kind)) continue;
    const k = { ...out[r.itemId] };
    if (keptRecall(r)) {
      k.good = latest(k.good, at);
      const w = rightParts.get(r.itemId) ?? { parts: new Set<string>(), of: r.of ?? 1 };
      w.parts.add(r.part ?? '*');
      w.of = Math.max(w.of, r.of ?? 1);
      rightParts.set(r.itemId, w);
    } else k.miss = latest(k.miss, at);
    out[r.itemId] = k;
  }
  // Every part of an item right in one lesson is a whole-item recall (an item of one part is whole by itself).
  for (const [itemId, w] of rightParts) if (w.parts.size >= w.of) out[itemId] = { ...out[itemId], full: latest(out[itemId].full, at) };
  return out;
}

/**
 * The keep record worked out from an answer log. `partsOf` says how many parts an item has, so a lesson in which every part was
 * right shows as a whole-item recall (answers saved before parts were recorded can't show one).
 */
export function keepFromLog(log: LogEntry[], partsOf?: (itemId: string) => number | undefined): Record<string, Keep> {
  const out: Record<string, Keep> = {};
  const sessions = new Map<string, { itemId: string; at: string; parts: Set<string>; of: number }>();
  for (const e of log) {
    if (!FULL_RECALL.has(e.kind)) continue;
    const k = out[e.itemId] ?? (out[e.itemId] = {});
    if (keptRecall(e)) {
      k.good = latest(k.good, e.at);
      if (e.part) {
        const s = sessions.get(`${e.itemId}|${e.at}`) ?? { itemId: e.itemId, at: e.at, parts: new Set<string>(), of: e.of ?? partsOf?.(e.itemId) ?? Infinity };
        s.parts.add(e.part);
        sessions.set(`${e.itemId}|${e.at}`, s);
      } else if ((partsOf?.(e.itemId) ?? 0) === 1) k.full = latest(k.full, e.at);
    } else k.miss = latest(k.miss, e.at);
  }
  for (const s of sessions.values()) if (s.parts.size >= s.of) out[s.itemId] = { ...out[s.itemId], full: latest(out[s.itemId]?.full, s.at) };
  return out;
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
        ...(m.explained && typeof m.explained === 'object' && !Array.isArray(m.explained)
          ? { explained: Object.fromEntries(Object.entries(m.explained).filter(([, v]) => typeof v === 'string')) }
          : {}),
        ...(m.keep && typeof m.keep === 'object' && !Array.isArray(m.keep)
          ? { keep: Object.fromEntries(Object.entries(m.keep).filter(([, v]) => v && typeof v === 'object').map(([k, v]) => [k, { ...(typeof v.good === 'string' ? { good: v.good } : {}), ...(typeof v.miss === 'string' ? { miss: v.miss } : {}), ...(typeof v.full === 'string' ? { full: v.full } : {}) }])) }
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

/** Record that an item was explained in your own words and checked against the notes. */
export function markExplained(p: MemberProgress, itemId: string, now: Date): MemberProgress {
  return p.explained?.[itemId] ? p : { ...p, explained: { ...p.explained, [itemId]: now.toISOString() } };
}

/** Record that a related verse was recalled from memory. */
export function recallRelated(p: MemberProgress, passage: string, now: Date): MemberProgress {
  return p.related?.[passage] ? p : { ...p, related: { ...p.related, [passage]: now.toISOString() } };
}

// ---- Combining two copies of one person's progress (this phone's and the account's), so nothing is ever lost:
// learned parts, checkpoints, days, recalled verses and explanations are joined; each stone takes the higher level; counts take
// the larger; each award keeps its first date; each schedule keeps the one reviewed most recently; and the answer
// logs are joined, each answer once, in time order.

const union = (a: string[], b: string[]) => [...new Set([...a, ...b])];
const latest = (a?: string, b?: string) => (!a ? b : !b ? a : a >= b ? a : b);
const earliest = (a?: string, b?: string) => (!a ? b : !b ? a : a <= b ? a : b);

function mergeRecord<T>(a: Record<string, T>, b: Record<string, T>, pick: (x: T, y: T) => T): Record<string, T> {
  const out: Record<string, T> = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = k in out ? pick(out[k], v) : v;
  return out;
}

// An answer with an id is itself; an older one (no id) is told apart by when, what and how, which is why two older answers
// of the same kind to the same question in one lesson were once taken for one.
const logKey = (e: LogEntry) => e.id ?? `${e.at}|${e.itemId}|${e.kind}|${e.review ? 1 : 0}`;

export function mergeProgress(a: MemberProgress, b: MemberProgress): MemberProgress {
  const log = new Map<string, LogEntry>();
  for (const e of [...a.log, ...b.log]) if (!log.has(logKey(e))) log.set(logKey(e), e);
  const night = !a.night ? b.night : !b.night ? a.night : a.night.at >= b.night.at ? a.night : b.night;
  const related = a.related || b.related ? mergeRecord(a.related ?? {}, b.related ?? {}, (x, y) => earliest(x, y)!) : undefined;
  const explained = a.explained || b.explained ? mergeRecord(a.explained ?? {}, b.explained ?? {}, (x, y) => earliest(x, y)!) : undefined;
  const keep = a.keep || b.keep ? mergeRecord(a.keep ?? {}, b.keep ?? {}, (x, y) => ({ ...(latest(x.good, y.good) ? { good: latest(x.good, y.good) } : {}), ...(latest(x.miss, y.miss) ? { miss: latest(x.miss, y.miss) } : {}), ...(latest(x.full, y.full) ? { full: latest(x.full, y.full) } : {}) })) : undefined;
  return {
    units: union(a.units, b.units),
    checkpoints: union(a.checkpoints, b.checkpoints),
    cards: mergeRecord(a.cards, b.cards, (x, y) => ((latest(x.last_review, y.last_review) ?? '') === (y.last_review ?? '') && y.last_review ? y : x)),
    lessons: Math.max(a.lessons, b.lessons),
    courseLessons: mergeRecord(a.courseLessons, b.courseLessons, Math.max),
    levels: mergeRecord(a.levels, b.levels, Math.max),
    awards: mergeRecord(a.awards, b.awards, (x, y) => earliest(x, y)!),
    days: union(a.days, b.days).sort(),
    log: [...log.values()].sort((x, y) => x.at.localeCompare(y.at)),
    ...(night ? { night } : {}),
    ...(related ? { related } : {}),
    ...(explained ? { explained } : {}),
    ...(keep ? { keep } : {}),
  };
}

/** Whether two copies hold the same progress (so there's nothing to send). */
export const sameProgress = (a: MemberProgress, b: MemberProgress) => JSON.stringify(a) === JSON.stringify(b);
