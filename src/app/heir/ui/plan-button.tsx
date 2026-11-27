'use client';

// One way to put a course in your plan or take it out, the same everywhere a course is shown (its page, the course list).
// "Add to plan" makes it your daily course (where new lessons come from); the others in your plan keep their reviews.
// "Remove from plan" takes it out of Today; nothing is lost, and adding it again picks up where you left off.

import { courseFor, courses, type Course } from '@/heir/content';
import { startedCourses } from '@/heir/dayplan';
import { activeMember, dailyCourse, inPlan, removeFromPlan, setPlan } from '@/heir/household';
import { memberProgress } from '@/heir/progress';
import { useHeir } from './provider';

export function usePlanState(course: Course) {
  const { household, progress, update } = useHeir();
  const me = activeMember(household);
  const mine = memberProgress(progress, me?.id);
  const track = me?.track ?? 'adult';
  const plan = household.plan;
  const daily = dailyCourse(plan);
  // The courses in the plan right now (the daily course, then every course begun and not removed).
  const inYourPlan = startedCourses(mine, track, daily, plan?.removed);
  const started = courses.some((c) => c.id === course.id && startedCourses(mine, track, null).some((s) => s.id === c.id));
  const isIn = inPlan(plan, course.id, started);
  const isDaily = daily === course.id;
  const dailyTitle = courseFor(daily)?.title ?? null;
  const add = () => update((h) => setPlan(h, { course: course.id }));
  const remove = () => update((h) => {
    const next = inYourPlan.find((c) => c.id !== course.id)?.id ?? null;
    return removeFromPlan(h, course.id, next);
  });
  return { isIn, isDaily, dailyTitle, add, remove, othersInPlan: inYourPlan.filter((c) => c.id !== course.id) };
}

/** The primary and secondary buttons for a course, on a dark card (`hero`) or a plain one. */
export function PlanButtons({ course, surface = 'hero' }: { course: Course; surface?: 'hero' | 'plain' }) {
  const s = usePlanState(course);
  const hero = surface === 'hero';
  const primary = (label: string, on: () => void) => <button type="button" className={hero ? 'hr-hero-btn' : 'hr-btn'} onClick={on}>{label}</button>;
  const secondary = (label: string, on: () => void) => <button type="button" className={hero ? 'hr-hero-btn' : 'hr-btn quiet'} {...(hero ? { 'data-quiet': 'true' } : {})} onClick={on}>{label}</button>;
  // Two states, two words: Add to plan, or Remove from plan.
  return s.isIn ? secondary('Remove from plan', s.remove) : primary('Add to plan', s.add);
}

/** One quiet line under the buttons: where this course stands in the plan. */
export function PlanNote({ course }: { course: Course }) {
  const s = usePlanState(course);
  const text = s.isDaily ? 'In your plan: today’s new lessons come from here.'
    : s.isIn ? `In your plan: reviews here, new lessons from ${s.dailyTitle ?? 'your newest course'}.`
    : s.dailyTitle ? `Adds ${course.title} to your daily courses. New lessons will come from it, and ${s.dailyTitle} stays for reviews.`
    : `Adds ${course.title} to your daily courses.`;
  return <p className="hr-hero-note">{text}</p>;
}

/** The same two choices as a compact row, for a list of courses (the plan screen). */
export function PlanRow({ course, learned, total }: { course: Course; learned: number; total: number }) {
  const s = usePlanState(course);
  return (
    <div className="hr-plan-row" data-in={s.isIn}>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, flex: '1 1 170px' }}>
        <span style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.25 }}>{course.title}</span>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>{s.isIn ? 'In your plan · ' : ''}{learned ? `${learned} of ${total} learned` : 'Not started'}</span>
      </span>
      <span className="hr-plan-actions">
        {s.isIn
          ? <button type="button" className="hr-plan-btn" data-quiet="true" onClick={s.remove}>Remove from plan</button>
          : <button type="button" className="hr-plan-btn" onClick={s.add}>Add to plan</button>}
      </span>
    </div>
  );
}
