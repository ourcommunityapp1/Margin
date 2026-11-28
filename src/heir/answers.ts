// Turning answers into rows for the database's `heir_answers` table, one row per answer. Pure, so it's tested without a database.
// Only answers with an id are sent: that id is what makes sending the same answer twice harmless.

import type { LogEntry } from './progress.ts';

export interface AnswerRow {
  id: string;
  household_id: string;
  member_id: string;
  item_id: string;
  kind: string;
  correct: boolean;
  misses: number | null;
  words: number | null;
  hints: number;
  ms: number;
  review: boolean;
  part: string | null;
  session_at: string;
  local_day: string | null;
  missed: number[] | null;
  p_recall: number | null;
  model_version: string | null;
}

/** Positions of missed words: whole numbers in range, at most 60; null when there are none. */
const cleanMissed = (m: unknown): number[] | null => {
  const ok = Array.isArray(m) ? m.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < 400).slice(0, 60) : [];
  return ok.length ? ok : null;
};

export const toAnswerRows = (householdId: string, memberId: string, entries: LogEntry[]): AnswerRow[] =>
  entries.filter((e) => !!e.id).map((e) => ({
    id: e.id!, household_id: householdId, member_id: memberId, item_id: e.itemId, kind: e.kind, correct: e.correct,
    misses: typeof e.misses === 'number' ? e.misses : null, words: typeof e.words === 'number' ? e.words : null, hints: Math.max(0, Math.round(e.hints) || 0), ms: Math.max(0, Math.round(e.ms) || 0),
    review: !!e.review, part: e.part ?? null, session_at: e.at, local_day: e.day ?? null,
    missed: cleanMissed(e.missed),
    p_recall: typeof e.p === 'number' && e.p >= 0 && e.p <= 1 ? e.p : null, model_version: e.mv ?? null,
  }));

/** Answers newer than the last one this phone sent (`since` is that answer's time), oldest first. */
export const unsent = (entries: LogEntry[], since: string): LogEntry[] =>
  entries.filter((e) => !!e.id && e.at > since).sort((a, b) => a.at.localeCompare(b.at));
