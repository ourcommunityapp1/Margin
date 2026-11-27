'use client';

// Progress, as one scroll: a row of rings, the words in your memory (an arc over your window) and how they have grown,
// the days kept, the stones, the window of every course you've begun (tap one to see it up close), and awards.

import { DEFAULT_GOAL } from '@/heir/planner';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useHeir } from '../ui/provider';
import { useKeep } from '../ui/keep';
import { Tabs } from '../ui/tabs';
import { DaysKept } from '../ui/days-kept';
import { Stone } from '../ui/stone';
import Link from 'next/link';
import { allItems, courseItems, courses, itemLabel } from '@/heir/content';
import { courseSummary } from '../ui/course-list';
import { MiniWindow } from '../ui/glass/mini';
import { RoundWindow } from '../ui/glass/round';
import type { PartWindow } from '../ui/glass/light';
import { activeMember } from '@/heir/household';
import { AWARDS, LEVELS, STAGES, UNDERSTANDING, bestDaysKept, daysKept, needsRefresh, nextStep, recited, understanding } from '@/heir/levels';
import { MILESTONES, milestones, wordsIn } from '@/heir/measures';
import { wordsHistory, type WordsPoint } from '@/heir/memory-history';
import { weekSummary } from '@/heir/week';
import { localDay, memberProgress } from '@/heir/progress';

