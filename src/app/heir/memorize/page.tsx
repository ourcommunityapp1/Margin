'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Tabs } from '../ui/tabs';
import { collections } from '@/heir/content';

type Seg = 'catechism' | 'creed' | 'scripture';
const SEGS: [Seg, string][] = [['scripture', 'Bible'], ['catechism', 'Catechisms'], ['creed', 'Creeds']];

export default function Memorize() {
  const [seg, setSeg] = useState<Seg>('catechism');
  const list = collections.filter((c) => c.kind === seg);
  return (
    <>
      <main className="hr-page">
        <h1 className="serif" style={{ margin: '20px 4px 0', fontSize: 34, fontWeight: 500 }}>Memorize</h1>
        <div className="hr-seg" role="group" aria-label="Kind" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          {SEGS.map(([id, label]) => <button key={id} type="button" aria-pressed={seg === id} onClick={() => setSeg(id)}>{label}</button>)}
        </div>
        <section className="hr-card" style={{ padding: '4px 22px' }}>
          {list.length ? list.map((c) => (
            <Link key={c.id} href={`/heir/c/${c.id}`} className="hr-row" style={{ minHeight: 68 }}>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontWeight: 600 }}>{c.title}</span>
                <span style={{ fontSize: 14, color: 'var(--muted)' }}>{c.items.length} {c.unit === 'Question' ? 'questions so far' : 'sections'}</span>
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
            </Link>
          )) : (
            <p style={{ margin: '18px 0', fontSize: 16, lineHeight: 1.5 }}>Scripture comes next, once the ESV license terms are confirmed. Catechisms and creeds are ready now.</p>
          )}
        </section>
      </main>
      <Tabs />
    </>
  );
}
