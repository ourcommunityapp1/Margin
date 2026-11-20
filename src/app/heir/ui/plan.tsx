'use client';

// Choosing what to memorize. Progress on every course is kept, so switching is safe.

import { useRouter } from 'next/navigation';
import { useHeir } from './provider';
import { Back } from './tabs';
import { CourseChoices } from './courses';
import { courseFor, courseItems, courses } from '@/heir/content';
import { activeMember } from '@/heir/household';
import { courseStats } from '@/heir/path';
import { memberProgress } from '@/heir/progress';
import { setPlan } from '@/heir/household';

export function PlanScreen({ setup }: { setup: boolean }) {
  const { ready, household, update, progress } = useHeir();
  const router = useRouter();
  if (!ready) return <main className="hr-page" aria-busy="true" />;
  const current = courseFor(household.plan?.course)?.id ?? null;
  const me = activeMember(household);
  const mine = memberProgress(progress, me?.id);
  const stats = Object.fromEntries(courses.map((c) => [c.id, courseStats(courseItems(c), me?.track ?? 'adult', mine)]));

  return (
    <main className="hr-page bare">
      {!setup && <div><Back href="/heir" /></div>}
      <section className="hr-card" style={{ marginTop: setup ? 40 : 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h1 className="serif" style={{ margin: 0, fontSize: 28, fontWeight: 600, lineHeight: 1.2 }}>Courses</h1>
        <CourseChoices value={current} progress={stats} onChange={(course) => { update((h) => setPlan(h, { course })); router.push('/heir'); }} />
        <p style={{ margin: 0, fontSize: 15, color: 'var(--muted)', lineHeight: 1.5 }}>Progress in each course is kept when you switch. Passages of Scripture come later.</p>
      </section>
    </main>
  );
}
