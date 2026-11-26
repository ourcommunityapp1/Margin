'use client';

// The new Today (owner accounts first): the day's recommended lessons and reviews as a carousel of course windows,
// one course each; when they're all done, a slim banner and a "Done for today" card; below, Keep going: every course
// you've started, to choose for yourself. The plan is made once a day (src/heir/dayplan.ts). See ADR-002.
// The evening and morning recalls are optional, so they are not cards: a night-blue (or dawn) banner above the carousel,
// which can be put away for the evening (or morning).

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useHeir } from './provider';
import { useCourse } from './course';
import { useKeep } from './keep';
import { RoundWindow } from './glass/round';
import type { WindowHandle } from './glass/window';
import { MiniWindow } from './glass/mini';
import { partOf, partWindow, type PartWindow } from './glass/light';
import { courseFor, courseItems, itemLabel, type Course } from '@/heir/content';
import { cardStates, extraSessions, minutesToday, nextLine, planDay, startedCourses, withFix, withPlan, type CardState, type DayCard, type DaySession } from '@/heir/dayplan';
import { dueCards, localDay, memberProgress, waitingForSleep, type MemberProgress } from '@/heir/progress';
import { recalledRecently } from '@/heir/memory';
import { nightOffer, riseOffer, riskOrder } from '@/heir/planner';
import type { Track } from '@/heir/types';

const arrow = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
const check = <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>;
const ids = (c: Course) => new Set(courseItems(c).map((i) => i.id));
const weekday = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long' });

// The window a card shows: for a review, the part holding most of what's due; otherwise the part you're working in.
function windowFor(course: Course, kind: DayCard['kind'] | 'extra', track: Track, p: MemberProgress, now: Date): PartWindow {
  if (kind === 'review' || kind === 'fix') {
    const counts = new Map<number, number>();
    for (const d of dueCards(p, now, ids(course))) { const at = partOf(course, d.itemId); counts.set(at, (counts.get(at) ?? 0) + 1); }
    const best = [...counts].sort((a, b) => b[1] - a[1])[0];
    if (best) return partWindow(course, track, p, now, best[0]);
  }
  return partWindow(course, track, p, now);
}

type Slide =
  | { type: 'card'; state: CardState; course: Course; href: string; tag: string; button: string }
  | { type: 'extra'; session: DaySession; course: Course; tag: string }
  | { type: 'done'; minutes: number; course: Course; extra: boolean };

