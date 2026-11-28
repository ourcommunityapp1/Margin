// The week in one line on Progress (ADR-003): worked out from the answer log and the days kept; nothing new is recorded.
//   learned: new lessons in the last 7 days (a lesson is one session with a new piece)
//   kept: questions and verses answered right in a review in the last 7 days
//   strengthened: ones that were missed and then answered right in the last 7 days
//   days: days kept in the last 7 days

import { localDay, type MemberProgress } from './progress.ts';

export interface WeekSummary { learned: number; kept: number; strengthened: number; days: number }

export function weekSummary(p: MemberProgress, now: Date): WeekSummary {
  const since = now.getTime() - 7 * 86_400_000;
  const answers = p.log.filter((e) => e.kind !== 'intro' && e.kind !== 'info' && e.kind !== 'verse' && e.kind !== 'quiz' && e.kind !== 'meaning');
  const inWeek = (at: string) => Date.parse(at) > since;
  const learned = new Set(p.log.filter((e) => e.kind === 'intro' && inWeek(e.at)).map((e) => e.at)).size;
  const kept = new Set(answers.filter((e) => e.review && e.correct && inWeek(e.at)).map((e) => e.itemId)).size;
  // Strengthened: an answer right in the week straight after a miss.
  const strengthened = new Set<string>();
  const byItem = new Map<string, typeof answers>();
  for (const e of answers) byItem.set(e.itemId, [...(byItem.get(e.itemId) ?? []), e]);
  for (const [id, es] of byItem) {
    const sorted = [...es].sort((a, b) => a.at.localeCompare(b.at));
    for (let i = 1; i < sorted.length; i++) if (sorted[i].correct && inWeek(sorted[i].at) && !sorted[i - 1].correct && sorted[i - 1].at !== sorted[i].at) strengthened.add(id);
  }
  const first = localDay(new Date(since));
  const days = p.days.filter((d) => d > first && d <= localDay(now)).length;
  return { learned, kept, strengthened: strengthened.size, days };
}
