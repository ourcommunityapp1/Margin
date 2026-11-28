'use client';

import { useState } from 'react';
// One way to put a course in your plan or take it out, the same everywhere a course is shown (its page, the course list).
// "Add to plan" makes it your daily course (where new lessons come from); the others in your plan keep their reviews.
// "Remove from plan" takes it out of Today; nothing is lost, and adding it again picks up where you left off.

import { courseFor, courses, type Course } from '@/heir/content';
import type { Item } from '@/heir/types';
import { startedCourses } from '@/heir/dayplan';
import { activeMember, addVerse, dailyCourse, inPlan, removeFromPlan, removeVerse, setPlan } from '@/heir/household';
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
  const inYourPlan = startedCourses(mine, track, daily, plan?.removed, plan?.verses);
  const started = courses.some((c) => c.id === course.id && startedCourses(mine, track, null, [], plan?.verses).some((s) => s.id === c.id));
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

const chevron = (open: boolean) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }}><path d="M6 9l6 6 6-6" /></svg>;

/** The primary and secondary buttons for a course, on a dark card (`hero`) or a plain one. */
export function PlanButtons({ course, surface = 'hero', calm = false }: { course: Course; surface?: 'hero' | 'plain'; calm?: boolean }) {
  const s = usePlanState(course);
  const hero = surface === 'hero';
  const primary = (label: string, on: () => void) => <button type="button" className={hero ? 'hr-hero-btn' : 'hr-btn'} onClick={on}>{label}</button>;
  const secondary = (label: string, on: () => void) => <button type="button" className={hero ? 'hr-hero-btn' : 'hr-btn hr-btn-outline'} {...(hero ? { 'data-quiet': 'true' } : {})} onClick={on}>{label}</button>;
  const [open, setOpen] = useState(false);
  // Two states: Add to plan; or "Added to plan" with a down arrow, and Remove from plan one tap further (no accidental removals).
  if (!s.isIn) return calm ? secondary('Add to plan', s.add) : primary('Add to plan', s.add);
  return (
    <>
      <button type="button" className={hero ? 'hr-hero-btn' : 'hr-btn hr-btn-outline'} {...(hero ? { 'data-quiet': 'true' } : {})} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span>Added to plan</span>{chevron(open)}
      </button>
      {open && secondary('Remove from plan', () => { setOpen(false); s.remove(); })}
    </>
  );
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
  const [open, setOpen] = useState(false);
  return (
    <div className="hr-plan-row" data-in={s.isIn}>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, flex: '1 1 170px' }}>
        <span style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.25 }}>{course.title}</span>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>{s.isIn ? 'In your plan · ' : ''}{learned ? `${learned} of ${total} learned` : 'Not started'}</span>
      </span>
      <span className="hr-plan-actions">
        {s.isIn
          ? <button type="button" className="hr-plan-btn" data-quiet="true" aria-expanded={open} onClick={() => setOpen((v) => !v)}>Added to plan {chevron(open)}</button>
          : <button type="button" className="hr-plan-btn" onClick={s.add}>Add to plan</button>}
        {s.isIn && open && <button type="button" className="hr-plan-btn" data-quiet="true" onClick={() => { setOpen(false); s.remove(); }}>Remove from plan</button>}
      </span>
    </div>
  );
}

/** Add one verse or answer to the plan on its own. It knows when the verse is already in the plan: on its own, or through its course. */
export function ItemPlanButton({ item, course }: { item: Item; course: Course }) {
  const { household, update } = useHeir();
  const c = usePlanState(course);
  const [open, setOpen] = useState(false);
  const own = !!household.plan?.verses?.includes(item.id);
  const through = c.isIn;
  const note = own && through ? `In your plan, and through ${course.title}`
    : own ? 'In your plan on its own'
    : through ? `In your plan through ${course.title}`
    : 'Adds just this one to your plan';
  if (!own && !through) {
    return (
      <div className="hr-itemplan">
        <button type="button" className="hr-btn hr-btn-outline" onClick={() => update((h) => addVerse(h, item.id, course.id))}>Add to plan</button>
        <span className="hr-btn-note" style={{ marginTop: 0 }}>{note}</span>
      </div>
    );
  }
  return (
    <div className="hr-itemplan">
      <button type="button" className="hr-btn hr-btn-outline" aria-expanded={open} onClick={() => setOpen((v) => !v)}><span>Added to plan</span>{chevron(open)}</button>
      {open && own && <button type="button" className="hr-btn hr-btn-outline" onClick={() => { setOpen(false); update((h) => removeVerse(h, item.id)); }}>Remove this one from plan</button>}
      {open && through && <button type="button" className="hr-btn hr-btn-outline" onClick={() => { setOpen(false); c.remove(); }}>Remove {course.title} from plan</button>}
      <span className="hr-btn-note" style={{ marginTop: 0 }}>{note}</span>
    </div>
  );
}
