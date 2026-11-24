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

export default function Today() {
  const { ready, household, time } = useHeir();
  const router = useRouter();
  const { me, chosen } = useCourse();

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
        <TodayCards />
      </main>
      <Tabs />
    </>
  );
}
