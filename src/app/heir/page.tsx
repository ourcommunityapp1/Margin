'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useHeir } from './ui/provider';
import { Tabs } from './ui/tabs';
import { activeMember } from '@/heir/household';
import { getCollection, allItems } from '@/heir/content';
import { dayName, greeting } from '@/heir/time';

export default function Today() {
  const { ready, household, time, now } = useHeir();
  const router = useRouter();
  const me = activeMember(household);

  useEffect(() => {
    if (ready && !household.members.length) router.replace('/heir/welcome');
  }, [ready, household.members.length, router]);

  if (!ready || !me) return <main className="hr-page" aria-busy="true" />;

  const plan = household.plan;
  const goal = plan ? getCollection(plan.collection) : null;
  const unreviewed = allItems().filter((i) => !i.reviewed).length;

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
          {goal && plan ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="hr-label">Your goal</span>
                <p className="serif" style={{ margin: 0, fontSize: 26, lineHeight: 1.2 }}>
                  <span style={{ fontWeight: 600 }}>{goal.kind === 'catechism' ? 'Westminster' : goal.title}, {goal.unit === 'Question' ? 'Q' : 'sections '}1–{Math.min(plan.through, goal.items.length)}.</span>{' '}
                  <span style={{ color: 'var(--muted)' }}>Read it aloud, then say it without looking.</span>
                </p>
              </div>
              <Link className="hr-btn" href={`/heir/c/${goal.id}`}>Open your goal</Link>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)', textAlign: 'center' }}>Daily lessons and reviews arrive in the next build.</p>
            </>
          ) : (
            <>
              <p className="serif" style={{ margin: 0, fontSize: 26, lineHeight: 1.2 }}><span style={{ fontWeight: 600 }}>Choose a first goal.</span> <span style={{ color: 'var(--muted)' }}>Something the whole family can learn together.</span></p>
              <Link className="hr-btn" href="/heir/plan">Choose</Link>
            </>
          )}
        </section>

        <section className="hr-card" style={{ padding: '4px 22px' }}>
          <Link className="hr-row" href="/heir/review">
            <span style={{ fontWeight: 600 }}>Review the content</span>
            <span style={{ color: 'var(--muted)' }}>{unreviewed} waiting</span>
          </Link>
          <Link className="hr-row" href="/heir/plan">
            <span style={{ fontWeight: 600 }}>Family goal</span>
            <span style={{ color: 'var(--muted)' }}>{plan ? `${plan.minutes} min a day` : 'Not set'}</span>
          </Link>
        </section>
      </main>
      <Tabs />
    </>
  );
}
