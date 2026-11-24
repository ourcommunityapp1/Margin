'use client';

// How it works: what the stones mean, how each recall is graded, and how reviews are spaced.

import { Back, Tabs } from '../ui/tabs';
import { Stone } from '../ui/stone';
import { LEVELS, STAGES } from '@/heir/levels';
import { GRADES } from '@/heir/progress';

export default function HowPage() {
  return (
    <>
      <main className="hr-page">
        <div style={{ marginTop: 8 }}><Back href="/heir/you" /></div>
        <h1 className="serif" style={{ margin: '0 4px', fontSize: 32, fontWeight: 500 }}>How it works</h1>
        <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 className="serif" style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>The stones</h2>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: 'var(--muted)' }}>Each question or verse climbs a ladder of memory. It starts {STAGES[0].name.toLowerCase()}: {STAGES[0].means.charAt(0).toLowerCase() + STAGES[0].means.slice(1)} Every stone after that is earned the way memory research measures it: the whole thing recalled with no hints, after time away. Extra practice keeps it fresh, but doesn’t earn a stone by itself.</p>
          {LEVELS.map((l) => (
            <div key={l.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Stone level={l.n} size={34} />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontWeight: 600 }}>{l.name} <span style={{ color: 'var(--muted)', fontWeight: 500 }}>· {l.counts}</span></span>
                <span style={{ fontSize: 15, lineHeight: 1.45 }}>{l.means}</span>
                <span style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--muted)' }}>{l.rule}.</span>
              </span>
            </div>
          ))}
        </section>
        <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 className="serif" style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>How each recall is graded</h2>
          <p style={{ margin: 0, fontSize: 15, color: 'var(--muted)', lineHeight: 1.5 }}>Only answers you produce yourself count: typing it, saying it, or its first letters. The grade decides when it comes back.</p>
          {Object.values(GRADES).map((g) => (
            <div key={g.word} style={{ display: 'flex', gap: 12 }}>
              <span style={{ fontWeight: 600, minWidth: 92 }}>{g.word}</span>
              <span style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.45 }}>{g.means}</span>
            </div>
          ))}
        </section>
        <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 className="serif" style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Spaced review</h2>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>Each review waits until you’re close to forgetting, which is when recalling it helps most. Something you find hard comes back soon; something you know well waits longer each time.</p>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>A unit is locked in after a night’s sleep, all its questions together from memory. A day is kept by finishing a lesson or review, and Sundays are days of rest, with one more free day each week: learning on them counts, and skipping one never breaks the run.</p>
        </section>
      </main>
      <Tabs />
    </>
  );
}
