'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useHeir } from './ui/provider';
import { groupLabel, useCourse } from './ui/course';
import { Tabs } from './ui/tabs';
import { allItems, getItem, itemLabel } from '@/heir/content';
import { dayName, greeting } from '@/heir/time';

export default function Today() {
  const { ready, household, time, now } = useHeir();
  const router = useRouter();
  const { me, course, items, activity, group, groupLearned, due, learned, chosen, mine } = useCourse();

  useEffect(() => {
    if (!ready) return;
    if (!household.members.length) router.replace('/heir/welcome');
    else if (!chosen) router.replace('/heir/start');
  }, [ready, household.members.length, chosen, router]);

  if (!ready || !me || !chosen) return <main className="hr-page" aria-busy="true" />;

  const next = activity?.kind === 'learn' ? getItem(activity.unit.itemId) : null;
  const unreviewed = allItems().filter((i) => !i.reviewed).length;
  const pct = group ? Math.round((groupLearned / group.items.length) * 100) : 0;

  return (
    <>
      <main className="hr-page">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0 4px', marginTop: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 500 }}>{dayName(now)}</span>
            <h1 className="serif" style={{ margin: 0, fontSize: 34, fontWeight: 500, lineHeight: 1.1 }}>{greeting(time)}, {me.name}</h1>
          </div>
          <Link href="/heir/family" aria-label={`Switch profile (now ${me.name})`} style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--card)', color: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 17, textDecoration: 'none', flex: 'none' }}>{me.name[0]}</Link>
        </header>

        <section className="hr-card" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="hr-label">{course.title}{group ? ` · ${groupLabel(group)}` : ''}</span>
            {activity?.kind === 'learn' && next ? (
              <p className="serif" style={{ margin: 0, fontSize: 24, lineHeight: 1.25 }}>
                <span style={{ fontWeight: 600 }}>Next: {itemLabel(next)}{activity.unit.of > 1 ? `, part ${activity.unit.part} of ${activity.unit.of}` : ''}.</span>{' '}
                <span style={{ color: 'var(--muted)' }}>{next.prompt}</span>
              </p>
            ) : activity?.kind === 'checkpoint' ? (
              <p className="serif" style={{ margin: 0, fontSize: 24, lineHeight: 1.25 }}>
                <span style={{ fontWeight: 600 }}>Lock in {groupLabel(activity.group)}.</span>{' '}
                <span style={{ color: 'var(--muted)' }}>All of them from memory, the hard way, before moving on.</span>
              </p>
            ) : (
              <p className="serif" style={{ margin: 0, fontSize: 24, lineHeight: 1.25 }}>
                <span style={{ fontWeight: 600 }}>You’ve learned all {items.length} for now.</span>{' '}
                <span style={{ color: 'var(--muted)' }}>Reviews keep them fresh while more are added.</span>
              </p>
            )}
          </div>
          {group && activity && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="hr-progress" style={{ background: 'var(--well)', height: 8 }} aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
              <span style={{ fontSize: 14, color: 'var(--muted)' }}>{groupLearned} of {group.items.length} learned in this group · {learned} of {items.length} overall{due.length ? ` · ${due.length} ready to review` : ''}</span>
            </div>
          )}
          {activity ? (
            <Link className="hr-btn" href="/heir/lesson">{activity.kind === 'checkpoint' ? 'Lock them in' : mine.lessons ? 'Start the next lesson' : 'Start your first lesson'}</Link>
          ) : (
            <Link className="hr-btn" href="/heir/lesson?mode=review">Review</Link>
          )}
          {activity && due.length > 0 && <Link className="hr-btn quiet" href="/heir/lesson?mode=review">Just review ({due.length})</Link>}
        </section>

        <section className="hr-card" style={{ padding: '4px 22px' }}>
          <Link className="hr-row" href="/heir/plan">
            <span style={{ fontWeight: 600 }}>What you’re memorizing</span>
            <span style={{ color: 'var(--muted)', fontSize: 15 }}>Change</span>
          </Link>
          <Link className="hr-row" href="/heir/review">
            <span style={{ fontWeight: 600 }}>Review the content</span>
            <span style={{ color: 'var(--muted)', fontSize: 15 }}>{unreviewed} waiting</span>
          </Link>
        </section>
      </main>
      <Tabs />
    </>
  );
}
