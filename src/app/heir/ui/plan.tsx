'use client';

// Choosing what to memorize and how long each day, with what that means in dates, and what the stones
// and grades mean. Progress on every course is kept, so switching is safe.

import { DEFAULT_GOAL } from '@/heir/planner';
import { useRouter } from 'next/navigation';
import { useHeir } from './provider';
import { Back } from './tabs';
import { CourseChoices } from './courses';
import { courseFor, courseItems, courses } from '@/heir/content';
import { activeMember } from '@/heir/household';
import { courseStats } from '@/heir/path';
import { memberProgress } from '@/heir/progress';
import { dailyCourse, setPlan } from '@/heir/household';
import { startedCourses } from '@/heir/dayplan';
import { PlanRow } from './plan-button';
import { GRADES } from '@/heir/progress';
import { TIERS } from '@/heir/tiers';
import { AllCourses, GoalChoices, LongTermNote } from './goal';
import { Stone } from './stone';

export function PlanScreen({ setup }: { setup: boolean }) {
  const { ready, household, update, progress } = useHeir();
  const router = useRouter();
  if (!ready) return <main className="hr-page" aria-busy="true" />;
  const daily = dailyCourse(household.plan);
  const current = courseFor(household.plan?.course)?.id ?? null;
  const course = courseFor(daily) ?? null;
  const minutes = household.plan?.minutes ?? DEFAULT_GOAL;
  const me = activeMember(household);
  const mine = memberProgress(progress, me?.id);
  const inPlanIds = new Set(startedCourses(mine, me?.track ?? 'adult', daily, household.plan?.removed).map((c) => c.id));
  const stats = Object.fromEntries(courses.map((c) => [c.id, courseStats(courseItems(c), me?.track ?? 'adult', mine)]));

  return (
    <main className="hr-page bare">
      {!setup && <div><Back href="/heir/you" /></div>}
      <section className="hr-card" style={{ marginTop: setup ? 40 : 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h1 className="serif" style={{ margin: 0, fontSize: 28, fontWeight: 600, lineHeight: 1.2 }}>{setup ? 'Courses' : 'Your plan'}</h1>
        {setup
          ? <CourseChoices value={current} progress={stats} onChange={(id) => { update((h) => setPlan(h, { course: id })); router.push('/heir'); }} />
          : (
            <div>
              {[...courses].sort((a, b) => Number(inPlanIds.has(b.id)) - Number(inPlanIds.has(a.id)) || Number(b.id === daily) - Number(a.id === daily)).map((c) => (
                <PlanRow key={c.id} course={c} learned={stats[c.id]?.learned ?? 0} total={stats[c.id]?.total ?? courseItems(c).length} />
              ))}
            </div>
          )}
        <p style={{ margin: 0, fontSize: 15, color: 'var(--muted)', lineHeight: 1.5 }}>Today is made from your plan: new lessons from your daily course, and reviews from every course in it. Removing a course keeps your progress.</p>
      </section>
      {course && (
        <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 className="serif" style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Your daily goal</h2>
          <GoalChoices value={minutes} onChange={(m) => update((h) => setPlan(h, { course: course.id, minutes: m }))} course={course} track={me?.track ?? 'adult'} p={mine} />
          <AllCourses minutes={minutes} track={me?.track ?? 'adult'} p={mine} />
          <LongTermNote />
        </section>
      )}
      <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 className="serif" style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>What the levels mean</h2>
        {TIERS.map((t) => (
          <div key={t.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Stone level={t.n} size={30} started />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontWeight: 600 }}>{t.name} <span style={{ color: 'var(--muted)', fontWeight: 500 }}>· {t.stone}</span></span>
              <span style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.45 }}>{t.means}</span>
            </span>
          </div>
        ))}
      </section>
      <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 className="serif" style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>How each recall is graded</h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>Only answers you produce yourself count: typing it, saying it, or its first letters. The grade decides when it comes back.</p>
        {Object.values(GRADES).map((g) => (
          <div key={g.word} style={{ display: 'flex', gap: 12 }}>
            <span style={{ fontWeight: 600, minWidth: 92 }}>{g.word}</span>
            <span style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.45 }}>{g.means}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
