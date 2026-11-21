'use client';

// Courses: every course, each with a small copy of its window lit as far as you've come. Filter by what you'd
// memorize and how long it takes at your daily goal; open a course to see everything in it.

import Link from 'next/link';
import { useState } from 'react';
import { useHeir } from '../ui/provider';
import { Tabs } from '../ui/tabs';
import { courseSummary, LENGTHS, KINDS, type Kind, type Length } from '../ui/course-list';
import { MiniWindow } from '../ui/glass/mini';
import { courseFor, courses } from '@/heir/content';
import { activeMember } from '@/heir/household';
import { memberProgress } from '@/heir/progress';

const FILTER_KEY = 'heir-courses-filter';

export default function Courses() {
  const { ready, household, progress, now } = useHeir();
  const [filter, setFilter] = useState<{ kind: Kind | 'all'; length: Length | 'any' }>(() => {
    try { return { kind: 'all', length: 'any', ...JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? '{}') }; } catch { return { kind: 'all', length: 'any' }; }
  });
  if (!ready) return <main className="hr-page" aria-busy="true" />;
  const me = activeMember(household);
  const mine = memberProgress(progress, me?.id);
  const track = me?.track ?? 'adult';
  const minutes = household.plan?.minutes ?? 15;
  const mineId = courseFor(household.plan?.course)?.id;
  const all = courses.map((c) => ({ ...courseSummary(c, track, mine, minutes, now), current: c.id === mineId }));
  const shown = all.filter((s) => (filter.kind === 'all' || s.kind === filter.kind) && (filter.length === 'any' || s.length === filter.length));
  const pick = (next: Partial<typeof filter>) => {
    const f = { ...filter, ...next };
    setFilter(f);
    try { sessionStorage.setItem(FILTER_KEY, JSON.stringify(f)); } catch { /* private mode */ }
  };

  return (
    <>
      <main className="hr-page">
        <h1 className="serif" style={{ margin: '20px 4px 0', fontSize: 34, fontWeight: 500 }}>Courses</h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="hr-seg" role="group" aria-label="What you memorize" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
            {([['all', 'All'], ...KINDS] as const).map(([k, label]) => (
              <button key={k} type="button" aria-pressed={filter.kind === k} onClick={() => pick({ kind: k as Kind | 'all' })}>{label}</button>
            ))}
          </div>
          <div className="hr-seg" role="group" aria-label="Length" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
            {([['any', 'Any length'], ...LENGTHS.map((l) => [l.id, l.label])] as const).map(([k, label]) => (
              <button key={k} type="button" aria-pressed={filter.length === k} onClick={() => pick({ length: k as Length | 'any' })}>{label}</button>
            ))}
          </div>
          <p style={{ margin: '0 6px', fontSize: 13, color: 'var(--muted)' }}>
            Length at your goal of {minutes} minutes a day: short is under a month, medium one to four months.
          </p>
        </div>

        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {shown.map((s) => (
            <li key={s.course.id}>
              <Link href={`/heir/courses/${s.course.id}`} className="hr-card hr-course-row">
                <MiniWindow base={s.window.base} lit={s.window.lit} dusty={s.window.dusty} size={68} label={`${s.course.title} window, ${s.learned} of ${s.total} learned`} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span className="serif" style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.2 }}>{s.course.title}</span>
                    {s.current && <span className="hr-tag">Your course</span>}
                  </span>
                  <span style={{ fontSize: 14, color: 'var(--muted)' }}>{s.total} {s.noun} · about {s.time}</span>
                  {s.learned > 0 && <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>{s.learned} of {s.total} learned</span>}
                </span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none', color: 'var(--muted)' }}><path d="M9 5l7 7-7 7" /></svg>
              </Link>
            </li>
          ))}
          {shown.length === 0 && <li><p style={{ margin: '8px 6px', color: 'var(--muted)' }}>No courses match. Try another length.</p></li>}
        </ul>
        <Link href="/heir/review" style={{ alignSelf: 'center', fontSize: 14, color: 'var(--ink)', padding: 12 }}>Review all the content (for the owner)</Link>
      </main>
      <Tabs />
    </>
  );
}