export function TodayCards() {
  const { household, now, updateProgress } = useHeir();
  const { me, track, mine } = useCourse();
  const keep = useKeep();
  const focus = household.plan?.course ?? null;
  const goal = household.plan?.minutes ?? 15;
  const day = localDay(now);
  const started = useMemo(() => startedCourses(mine, track, focus), [mine, track, focus]);
  const fixIds = useMemo(() => keep?.tryAgain.map((h) => h.item.id) ?? [], [keep]);

  // Make the day's plan once, the first time Today opens on a new day; add a fix found later in the day at the end.
  const today = mine.today;
  useEffect(() => {
    if (!me) return;
    const planned = today?.day === day && today.cards;
    const cards = planned ? null : planDay({ p: mine, track, started, focus, goal, now, fix: fixIds });
    const lateFixes = planned ? planDay({ p: mine, track, started, focus: null, goal: 0, now, fix: fixIds }).filter((c) => c.kind === 'fix' && !today.cards!.some((x) => x.course === c.course && x.kind !== 'lesson')) : [];
    if (planned && !lateFixes.length) return;
    Promise.resolve().then(() => updateProgress((all) => {
      const p = memberProgress(all, me.id);
      if (p.today?.day === day && p.today.cards && !lateFixes.length) return all;
      const next = cards ? withPlan(p.today, day, cards) : lateFixes.reduce((t, c) => withFix(t, c), p.today!);
      return { ...all, [me.id]: { ...p, today: next } };
    }));
  }, [me, today, day, mine, track, started, focus, goal, now, fixIds, updateProgress]);

  const satisfied = (c: DayCard) => {
    const course = courseFor(c.course);
    if (!course) return true;
    if (c.kind === 'fix') return !keep?.tryAgain.some((h) => ids(course).has(h.item.id));
    if (c.kind === 'review') return dueCards(mine, now, ids(course)).length === 0 && (today?.sessions ?? []).some((s) => s.course === c.course);
    return false;
  };
  const states = today?.day === day ? cardStates(today, satisfied) : [];
  const left = states.filter((s) => !s.done);
  const allDone = states.length > 0 && !left.length;
  const minutes = minutesToday(today?.day === day ? today : undefined);

  const focusCourse = courseFor(focus) ?? started[0];
  const slides: Slide[] = [];
  const cardSlide = (s: CardState): Slide | null => {
    const course = courseFor(s.card.course);
    if (!course) return null;
    const fixItems = s.card.kind === 'fix' ? (keep?.tryAgain ?? []).filter((h) => ids(course).has(h.item.id)).map((h) => h.item.id) : [];
    const href = s.card.kind === 'fix' && fixItems.length ? `/heir/lesson?mode=keep&items=${fixItems.join(',')}&course=${course.id}&card=${encodeURIComponent(s.card.id)}`
      : `/heir/lesson?mode=${s.card.kind === 'lesson' ? 'lesson' : 'review'}&course=${course.id}&card=${encodeURIComponent(s.card.id)}`;
    const lessonNo = (mine.courseLessons[course.id] ?? 0) + 1;
    const lockIn = s.card.kind === 'lesson' && nextLine(mine, track, course, now).text === 'Lock-in next';
    return { type: 'card', state: s, course, href, tag: s.card.kind === 'fix' ? 'Fix today' : 'Recommended', button: s.card.kind !== 'lesson' ? 'Start review' : lockIn ? 'Lock it in' : lessonNo === 1 ? 'Begin' : `Start lesson ${lessonNo}` };
  };
  // "When you rise" in the morning and "When you lie down" in the evening: optional, never part of the day's cards.
  const focusIds = focusCourse ? ids(focusCourse) : new Set<string>();
  const rise = focusCourse ? riseOffer(mine, now) : null;
  const night = focusCourse && !rise ? nightOffer(mine, focusIds, now) : null;
  const live: Live | null = rise ? { key: 'rise', when: localDay(now), href: '/heir/lesson?mode=rise', title: 'When you rise', line: `Recall last night’s · ${recallMinutes(rise.length)} min` }
    : night ? { key: 'night', when: localDay(new Date(now.getTime() - 3 * 3_600_000)), href: '/heir/lesson?mode=night', title: 'When you lie down', line: `A quiet recall · ${recallMinutes(night.length)} min` } : null;
  for (const s of left) { const sl = cardSlide(s); if (sl) slides.push(sl); }
  if (allDone) {
    const allIds = new Set(started.flatMap((c) => [...ids(c)]));
    const recent = recalledRecently(mine.log, now);
    const extra = riskOrder(mine, allIds, now).some((x) => x.recall < 0.85 && !waitingForSleep(mine, x.itemId, now) && !recent.has(x.itemId));
    // The window shown is the course you spent longest on today, lit only as far as you've learned. Never a finished
    // window that hasn't been earned.
    const most = [...states].sort((a, b) => b.secs - a.secs)[0];
    const course = courseFor(most?.card.course) ?? focusCourse;
    if (course) slides.push({ type: 'done', minutes, course, extra });
  }
  for (const s of states.filter((x) => x.done)) { const sl = cardSlide(s); if (sl) slides.push(sl); }
  // Sessions that finished no card (a review started from Keep going, extra practice, the evening or morning recall) show as
  // their own done card, so the day's minutes add up to what the cards show.
  const extraTag = (k: DaySession['kind']) => (k === 'night' ? 'When you lie down' : k === 'rise' ? 'This morning' : k === 'lesson' ? 'Lesson' : k === 'fix' ? 'Fix' : k === 'review' ? 'Review' : 'Extra');
  for (const x of today?.day === day ? extraSessions(today) : []) { const course = courseFor(x.course); if (course) slides.push({ type: 'extra', session: x, course, tag: extraTag(x.kind) }); }

  // Warnings: words about to leave your count, or already gone. One line, at most.
  const soon = keep?.review.filter((h) => h.state.state === 'review' && (h.state as { deadline: Date }).deadline.getTime() - now.getTime() < 4 * 86_400_000) ?? [];
  const warning = keep && keep.wordsOut > 0 ? `${keep.wordsOut.toLocaleString('en-US')} words have left your count. Review to bring them back.`
    : soon.length === 1 ? `Review ${itemLabel(soon[0].item)} by ${weekday((soon[0].state as { deadline: Date }).deadline)} to keep it in your count.`
    : soon.length > 1 ? `${soon.length} need a review by ${weekday((soon[0].state as { deadline: Date }).deadline)} to stay in your count.` : null;

  if (!me) return null;
  return (
    <>
      {allDone ? (
        live ? <LiveBanner live={live} done={minutes} /> : <div className="hr-day-banner" role="status"><span className="hr-day-tick">{check}</span><span>Today’s lessons are done</span><span className="hr-day-mins">{minutes} min</span></div>
      ) : states.length ? (
        <div className="hr-day-line"><span><b>Today</b> · {states.length - left.length} of {states.length} done</span><span>about {left.reduce((n, s) => n + s.card.est, 0)} min left</span></div>
      ) : null}
      {live && !allDone && <LiveBanner live={live} done={null} />}
      {warning && <Link href="/heir/keep" className="hr-day-warn">{warning}</Link>}
      <Carousel slides={slides} track={track} mine={mine} now={now} />
      {started.length > 1 && <KeepGoing started={started} track={track} mine={mine} now={now} />}
    </>
  );
}

