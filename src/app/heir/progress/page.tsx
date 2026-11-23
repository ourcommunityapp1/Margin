'use client';

// Progress, in three sections: Overview (the words in your memory, milestones, days kept), Courses (the window of
// every course you've begun), and Stones (each item's stone, how to earn them, and awards).

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useHeir } from '../ui/provider';
import { Tabs } from '../ui/tabs';
import { Stone } from '../ui/stone';
import Link from 'next/link';
import { allItems, courseItems, courses, itemLabel } from '@/heir/content';
import { courseSummary } from '../ui/course-list';
import { MiniWindow } from '../ui/glass/mini';
import { activeMember } from '@/heir/household';
import { AWARDS, LEVELS, STAGES, bestDaysKept, daysKept, needsRefresh, nextStep, shelf } from '@/heir/levels';
import { milestones, wordsIn, wordsLearnedThisWeek } from '@/heir/measures';
import { localDay, memberProgress } from '@/heir/progress';

// Learned (no stone yet) in warm glass, then each stone's own colour.
const STAGE_COLORS = ['#C9A46A', '#7B52B5', '#D99A2B', '#B0442A', '#1E8657', '#2F5DA8', '#BFC6CC'];
type Section = 'overview' | 'courses' | 'stones';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function Progress() {
  const { ready, household, progress, now } = useHeir();
  const router = useRouter();
  const [section, setSection] = useState<Section>('overview');
  useEffect(() => { if (ready && !household.members.length) router.replace('/heir/welcome'); }, [ready, household.members.length, router]);
  const me = activeMember(household);
  if (!ready || !me) return <main className="hr-page" aria-busy="true" />;

  const mine = memberProgress(progress, me.id);
  const items = allItems();
  const words = wordsIn(items, me.track, mine);
  const week = wordsLearnedThisWeek(items, me.track, mine, now);
  const miles = milestones(words.inMemory);
  const prevMile = miles.reached.at(-1) ?? 0;
  const today = localDay(now);
  const kept = daysKept(mine.days, today);
  const best = Math.max(kept, bestDaysKept(mine.days));
  const stones = shelf(items, mine);
  // Every course with anything learned, the one in progress first: its window lit as far as you've come.
  const minutes = household.plan?.minutes ?? 15;
  const yours = courses
    .map((c) => ({ c, s: courseSummary(c, me.track, mine, minutes, now), stones: courseItems(c).filter((i) => (mine.levels[i.id] ?? 0) > 0).length }))
    .filter((x) => x.s.started)
    .sort((a, b) => Number(b.c.id === household.plan?.course) - Number(a.c.id === household.plan?.course));
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
  const fmt = (n: number) => n.toLocaleString('en-US');

  return (
    <>
      <main className="hr-page">
        <h1 className="serif" style={{ margin: '20px 4px 4px', fontSize: 34, fontWeight: 500 }}>Progress</h1>
        <div className="hr-seg" role="tablist" aria-label="Progress sections" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          {([['overview', 'Overview'], ['courses', 'Courses'], ['stones', 'Stones']] as const).map(([id, name]) => (
            <button key={id} type="button" role="tab" aria-selected={section === id} onClick={() => setSection(id)}>{name}</button>
          ))}
        </div>

        {section === 'overview' && (
          <>
            <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }} aria-label="Words in your memory">
              <span className="hr-label">Words in your memory</span>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span className="serif" style={{ fontSize: 48, fontWeight: 600, lineHeight: 1 }}>{fmt(words.inMemory)}</span>
                <span style={{ fontSize: 15, color: 'var(--muted)' }}>of {fmt(words.learned)} learned{week ? ` · +${fmt(week)} this week` : ''}</span>
              </span>
              {words.inMemory === 0 && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: 'var(--muted)' }}>Recall something on the day after you learn it, and its words move up into your memory.</p>}
              <div className="hr-ladder">
                {STAGES.slice(0, 5).map((stage) => {
                  const n = words.atStage[stage.n];
                  return (
                    <div key={stage.name} className="hr-ladder-row">
                      <span className="hr-ladder-name">{stage.name}</span>
                      <span className="hr-ladder-bar"><span style={{ width: `${words.learned ? (n / words.learned) * 100 : 0}%`, background: STAGE_COLORS[stage.n] }} /></span>
                      <span className="hr-ladder-n">{fmt(n)}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} aria-label="Milestones">
              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="hr-label">Milestones</span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>{miles.next ? `${fmt(miles.next - words.inMemory)} more to ${fmt(miles.next)}` : 'All reached'}</span>
              </span>
              <div className="hr-miles">
                {[...miles.reached, ...(miles.next ? [miles.next] : [])].slice(-5).map((m) => (
                  <span key={m} className="hr-mile" data-reached={miles.reached.includes(m)}>{fmt(m)}</span>
                ))}
              </div>
              {miles.next && (
                <span className="hr-ladder-bar" aria-hidden="true"><span style={{ width: `${((words.inMemory - prevMile) / (miles.next - prevMile)) * 100}%`, background: STAGE_COLORS[1] }} /></span>
              )}
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

          </>
        )}

        {section === 'courses' && (
          <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }} aria-label="Your courses">
            <span className="hr-label">Your windows</span>
            {yours.length === 0 && <p style={{ margin: 0, fontSize: 15, color: 'var(--muted)' }}>Finish your first lesson and its window starts to light here.</p>}
            <div className="hr-wall">
              {yours.map(({ c, s }) => (
                <Link key={c.id} href={`/heir/courses/${c.id}`} className="hr-wall-item">
                  <MiniWindow base={s.window.base} lit={s.window.lit} dusty={s.window.dusty} size={88} started label={`${c.title} window`} />
                  <span className="serif" style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.2 }}>{c.title}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{s.learned >= s.total ? 'Finished' : `${s.learned} of ${s.total}`}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {section === 'stones' && (
          <>
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
                <span style={{ fontSize: 10.5, color: 'var(--muted)', opacity: 0.75, marginTop: -4 }}>{l.counts}</span>
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
          </>
        )}
      </main>
      <Tabs />
    </>
  );
}