// Recited (no stone yet) in warm glass, then each stone's own colour.
const STAGE_COLORS = ['#C9A46A', '#7B52B5', '#D99A2B', '#B0442A', '#1E8657', '#2F5DA8', '#BFC6CC'];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function Progress() {
  const { ready, household, progress, now, labs } = useHeir();
  const keep = useKeep();
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { if (ready && !household.members.length) router.replace('/heir/welcome'); }, [ready, household.members.length, router]);
  const me = activeMember(household);
  const mine0 = memberProgress(progress, me?.id);
  const track0 = me?.track ?? 'adult';
  const wordsNow = keep ? keep.wordsKept : null;
  const history = useMemo(() => (me ? wordsHistory(allItems(), track0, mine0, now, wordsNow ?? wordsIn(allItems(), track0, mine0).inMemory) : []), [me, track0, mine0, now, wordsNow]);
  if (!ready || !me) return <main className="hr-page" aria-busy="true" />;

  const mine = mine0;
  const items = allItems();
  const words = wordsIn(items, me.track, mine);
  // With the keeping rules on, words not recalled in time aren't counted.
  const inMemory = keep ? keep.wordsKept : words.inMemory;
  const miles = milestones(inMemory);
  const prevMile = miles.reached.at(-1) ?? 0;
  const today = localDay(now);
  const kept = daysKept(mine.days, today);
  const best = Math.max(kept, bestDaysKept(mine.days));
  // Each stone keeps the ones below it: an item at Topaz also counts toward Amethyst. So counts fall as you climb.
  const levelOf = (id: string) => mine.levels[id] ?? 0;
  const recitedCount = items.filter((i) => levelOf(i.id) > 0 || recited(i, me.track, mine.log)).length;
  const holding = LEVELS.map((l) => items.filter((i) => levelOf(i.id) >= l.n).length);
  // Understanding, counted over items that have meaning notes: how many at each step or beyond.
  const withNotes = items.filter((i) => i.meaning.length);
  const grasp = UNDERSTANDING.map((u) => withNotes.filter((i) => understanding(i, mine) >= u.n).length);
  // Every course with anything learned, the one in progress first: its window lit as far as you've come.
  const minutes = household.plan?.minutes ?? DEFAULT_GOAL;
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

  const nextAward = AWARDS.find((a) => !mine.awards[a.id]);
  const viewing = yours.find((y) => y.c.id === open);
  const wash = yours[0]?.s.window.base ?? null;
  const week = weekSummary(mine, now);
  const learnedAll = yours.reduce((n, y) => n + y.s.learned, 0), totalAll = yours.reduce((n, y) => n + y.s.total, 0);
  // One plain sentence for where you stand, and one line of what to do.
  const toNext = miles.next ? miles.next - inMemory : 0;
  const say = keep && keep.tryAgain.length > 0 ? 'A few to bring back' : keep && keep.review.length > 0 ? 'Keep them strong' : inMemory === 0 ? 'Your first words are coming' : miles.next ? 'Steady does it' : 'Every milestone reached';
  const guide = inMemory === 0 ? 'Recall a verse or answer on a later day and it counts here.'
    : keep && keep.tryAgain.length > 0 ? `${keep.tryAgain.length} ${keep.tryAgain.length === 1 ? 'needs' : 'need'} another go today to stay in your count.`
    : keep && keep.review.length > 0 ? `Review ${keep.review.length} soon to keep ${keep.review.length === 1 ? 'it' : 'them'} in your count.`
    : miles.next ? `Next milestone: ${fmt(miles.next)} words. You’re ${fmt(toNext)} ${toNext === 1 ? 'word' : 'words'} away.` : 'Every word you’ve learned is holding.';

  return (
    <>
      <main className="hr-page">
        <h1 className="serif" style={{ margin: '20px 4px 4px', fontSize: 34, fontWeight: 500 }}>Progress</h1>

        <div className="hr-pg-chips" role="list" aria-label="At a glance">
          <RingChip frac={miles.next ? (inMemory - prevMile) / (miles.next - prevMile) : 1} value={fmt(inMemory)} label="Words" color="#F3D8B6" />
          <RingChip frac={best ? Math.min(1, kept / best) : 0} value={String(kept)} label="Days kept" color="#9fb8e8" />
          <RingChip frac={recitedCount ? holding[0] / recitedCount : 0} value={String(holding[0])} label="Stones" color="#b9a1e6" />
          <RingChip frac={totalAll ? learnedAll / totalAll : 0} value={String(yours.length)} label="Windows" color="#e5b66a" />
        </div>

        <section className="hr-pg-hero" aria-label="Words in your memory">
          {wash && <div className="hr-pg-wash" style={{ backgroundImage: `url(${wash}/glass.webp)` }} aria-hidden="true" />}
          <Gauge frac={miles.next ? (inMemory - prevMile) / (miles.next - prevMile) : 1} left={miles.next ? fmt(prevMile) : undefined} right={miles.next ? fmt(miles.next) : undefined} />
          <span className="serif hr-pg-num">{fmt(inMemory)}</span>
          <span className="hr-pg-kicker">Words in your memory</span>
          <span className="serif hr-pg-say">{say}</span>
          <p className="hr-pg-line">{guide}</p>
          {keep && keep.review.length > 0 ? <Link href="/heir/keep" className="hr-pg-btn">Review {keep.review.length} soon</Link>
            : keep && keep.out.length > 0 ? <Link href="/heir/keep" className="hr-pg-btn">Bring {keep.out.length} back</Link> : null}
        </section>

        <section className="hr-pg-week" aria-label="This week">
          {[[week.learned, 'learned'], [week.kept, 'kept up'], [week.strengthened, 'strengthened'], [week.days, week.days === 1 ? 'day kept' : 'days kept']].map(([n, label]) => (
            <div key={String(label)}><b className="serif">{n}</b><span>{label}</span></div>
          ))}
          <span className="hr-pg-week-title">This week</span>
        </section>

        {history.length > 2 && (
          <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-label="Words over time">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="hr-label">Growing</span>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>since {new Date((history.find((q) => q.words > 0) ?? history[0]).at).toLocaleDateString('en-US', { month: 'long' })}</span>
            </div>
            <StepChart pts={history} />
          </section>
        )}

        <details className="hr-card hr-pg-how">
          <summary>How a word gets into your memory</summary>
          <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.5, color: 'var(--muted)' }}>{keep ? 'A word is in your memory once you’ve recalled it with no hints on a later day than you first recited it, and stays there as long as you recall it again in time.' : 'A word is in your memory once you’ve recalled it with no hints on a later day than you first recited it.'}{words.recited > words.inMemory ? ` ${fmt(words.recited - words.inMemory)} more are recited, not yet recalled on a later day.` : ''}</p>
        </details>

        {keep && (keep.tryAgain.length > 0 || keep.review.length > 0 || keep.out.length > 0) && (
          <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 15 }} aria-label="Keeping your words">
            {keep.tryAgain.length > 0 && <span style={{ display: 'flex', justifyContent: 'space-between' }}><span>Try again today</span><b>{keep.tryAgain.length} {keep.tryAgain.length === 1 ? 'verse or answer' : 'verses and answers'}</b></span>}
            {keep.review.length > 0 && <Link href="/heir/keep" style={{ display: 'flex', justifyContent: 'space-between', color: 'inherit', textDecoration: 'none' }}><span>Review soon</span><b>{fmt(keep.review.reduce((n, h) => n + h.words, 0))} words ›</b></Link>}
            {keep.out.length > 0 && <Link href="/heir/keep" style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', textDecoration: 'none' }}><span>Out of memory · one recall brings back</span><b>{keep.out.length} ›</b></Link>}
          </section>
        )}

        <DaysKept days={mine.days} today={localDay(now)} now={now} dueCount={0} />

        <details className="hr-card hr-pg-how" aria-label="Days kept this month">
          <summary>{MONTHS[now.getMonth()]}, day by day{best ? ` · best ${best}` : ''}</summary>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6, textAlign: 'center', marginTop: 12 }}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i} style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>{d}</span>)}
            {Array.from({ length: blanks }, (_, i) => <span key={`b${i}`} />)}
            {cells.map((c) => <span key={c.key} className="hr-cal" data-state={c.state}>{c.n}</span>)}
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--muted)', lineHeight: 1.45 }}>A day is kept by finishing a lesson or review. Sundays are days of rest, and each week has one more free day: learning on them counts, and skipping one never breaks the run.</p>
        </details>

        <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }} aria-label="Stones">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="hr-label">Stones</span>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>All courses · {recitedCount} recited</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[{ n: 0, name: STAGES[0].name, word: 'No stone yet', count: recitedCount, color: STAGE_COLORS[0] },
              ...LEVELS.map((l, i) => ({ n: l.n, name: l.name, word: l.counts, count: holding[i], color: STAGE_COLORS[l.n] }))].map((r) => (
              <div key={r.name} className="hr-stone-row">
                <Stone level={r.n} size={36} dim={r.n > 0 && r.count === 0} />
                <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{r.name}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{r.word}</span>
                </span>
                <span className="hr-ladder-bar"><span style={{ width: `${recitedCount ? (r.count / recitedCount) * 100 : 0}%`, background: r.color }} /></span>
                <span className="hr-ladder-n" style={{ fontSize: 15 }}>{r.count}</span>
              </div>
            ))}
          </div>
          {hints.length > 0 && <p style={{ margin: 0, background: 'var(--well)', borderRadius: 14, padding: '12px 14px', fontSize: 14, lineHeight: 1.45 }}><strong>Closest next:</strong> {hints.join('. ')}.</p>}
          <Link href="/heir/how" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>How to earn each stone</Link>
        </section>

        {labs && <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }} aria-label="Understanding">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="hr-label">Understanding</span>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Separate from memory</span>
          </div>
          <div className="hr-ladder">
            {UNDERSTANDING.map((u, i) => (
              <div key={u.name} className="hr-ladder-row">
                <span className="hr-ladder-name">{u.name}</span>
                <span className="hr-ladder-bar"><span style={{ width: `${withNotes.length ? (grasp[i] / withNotes.length) * 100 : 0}%`, background: 'var(--good)', opacity: 0.55 + i * 0.2 }} /></span>
                <span className="hr-ladder-n">{grasp[i]}</span>
              </div>
            ))}
          </div>
        </section>}

        <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }} aria-label="Your windows">
          <span className="hr-label">Your windows</span>
          {yours.length === 0 && <p style={{ margin: 0, fontSize: 15, color: 'var(--muted)' }}>Finish your first lesson and its window starts to light here.</p>}
          <div className="hr-wall">
            {yours.map(({ c, s }) => (
              <button key={c.id} type="button" className="hr-wall-item" onClick={() => setOpen(c.id)} aria-label={`See the ${c.title} window up close`}>
                <MiniWindow base={s.window.base} lit={s.window.lit} dusty={s.window.dusty} size={128} started reveal label={`${c.title} window`} />
                <span className="serif" style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.2 }}>{c.title}</span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>{s.learned >= s.total ? 'Finished' : `${s.learned} of ${s.total} learned`}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }} aria-label="Awards">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="hr-label">Awards</span>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{earned} of {AWARDS.length}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {AWARDS.filter((a) => mine.awards[a.id]).map((a) => <span key={a.id} className="hr-seal big" title={a.name} role="img" aria-label={a.name}><Star /></span>)}
            {nextAward && <span className="hr-seal big next" role="img" aria-label={`Next: ${nextAward.name}`}><Star /></span>}
          </div>
          {nextAward && <span style={{ fontSize: 14 }}><b>Next: {nextAward.name}</b> <span style={{ color: 'var(--muted)' }}>· {nextAward.hint}</span></span>}
          <details className="hr-awards-all">
            <summary>See all awards</summary>
            <ul>
              {AWARDS.map((a) => {
                const when = mine.awards[a.id];
                return (
                  <li key={a.id} data-earned={!!when}>
                    <span style={{ fontWeight: 600 }}>{a.name}</span>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>{when ? new Date(when).toLocaleDateString(undefined, { day: 'numeric', month: 'long' }) : a.hint}</span>
                  </li>
                );
              })}
            </ul>
          </details>
        </section>
      </main>
      {viewing ? <WindowView title={viewing.c.title} part={viewing.s.window.count > 1 ? `Part ${viewing.s.window.index + 1} · ${viewing.s.window.title}` : null}
        learned={viewing.s.learned >= viewing.s.total ? 'Finished' : `${viewing.s.learned} of ${viewing.s.total} learned`}
        window={viewing.s.window} href={`/heir/courses/${viewing.c.id}`} onClose={() => setOpen(null)} /> : <Tabs />}
    </>
  );
}

