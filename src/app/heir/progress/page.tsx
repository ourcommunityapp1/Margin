'use client';

// Progress: what you know across every course, your stones, days kept this month, and awards.

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useHeir } from '../ui/provider';
import { Tabs } from '../ui/tabs';
import { Stone } from '../ui/stone';
import { allItems, getCollection, itemLabel } from '@/heir/content';
import { activeMember } from '@/heir/household';
import { AWARDS, LEVELS, bestDaysKept, countsFor, daysKept, needsRefresh, nextStep, shelf } from '@/heir/levels';
import { localDay, memberProgress } from '@/heir/progress';

const COLORS = ['#7B52B5', '#D99A2B', '#B0442A', '#1E8657', '#2F5DA8', '#BFC6CC'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function Progress() {
  const { ready, household, progress, now } = useHeir();
  const router = useRouter();
  useEffect(() => { if (ready && !household.members.length) router.replace('/heir/welcome'); }, [ready, household.members.length, router]);
  const me = activeMember(household);
  if (!ready || !me) return <main className="hr-page" aria-busy="true" />;

  const mine = memberProgress(progress, me.id);
  const items = allItems();
  const counts = countsFor(items, mine);
  const today = localDay(now);
  const kept = daysKept(mine.days, today);
  const best = Math.max(kept, bestDaysKept(mine.days));
  const stones = shelf(items, mine);
  const kinds = [
    { name: 'Catechism questions', list: items.filter((i) => getCollection(i.collection)?.kind === 'catechism') },
    { name: 'Creed sections', list: items.filter((i) => getCollection(i.collection)?.kind === 'creed') },
    { name: 'Bible verses', list: items.filter((i) => getCollection(i.collection)?.kind === 'scripture') },
  ];
  const hints = items
    .filter((i) => (mine.levels[i.id] ?? 0) > 0 && !needsRefresh(mine, i.id, now))
    .sort((a, b) => (mine.levels[a.id] ?? 0) - (mine.levels[b.id] ?? 0))
    .slice(0, 2)
    .map((i) => `${itemLabel(i)}: ${nextStep(i, me.track, mine, now)}`);

  // This month, Monday first.
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const blanks = (first.getDay() + 6) % 7;
  const daysIn = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const kept_ = new Set(mine.days);
  const cells = Array.from({ length: daysIn }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), i + 1);
    const key = localDay(d);
    const state = kept_.has(key) ? 'kept' : key === today ? 'today' : key > today ? 'later' : d.getDay() === 0 ? 'rest' : 'missed';
    return { key, n: i + 1, state };
  });
  const earned = AWARDS.filter((a) => mine.awards[a.id]).length;
  const sentence = counts.know === 0
    ? 'Finish a lesson and type the answer in full to earn your first stone.'
    : `${counts.know} you know. ${counts.memorized} memorized, ${counts.mastered} mastered.`;

  return (
    <>
      <main className="hr-page">
        <h1 className="serif" style={{ margin: '20px 4px 4px', fontSize: 34, fontWeight: 500 }}>Progress</h1>

        <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span className="hr-label">In your memory</span>
          <p className="serif" style={{ margin: 0, fontSize: 22, lineHeight: 1.3, fontWeight: 600 }}>{sentence}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
            {[[1, counts.know, 'Know'], [2, counts.memorized, 'Memorized'], [3, counts.mastered, 'Mastered'], [4, counts.longTerm, 'Long-term']].map(([lv, n, name]) => (
              <div key={name} style={{ background: 'var(--well)', borderRadius: 16, padding: '12px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
                <Stone level={Number(lv)} size={32} />
                <span className="serif" style={{ fontSize: 24, fontWeight: 600, lineHeight: 1 }}>{n}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', lineHeight: 1.25 }}>{name}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {kinds.map((k) => {
              const known = k.list.filter((i) => (mine.levels[i.id] ?? 0) > 0).length;
              return (
                <div key={k.name} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span style={{ fontWeight: 600 }}>{k.name}</span>
                    <span style={{ color: 'var(--muted)' }}>{known ? `${known} of ${k.list.length} known` : 'Not started'}</span>
                  </div>
                  <div className="hr-stack" aria-hidden="true">
                    {[5, 4, 3, 2, 1].map((lv) => {
                      const n = k.list.filter((i) => (mine.levels[i.id] ?? 0) === lv).length;
                      return n ? <span key={lv} style={{ width: `${(n / k.list.length) * 100}%`, background: COLORS[lv - 1] }} /> : null;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="hr-label">Stones</span>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Each question’s highest level</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 4 }}>
            {LEVELS.map((l, i) => (
              <div key={l.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <Stone level={l.n} size={40} dim={stones[i] === 0} />
                <span style={{ fontSize: 16, fontWeight: 700 }}>{stones[i]}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>{l.name}</span>
              </div>
            ))}
          </div>
          {hints.length > 0 && <p style={{ margin: 0, background: 'var(--well)', borderRadius: 14, padding: '12px 14px', fontSize: 14, lineHeight: 1.45 }}><strong>Closest next:</strong> {hints.join('. ')}.</p>}
          <details className="hr-stones-how">
            <summary>How to earn each stone</summary>
            <ol>
              {LEVELS.map((l) => (
                <li key={l.id}>
                  <Stone level={l.n} size={30} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <b>{l.name}{l.counts ? <span style={{ fontWeight: 500, color: 'var(--muted)' }}> · {l.counts}</span> : null}</b>
                    <span>{l.means}</span>
                    {l.n === 6 && <span style={{ fontSize: 13, color: 'var(--muted)' }}>Open any question or verse that has reached Sapphire, and recall its related verses one by one.</span>}
                  </span>
                </li>
              ))}
            </ol>
          </details>
        </section>

        <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }} aria-label="Days kept this month">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="serif" style={{ fontSize: 30, fontWeight: 600, lineHeight: 1 }}>{kept}</span>
              <span style={{ fontWeight: 600 }}>{kept === 1 ? 'day kept' : 'days kept'}</span>
            </span>
            <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>{MONTHS[now.getMonth()]}{best ? ` · Best ${best}` : ''}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6, textAlign: 'center' }}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i} style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>{d}</span>)}
            {Array.from({ length: blanks }, (_, i) => <span key={`b${i}`} />)}
            {cells.map((c) => <span key={c.key} className="hr-cal" data-state={c.state}>{c.n}</span>)}
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.45 }}>A day is kept by finishing a lesson or review. Sundays are days of rest: learning counts, and skipping never breaks the run.</p>
        </section>

        <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="hr-label">Awards</span>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{earned} of {AWARDS.length}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            {AWARDS.map((a) => {
              const when = mine.awards[a.id];
              return (
                <div key={a.id} className="hr-award" data-earned={!!when}>
                  <span className="hr-seal" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.4 6.8 19.2l1-5.9L3.5 9.2l5.9-.8z" /></svg></span>
                  <span style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.3 }}>{a.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{when ? new Date(when).toLocaleDateString(undefined, { day: 'numeric', month: 'long' }) : a.hint}</span>
                </div>
              );
            })}
          </div>
        </section>
      </main>
      <Tabs />
    </>
  );
}
