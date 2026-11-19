'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useHeir } from './provider';
import { Back } from './tabs';
import { collections, getCollection } from '@/heir/content';
import { setPlan } from '@/heir/household';

const MINUTES = [3, 5, 10, 15];

export function PlanScreen({ setup }: { setup: boolean }) {
  const { ready, household, update } = useHeir();
  const router = useRouter();
  const current = household.plan;
  const [collection, setCollection] = useState(current?.collection ?? 'westminster-shorter');
  const [through, setThrough] = useState(current?.through ?? 10);
  const [minutes, setMinutes] = useState(current?.minutes ?? 5);

  if (!ready) return <main className="hr-page" aria-busy="true" />;
  const c = getCollection(collection)!;
  const max = c.items.length;
  const upTo = Math.min(through, max);
  const ranges = c.kind === 'catechism' ? [5, 10].filter((n) => n <= max) : [max];

  const save = () => {
    update((h) => setPlan(h, { collection, through: upTo, minutes }));
    router.push('/heir');
  };

  return (
    <main className="hr-page bare">
      {!setup && <div><Back href="/heir" /></div>}
      <section className="hr-card" style={{ marginTop: setup ? 40 : 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <h1 className="serif" style={{ margin: 0, fontSize: 30, fontWeight: 500, lineHeight: 1.15 }}>Your family’s first goal</h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="hr-label" id="what">What</span>
          <div className="hr-seg" role="group" aria-labelledby="what" style={{ gridTemplateColumns: `repeat(${collections.length}, minmax(0, 1fr))`, background: 'var(--well)' }}>
            {collections.map((x) => (
              <button key={x.id} type="button" aria-pressed={x.id === collection} onClick={() => { setCollection(x.id); setThrough(x.kind === 'catechism' ? 10 : x.items.length); }}>
                {x.kind === 'catechism' ? 'Westminster' : x.title}
              </button>
            ))}
          </div>
        </div>

        {ranges.length > 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="hr-label" id="howfar">How far</span>
            <div className="hr-seg" role="group" aria-labelledby="howfar" style={{ gridTemplateColumns: `repeat(${ranges.length}, minmax(0, 1fr))`, background: 'var(--well)' }}>
              {ranges.map((n) => <button key={n} type="button" aria-pressed={upTo === n} onClick={() => setThrough(n)}>Questions 1–{n}</button>)}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="hr-label" id="pace">Minutes a day</span>
          <div className="hr-seg" role="group" aria-labelledby="pace" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', background: 'var(--well)' }}>
            {MINUTES.map((m) => <button key={m} type="button" aria-pressed={minutes === m} onClick={() => setMinutes(m)}>{m} min</button>)}
          </div>
        </div>

        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: 'var(--muted)' }}>
          {c.title}, {c.unit === 'Question' ? `questions 1–${upTo}` : `all ${max} sections`}, about {minutes} minutes a day. Once lessons arrive, the app will pace new pieces to fit and slow down if reviews pile up.
        </p>
        <button type="button" className="hr-btn" onClick={save}>{setup ? 'Start' : 'Save'}</button>
      </section>
    </main>
  );
}
