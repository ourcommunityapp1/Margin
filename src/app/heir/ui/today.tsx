'use client';

// Today: one big thing at a time. The hero follows the time of day ("When you rise" at dawn, the next lesson or review by day,
// "When you lie down" at night); the rest of the day's lessons and reviews are quiet rows, then "This evening", then "Done".
// Below, Keep going: every course you've started, to choose for yourself. The plan is made once a day (src/heir/dayplan.ts). See ADR-002.
// The evening and morning recalls are optional, so they are not cards: a night-blue (or dawn) banner above the carousel,
// which can be put away for the evening (or morning).

import { DEFAULT_GOAL } from '@/heir/planner';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useHeir } from './provider';
import { useCourse } from './course';
import { useKeep } from './keep';
import { RoundWindow } from './glass/round';
import type { WindowHandle } from './glass/window';
import { MiniWindow } from './glass/mini';
import { partOf, partWindow, type PartWindow } from './glass/light';
import { courseFor, courseItems, getCollection, getItem, isVerse, itemLabel, type Course } from '@/heir/content';
import { dailyCourse } from '@/heir/household';
import { cardStates, extraSessions, minutesToday, nextLine, planDay, startedCourses, withFix, withPlan, type CardState, type DayCard, type DaySession } from '@/heir/dayplan';
import { dueCards, localDay, memberProgress, waitingForSleep, type MemberProgress } from '@/heir/progress';
import { recalledRecently } from '@/heir/memory';
import { bedtimePicks, EVENING_FROM, MORNING_FROM, morningPicks, nightOffer, planNext, riskOrder } from '@/heir/planner';
import type { Item, Track } from '@/heir/types';
import { DAWN, DUSK, photoFor, type Photo } from '@/heir/photos';
import { PhotoCircle } from './photo-circle';
import { markPlayed, playedRecently } from './glass/played';

const check = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>;
const ids = (c: Course) => new Set(courseItems(c).map((i) => i.id));
const weekday = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long' });