interface Live { key: 'rise' | 'night'; when: string; href: string; title: string; line: string }

// About half a minute a question, at least one minute.
const recallMinutes = (n: number) => Math.max(1, Math.round(n * 0.5));

const moon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>;
const sun = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="13" r="4" /><path d="M12 3v3M4.9 6.9l2.1 2.1M19.1 6.9 17 9M2 17h20M5 21h14" /></svg>;
const cross = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>;

// The optional evening or morning recall, as a banner. Put away, it stays away for that evening (or morning) on this phone.
// When the day's cards are done it also carries that news, so there is one banner, not two.
function LiveBanner({ live, done }: { live: Live; done: number | null }) {
  const key = `hr-live-away:${live.key}:${live.when}`;
  const [away, setAway] = useState(false);
  useEffect(() => {
    let v = false;
    try { v = localStorage.getItem(key) === '1'; } catch { /* storage blocked: show it */ }
    Promise.resolve().then(() => setAway(v));
  }, [key]);
  const putAway = () => { setAway(true); try { localStorage.setItem(key, '1'); } catch { /* ignore */ } };
  if (away) return done !== null ? <div className="hr-day-banner" role="status"><span className="hr-day-tick">{check}</span><span>Today’s lessons are done</span><span className="hr-day-mins">{done} min</span></div> : null;
  return (
    <div className="hr-live" data-key={live.key} role="region" aria-label={live.title}>
      {done !== null && <div className="hr-live-done"><span className="hr-day-tick">{check}</span><span>Today’s lessons are done</span><span className="hr-day-mins">{done} min</span></div>}
      <div className="hr-live-row">
        <span className="hr-live-icon">{live.key === 'night' ? moon : sun}</span>
        <Link href={live.href} className="hr-live-text"><b>{live.title}</b><span>{live.line}</span></Link>
        <Link href={live.href} className="hr-live-go">Start</Link>
        <button type="button" className="hr-live-x" aria-label={`Not tonight`} onClick={putAway}>{cross}</button>
      </div>
    </div>
  );
}

