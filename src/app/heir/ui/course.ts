'use client';

// Where the active person is in their course: the group they're in, what comes next, what is due.

import { activeMember } from '@/heir/household';
import { courseFor, courseItems, courses, getCollection } from '@/heir/content';
import { groupsOf, lockInsWaiting, nextActivity, unitsFor, type Group } from '@/heir/lesson';
import { dueCards, localDay, memberProgress, waitingForSleep } from '@/heir/progress';
import { coursePath, courseStats, streak } from '@/heir/path';
import { useHeir } from './provider';

// "Questions 1–5", "Apostles’ Creed", "Nicene Creed, parts 1–3".
export function groupLabel(g: Group): string {
  const c = getCollection(g.collection);
  const a = g.items[0].number, b = g.items[g.items.length - 1].number;
  if (c?.unit === 'Question') return a === b ? `Question ${a}` : `Questions ${a}–${b}`;
  return g.items.length === c?.items.length ? (c?.title ?? '') : `${c?.title ?? ''}, parts ${a}–${b}`;
}

export function useCourse() {
  const { household, progress, now } = useHeir();
  const me = activeMember(household);
  const course = courseFor(household.plan?.course) ?? courses[0];
  const items = courseItems(course);
  const track = me?.track ?? 'adult';
  const mine = memberProgress(progress, me?.id);
  const learnedUnits = new Set(mine.units);
  const activity = nextActivity(items, track, learnedUnits, new Set(mine.checkpoints), lockInsWaiting(items, (id) => waitingForSleep(mine, id, now)));
  const due = dueCards(mine, now, new Set(items.map((i) => i.id)));
  const learned = items.filter((i) => unitsFor(i, track).every((u) => learnedUnits.has(u.key))).length;
  const group = activity?.group ?? groupsOf(items).at(-1) ?? null;
  const groupLearned = group ? group.items.filter((i) => unitsFor(i, track).every((u) => learnedUnits.has(u.key))).length : 0;
  const path = coursePath(items, track, mine, now);
  const stats = courseStats(items, track, mine);
  const days = streak(mine.days, localDay(now));
  return { me, course, items, track, mine, activity, group, groupLearned, due, learned, path, stats, days, chosen: !!household.plan };
}