// The window a card shows: for a review, the part holding most of what's due; otherwise the part you're working in.
function windowFor(course: Course, kind: DayCard['kind'] | 'extra', track: Track, p: MemberProgress, now: Date): PartWindow {
  if (kind === 'review' || kind === 'fix') {
    const counts = new Map<number, number>();
    for (const d of dueCards(p, now, ids(course))) { const at = partOf(course, d.itemId); counts.set(at, (counts.get(at) ?? 0) + 1); }
    // Most due first; a tie goes to the earlier part, so the window never flips between parts as the clock moves.
    const best = [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
    if (best) return partWindow(course, track, p, now, best[0]);
  }
  return partWindow(course, track, p, now);
}

type Slide =
  | { type: 'card'; state: CardState; course: Course; href: string; tag: string; button: string }
  | { type: 'extra'; session: DaySession; course: Course; tag: string };

export function TodayCards() {
  const { household, now, updateProgress } = useHeir();
  const { me, track, mine } = useCourse();
  const keep = useKeep();
  const focus = dailyCourse(household.plan);
  const goal = household.plan?.minutes ?? DEFAULT_GOAL;
  const day = localDay(now);
  const started = useMemo(() => startedCourses(mine, track, focus, household.plan?.removed), [mine, track, focus, household.plan?.removed]);
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
  // "When you rise" and "When you lie down" are on Today every day from 5 am (once something is learned): the morning
  // recall until it's done or the evening comes, and the evening one shown all day, startable from 7 pm.
  const focusIds = focusCourse ? ids(focusCourse) : new Set<string>();
  const hour = now.getHours();
  const doneToday = (k: 'rise' | 'night') => (today?.day === day ? today.sessions : []).some((x) => x.kind === k);
  const riseItems = focusCourse && hour >= MORNING_FROM && hour < EVENING_FROM && !doneToday('rise') ? morningPicks(mine, focusIds, now) : [];
  const rise = riseItems.length ? riseItems : null;
  const nightOpen = hour >= EVENING_FROM || hour < 3;
  const nightPreview = focusCourse && !nightOpen && hour >= MORNING_FROM && !doneToday('night') ? bedtimePicks(mine, focusIds, now) : [];
  const evening = (d: Date) => localDay(new Date(d.getTime() - 3 * 3_600_000));
  const nightDone = !!mine.night && evening(new Date(mine.night.at)) === evening(now);
  // With nothing new today and nothing on the edge, the evening recall still comes: the ones most worth recalling.
  const nightFallback = () => { const m = morningPicks(mine, focusIds, now); return m.length ? m : null; };
  const night = !focusCourse ? null : nightOpen ? (nightDone ? null : nightOffer(mine, focusIds, now) ?? nightFallback())
    : nightPreview.length ? nightPreview : hour >= MORNING_FROM && !doneToday('night') ? nightFallback() : null;
  for (const s of left) { const sl = cardSlide(s); if (sl) slides.push(sl); }
  let extraOffer = false;
  const doneCourse = courseFor([...states].sort((a, b) => b.secs - a.secs)[0]?.card.course) ?? focusCourse;
  if (allDone) {
    const allIds = new Set(started.flatMap((c) => [...ids(c)]));
    const recent = recalledRecently(mine.log, now);
    extraOffer = riskOrder(mine, allIds, now).some((x) => x.recall < 0.85 && !waitingForSleep(mine, x.itemId, now) && !recent.has(x.itemId));
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
  const todo = slides.filter((x): x is Extract<Slide, { type: 'card' }> => x.type === 'card' && !x.state.done);
  const finished = slides.filter((x) => (x.type === 'card' && x.state.done) || x.type === 'extra');
  // The hero follows the time of day: "When you rise" first while it is not done, then the next lesson or review by day,
  // "When you lie down" from 7 pm.
  // "When you rise" comes first whenever it isn't done yet (until the evening takes over at 7 pm): the screen is in time order.
  const riseFirst = !!rise;
  const heroKind: 'rise' | 'card' | 'night' | 'done' = riseFirst ? 'rise' : todo.length ? 'card' : rise ? 'rise' : night && nightOpen ? 'night' : 'done';
  const first = heroKind === 'card' ? todo[0] : null;
  const later = first ? todo.slice(1) : todo; // in the morning the rise hero comes first and every card is a row
  const photoDay = localDay(now);
  const dawn = photoFor(DAWN, photoDay), dusk = photoFor(DUSK, photoDay, 7);
  // Which questions or verses a card is about: "Q4, Q9", "Luke 2:11", always the references.
  const cardItems = (s: Extract<Slide, { type: 'card' }>): Item[] => {
    const course = ids(s.course);
    if (s.state.card.kind === 'lesson') return lessonItems(s.course, mine, track, now);
    if (s.state.card.kind === 'fix') return (keep?.tryAgain ?? []).filter((h) => course.has(h.item.id)).map((h) => h.item);
    return dueCards(mine, now, course).map((d) => getItem(d.itemId)).filter((i): i is Item => !!i);
  };
  const refs = (items: Item[]) => refList(items) || null;
  // How hard a card is, said before it starts (ADR-003): reviews are light; a lesson ends with one full answer; a fix is typed whole.
  const effort = (s: Extract<Slide, { type: 'card' }>): { full: boolean; label: string } =>
    s.state.card.kind === 'review' ? { full: false, label: 'Light' }
    : s.state.card.kind === 'fix' ? { full: true, label: '✎ Type it from memory' }
    : s.button === 'Lock it in' ? { full: true, label: '✎ Lock it in: each from memory' }
    : { full: true, label: 'Ends with one full answer' };
  const recallRefs = (list: string[]) => refList(list.map(getItem).filter((i): i is Item => !!i));
  const mins = (n: number) => `${Math.max(1, Math.round(n))} min`;
  const doneTick = <span className="hr-b4-tick" aria-label="Done">{check}</span>;
  // The rows after the hero, in order: what's next, then what follows, then the evening.
  const upcoming: { key: string; label: string; ev?: boolean; left: React.ReactNode; title: string; right: string }[] = [];
  later.forEach((s, i) => {
    const w = windowFor(s.course, s.state.card.kind, track, mine, now);
    const r = refs(cardItems(s));
    upcoming.push({ key: s.state.card.id, label: i === 0 ? 'Up next' : 'Then',
      left: <MiniWindow base={w.base} lit={w.lit} dusty={w.dusty} size={48} started={w.share > 0} reveal label={`${s.course.title} window`} />,
      title: r ? `${s.course.title} · ${r}` : s.course.title, right: `${effort(s).full ? '✎ ' : ''}${mins(s.state.card.est)}` });
  });
  if (rise && heroKind !== 'rise') upcoming.push({ key: 'rise', label: upcoming.length ? 'Then' : 'Up next', left: <PhotoThumb photo={dawn} />, title: `When you rise · ${recallRefs(rise)}`, right: mins(recallMinutes(rise.length)) });
  if (night && heroKind !== 'night') upcoming.push({ key: 'night', label: 'This evening', ev: true, left: <PhotoThumb photo={dusk} />, title: `When you lie down · ${recallRefs(night)}`, right: mins(recallMinutes(night.length)) });
  // Finished today, at the bottom: small and dim, with a tick where the minutes were.
  const doneRows = finished.map((x) => {
    const secs = x.type === 'extra' ? x.session.secs : x.state.secs;
    const at = x.type === 'extra' ? x.session : (today?.sessions ?? []).find((y) => y.card === x.state.card.id);
    const items = at ? sessionItems(mine, at, x.course) : [];
    const r = refList(items);
    if (x.type === 'extra' && (x.session.kind === 'night' || x.session.kind === 'rise')) {
      return { key: x.session.id, left: <PhotoThumb photo={x.session.kind === 'night' ? dusk : dawn} small />, title: `${x.session.kind === 'night' ? 'When you lie down' : 'When you rise'}${r ? ` · ${r}` : ''}`, secs };
    }
    const w = windowFor(x.course, x.type === 'card' ? x.state.card.kind : 'extra', track, mine, now);
    const word = x.type === 'card' ? (x.state.card.kind === 'fix' ? 'fix ' : x.state.card.kind === 'review' ? 'review ' : '') : x.session.kind === 'fix' ? 'fix ' : x.session.kind === 'lesson' ? '' : 'review ';
    return { key: x.type === 'card' ? x.state.card.id : x.session.id, left: <MiniWindow base={w.base} lit={w.lit} dusty={w.dusty} size={36} started={w.share > 0} reveal label={`${x.course.title} window`} />, title: `${x.course.title}${r ? ` · ${word}${r}` : ''}`, secs };
  });
  const mood = heroKind === 'rise' ? 'dawn' : heroKind === 'night' ? 'night' : 'day';
  return (
    <>
      <div className="hr-b4-sky" data-mood={mood} aria-hidden="true" />
      {warning && <Link href="/heir/keep" className="hr-day-warn">{warning}</Link>}
      <section className="hr-b4-hero" aria-label="Now">
        {heroKind === 'rise' && rise && (
          <>
            <PhotoCircle photo={dawn} mood="dawn" />
            <h2 className="serif hr-b4-title">When you rise</h2>
            <p className="hr-b4-sub">{heroRefs(rise.map(getItem).filter((i): i is Item => !!i), undefined, true)}</p>
            <span className="hr-b4-effort">Light</span>
            <Link className="hr-b4-go" href="/heir/lesson?mode=rise"><span>Start</span><span className="hr-b4-gomin"> · {mins(recallMinutes(rise.length))}</span></Link>
          </>
        )}
        {heroKind === 'night' && night && (
          <>
            <PhotoCircle photo={dusk} mood="night" />
            <h2 className="serif hr-b4-title">When you lie down</h2>
            <p className="hr-b4-sub">{heroRefs(night.map(getItem).filter((i): i is Item => !!i), undefined, true)}</p>
            <span className="hr-b4-effort">Light</span>
            <Link className="hr-b4-go" data-mood="night" href="/heir/lesson?mode=night"><span>Start</span><span className="hr-b4-gomin"> · {mins(recallMinutes(night.length))}</span></Link>
          </>
        )}
        {heroKind === 'card' && first && (() => {
          const w = windowFor(first.course, first.state.card.kind, track, mine, now);
          const what = heroRefs(cardItems(first), first.state.card.kind !== 'lesson' ? first.course.title : undefined);
          return (
            <>
              <CardWindow key={w.base} light={w} started={w.share > 0} size={190} hint={first.state.card.kind === 'lesson' && w.next >= 0 ? w.next : undefined} label={`${first.course.title} window`} />
              <h2 className="serif hr-b4-title">{first.course.title}</h2>
              {what && <p className="hr-b4-sub">{what}</p>}
              <span className="hr-b4-effort" data-full={effort(first).full || undefined}>{effort(first).label}</span>
              <Link className="hr-b4-go" href={first.href}><span>{first.button}</span><span className="hr-b4-gomin"> · {mins(first.state.card.est)}</span></Link>
            </>
          );
        })()}
        {heroKind === 'done' && (
          <>
            {doneCourse && (() => {
              // The course you spent longest on today, lit only as far as you've learned: never a finished window that hasn't been earned.
              const w = partWindow(doneCourse, track, mine, now);
              return <CardWindow key={w.base} light={w} started={w.share > 0} size={190} label={`${doneCourse.title} window`} />;
            })()}
            {/* The evening recall is still to come: not "done for today" yet. */}
            <h2 className="serif hr-b4-title">{states.length ? (night ? 'Done for now' : 'Done for today') : 'Today'}</h2>
            {states.length > 0 && <p className="hr-b4-sub">{minutesWord(minutes)}{night ? ' · one light recall tonight' : ''}</p>}
            {extraOffer && <Link href="/heir/lesson?mode=extra" className="hr-b4-go">Extra practice</Link>}
          </>
        )}
      </section>
      {(upcoming.length > 0 || doneRows.length > 0) && (
        <div className="hr-b4-list">
          {upcoming.map((u) => (
            <div key={u.key} className="hr-b4-row">
              {u.left}
              <span className="hr-b4-t"><span className="hr-b4-lb" data-ev={u.ev || undefined}>{u.label}</span><b>{u.title}</b></span>
              <span className="hr-b4-min">{u.right}</span>
            </div>
          ))}
          {doneRows.length > 0 && <div className="hr-b4-divider" data-done="true">Done</div>}
          {doneRows.map((d) => (
            <div key={d.key} className="hr-b4-row" data-done="true">
              {d.left}
              <span className="hr-b4-t"><b>{d.title}</b></span>
              {doneTick}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function PhotoThumb({ photo, small }: { photo: Photo; small?: boolean }) {
  return <span className="hr-b4-thumb" data-small={small || undefined} style={{ backgroundImage: `url(${photo.file})` }} aria-hidden="true" />;
}

// What the big card is about, in words: "Questions 1–4", "Questions 1, 2 and 4", "Luke 2:11". Several verses on a review
// shorten to "Christmas review".
function heroRefs(items: Item[], reviewOf?: string, named = false): string {
  const seen = new Set<string>();
  const list = items.filter((i) => !seen.has(i.id) && seen.add(i.id));
  if (!list.length) return '';
  const verses = list.filter(isVerse);
  const numbered = list.filter((i) => !isVerse(i));
  const out: string[] = [];
  if (verses.length) out.push(verses.length > 1 && reviewOf ? `${reviewOf} review` : verses.slice(0, 3).map((v) => v.prompt).join(', ') + (verses.length > 3 ? ` +${verses.length - 3}` : ''));
  if (numbered.length) {
    const unit = getCollection(numbered[0].collection)?.unit === 'Question' ? 'Question' : 'Part';
    const nums = [...new Set(numbered.map((i) => i.number))].sort((a, b) => a - b);
    const parts: string[] = [];
    for (let i = 0; i < nums.length;) {
      let j = i;
      while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
      if (j - i >= 2) parts.push(`${nums[i]}–${nums[j]}`); else for (let k = i; k <= j; k++) parts.push(String(nums[k]));
      i = j + 1;
    }
    const list2 = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
    const word = `${unit}${nums.length > 1 ? 's' : ''}`;
    // With no course title above (the morning and evening recalls), say whose questions they are.
    out.push(named ? `${getCollection(numbered[0].collection)?.title ?? ''} ${word.toLowerCase()} ${list2}`.trim() : `${word} ${list2}`);
  }
  return out.join(' · ');
}

const minutesWord = (n: number) => `${n} minute${n === 1 ? '' : 's'}`;

// The references, short: "Q4, Q9", "Luke 2:11", "Q1, Q2, Q3 +2". In course order.
function refList(items: Item[]): string {
  const seen = new Set<string>();
  const list = items.filter((i) => !seen.has(i.id) && seen.add(i.id)).sort((a, b) => (a.collection === b.collection ? a.number - b.number : 0));
  const shown = list.slice(0, 3).map(shortLabel).join(', ');
  return list.length > 3 ? `${shown} +${list.length - 3}` : shown;
}

// What the next lesson will teach (or lock in, or practise), as items.
function lessonItems(course: Course, p: MemberProgress, track: Track, now: Date): Item[] {
  const plan = planNext({ courseId: course.id, items: courseItems(course), track, p, now });
  if (!plan) return [];
  if (plan.kind === 'learn' || plan.kind === 'welcome') return plan.units.map((u) => getItem(u.itemId)).filter((i): i is Item => !!i);
  if (plan.kind === 'checkpoint') return plan.group.items;
  return plan.picks.map((x) => getItem(x.itemId)).filter((i): i is Item => !!i);
}

// The questions or verses answered in a finished session: the answers logged in its time, from its course.
function sessionItems(p: MemberProgress, s: DaySession, course: Course): Item[] {
  const end = new Date(s.at).getTime(), start = end - s.secs * 1000 - 120_000;
  const mine = ids(course);
  const out: Item[] = [];
  for (const e of p.log) {
    const t = new Date(e.at).getTime();
    if (t < start || t > end + 10_000) continue;
    if (s.kind !== 'night' && s.kind !== 'rise' && !mine.has(e.itemId)) continue;
    const i = getItem(e.itemId);
    if (i) out.push(i);
  }
  return out;
}

const shortLabel = (i: Item) => (isVerse(i) ? i.prompt : getCollection(i.collection)?.unit === 'Question' ? `Q${i.number}` : `Part ${i.number}`);

// About half a minute a question, at least one minute.
const recallMinutes = (n: number) => Math.max(1, Math.round(n * 0.5));

// A card's window lights up the way it did on the old Today: it starts dark and lights pane by pane up to where you are,
// while the gold arc grows round with it. It happens when the card comes into view (so a card you swipe to lights then),
// and again each time Today opens. Before a course has begun, a dim light moves behind the dark glass. The window never
// shows more than you have earned: it only ever lights up to `light.lit`.
function CardWindow({ light, hint, started, label, size = 240 }: { light: PartWindow; hint?: number; started: boolean; label: string; size?: number }) {
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
  // Played once per window: later changes (the clock nudges the numbers) add any newly lit panes quietly, never starting over.
  const playedKey = `${light.base}|${size}`;
  const played = useRef(playedRecently(playedKey));
  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === 'undefined') { Promise.resolve().then(() => setSeen(true)); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); } }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!ready || !seen) return;
    const light = latest.current;
    if (played.current) {
      win.current?.revealTo(light.lit);
      Promise.resolve().then(() => { setShare(light.share); setSettled(true); });
      return;
    }
    const pieces = win.current?.meta()?.count ?? 500;
    const lit = Math.round(light.share * pieces);
    // The engine spaces panes so the whole sweep takes about two and a half seconds at most.
    const sweep = lit ? Math.min(2400, lit * 130) + 600 : 0;
    const a = setTimeout(() => {
      win.current?.revealTo(light.lit);
      setArcMs(Math.max(600, sweep));
      setShare(light.share);
    }, 350);
    const b = setTimeout(() => { played.current = true; markPlayed(playedKey); setSettled(true); }, 350 + sweep);
    return () => { clearTimeout(a); clearTimeout(b); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, seen, sig]);
  return (
    <div ref={box} style={{ display: 'flex' }}>
      <RoundWindow ref={win} base={light.base} lit={dark} dusty={settled ? light.dusty : undefined} hint={settled ? hint : undefined}
        share={share} arcMs={arcMs} size={size} onReady={() => setReady(true)} beam={started ? undefined : { kind: 'circle' }} label={label} />
    </div>
  );
}