// A card's window lights up the way it did on the old Today: it starts dark and lights pane by pane up to where you are,
// while the gold arc grows round with it. It happens when the card comes into view (so a card you swipe to lights then),
// and again each time Today opens. Before a course has begun, a dim light moves behind the dark glass. The window never
// shows more than you have earned: it only ever lights up to `light.lit`.
function CardWindow({ light, hint, started, label }: { light: PartWindow; hint?: number; started: boolean; label: string }) {
  const win = useRef<WindowHandle>(null);
  const box = useRef<HTMLDivElement>(null);
  // `light` is worked out afresh on every render, so what the effects use is kept in a ref and the window is keyed by what it shows.
  const latest = useRef(light);
  useEffect(() => { latest.current = light; });
  const count = light.lit.length, sig = light.lit.map((f) => f.toFixed(3)).join(',');
  const dark = useMemo(() => Array.from({ length: count }, () => 0), [count]);
  const [share, setShare] = useState(0);
  const [arcMs, setArcMs] = useState(900);
  const [settled, setSettled] = useState(false);
  const [ready, setReady] = useState(false);
  const [seen, setSeen] = useState(false);
  const ran = useRef(false);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === 'undefined') { Promise.resolve().then(() => setSeen(true)); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); } }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!ready || !seen || ran.current) return;
    ran.current = true;
    const light = latest.current;
    const pieces = win.current?.meta()?.count ?? 500;
    const lit = Math.round(light.share * pieces);
    // The engine spaces panes so the whole sweep takes about two and a half seconds at most.
    const sweep = lit ? Math.min(2400, lit * 130) + 600 : 0;
    const a = setTimeout(() => {
      win.current?.revealTo(light.lit);
      setArcMs(Math.max(600, sweep));
      setShare(light.share);
    }, 350);
    const b = setTimeout(() => setSettled(true), 350 + sweep);
    return () => { clearTimeout(a); clearTimeout(b); ran.current = false; };
  }, [ready, seen, sig]);
  return (
    <div ref={box} style={{ display: 'flex' }}>
      <RoundWindow ref={win} base={light.base} lit={dark} dusty={settled ? light.dusty : undefined} hint={settled ? hint : undefined}
        share={share} arcMs={arcMs} size={240} onReady={() => setReady(true)} beam={started ? undefined : { kind: 'circle' }} label={label} />
    </div>
  );
}

function Carousel({ slides, track, mine, now }: { slides: Slide[]; track: Track; mine: MemberProgress; now: Date }) {
  const ref = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const first = slides[0] ? (slides[0].type === 'card' ? slides[0].state.card.id : slides[0].type === 'extra' ? slides[0].session.id : slides[0].type) : '';
  // When the front card changes (one was finished), go back to the front.
  useEffect(() => { ref.current?.scrollTo({ left: 0 }); Promise.resolve().then(() => setAt(0)); }, [first]);
  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0, bd = Infinity;
    Array.from(el.children).forEach((c, i) => { const h = c as HTMLElement; const d = Math.abs(h.offsetLeft + h.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i; } });
    setAt(best);
  };
  const go = (i: number) => { const el = ref.current, c = el?.children[i] as HTMLElement | undefined; if (el && c) el.scrollTo({ left: c.offsetLeft - el.offsetLeft, behavior: 'smooth' }); };
  if (!slides.length) return null;
  return (
    <>
      <div ref={ref} className="hr-carousel" onScroll={onScroll} role="list" aria-label="Today’s lessons">
        {slides.map((s) => {
          if (s.type === 'done') {
            const w = partWindow(s.course, track, mine, now);
            return (
              <section key="done" role="listitem" className="hr-rose-card hr-slide" aria-label="Done for today">
                <div className="hr-rose-wash" style={{ backgroundImage: `url(${w.base}/glass.webp)` }} aria-hidden="true" />
                <h2 className="serif" style={{ margin: 0, fontSize: 28, fontWeight: 500 }}>Done for today</h2>
                <CardWindow key={w.base} light={w} started={w.share > 0} label={`${s.course.title} window`} />
                <span className="serif" style={{ fontSize: 32, lineHeight: 1 }}>{s.minutes} min</span>
                {s.extra && <Link href="/heir/lesson?mode=extra" className="hr-day-extra">Extra practice</Link>}
              </section>
            );
          }
          const kind = s.type === 'card' ? s.state.card.kind : 'extra';
          const w = windowFor(s.course, kind, track, mine, now);
          const done = s.type === 'extra' || (s.type === 'card' && s.state.done);
          // A finished card says what it was in one word (Lesson, Fix, Review); an extra says Extra.
          const word = s.type === 'card' ? (s.state.done ? ({ lesson: 'Lesson', review: 'Review', fix: 'Fix' } as const)[s.state.card.kind] : s.tag) : s.tag;
          const secs = s.type === 'extra' ? s.session.secs : s.type === 'card' ? s.state.secs : 0;
          return (
            <section key={s.type === 'card' ? s.state.card.id : s.session.id} role="listitem" className="hr-rose-card hr-slide" data-done={done || undefined} aria-label={s.course.title}>
              <div className="hr-rose-wash" style={{ backgroundImage: `url(${w.base}/glass.webp)` }} aria-hidden="true" />
              <span className="hr-day-tag" data-fix={(s.type === 'card' && s.state.card.kind === 'fix' && !done) || undefined}>{word}</span>
              <h2 className="serif" style={{ margin: 0, fontSize: 26, fontWeight: 500, lineHeight: 1.12, textAlign: 'center' }}>{s.course.title}</h2>
              <CardWindow key={w.base} light={w} started={w.share > 0} hint={!done && s.type === 'card' && s.state.card.kind === 'lesson' && w.next >= 0 ? w.next : undefined} label={`${s.course.title} window`} />
              {done || s.type !== 'card' ? (
                <div className="hr-day-done"><span className="hr-day-tick">{check}</span>{Math.max(1, Math.round(secs / 60))} min</div>
              ) : (
                <Link className="hr-glass-btn" href={s.href}><span>{s.button}</span><span className="hr-glass-btn-go" aria-hidden="true">{arrow}</span></Link>
              )}
            </section>
          );
        })}
      </div>
      {slides.length > 1 && (
        <div className="hr-dots" role="group" aria-label="Cards">
          {slides.map((s, i) => <button key={i} type="button" aria-label={`Card ${i + 1} of ${slides.length}`} aria-current={i === at || undefined} data-done={(s.type === 'extra' || (s.type === 'card' && s.state.done)) || undefined} onClick={() => go(i)} />)}
        </div>
      )}
    </>
  );
}

