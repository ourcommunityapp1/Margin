'use client';

// Courses: every course, each with a small copy of its window lit as far as you've come. Open a course to see
// everything in it.

import Link from 'next/link';
import { useHeir } from '../ui/provider';
import { Tabs } from '../ui/tabs';
import { courseSummary } from '../ui/course-list';
import { MiniWindow } from '../ui/glass/mini';
import { courses } from '@/heir/content';
import { activeMember } from '@/heir/household';
import { memberProgress } from '@/heir/progress';

export default function Courses() {
  const { ready, household, progress, now } = useHeir();
  if (!ready) return <main className="hr-page" aria-busy="true" />;
  const me = activeMember(household);
  const mine = memberProgress(progress, me?.id);
  const track = me?.track ?? 'adult';
  const minutes = household.plan?.minutes ?? 15;
  const all = courses.map((c) => courseSummary(c, track, mine, minutes, now));

  return (
    <>
      <main className="hr-page">
        <h1 className="serif" style={{ margin: '20px 4px 0', fontSize: 34, fontWeight: 500 }}>Courses</h1>

        <ul style={{ listStyle: 'none', margin: '0 -10px', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {all.map((s) => (
            <li key={s.course.id}>
              <Link href={`/heir/courses/${s.course.id}`} className="hr-card hr-course-row">
                <MiniWindow base={s.window.base} lit={s.window.lit} dusty={s.window.dusty} size={76} label={`${s.course.title} window, ${s.learned} of ${s.total} learned`} />
                <span className="serif" style={{ flex: 1, minWidth: 0, fontSize: 21, fontWeight: 600, lineHeight: 1.2 }}>{s.course.title}</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none', color: 'var(--muted)' }}><path d="M9 5l7 7-7 7" /></svg>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/heir/review" style={{ alignSelf: 'center', fontSize: 14, color: 'var(--ink)', padding: 12 }}>Review all the content (for the owner)</Link>
      </main>
      <Tabs />
    </>
  );
}
