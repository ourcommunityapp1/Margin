'use client';

// "Review": everything that needs recalling to stay in your memory, soonest first. You choose what to review now; the three
// soonest are ticked. What you skip stays on Today until its date.

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { dayLabel, useKeep } from './keep';
import { allItems } from '@/heir/content';
import { KEEP_LAUNCH, heldItems } from '@/heir/keep';
import { activeMember } from '@/heir/household';
import { memberProgress } from '@/heir/progress';
import { useHeir } from './provider';
import { Back, Tabs } from './tabs';
import { itemLabel, getCollection } from '@/heir/content';
import type { Held } from '@/heir/keep';

const MINUTES_PER_ITEM = 0.7;

function Line({ h, on, toggle }: { h: Held; on: boolean; toggle: () => void }) {
  const due = h.state.state === 'review' || h.state.state === 'try-again' ? h.state.deadline : null;
  const where = getCollection(h.item.collection)?.title ?? '';
  return (
    <label className="hr-keep-line">
      <input type="checkbox" checked={on} onChange={toggle} style={{ width: 22, height: 22, accentColor: 'var(--good)', flex: 'none' }} />
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
        <b style={{ overflowWrap: 'anywhere' }}>{itemLabel(h.item)}</b>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>{where} · {h.words} words{due ? ` · due ${dayLabel(due)}` : h.state.state === 'out' ? ' · out of your memory' : ''}</span>
      </span>
    </label>
  );
}

export function KeepScreen() {
  const { ready, keepRules, household, progress, now } = useHeir();
  const me = activeMember(household);
  const k = useKeep();
  const sorted = useMemo(() => (k ? [...k.tryAgain, ...k.review, ...k.out] : []), [k]);
  const initial = useMemo(() => new Set([...(k?.tryAgain ?? []), ...(k?.review ?? []).slice(0, 3)].map((h) => h.item.id)), [k]);
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const chosen = picked ?? initial;
  // Everything else you know, so you can review it any time you like.
  const others = useMemo(() => {
    if (!me || !k) return [] as Held[];
    const attention = new Set([...k.tryAgain, ...k.review, ...k.out].map((h) => h.item.id));
    return heldItems(allItems(), memberProgress(progress, me.id), me.track, now, { launch: KEEP_LAUNCH, tz: null, mode: 'whole' }).filter((h) => !attention.has(h.item.id));
  }, [me, k, progress, now]);
  if (!ready) return <main className="hr-page" aria-busy="true" />;
  if (!keepRules || !k) return <main className="hr-page bare"><section className="hr-card" style={{ margin: 'auto 0', display: 'flex', flexDirection: 'column', gap: 12 }}><p className="serif" style={{ margin: 0, fontSize: 24 }}>Nothing to review yet.</p><Link className="hr-btn" href="/heir">Back to Today</Link></section></main>;
  const toggle = (id: string) => { const s = new Set(chosen); if (s.has(id)) s.delete(id); else s.add(id); setPicked(s); };
  const everything = [...sorted, ...others];
  const ids = everything.filter((h) => chosen.has(h.item.id)).map((h) => h.item.id);
  const minutes = Math.max(1, Math.round(ids.length * MINUTES_PER_ITEM));
  const section = (title: string, list: Held[]) => list.length > 0 && (
    <section className="hr-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span className="hr-label">{title} · {list.length}</span>
      {list.map((h) => <Line key={h.item.id} h={h} on={chosen.has(h.item.id)} toggle={() => toggle(h.item.id)} />)}
    </section>
  );
  return (
    <>
      <main className="hr-page">
        <div style={{ marginTop: 8 }}><Back href="/heir" /></div>
        <h1 className="serif" style={{ margin: '0 4px', fontSize: 32, fontWeight: 500 }}>Review</h1>
        <p style={{ margin: '0 4px', color: 'var(--muted)', fontSize: 14 }}>Pick what to review now. Each one is recalled whole, every part, because that’s what keeps it in your memory. Anything you skip stays on Today until its date.</p>
        {sorted.length === 0 && <section className="hr-card"><p style={{ margin: 0, lineHeight: 1.5 }}>Everything is in your memory for now. Reviews show up here two weeks before they’re due.</p></section>}
        {section('Try again', k.tryAgain)}
        {section('Due soon', k.review)}
        {section('Out of your memory', k.out)}
        {k.out.length > 0 && <p style={{ margin: '0 4px', fontSize: 13, color: 'var(--muted)' }}>One right recall brings an item back. Its stone was never taken away.</p>}
        {others.length > 0 && (
          <details className="hr-card" style={{ padding: '14px 16px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Review something else · {others.length}</summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
              {others.map((h) => <Line key={h.item.id} h={h} on={chosen.has(h.item.id)} toggle={() => toggle(h.item.id)} />)}
            </div>
          </details>
        )}
        {everything.length > 0 && (
          <div className="hr-keep-bar">
            <span style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', padding: '0 4px' }}>
              <span>{ids.length} chosen · about {minutes} {minutes === 1 ? 'minute' : 'minutes'}</span>
              <button type="button" onClick={() => setPicked(chosen.size >= sorted.length && sorted.length > 0 && sorted.every((h) => chosen.has(h.item.id)) ? new Set() : new Set(sorted.map((h) => h.item.id)))} style={{ background: 'none', border: 0, color: 'inherit', font: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}>{sorted.length > 0 && sorted.every((h) => chosen.has(h.item.id)) ? 'Clear all' : 'Choose all'}</button>
            </span>
            {ids.length > 0 ? <Link className="hr-btn" href={`/heir/lesson?mode=keep&items=${ids.map(encodeURIComponent).join(',')}&from=%2Fheir%2Fkeep`}>Review {ids.length}</Link> : <button type="button" className="hr-btn" disabled>Review</button>}
          </div>
        )}
      </main>
      <Tabs />
    </>
  );
}