// A small ring with a number inside, for the row at the top.
function RingChip({ frac, value, label, color }: { frac: number; value: string; label: string; color: string }) {
  const r = 26, C = 2 * Math.PI * r, f = Math.max(0, Math.min(1, frac));
  return (
    <div className="hr-pg-chip" role="listitem">
      <span className="hr-pg-chip-ring">
        <svg viewBox="0 0 58 58" aria-hidden="true"><circle cx="29" cy="29" r={r} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="3" /><circle cx="29" cy="29" r={r} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${C * f} ${C}`} transform="rotate(-90 29 29)" /></svg>
        <b>{value}</b>
      </span>
      {label}
    </div>
  );
}

// The arc over the number: how far from the last milestone to the next, with a few quiet dots along it.
function Gauge({ frac, left, right }: { frac: number; left?: string; right?: string }) {
  const w = 320, cx = w / 2, cy = 184, r = 170, a0 = -50, a1 = 50, f = Math.max(0, Math.min(1, frac));
  const pt = (rad: number, deg: number) => [cx + rad * Math.sin((deg * Math.PI) / 180), cy - rad * Math.cos((deg * Math.PI) / 180)] as const;
  const path = (from: number, to: number) => { const [x0, y0] = pt(r, from), [x1, y1] = pt(r, to); return `M${x0.toFixed(2)},${y0.toFixed(2)}A${r},${r} 0 0 1 ${x1.toFixed(2)},${y1.toFixed(2)}`; };
  const a = a0 + (a1 - a0) * f;
  const [lx, ly] = pt(r, a0), [rx, ry] = pt(r, a1);
  return (
    <svg viewBox="0 0 320 100" className="hr-pg-gauge" aria-hidden="true">
      <path d={path(a0, a1)} fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="1.4" />
      {f > 0 && <path d={path(a0, a)} fill="none" stroke="#F8EBD8" strokeWidth="5" strokeLinecap="round" />}
      {[0.25, 0.5, 0.75].map((d) => { const [x, y] = pt(r + 14, a0 + (a1 - a0) * d); return <circle key={d} cx={x} cy={y} r="2.2" fill="rgba(255,255,255,.7)" />; })}
      {left && <text x={lx - 6} y={ly + 16} textAnchor="middle">{left}</text>}
      {right && <text x={rx + 6} y={ry + 16} textAnchor="middle">{right}</text>}
    </svg>
  );
}

// How the words have grown, week by week: a stepped climb ending at today's number, with the milestones as faint lines.
function StepChart({ pts }: { pts: WordsPoint[] }) {
  const w = 320, h = 170, L = 6, R = 46, T = 16, B = 30;
  const last = pts[pts.length - 1].words;
  const cand = MILESTONES.filter((m) => m <= last * 1.15 && m >= last / 8);
  const top = Math.max(last, cand[cand.length - 1] ?? 0, 10) * 1.1;
  const x = (i: number) => L + ((w - L - R) * i) / (pts.length - 1), y = (v: number) => T + (h - T - B) * (1 - v / top);
  // Milestone lines from the top down, skipping any that would crowd the one above.
  const lines: number[] = [];
  for (const m of [...cand].reverse()) if (lines.length < 3 && (!lines.length || y(m) - y(lines[lines.length - 1]) >= 22)) lines.push(m);
  const d = `M${x(0).toFixed(1)},${y(pts[0].words).toFixed(1)}` + pts.map((q, i) => (i ? `H${x(i).toFixed(1)}V${y(q.words).toFixed(1)}` : '')).join('');
  const fill = `${d}H${x(pts.length - 1).toFixed(1)}V${y(0).toFixed(1)}H${x(0).toFixed(1)}Z`;
  const lx = x(pts.length - 1), ly = y(last);
  const first = new Date((pts.find((q) => q.words > 0) ?? pts[0]).at).toLocaleDateString('en-US', { month: 'short' });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="hr-pg-step" role="img" aria-label={`Words in your memory over time, now ${last.toLocaleString('en-US')}`}>
      <defs><linearGradient id="hr-pg-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F3D8B6" stopOpacity=".6" /><stop offset="1" stopColor="#F3D8B6" stopOpacity=".04" /></linearGradient></defs>
      {lines.map((m) => <g key={m}><line x1={L} x2={w - R} y1={y(m)} y2={y(m)} stroke="rgba(255,255,255,.14)" strokeDasharray="3 4" /><text x={w - R + 6} y={y(m) + 4}>{m.toLocaleString('en-US')}</text></g>)}
      <path d={fill} fill="url(#hr-pg-fill)" />
      <path d={d} fill="none" stroke="#F3D8B6" strokeWidth="2" />
      <circle cx={lx} cy={ly} r="4.5" fill="#F3D8B6" stroke="var(--card, #1a2027)" strokeWidth="2" />
      <text className="n" x={lx - 8} y={ly - 10} textAnchor="end">{last.toLocaleString('en-US')}</text>
      <rect x={L} y={h - 22} width="38" height="20" rx="10" fill="rgba(255,255,255,.1)" /><text className="n" x={L + 19} y={h - 8} textAnchor="middle">{first}</text>
      <rect x={w - R - 44} y={h - 22} width="44" height="20" rx="10" fill="rgba(255,255,255,.1)" /><text className="n" x={w - R - 22} y={h - 8} textAnchor="middle">Now</text>
    </svg>
  );
}

const Star = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.4 6.8 19.2l1-5.9L3.5 9.2l5.9-.8z" /></svg>;

// A course's window up close: full screen, with a way back and a quiet way into the course.
function WindowView({ title, part, learned, window: w, href, onClose }: { title: string; part: string | null; learned: string; window: PartWindow; href: string; onClose(): void }) {
  const [size, setSize] = useState(320);
  useEffect(() => {
    const fit = () => setSize(Math.floor(Math.min(window.innerWidth - 32, window.innerHeight - 260, 720)));
    fit();
    window.addEventListener('resize', fit);
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('resize', fit); window.removeEventListener('keydown', esc); };
  }, [onClose]);
  return (
    <div className="hr-window-view" role="dialog" aria-modal="true" aria-label={`${title} window`}>
      <div className="hr-window-view-wash" style={{ backgroundImage: `url(${w.base}/glass.webp)` }} aria-hidden="true" />
      <div className="hr-window-view-top">
        <button type="button" className="hr-back" onClick={onClose} aria-label="Back" autoFocus>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
      </div>
      <div className="hr-window-view-body">
        <RoundWindow base={w.base} lit={w.lit} dusty={w.dusty} share={w.share} size={size} label={`${title} window: ${learned}`} />
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center' }}>
          <span className="serif" style={{ fontSize: 26, fontWeight: 500, lineHeight: 1.15 }}>{title}</span>
          <span style={{ fontSize: 14, color: '#C9C1B3' }}>{part ? `${part} · ` : ''}{learned}</span>
        </span>
        <Link href={href} className="hr-window-view-go">Go to course</Link>
      </div>
    </div>
  );
}
