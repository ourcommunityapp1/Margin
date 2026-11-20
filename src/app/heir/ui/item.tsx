'use client';

// One item, for reading: the answer, what it means, and the Scripture it rests on. Practice happens in lessons.

import { useHeir } from './provider';
import { Back, Tabs } from './tabs';
import { activeMember } from '@/heir/household';
import { memberProgress } from '@/heir/progress';
import { masteredItem } from '@/heir/path';
import { unitsFor } from '@/heir/lesson';
import type { Item } from '@/heir/types';

export function ItemScreen({ item, collectionTitle, unit }: { item: Item; collectionTitle: string; unit: string }) {
  const { household, progress } = useHeir();
  const me = activeMember(household);
  const mine = memberProgress(progress, me?.id);
  const learned = unitsFor(item, me?.track ?? 'adult').every((u) => mine.units.includes(u.key));
  const status = masteredItem(item, mine) ? 'Mastered' : learned ? 'Learned' : null;

  return (
    <>
      <main className="hr-page">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <Back href="/heir/learn" />
          <span style={{ fontSize: 15, fontWeight: 600 }}>{collectionTitle} · {unit === 'Question' ? 'Q' : 'Part '}{item.number}</span>
        </div>

        <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p className="serif" style={{ margin: 0, fontSize: 20, lineHeight: 1.35, fontWeight: 600 }}>{item.prompt}</p>
          <p className="serif" style={{ margin: 0, fontSize: 24, lineHeight: 1.45 }}>{item.text}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {status && <span className="hr-tag">{status}</span>}
            {!item.reviewed && <span className="hr-tag" style={{ background: 'transparent', border: '1px solid var(--edge)' }}>Not yet reviewed</span>}
          </div>
        </section>

        {item.meaning.length > 0 && (
          <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <span className="hr-label">What it means</span>
            {item.meaning.map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: i ? '1px solid var(--line)' : 0, paddingTop: i ? 14 : 0 }}>
                <span style={{ fontWeight: 600, fontSize: 16 }}>{m.question}</span>
                <span style={{ fontSize: 16, lineHeight: 1.5 }}><b>{m.answer}.</b> {m.explain}</span>
              </div>
            ))}
          </section>
        )}

        {item.connected.length > 0 && (
          <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="hr-label">Connected Scripture</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {item.connected.map((r) => <span key={r} className="hr-tag" style={{ fontSize: 14, padding: '7px 12px' }}>{r}</span>)}
            </div>
          </section>
        )}
      </main>
      <Tabs />
    </>
  );
}
