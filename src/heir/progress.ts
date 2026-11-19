// Each person's progress: which parts they have learned, when each item comes back (FSRS), and a log of
// every answer. Pure functions over plain JSON, so it can live on the phone now and in the database later.

import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from 'ts-fsrs';
import type { StepKind, Unit } from './lesson.ts';

// Day-sized intervals: same-day repetition happens inside the lesson itself.
const scheduler = fsrs(generatorParameters({ enable_fuzz: false, enable_short_term: false }));

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
  // One schedule per fully learned item.
  cards: Record<string, SavedCard>;
  lessons: number;
  // Local dates (YYYY-MM-DD) with a finished lesson or review.
  days: string[];
  log: LogEntry[];
}

export type Progress = Record<string, MemberProgress>;

export const emptyProgress = (): MemberProgress => ({ units: [], cards: {}, lessons: 0, days: [], log: [] });

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

// How well an item went in one session, from its answers. The intro is reading, not recall.
export function ratingFor(results: StepResult[]): Grade {
  const recall = results.filter((r) => r.kind !== 'intro');
  const misses = recall.filter((r) => !r.correct).length;
  const hints = recall.reduce((n, r) => n + r.hints, 0);
  if (misses === 0 && hints === 0) return Rating.Good;
  if (misses <= 1) return Rating.Hard;
  return Rating.Again;
}

export function finishSession(p: MemberProgress, o: { results: StepResult[]; learned?: Unit | null; now: Date }): MemberProgress {
  const cards = { ...p.cards };
  const byItem = new Map<string, StepResult[]>();
  for (const r of o.results) byItem.set(r.itemId, [...(byItem.get(r.itemId) ?? []), r]);
  for (const [itemId, rs] of byItem) {
    const existing = cards[itemId];
    const finishesItem = o.learned && o.learned.itemId === itemId && o.learned.part === o.learned.of;
    if (!existing && !finishesItem) continue;
    const card = existing ? toCard(existing) : createEmptyCard(o.now);
    cards[itemId] = fromCard(scheduler.next(card, o.now, ratingFor(rs)).card);
  }
  const at = o.now.toISOString();
  const day = localDay(o.now);
  return {
    units: o.learned && !p.units.includes(o.learned.key) ? [...p.units, o.learned.key] : p.units,
    cards,
    lessons: p.lessons + 1,
    days: p.days.includes(day) ? p.days : [...p.days, day].slice(-400),
    log: [...p.log, ...o.results.map((r) => ({ ...r, at }))].slice(-1500),
  };
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
        cards: m.cards && typeof m.cards === 'object' ? m.cards : {},
        lessons: Number(m.lessons) || 0,
        days: Array.isArray(m.days) ? m.days : [],
        log: Array.isArray(m.log) ? m.log : [],
      };
    }
    return out;
  } catch {
    return {};
  }
}
