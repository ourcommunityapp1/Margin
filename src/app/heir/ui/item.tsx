'use client';

import { useState } from 'react';
import { useHeir } from './provider';
import { Back, Tabs } from './tabs';
import { activeMember } from '@/heir/household';
import type { Item } from '@/heir/types';

// One item, for reading and reciting. Practice with recall and scheduling replaces "Hide the words" in the next build.
export function ItemScreen({ item, collectionTitle, unit }: { item: Item; collectionTitle: string; unit: string }) {
  const { household } = useHeir();
  const track = activeMember(household)?.track ?? 'adult';
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      <main className="hr-page">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <Back href={`/heir/c/${item.collection}`} />
          <span style={{ fontSize: 15, fontWeight: 600 }}>{collectionTitle} · {unit === 'Question' ? 'Q' : 'Section '}{item.number}</span>
        </div>

        <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--muted)' }}>{item.prompt}</p>
          <p className="serif" style={{ margin: 0, fontSize: 24, lineHeight: 1.45 }} aria-live="polite">
            {hidden ? item.text.split(' ').map((w) => w[0] + '…').join(' ') : item.text}
          </p>
          <button type="button" className="hr-btn" onClick={() => setHidden(!hidden)} style={{ background: 'var(--well)', color: 'var(--ink)' }}>
            {hidden ? 'Show the words' : 'Hide the words and say it'}
          </button>
          {!item.reviewed && <span className="hr-tag" style={{ alignSelf: 'flex-start' }}>Not yet reviewed</span>}
        </section>

        <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="hr-label">In pieces ({track === 'child' ? 'child' : 'adult'} track)</span>
          <ol style={{ margin: 0, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {item.chunks[track].map((c, i) => <li key={i} className="serif" style={{ fontSize: 19, lineHeight: 1.4 }}>{c}</li>)}
          </ol>
        </section>

        {item.meaning.length > 0 && (
          <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="hr-label">What it means</span>
            {item.meaning.map((m, i) => (
              <div key={i} style={{ borderTop: i ? '1px solid var(--line)' : 0, paddingTop: i ? 10 : 0 }}>
                <button type="button" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}
                  style={{ border: 0, background: 'transparent', color: 'var(--ink)', font: '600 16px var(--font-inter), Inter, sans-serif', padding: '6px 0', textAlign: 'left', width: '100%', cursor: 'pointer', minHeight: 44 }}>
                  {m.question}
                </button>
                {open === i && <p style={{ margin: '4px 0 6px', fontSize: 16, lineHeight: 1.5 }}><b>{m.answer}.</b> {m.explain}</p>}
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
