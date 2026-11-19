'use client';

// Where the active person is in their course: the next part to learn and what is due for review.

import { activeMember } from '@/heir/household';
import { courseFor, courseItems, courses } from '@/heir/content';
import { nextUnit } from '@/heir/lesson';
import { dueCards, memberProgress } from '@/heir/progress';
import { useHeir } from './provider';

export function useCourse() {
  const { household, progress, now } = useHeir();
  const me = activeMember(household);
  const course = courseFor(household.plan?.course) ?? courses[0];
  const items = courseItems(course);
  const track = me?.track ?? 'adult';
  const mine = memberProgress(progress, me?.id);
  const unit = nextUnit(items, track, new Set(mine.units));
  const due = dueCards(mine, now, new Set(items.map((i) => i.id)));
  const learned = items.filter((i) => mine.cards[i.id]).length;
  return { me, course, items, track, mine, unit, due, learned, chosen: !!household.plan };
}
