'use client';

// Progress, as one scroll: a row of rings, the words in your memory (an arc over your window) and how they have grown,
// the five levels, and the window of every course you've begun (tap one to see it up close).
// Hidden for now (see ADR-004): how a word gets into memory, keeping rows, days kept, the month calendar, understanding, awards.

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useHeir } from '../ui/provider';
import { useKeep } from '../ui/keep';
import { Tabs } from '../ui/tabs';
import { Stone } from '../ui/stone';
import Link from 'next/link';
import { allItems, courseItems, courses, isVerse } from '@/heir/content';
import { unitsFor } from '@/heir/lesson';
import { DEFAULT_GOAL } from '@/heir/planner';
import { courseSummary } from '../ui/course-list';
import { MiniWindow } from '../ui/glass/mini';
import { RoundWindow } from '../ui/glass/round';
import type { PartWindow } from '../ui/glass/light';
import { activeMember } from '@/heir/household';
import { bestDaysKept, daysKept, recited } from '@/heir/levels';
import { TIERS, tierIndex } from '@/heir/tiers';
import { MILESTONES, milestones, wordsIn } from '@/heir/measures';
import { wordsHistory, type WordsPoint } from '@/heir/memory-history';
import { localDay, memberProgress } from '@/heir/progress';

export default function Progress() {
  const { ready, household, progress, now } = useHeir();
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
  // How many questions and verses sit at each of the five levels right now (their highest).
  const levelOf = (id: string) => mine.levels[id] ?? 0;
  const recitedCount = items.filter((i) => levelOf(i.id) > 0 || recited(i, me.track, mine.log)).length;
  const tierCounts = TIERS.map(() => 0);
  for (const i of items) { if (levelOf(i.id) > 0) tierCounts[tierIndex(levelOf(i.id))]++; else if (recited(i, me.track, mine.log)) tierCounts[0]++; }
  // Every course with anything learned, the one in progress first: its window lit as far as you've come.
  const minutes = household.plan?.minutes ?? DEFAULT_GOAL;
  const yours = courses
    .map((c) => ({ c, s: courseSummary(c, me.track, mine, minutes, now), stones: courseItems(c).filter((i) => (mine.levels[i.id] ?? 0) > 0).length }))
    .filter((x) => x.s.started)
    .sort((a, b) => Number(b.c.id === household.plan?.course) - Number(a.c.id === household.plan?.course));

  const fmt = (n: number) => n.toLocaleString('en-US');

  const viewing = yours.find((y) => y.c.id === open);
  const wash = yours[0]?.s.window.base ?? null;
  // The ring row: verses and catechism answers learned (of those in the courses you've begun), active minutes this week, the streak.
  const startedItems = yours.flatMap(({ c }) => courseItems(c));
  const learnedUnits = new Set(mine.units);
  const isLearned = (i: (typeof startedItems)[number]) => unitsFor(i, me.track).every((u) => learnedUnits.has(u.key));
  const verseItems = startedItems.filter((i) => isVerse(i)), answerItems = startedItems.filter((i) => !isVerse(i));
  const sinceWeek = now.getTime() - 7 * 86_400_000;
  const glance = {
    verses: { learned: verseItems.filter(isLearned).length, total: verseItems.length },
    answers: { learned: answerItems.filter(isLearned).length, total: answerItems.length },
    minutes: Math.round(mine.log.filter((e) => Date.parse(e.at) > sinceWeek).reduce((n, e) => n + Math.min(e.ms, 120_000), 0) / 60_000),
    goalMinutes: (household.plan?.minutes ?? DEFAULT_GOAL) * 6,
  };
  return (
    <>
      <main className="hr-page">
        <h1 className="serif" style={{ margin: '20px 4px 4px', fontSize: 34, fontWeight: 500 }}>Progress</h1>

        <div className="hr-pg-chips" role="list" aria-label="At a glance">
          <RingChip frac={glance.verses.total ? glance.verses.learned / glance.verses.total : 0} value={String(glance.verses.learned)} label="Verses" color="#F3D8B6" />
          <RingChip frac={glance.answers.total ? glance.answers.learned / glance.answers.total : 0} value={String(glance.answers.learned)} label="Catechism" color="#9fb8e8" />
          <RingChip frac={glance.goalMinutes ? Math.min(1, glance.minutes / glance.goalMinutes) : 0} value={String(glance.minutes)} label="Min this week" color="#b9e3b0" />
          <RingChip frac={best ? Math.min(1, kept / best) : 0} value={String(kept)} label="Day streak" color="#e5b66a" />
        </div>

        <section className="hr-pg-hero" aria-label="Words in your memory">
          {wash && <div className="hr-pg-wash" style={{ backgroundImage: `url(${wash}/glass.webp)` }} aria-hidden="true" />}
          <Gauge frac={miles.next ? (inMemory - prevMile) / (miles.next - prevMile) : 1} left={miles.next ? fmt(prevMile) : undefined} right={miles.next ? fmt(miles.next) : undefined} />
          <span className="serif hr-pg-num">{fmt(inMemory)}</span>
          <span className="hr-pg-kicker">Words in your memory</span>
          {keep && keep.review.length > 0 ? <Link href="/heir/keep" className="hr-hero-btn">Review {keep.review.length} soon</Link>
            : keep && keep.out.length > 0 ? <Link href="/heir/keep" className="hr-hero-btn">Bring {keep.out.length} back</Link> : null}
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

        <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }} aria-label="Levels">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="hr-label">Levels</span>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>All courses · {recitedCount} started</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {TIERS.map((t, k) => (
              <div key={t.id} className="hr-stone-row">
                <Stone level={t.n} size={36} started dim={tierCounts[k] === 0} />
                <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{t.name}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{t.stone}</span>
                </span>
                <span className="hr-ladder-bar"><span style={{ width: `${recitedCount ? (tierCounts[k] / recitedCount) * 100 : 0}%`, background: t.color }} /></span>
                <span className="hr-ladder-n" style={{ fontSize: 15 }}>{tierCounts[k]}</span>
              </div>
            ))}
          </div>
          <Link href="/heir/how" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>What the levels mean</Link>
        </section>

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
        <Link href={href} className="hr-hero-btn" data-quiet="true">Go to course</Link>
      </div>
    </div>
  );
}
