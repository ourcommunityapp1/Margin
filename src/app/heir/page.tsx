'use client';

// Today answers one question: what should I do now? The day's recommended lessons and reviews, one course each, as a
// carousel of windows; then every course you've started, to keep going. See ui/today.tsx and docs/memory/ADR-002.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useHeir } from './ui/provider';
import { useCourse } from './ui/course';
import { Tabs } from './ui/tabs';
import { TodayCards } from './ui/today';
import { greeting } from '@/heir/time';
import { startedCourses } from '@/heir/dayplan';
import { dailyCourse } from '@/heir/household';
import type { Plan, Track } from '@/heir/types';
import type { MemberProgress } from '@/heir/progress';

const emptyPlan = (plan: Plan | null, mine: MemberProgress, track: Track) => !!plan && startedCourses(mine, track, dailyCourse(plan), plan.removed).length === 0;

export default function Today() {
  const { ready, household, time } = useHeir();
  const router = useRouter();
  const { me, chosen, mine, track } = useCourse();

  useEffect(() => {
    if (!ready) return;
    if (!household.members.length) router.replace('/heir/welcome');
    else if (!chosen) router.replace('/heir/start');
  }, [ready, household.members.length, chosen, router]);

  if (!ready || !me || !chosen) return <main className="hr-page" aria-busy="true" />;

  return (
    <>
      <main className="hr-page">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', marginTop: 12 }}>
          <h1 className="serif" style={{ margin: 0, fontSize: 26, fontWeight: 500, lineHeight: 1.15 }}>{greeting(time)}, {me.name.trim().split(/\s+/)[0]}</h1>
          <Link href="/heir/you" aria-label={`You: ${me.name}, settings and family`} style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--card)', color: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 17, textDecoration: 'none', flex: 'none' }}>{me.name[0]}</Link>
        </header>
        {emptyPlan(household.plan, mine, track)
          ? (
            <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'center', alignItems: 'center' }}>
              <h2 className="serif" style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>Your plan is empty</h2>
              <p style={{ margin: 0, fontSize: 15, color: 'var(--muted)', lineHeight: 1.5 }}>Add a course and Today will fill with its lessons and reviews. Your progress in the courses you removed is kept.</p>
              <Link href="/heir/courses" className="hr-btn">Add a course</Link>
            </section>
          )
          : <TodayCards />}
      </main>
      <Tabs />
    </>
  );
}
