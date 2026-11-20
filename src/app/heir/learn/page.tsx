'use client';

// Learn: the actual words of each course, unit by unit, to read and look things up.
// Opens on the course you're memorizing; each line opens the answer, its meaning and its Scripture.

import Link from 'next/link';
import { useState } from 'react';
import { useHeir } from '../ui/provider';
import { Tabs } from '../ui/tabs';
import { groupLabel } from '../ui/course';
import { courseFor, courseItems, courses, getCollection } from '@/heir/content';
import { activeMember } from '@/heir/household';
import { groupsOf, unitsFor } from '@/heir/lesson';
import { masteredItem } from '@/heir/path';
import { memberProgress } from '@/heir/progress';

const SHORT: Record<string, string> = { 'westminster-shorter': 'Shorter', 'westminster-larger': 'Larger', creeds: 'Creeds' };

export default function Learn() {
  const { ready, household, progress } = useHeir();
  const [picked, setPicked] = useState<string | null>(null);
  if (!ready) return <main className="hr-page" aria-busy="true" />;
  const me = activeMember(household);
  const mine = memberProgress(progress, me?.id);
  const track = me?.track ?? 'adult';
  const course = courseFor(picked ?? household.plan?.course) ?? courses[0];
  const groups = groupsOf(courseItems(course));

  return (
    <>
      <main className="hr-page">
        <h1 className="serif" style={{ margin: '20px 4px 0', fontSize: 34, fontWeight: 500 }}>Learn</h1>
        <div className="hr-seg" role="group" aria-label="Course" style={{ gridTemplateColumns: `repeat(${courses.length}, minmax(0, 1fr))` }}>
          {courses.map((c) => <button key={c.id} type="button" aria-pressed={c.id === course.id} onClick={() => setPicked(c.id)}>{SHORT[c.id] ?? c.title}</button>)}
        </div>
        {groups.map((g, n) => (
          <section key={g.key} className="hr-card" style={{ padding: '16px 22px 6px' }} aria-label={`Unit ${n + 1}`}>
            <span className="hr-label">Unit {n + 1} · {groupLabel(g)}</span>
            <ol className="hr-lessons" style={{ marginTop: 6 }}>
              {g.items.map((item) => {
                const learned = unitsFor(item, track).every((u) => mine.units.includes(u.key));
                const status = masteredItem(item, mine) ? 'Mastered' : learned ? 'Learned' : null;
                const unit = getCollection(item.collection)?.unit;
                return (
                  <li key={item.id}>
                    <Link className="hr-lesson" href={`/heir/item/${item.id}`} style={{ alignItems: 'flex-start', padding: '10px 8px' }}>
                      <span style={{ flex: 'none', width: 34, fontWeight: 600, color: 'var(--muted)', fontSize: 15, paddingTop: 1 }}>{unit === 'Question' ? `Q${item.number}` : item.number}</span>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, flex: 1 }}>
                        <span style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.35 }}>{item.prompt}</span>
                        <span className="serif" style={{ fontSize: 16, lineHeight: 1.4, color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.text}</span>
                      </span>
                      {status && <span className="hr-tag" style={{ flex: 'none' }}>{status}</span>}
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
        <Link href="/heir/review" style={{ alignSelf: 'center', fontSize: 14, color: 'var(--ink)', padding: 12 }}>Review all the content (for the owner)</Link>
      </main>
      <Tabs />
    </>
  );
}
