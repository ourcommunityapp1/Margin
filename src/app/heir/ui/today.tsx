'use client';

// The new Today (owner accounts first): the day's recommended lessons and reviews as a carousel of course windows,
// one course each; when they're all done, a slim banner and a "Done for today" card; below, Keep going: every course
// you've started, to choose for yourself. The plan is made once a day (src/heir/dayplan.ts). See ADR-002.

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useHeir } from './provider';
import { useCourse } from './course';
import { useKeep } from './keep';
import { RoundWindow } from './glass/round';
import { MiniWindow } from './glass/mini';
import { partOf, partWindow, type PartWindow } from './glass/light';
import { courseFor, courseItems, itemLabel, type Course } from '@/heir/content';
import { cardStates, minutesToday, nextLine, planDay, startedCourses, withFix, withPlan, type CardState, type DayCard } from '@/heir/dayplan';
import { dueCards, localDay, memberProgress, waitingForSleep, type MemberProgress } from '@/heir/progress';
import { recalledRecently } from '@/heir/memory';
import { nightOffer, riseOffer, riskOrder } from '@/heir/planner';
import type { Track } from '@/heir/types';

const arrow = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
const check = <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>;
const ids = (c: Course) => new Set(courseItems(c).map((i) => i.id));
const weekday = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long' });

// The window a card shows: for a review, the part holding most of what's due; otherwise the part you're working in.
function windowFor(course: Course, kind: DayCard['kind'] | 'live', track: Track, p: MemberProgress, now: Date): PartWindow {
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
  | { type: 'live'; key: 'rise' | 'night'; course: Course; href: string; tag: string; title: string; button: string }
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
  // "When you rise" leads in the morning; "When you lie down" follows the day's cards in the evening. Neither is needed for the day.
  const focusIds = focusCourse ? ids(focusCourse) : new Set<string>();
  const rise = focusCourse ? riseOffer(mine, now) : null;
  const night = focusCourse && !rise ? nightOffer(mine, focusIds, now) : null;
  if (rise && focusCourse) slides.push({ type: 'live', key: 'rise', course: focusCourse, href: '/heir/lesson?mode=rise', tag: 'This morning', title: 'When you rise', button: 'Recall last night’s' });
  for (const s of left) { const sl = cardSlide(s); if (sl) slides.push(sl); }
  if (night && focusCourse) slides.push({ type: 'live', key: 'night', course: focusCourse, href: '/heir/lesson?mode=night', tag: 'Before sleep', title: 'When you lie down', button: 'Start' });
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

  // Warnings: words about to leave your count, or already gone. One line, at most.
  const soon = keep?.review.filter((h) => h.state.state === 'review' && (h.state as { deadline: Date }).deadline.getTime() - now.getTime() < 4 * 86_400_000) ?? [];
  const warning = keep && keep.wordsOut > 0 ? `${keep.wordsOut.toLocaleString('en-US')} words have left your count. Review to bring them back.`
    : soon.length === 1 ? `Review ${itemLabel(soon[0].item)} by ${weekday((soon[0].state as { deadline: Date }).deadline)} to keep it in your count.`
    : soon.length > 1 ? `${soon.length} need a review by ${weekday((soon[0].state as { deadline: Date }).deadline)} to stay in your count.` : null;

  if (!me) return null;
  return (
    <>
      {allDone ? (
        <div className="hr-day-banner" role="status"><span className="hr-day-tick">{check}</span><span>Today’s lessons are done</span><span className="hr-day-mins">{minutes} min</span></div>
      ) : states.length ? (
        <div className="hr-day-line"><span><b>Today</b> · {states.length - left.length} of {states.length} done</span><span>about {left.reduce((n, s) => n + s.card.est, 0)} min left</span></div>
      ) : null}
      {warning && <Link href="/heir/keep" className="hr-day-warn">{warning}</Link>}
      <Carousel slides={slides} track={track} mine={mine} now={now} />
      {started.length > 1 && <KeepGoing started={started} track={track} mine={mine} now={now} />}
    </>
  );
}

function Carousel({ slides, track, mine, now }: { slides: Slide[]; track: Track; mine: MemberProgress; now: Date }) {
  const ref = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const first = slides[0] ? (slides[0].type === 'card' ? slides[0].state.card.id : slides[0].type) : '';
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
                <RoundWindow base={w.base} lit={w.lit} dusty={w.dusty} share={w.share} size={240} label={`${s.course.title} window`} />
                <span className="serif" style={{ fontSize: 32, lineHeight: 1 }}>{s.minutes} min</span>
                {s.extra && <Link href="/heir/lesson?mode=extra" className="hr-day-extra">Extra practice</Link>}
              </section>
            );
          }
          const kind = s.type === 'card' ? s.state.card.kind : 'live';
          const w = windowFor(s.course, kind, track, mine, now);
          const done = s.type === 'card' && s.state.done;
          return (
            <section key={s.type === 'card' ? s.state.card.id : s.key} role="listitem" className="hr-rose-card hr-slide" data-done={done || undefined} aria-label={s.type === 'live' ? s.title : s.course.title}>
              <div className="hr-rose-wash" style={{ backgroundImage: `url(${w.base}/glass.webp)` }} aria-hidden="true" />
              <span className="hr-day-tag" data-fix={s.tag === 'Fix today' || undefined}>{done ? 'Done' : s.tag}</span>
              <h2 className="serif" style={{ margin: 0, fontSize: 26, fontWeight: 500, lineHeight: 1.12, textAlign: 'center' }}>{s.type === 'live' ? s.title : s.course.title}</h2>
              <RoundWindow base={w.base} lit={w.lit} dusty={w.dusty} share={w.share} size={240} label={`${s.course.title} window`} />
              {done ? (
                <div className="hr-day-done"><span className="hr-day-tick">{check}</span>{Math.max(1, Math.round(s.state.secs / 60))} min</div>
              ) : (
                <Link className="hr-glass-btn" href={s.href}><span>{s.button}</span><span className="hr-glass-btn-go" aria-hidden="true">{arrow}</span></Link>
              )}
            </section>
          );
        })}
      </div>
      {slides.length > 1 && (
        <div className="hr-dots" role="group" aria-label="Cards">
          {slides.map((s, i) => <button key={i} type="button" aria-label={`Card ${i + 1} of ${slides.length}`} aria-current={i === at || undefined} data-done={(s.type === 'card' && s.state.done) || undefined} onClick={() => go(i)} />)}
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