function KeepGoing({ started, track, mine, now }: { started: Course[]; track: Track; mine: MemberProgress; now: Date }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section className="hr-keepgoing" aria-label="Keep going">
      <span className="hr-label" style={{ padding: '6px 6px 0' }}>Keep going</span>
      {started.map((c) => {
        const w = partWindow(c, track, mine, now);
        const line = nextLine(mine, track, c, now);
        if (open !== c.id) return (
          <button key={c.id} type="button" className="hr-keeprow" onClick={() => setOpen(c.id)} aria-expanded="false">
            <MiniWindow base={w.base} lit={w.lit} dusty={w.dusty} size={56} started label={`${c.title} window`} />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0, textAlign: 'left' }}>
              <b style={{ fontSize: 16 }}>{c.title}</b>
              <span style={{ fontSize: 14, color: '#C9C1B3' }}>{line.text}</span>
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: '#C9C1B3', flex: 'none' }}><path d="M9 6l6 6-6 6" /></svg>
          </button>
        );
        return (
          <section key={c.id} className="hr-rose-card" aria-label={c.title}>
            <div className="hr-rose-wash" style={{ backgroundImage: `url(${w.base}/glass.webp)` }} aria-hidden="true" />
            <button type="button" className="hr-keepclose" onClick={() => setOpen(null)} aria-label={`Close ${c.title}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
            <h2 className="serif" style={{ margin: '14px 0 0', fontSize: 26, fontWeight: 500, lineHeight: 1.12, textAlign: 'center' }}>{c.title}</h2>
            <RoundWindow base={w.base} lit={w.lit} dusty={w.dusty} share={w.share} size={220} label={`${c.title} window`} />
            {!line.allLearned && <Link className="hr-glass-btn" href={`/heir/lesson?mode=lesson&course=${c.id}`}><span>{line.text === 'Lock-in next' ? 'Lock it in' : 'Next lesson'}</span><span className="hr-glass-btn-go" aria-hidden="true">{arrow}</span></Link>}
            <Link className={line.allLearned ? 'hr-glass-btn' : 'hr-glass-btn hr-glass-btn-quiet'} href={`/heir/lesson?mode=review&course=${c.id}`}><span>Review</span>{line.allLearned && <span className="hr-glass-btn-go" aria-hidden="true">{arrow}</span>}</Link>
          </section>
        );
      })}
    </section>
  );
}
