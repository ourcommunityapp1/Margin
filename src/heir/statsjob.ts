// The server's job of working out the numbers friends see (words in memory, stones, streak, courses) from what the
// account stores: every answer, one row each, plus the progress record. Pure apart from the `Store` it is given, so
// it is tested with an in-memory store and run in production with the database behind it.
//
// What this does and doesn't protect: a phone can no longer set the numbers friends see (it has no way to write them);
// they are worked out here, from the full answer history, in the right time zone. A phone could still send made-up
// answers, because grading happens on the phone; answers are append-only and timestamped by the server, which makes
// that slow and visible, not impossible.

import { earnedLevels, onCurrentScale } from './levels.ts';
import type { KeepOptions } from './keep.ts';
import type { LogEntry, MemberProgress } from './progress.ts';
import { emptyProgress } from './progress.ts';
import { statsFor, type CourseInput, type Stats } from './stats.ts';
import type { Item, Track } from './types.ts';

export interface AnswerIn {
  item_id: string; kind: string; correct: boolean; hints: number; ms: number; review: boolean;
  part: string | null; misses: number | null; words?: number | null; session_at: string; local_day: string | null;
}

export interface Store {
  /** The signed-in person's profile: which family member it is, and that member's track. */
  profileFor(userId: string): Promise<{ memberId: string; track: Track; tz: string | null } | null>;
  /** The progress record the account stores for this member (levels, learned parts, days), if any. */
  progressFor(memberId: string): Promise<MemberProgress | null>;
  /** Every answer for this member, oldest first. */
  answersFor(memberId: string): Promise<AnswerIn[]>;
  /** What was last saved for this person (to skip work, and to know whether words changed). */
  lastStats(userId: string): Promise<{ words: number; updatedAt: string; source: string } | null>;
  save(userId: string, s: Stats, now: Date): Promise<void>;
  /** The newest point in the words-over-time history, or null if there is none yet. */
  lastRecordedWords(userId: string): Promise<number | null>;
  /** Add a point to the words-over-time history. */
  recordWords(userId: string, words: number, now: Date): Promise<void>;
}

const logFromAnswers = (rows: AnswerIn[]): LogEntry[] => rows.map((r) => ({
  at: r.session_at, itemId: r.item_id, kind: r.kind as LogEntry['kind'], correct: r.correct, hints: r.hints, ms: r.ms, review: r.review,
  ...(r.part ? { part: r.part } : {}), ...(r.misses !== null ? { misses: r.misses } : {}), ...(typeof r.words === 'number' ? { words: r.words } : {}), ...(r.local_day ? { day: r.local_day } : {}),
}));

/** Progress as the server sees it: the full answer history in place of the phone's trimmed log, and days from both. */
export function progressForStats(blob: MemberProgress | null, rows: AnswerIn[], track: Track, items: Item[], now: Date): MemberProgress {
  const base = onCurrentScale(blob ?? emptyProgress());
  const log = logFromAnswers(rows);
  const days = [...new Set([...base.days, ...rows.map((r) => r.local_day).filter((d): d is string => !!d)])].sort();
  const withLog: MemberProgress = { ...base, log: log.length >= base.log.length ? log : base.log, days };
  return { ...withLog, levels: earnedLevels(items, track, withLog, now) };
}

const THROTTLE_MS = 20_000;

export type Outcome = { ok: true; stats: Stats; changed: boolean } | { ok: false; reason: 'no-profile' | 'too-soon' };

export async function refreshStats(store: Store, userId: string, o: { courses: CourseInput[]; items: Item[]; now: Date; today: (tz: string | null, now: Date) => string; force?: boolean; keepFor?: (userId: string, tz: string | null) => KeepOptions | null }): Promise<Outcome> {
  const last = await store.lastStats(userId);
  if (!o.force && last && last.source === 'server' && o.now.getTime() - Date.parse(last.updatedAt) < THROTTLE_MS) return { ok: false, reason: 'too-soon' };
  const profile = await store.profileFor(userId);
  if (!profile) return { ok: false, reason: 'no-profile' };
  const [blob, rows] = await Promise.all([store.progressFor(profile.memberId), store.answersFor(profile.memberId)]);
  const p = progressForStats(blob, rows, profile.track, o.items, o.now);
  const rules = o.keepFor?.(userId, profile.tz) ?? null;
  const stats = statsFor(o.courses, o.items, profile.track, p, o.today(profile.tz, o.now), rules ? { options: rules, now: o.now } : null);
  await store.save(userId, stats, o.now);
  // A history point is added when the number differs from the newest point (and the first time, so there is a starting point).
  const lastPoint = await store.lastRecordedWords(userId);
  const changed = lastPoint === null || lastPoint !== stats.wordsInMemory;
  if (changed) await store.recordWords(userId, stats.wordsInMemory, o.now);
  return { ok: true, stats, changed };
}

/** The local date in a time zone (YYYY-MM-DD); the server's own day if the zone is missing or unknown. */
export function dayIn(tz: string | null, now: Date): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz || undefined, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    return parts;
  } catch {
    return now.toISOString().slice(0, 10);
  }
}
