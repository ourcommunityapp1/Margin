// The community leaderboard on the phone: what a row says under the name, how far someone moved, which rows the Progress
// preview shows, and where each row sits while it moves. The database decides who is on the board and in what order;
// this only turns what it returns into words and positions. Pure, so it is tested without a database.

import { sinceLabel } from './social.ts';

export type Period = 'all' | 'month';

export interface BoardRow {
  place: number; prev_place: number | null; idx: number; username: string; relation: 'me' | 'friend' | 'fof'; words: number;
  name: string; is_me: boolean; friends_since: string | null; via: string | null;
}
export interface Board { period: Period; total: number; my_place: number | null; my_prev_place: number | null; my_idx: number | null; rows: BoardRow[] }
export interface BoardStatus { moved: number; entered_top10: boolean; left_top10: boolean; place: number | null; total: number }

/** The line under a name: when you became friends, who connects you, or (for you) nothing. */
export function rowSub(r: BoardRow): string {
  if (r.relation === 'friend') return r.friends_since ? `Friend since ${sinceLabel(r.friends_since)}` : 'Friend';
  if (r.relation === 'fof') return r.via ? `${r.via}’s friend` : 'Friend of a friend';
  return '';
}

/** Places gained (positive) or lost (negative) since the viewer last looked; 0 when there is nothing to compare. */
export const movement = (r: BoardRow): number => (r.prev_place === null ? 0 : r.prev_place - r.place);

export const arrow = (n: number): string => (n > 0 ? `▲ ${n}` : n < 0 ? `▼ ${-n}` : '');

/** "1st", "2nd", "23rd". */
export function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;
}

/** The Progress preview: the top three, then you if you are lower down (only three rows if you are in the top three). */
export function previewRows(b: Board): BoardRow[] {
  const top = b.rows.filter((r) => r.idx <= 3);
  const me = b.rows.find((r) => r.is_me);
  return me && me.idx > 3 ? [...top, me] : top;
}

/** The dot on Progress and the pill on the preview: something moved since you last looked. */
export const hasAlert = (s: BoardStatus | null): boolean => !!s && (s.moved !== 0 || s.entered_top10 || s.left_top10);

/** The note beside a move into or out of the top ten. */
export const topTenNote = (s: BoardStatus): string => (s.entered_top10 ? 'Into the top 10' : s.left_top10 ? 'Out of the top 10' : '');

/**
 * Where each row sits, as an order (0 first): at the start of the move (by where it was) and at the end (by where it is).
 * Rows with no earlier place start where they end. Ties in the earlier ranking keep their current order.
 */
export function slots(rows: BoardRow[]): { start: Record<string, number>; end: Record<string, number> } {
  const byNow = [...rows].sort((a, b) => a.idx - b.idx);
  const byThen = [...rows].sort((a, b) => (a.prev_place ?? a.place) - (b.prev_place ?? b.place) || a.idx - b.idx);
  const end: Record<string, number> = {}, start: Record<string, number> = {};
  byNow.forEach((r, i) => { end[r.username] = i; });
  byThen.forEach((r, i) => { start[r.username] = i; });
  return { start, end };
}

/** Where a "···" gap belongs: after the row at this order, when the places skip. */
export function gapsAfter(rows: BoardRow[]): Set<number> {
  const byNow = [...rows].sort((a, b) => a.idx - b.idx);
  const out = new Set<number>();
  byNow.forEach((r, i) => { if (i > 0 && r.idx - byNow[i - 1].idx > 1) out.add(i - 1); });
  return out;
}
