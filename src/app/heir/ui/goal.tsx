'use client';

// The daily practice goal, with what it means in dates: when the course could be learned, and when it
// could be in long-term memory. You can always do more than the goal; it only sets the pace we plan for.

import { courseItems, courses, type Course } from '@/heir/content';
import { GOALS, project } from '@/heir/planner';
import type { MemberProgress } from '@/heir/progress';
import type { Track } from '@/heir/types';

const month = (d: Date) => d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
const span = (days: number) => (days < 14 ? `${days} days` : days < 60 ? `${Math.round(days / 7)} weeks` : `${Math.round(days / 30)} months`);

export function GoalChoices({ value, onChange, course, track, p }: {
  value: number | null; onChange(minutes: number): void; course: Course; track: Track; p: MemberProgress;
}) {
  const now = new Date();
  const items = courseItems(course);
  return (
    <div role="radiogroup" aria-label="Daily goal" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {GOALS.map((minutes) => {
        const r = project({ items, track, p, minutes, now });
        return (
          <button key={minutes} type="button" role="radio" aria-checked={value === minutes} className="hr-choice" onClick={() => onChange(minutes)}
            style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontWeight: 600 }}>{minutes} minutes a day</span>
            <span style={{ fontSize: 15, color: 'var(--muted)', fontWeight: 400, lineHeight: 1.45 }}>
              {r.learnDays === 0 ? 'Everything here is learned.' : `Learned in about ${span(r.learnDays)}, by ${month(r.learnedBy)}.`}
              {' '}In long-term memory by {month(r.longTermBy)}.
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Every course at this pace.
export function AllCourses({ minutes, track, p }: { minutes: number; track: Track; p: MemberProgress }) {
  const items = courses.flatMap((c) => courseItems(c));
  const r = project({ items, track, p, minutes, now: new Date() });
  return (
    <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
      Everything in Katekize at {minutes} minutes a day: learned by {month(r.learnedBy)}, in long-term memory by {month(r.longTermBy)}.
    </p>
  );
}

export function LongTermNote() {
  return (
    <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)', lineHeight: 1.55 }}>
      <b style={{ color: 'var(--ink)' }}>What long-term memory means.</b> By then you’ll have recalled each answer correctly for six
      months, including after two months away. Each recall spaced further apart slows forgetting, until a few minutes of review now and
      then keeps it for good. Studies of people who learned something well this way find it still there decades later. Learn as fast
      as you like: a question only counts as remembered once you’ve recalled it after a night’s sleep.
    </p>
  );
}
