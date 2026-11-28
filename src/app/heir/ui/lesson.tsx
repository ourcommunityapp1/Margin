'use client';

// Runs one lesson, lock-in checkpoint or review: a progress bar, one step at a time, feedback after each.
// A step missed on the first try comes back once at the end, as in most language apps.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { BAND_WORDS, bandFor } from '@/heir/feedback';
import { useHeir } from './provider';
import type { Item, Track } from '@/heir/types';
import { groupLabel, useCourse } from './course';
import { Blanks, Cue, Intro, Letters, Match, Meaning, Next, Order, Say, Spot, Type, type Outcome, type Report, Dock, Context } from './steps';
import { buildCheckpoint, buildKeep, buildPractice, buildLesson, buildLite, buildNight, buildReview, buildRise, buildWelcome, groupsOf, unitsFor, withoutSpeaking, type Group, type Mate, type Step, type Unit } from '@/heir/lesson';
import { wordCount } from '@/heir/measures';
import { KEEP_LAUNCH, heldItems, summarize } from '@/heir/keep';
import { finishSession, localDay, markNight, markRisen, memberProgress, seenCounts, waitingForSleep, type StepResult } from '@/heir/progress';
import { bedtimePicks, lessonsDone, morningPicks, planNext, riskOrder } from '@/heir/planner';
import { INTROS } from '@/heir/content/intros';
import { daysKept, RECALLED, settle } from '@/heir/levels';
import { addVerse, dailyCourse } from '@/heir/household';
import { tierIndex, tierOf } from '@/heir/tiers';
import { testedPositions } from '@/heir/observe';
import { Stone } from './stone';
import { allItems, courseItems, courseParts, getItem, itemLabel, isVerse } from '@/heir/content';
import { startedCourses, withSession, withStarted } from '@/heir/dayplan';
import { itemChance, partMemories, predictedChance, recallChance, stepSeconds, weakPartsNow, whyNow, recalledRecently } from '@/heir/memory';
import { type WindowHandle } from './glass/window';
import { RoundWindow } from './glass/round';
import { partOf, partWindow, windowBase, windowLight } from './glass/light';

type Kind = 'learn' | 'checkpoint' | 'review';
interface Session { course?: string; card?: string; why?: Record<string, string>; kind: Kind; steps: Step[]; units: Unit[]; group: Group | null; memberId: string; label: string; courseId: string; before: { lit: number[]; dusty: boolean[] }; rise?: boolean; night?: boolean }

interface Finished { right: number; total: number; minutes: number; ups: { itemId: string; from: number; to: number }[]; awards: string[]; kept: number }

// The text before a part's lead-in: the verse or answer up to where the part being practiced starts.
function contextBefore(item: Item, track: Track, lead: string): string {
  if (!lead) return '';
  const c = item.chunks[track];
  const at = c.indexOf(lead);
  return at > 0 ? c.slice(0, at).join(' ') : '';
}

// While the phone keyboard is open, lift the bottom button bar above it (iPhone keeps fixed bars behind the keyboard).
function useKeyboardLift() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    let last = -1;
    const set = () => {
      // The phone nudges the visible area a few pixels as you type; only a real change (the keyboard opening, closing or
      // growing) moves anything, so the page never shakes while typing.
      const kb = Math.max(0, window.innerHeight - vv.height);
      if (last >= 0 && Math.abs(kb - last) < 40) return;
      last = kb;
      root.style.setProperty('--kb', `${kb}px`);
      // With the keyboard up there is little room: the button bar sits right under the answer box (in the page) instead of floating over it.
      if (kb > 100) root.dataset.kb = 'open'; else delete root.dataset.kb;
    };
    set();
    vv.addEventListener('resize', set); vv.addEventListener('scroll', set);
    return () => { vv.removeEventListener('resize', set); vv.removeEventListener('scroll', set); document.documentElement.style.removeProperty('--kb'); delete document.documentElement.dataset.kb; };
  }, []);
}

export function LessonRunner({ mode, itemId, itemIds = [], courseId, cardId, from = '/heir' }: { mode: 'lesson' | 'review' | 'rise' | 'night' | 'item' | 'learn' | 'keep' | 'extra'; itemId?: string; itemIds?: string[]; courseId?: string; cardId?: string; from?: string }) {
  useKeyboardLift();
  const router = useRouter();
  const { ready, household, update, updateProgress, progress, keepRules } = useHeir();
  const { me, items, track, mine, due, course } = useCourse(courseId);
  const idsKey = itemIds.join(',');
  const [session, setSession] = useState<Session | null>(null);
  const [queue, setQueue] = useState<Step[]>([]);
  const [pos, setPos] = useState(0);
  const [results, setResults] = useState<Record<string, StepResult>>({});
  const [retried, setRetried] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<Outcome | null>(null);
  const fbRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (feedback) fbRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [feedback]);
  const [finished, setFinished] = useState<Finished | null>(null);
  // The NASB text of the session's verse, fetched as the session starts so it's ready by the time it comes up.
  // Until then, or if it can't be fetched, the verse shows in the KJV that ships with the app.
  const [verses, setVerses] = useState<Record<string, { text: string; version: string }>>({});
  useEffect(() => {
    if (!session) return;
    const ctl = new AbortController();
    for (const s of session.steps) {
      if (s.kind !== 'verse') continue;
      fetch(`/api/heir/verse?id=${encodeURIComponent(s.itemId)}`, { signal: ctl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((v: { text?: string; version?: string } | null) => { if (v?.text && v.version) setVerses((m) => ({ ...m, [s.itemId]: { text: v.text!, version: v.version! } })); })
        .catch(() => { /* offline or no key: keep the KJV */ });
    }
    return () => ctl.abort();
  }, [session]);
  const startedAt = useRef(0);
  const sessionStart = useRef(0);
  // Time actually spent: each step's time, with any pause over two minutes cut, so a phone left on the table doesn't count.
  const activeMs = useRef(0);

  useEffect(() => {
    if (!ready) return;
    if (!household.members.length) { router.replace('/heir/welcome'); return; }
    if (session || !me) return;
    const pool = allItems();
    // With the newer engine (owner accounts first): each review knows its weak parts and its chance of recall now.
    // Each part's own memory, rebuilt from the answers (memory.ts): an item is as strong as its weakest part.
    const parts = keepRules ? partMemories(mine.log, mine.partSnap) : undefined;
    const weak = parts ? weakPartsNow(mine.log, parts, new Date()) : null;
    const toDue = (list: { itemId: string; strength: number }[]) => list.flatMap((d) => {
      const item = getItem(d.itemId);
      if (!item) return [];
      const card = mine.cards[d.itemId];
      if (!weak || !parts) return [{ item, strength: d.strength }];
      const byPart = itemChance(item.id, parts, new Date());
      const chance = card ? Math.min(recallChance(card, new Date()), byPart ?? 1) : byPart ?? undefined;
      return [{ item, strength: d.strength, weak: [...weak].filter((k) => k.startsWith(`${item.id}#`)), ...(chance !== undefined ? { chance } : {}) }];
    });
    const learnedUnits = new Set(mine.units);
    const ids = new Set(items.map((i) => i.id));
    const done = lessonsDone(mine, course.id, ids);
    const learnItem = mode === 'learn' && itemId ? getItem(itemId) : undefined;
    const learnUnit = learnItem ? unitsFor(learnItem, track).find((u) => !learnedUnits.has(u.key)) : undefined;
    // "Learn it" on something already learned (a stale card, or learned since) is a short practice on it, not the course's next lesson.
    const alreadyLearned = !!learnItem && !learnUnit;
    const plan = learnItem && learnUnit
      ? { kind: 'learn' as const, units: [learnUnit], group: groupsOf(items).find((g) => g.items.some((i) => i.id === learnItem.id)) ?? groupsOf(items)[0] }
      : mode === 'review'
      ? (() => {
        // A review fits its time: the card's minutes (or about four) at this person's own pace, two steps an item.
        const est = mine.today?.cards?.find((c) => c.id === cardId)?.est ?? 4;
        const fit = keepRules ? Math.min(8, Math.max(3, Math.round((est * 60) / (2 * stepSeconds(mine.log))))) : 6;
        // Not something still waiting for its first night's sleep, or recalled in the last few hours: a review then
        // measures short-term memory, not what's kept.
        const recent = recalledRecently(mine.log, new Date());
        const fresh = riskOrder(mine, ids, new Date(), parts).filter((x) => !waitingForSleep(mine, x.itemId, new Date()) && !recent.has(x.itemId));
        const picks = fresh.length ? fresh : riskOrder(mine, ids, new Date(), parts).filter((x) => !waitingForSleep(mine, x.itemId, new Date()));
        return picks.length ? { kind: 'practice' as const, picks: picks.slice(0, fit), why: 'catch-up' as const } : null;
      })()
      : planNext({ courseId: course.id, items, track, p: mine, now: new Date() });
    const seen = seenCounts(mine);
    const fromPicks = (picks: { itemId: string; strength: number }[]) => toDue(picks);
    const glassBefore = windowLight(items, track, mine, new Date());
    const base = { memberId: me.id, courseId: course.id, label: mode === 'review' ? `Review · ${course.title}` : done === 0 ? 'Welcome' : `Lesson ${done + 1}`, before: { lit: glassBefore.lit, dusty: glassBefore.dusty } };
    let next: Session;
    const one = (mode === 'item' || alreadyLearned) && itemId ? getItem(itemId) : undefined;
    if (mode === 'extra') {
      // Extra practice, after the day's lessons: what is most likely to slip, across every course you've started.
      const started = startedCourses(mine, track, dailyCourse(household.plan), household.plan?.removed, household.plan?.verses);
      const allIds = new Set(started.flatMap((c) => courseItems(c).map((i) => i.id)));
      const recent = recalledRecently(mine.log, new Date());
      const picks = riskOrder(mine, allIds, new Date(), parts).filter((x) => !waitingForSleep(mine, x.itemId, new Date()) && !recent.has(x.itemId));
      const slipping = picks.filter((x) => x.recall < 0.85);
      next = { ...base, courseId: '', label: 'Extra practice', kind: 'review', steps: buildReview({ due: fromPicks((slipping.length ? slipping : picks).slice(0, 5)), track, pool, rng: Math.random, max: 5 }), units: [], group: null };
    } else if (one) {
      // One question or verse, practiced on its own from its page: about two minutes of varied steps, then the whole thing typed.
      // Not numbered as a lesson of the course: no course id.
      const chance = parts ? (() => { const card = mine.cards[one.id]; const byPart = itemChance(one.id, parts, new Date()); return card ? Math.min(recallChance(card, new Date()), byPart ?? 1) : byPart ?? undefined; })() : undefined;
      next = { ...base, courseId: '', label: `Practice · ${itemLabel(one)}`, kind: 'review', steps: buildPractice({ item: one, track, pool, rng: Math.random, ...(chance !== undefined ? { chance } : {}) }), units: [], group: null };
    } else if (mode === 'keep') {
      // Keeping words in memory: the verses and answers you chose, each recalled whole.
      const chosen = idsKey.split(',').filter(Boolean).flatMap((id) => { const it = getItem(id); return it ? [it] : []; });
      next = { ...base, courseId: '', label: chosen.length === 1 ? `Review · ${itemLabel(chosen[0])}` : `Review · ${chosen.length} to keep`, kind: 'review', steps: buildKeep({ items: chosen, track, pool, rng: Math.random }), units: [], group: null };
    } else if (mode === 'night') {
      // When you lie down: today's questions first, then a few on the edge, one quiet step each.
      const tonight = bedtimePicks(mine, ids, new Date());
      const picked = (tonight.length ? tonight : morningPicks(mine, ids, new Date())).flatMap((id) => { const it = getItem(id); return it ? [it] : []; });
      next = { ...base, label: 'When you lie down', kind: 'review', steps: buildNight({ items: picked, track, pool, rng: Math.random }), units: [], group: null, night: true };
    } else if (mode === 'rise') {
      // When you rise: last night's questions (or, with no night, the ones most worth recalling), in full from the question alone.
      const risen = morningPicks(mine, ids, new Date()).flatMap((id) => { const it = getItem(id); return it ? [it] : []; });
      next = { ...base, label: 'When you rise', kind: 'review', steps: buildRise({ items: risen, track, pool, rng: Math.random }), units: [], group: null, rise: true };
    } else if (plan?.kind === 'welcome') {
      const unit = plan.units[0];
      const item = getItem(unit.itemId)!;
      const intro = INTROS[course.id];
      const steps = intro ? buildWelcome({ intro, unit, item, track, pool, rng: Math.random }) : buildLesson({ unit, item, track, mates: [], due: [], pool, rng: Math.random });
      next = { ...base, kind: 'learn', steps, units: plan.units, group: plan.group };
    } else if (plan?.kind === 'learn') {
      const [unit, second] = plan.units;
      const item = getItem(unit.itemId)!;
      const fresh = new Set(plan.units.map((u) => u.itemId));
      const mates: Mate[] = plan.group.items.flatMap((i) => {
        const units = unitsFor(i, track).filter((u) => learnedUnits.has(u.key));
        return units.length && !fresh.has(i.id) ? [{ item: i, units, seen: seen.get(i.id) ?? 0 }] : [];
      });
      // Earlier parts of the item being learned count as practice too.
      const ownLearned = unitsFor(item, track).filter((u) => learnedUnits.has(u.key));
      if (ownLearned.length) mates.unshift({ item, units: ownLearned, seen: seen.get(item.id) ?? 0 });
      const inGroup = new Set(plan.group.items.map((i) => i.id));
      const reviews = toDue(due.filter((d) => !inGroup.has(d.itemId)));
      // A lesson fits about six minutes at this person's own pace (owner accounts first).
      const maxSteps = keepRules ? Math.min(18, Math.max(10, Math.round((6 * 60) / stepSeconds(mine.log)))) : undefined;
      let steps = buildLesson({ unit, item, track, mates: second ? mates.slice(0, 1) : mates, due: second ? [] : reviews, pool, rng: Math.random, maxSteps });
      if (second) steps = [...steps, ...buildLite({ unit: second, item: getItem(second.itemId)!, track, pool, rng: Math.random })];
      next = { ...base, kind: 'learn', steps, units: plan.units, group: plan.group };
    } else if (plan?.kind === 'checkpoint') {
      next = { ...base, kind: 'checkpoint', steps: buildCheckpoint({ group: plan.group, track, pool, rng: Math.random }), units: [], group: plan.group };
    } else if (plan) {
      next = { ...base, label: plan.kind === 'welcome-back' ? `Welcome back · ${base.label}` : base.label, kind: 'review', steps: buildReview({ due: fromPicks(plan.picks), track, pool, rng: Math.random, max: plan.picks.length }), units: [], group: null };
    } else {
      next = { ...base, kind: 'review', steps: [], units: [], group: null };
    }
    // With the keeping rules on, a lesson also carries up to two whole-verse reviews for what needs keeping most (a miss to
    // put right first, then what is due soonest), so everyday lessons keep words in your memory without a separate trip.
    if (keepRules && (mode === 'lesson' || mode === 'review') && next.steps.length) {
      const inLesson = new Set(next.steps.map((s) => s.itemId));
      const held = heldItems(pool, mine, track, new Date(), { launch: KEEP_LAUNCH, tz: null, mode: 'whole' });
      const urgent = summarize(held);
      // Only from this lesson's own course (a Christmas review never brings in a catechism answer), and not anything
      // recalled in the last few hours.
      const recentNow = recalledRecently(mine.log, new Date());
      const extra = [...urgent.tryAgain, ...urgent.review].filter((h) => !inLesson.has(h.item.id) && ids.has(h.item.id) && !recentNow.has(h.item.id)).slice(0, 2).map((h) => h.item);
      if (extra.length) next = { ...next, steps: [...next.steps, ...buildKeep({ items: extra, track, pool, rng: Math.random })] };
    }
    // Which course's window and "up next" the done screen shows: the one this lesson was for.
    // Why each review is here, shown on it (newer engine): how it went last time or how long ago, and its strength now.
    const why: Record<string, string> = {};
    if (parts) for (const st of next.steps) if (st.review && !why[st.itemId]) {
      const card = mine.cards[st.itemId];
      const byPart = itemChance(st.itemId, parts, new Date());
      const chance = card ? Math.min(recallChance(card, new Date()), byPart ?? 1) : byPart;
      const w = whyNow(st.itemId, mine.log, chance, new Date());
      if (w) why[st.itemId] = w;
    }
    next = { ...next, course: courseId, card: cardId, why };
    Promise.resolve().then(() => {
      setSession(next);
      setQueue(next.steps);
      startedAt.current = Date.now();
      sessionStart.current = Date.now();
      activeMs.current = 0;
      // Opening a card from Today is recorded (finished or not), to tell whether the recommendations are used.
      if (cardId && me) updateProgress((all) => { const p = memberProgress(all, me.id); return p.today?.started?.includes(cardId) ? all : { ...all, [me.id]: { ...p, today: withStarted(p.today, localDay(new Date()), cardId) } }; });
    });
  }, [ready, household.members.length, session, me, items, track, mine, due, course.id, mode, itemId, idsKey, keepRules, router, household.plan, courseId, cardId, course.title, updateProgress]);

  if (!ready || !session) return <main className="hr-page bare" aria-busy="true" />;

  if (!queue.length) {
    return (
      <main className="hr-page bare">
        <section className="hr-card" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p className="serif" style={{ margin: 0, fontSize: 26, lineHeight: 1.25 }}><span style={{ fontWeight: 600 }}>Nothing to review yet.</span> <span style={{ color: 'var(--muted)' }}>Finish a lesson first, and it will come back here.</span></p>
          <Link className="hr-btn" href={from}>{from === '/heir' ? 'Back to Today' : 'Back'}</Link>
        </section>
      </main>
    );
  }

  if (finished) return <Done session={session} finished={finished} from={from} again={() => { setSession(null); setPos(0); setResults({}); setRetried(new Set()); setFinished(null); }} />;

  const step = queue[pos];
  const item = getItem(step.itemId)!;

  const report: Report = (o) => {
    // Checking puts the phone keyboard away so the feedback has room.
    (document.activeElement as HTMLElement | null)?.blur?.();
    const ms = Date.now() - startedAt.current;
    const key = step.id.replace(/:typed$/, '');
    // The welcome lesson's easy questions teach about the catechism, not the answer: not graded or repeated.
    if (step.kind === 'quiz') { setFeedback(o); return; }
    // The chance the model gave before this answer, kept beside it so we can check the model is right.
    const chance = ['type', 'say', 'letters'].includes(step.kind) ? predictedChance(mine.cards[step.itemId], new Date()) : null;
    setResults((r) => (r[key] ? r : { ...r, [key]: { itemId: step.itemId, kind: step.kind, correct: o.ok, hints: o.hints ?? 0, ms, review: step.review, ...(chance !== null ? { p: chance } : {}), ...(step.part ? { part: step.part } : {}), ...(step.partOf ? { of: step.partOf } : {}), ...('text' in step && typeof step.text === 'string' && step.kind !== 'verse' ? { words: wordCount(step.text) } : {}), ...(o.misses !== undefined ? { misses: o.misses } : {}), ...(o.missedAt?.length ? { missed: o.missedAt.slice(0, 60) } : step.kind === 'spot' && !o.ok ? { missed: [step.wrongIndex] } : {}), ...(testedPositions(step) ? { tested: testedPositions(step)!.slice(0, 60) } : {}) } }));
    if (!o.ok && !retried.has(key)) {
      setRetried((s) => new Set(s).add(key));
      setQueue((q) => [...q, step]);
    }
    setFeedback(o);
  };

  const advance = () => {
    setFeedback(null);
    const n = pos + 1;
    activeMs.current += Math.min(Date.now() - startedAt.current, 120_000);
    startedAt.current = Date.now();
    if (n < queue.length) { setPos(n); return; }
    const recorded = Object.values(results);
    const now = new Date();
    const next = finishSession(memberProgress(progress, session.memberId), { results: recorded, learned: session.units, courseId: session.courseId, checkpoint: session.kind === 'checkpoint' ? session.group?.key : null, now, ...(keepRules ? { grading: 'v2' as const } : {}), keepRules: keepRules ? { tz: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch { return null; } })() } : undefined });
    // Raise levels the log now shows and stamp new awards, so the done screen can show what changed.
    const settled = settle(next, allItems(), track, now);
    const marked = session.rise ? markRisen(settled.progress) : session.night ? markNight(settled.progress, [...new Set(session.steps.map((s) => s.itemId))], now) : settled.progress;
    // Today's record: this session and how long it took, so Today can tick off its card and add up the minutes.
    const kind = session.rise ? 'rise' : session.night ? 'night' : mode === 'extra' || mode === 'item' || (mode === 'keep' && !cardId) ? 'extra' : session.kind === 'review' ? 'review' : 'lesson';
    const saved = { ...marked, today: withSession(marked.today, localDay(now), { id: crypto.randomUUID(), at: now.toISOString(), secs: Math.max(1, Math.round(activeMs.current / 1000)), course: courseId ?? course.id, kind, ...(cardId ? { card: cardId } : {}) }) };
    updateProgress((p) => ({ ...p, [session.memberId]: saved }));
    // Learning a verse on its own puts it in the plan (its reviews follow), without bringing its whole course along.
    if (mode === 'learn' && itemId && session.units.length) update((h) => addVerse(h, itemId, course.id));
    const recall = recorded.filter((r) => r.kind !== 'intro');
    setFinished({ right: recall.filter((r) => r.correct).length, total: recall.length, minutes: Math.max(1, Math.round(activeMs.current / 60000)), ups: settled.ups, awards: settled.awards, kept: daysKept(settled.progress.days, localDay(now)) });
  };

  // Say steps become typing; a typing step that would then repeat the same words right after is dropped.
  const cantSpeak = () => setQueue((q) => q.map((s, i) => (i >= pos ? withoutSpeaking(s) : s)).filter((s, i, all) => {
    const prev = all[i - 1];
    return !(i > pos && prev && s.kind === 'type' && prev.kind === 'type' && prev.itemId === s.itemId && 'text' in prev && prev.text === s.text);
  }));
  const u = session.units.find((x) => x.itemId === step.itemId);
  const part = !step.review && u && u.of > 1 ? ` · Part ${u.part} of ${u.of}` : '';
  const title = `${itemLabel(item)}${part}`;
  const retry = retried.has(step.id.replace(/:typed$/, '')) && queue.indexOf(step) !== pos;
  // A lock-in says so on every question; elsewhere, practice on earlier questions is marked Review.
  const tag = session.kind === 'checkpoint' ? `Lock it in · ${Math.min(pos + 1, queue.length)} of ${queue.length}` : step.review ? 'Review' : null;
  // How it went, generously (ADR-003): the words and colour only. Whether it counts as right was decided strictly in `report`.
  const band = feedback ? bandFor(feedback) : null;
  const heading = band ? BAND_WORDS[band] : '';
  // A whole answer from memory, perfect: celebrated.
  const celebrate = band === 'perfect' && (step.kind === 'type' || step.kind === 'say');

  return (
    <main className="hr-page bare hr-lesson-screen" data-feedback={feedback ? 'true' : undefined}>
      <div className="hr-lesson-top">
        <Link href={from} className="hr-back" aria-label="End lesson">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </Link>
        <div className="hr-progress" role="progressbar" aria-valuemin={0} aria-valuemax={queue.length} aria-valuenow={pos} aria-label="Lesson progress">
          <span style={{ width: `${Math.round((pos / queue.length) * 100)}%` }} />
        </div>
      </div>
      {session.kind === 'checkpoint' && pos === 0 && !feedback && (
        <p style={{ margin: '0 4px', fontSize: 15, lineHeight: 1.45 }}><strong>Lock it in.</strong> Each of {session.group ? groupLabel(session.group) : 'these'}, from memory. This is meant to be hard.</p>
      )}
      <section key={`${step.id}-${pos}`} className="hr-card hr-open" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18, pointerEvents: feedback ? 'none' : undefined }}>
        {step.kind === 'intro' ? (
          <Intro item={item} track={track} step={step} onNext={advance} />
        ) : step.kind === 'info' ? (
          <>
            <span className="hr-label">Welcome</span>
            <h2 className="serif" style={{ margin: 0, fontSize: 26, lineHeight: 1.2, fontWeight: 600 }}>{step.title}</h2>
            <p style={{ margin: 0, fontSize: 18, lineHeight: 1.55 }}>{step.body}</p>
            <Dock><button type="button" className="hr-btn" onClick={advance}>Continue</button></Dock>
          </>
        ) : step.kind === 'verse' ? (
          <>
            <figure style={{ margin: 'auto 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <blockquote className="serif" style={{ margin: 0, fontSize: 25, lineHeight: 1.45 }}>{verses[step.itemId]?.text ?? step.text}</blockquote>
              <figcaption style={{ fontSize: 15, color: 'var(--muted)', fontWeight: 600 }}>{step.ref} ({verses[step.itemId]?.version ?? 'KJV'})</figcaption>
            </figure>
            <Dock><button type="button" className="hr-btn" onClick={advance}>Continue</button></Dock>
          </>
        ) : step.kind === 'quiz' ? (
          <>
            <span className="hr-label">Welcome</span>
            <Meaning step={{ ...step, kind: 'meaning' }} onReport={report} />
          </>
        ) : (
          <>
            {step.kind === 'match' || step.kind === 'meaning'
              ? <span className="hr-label" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{tag && <span className="hr-tag">{tag}</span>}{step.kind === 'meaning' ? title : 'Match'}{retry ? ' · Second try' : ''}</span>
              : <Cue item={item} step={step} tag={tag} title={`${title}${retry ? ' · Second try' : ''}`} />}
            {'lead' in step && step.kind !== 'next' && <Context text={contextBefore(item, track, step.lead)} />}
            {step.kind === 'next' && <Context text={contextBefore(item, track, step.lead)} />}
            {step.kind === 'order' && <Order step={step} onReport={report} />}
            {step.kind === 'meaning' && <Meaning step={step} onReport={report} />}
            {step.kind === 'next' && <Next step={step} onReport={report} />}
            {step.kind === 'match' && <Match step={step} onReport={report} />}
            {step.kind === 'spot' && <Spot step={step} onReport={report} />}
            {step.kind === 'blanks' && <Blanks step={step} onReport={report} />}
            {step.kind === 'letters' && <Letters step={step} onReport={report} />}
            {step.kind === 'type' && <Type step={step} onReport={report} />}
            {step.kind === 'say' && <Say step={step} onReport={report} onCantSpeak={cantSpeak} />}
          </>
        )}
      </section>
      <div id="hr-dock" className="hr-dock" />
      {feedback && (
        <div className="hr-fb" data-band={band ?? undefined} data-celebrate={celebrate || undefined} role="status" ref={fbRef}>
          <div className="hr-fb-details">
            {feedback.note && <p style={{ margin: 0, fontSize: 16, lineHeight: 1.45, fontWeight: 500 }}>{feedback.note}</p>}
            {feedback.reveal}
            {!feedback.ok && !retry && step.kind !== 'quiz' && <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>It’ll come back once more at the end.</p>}
          </div>
          <span className="hr-fb-pill" data-band={band ?? undefined} data-big={celebrate || undefined}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{band === 'perfect' ? <path d="M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.4 6.8 19.2l1-5.9L3.5 9.2l5.9-.8z" /> : band === 'pass' || band === 'good' ? <path d="M5 12l5 5 9-10" /> : <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" />}</svg>
            {heading}
          </span>
          <button type="button" className="hr-btn hr-fb-go" data-band={band ?? undefined} onClick={advance} autoFocus>Continue</button>
        </div>
      )}
    </main>
  );
}

function Done({ session, finished, again, from }: { session: Session; finished: Finished; again(): void; from: string }) {
  const { activity, group, groupLearned, mine, items, track, course, path } = useCourse(session.course);
  const lockTomorrow = path.find((u) => u.lockWaiting && session.units.some((x) => u.group.items.some((i) => i.id === x.itemId)));
  const { now } = useHeir();
  const upNext = planNext({ courseId: course.id, items, track, p: mine, now });
  const first = session.units[0];
  const item = first ? getItem(first.itemId) : null;
  const partial = first && first.part < first.of;
  const label = session.group ? groupLabel(session.group) : '';
  // Only a move to a new tier is news: Emerald, Sapphire and Diamond all show as Expert.
  const tierUps = finished.ups.filter((u) => u.to >= RECALLED && tierIndex(u.to) > tierIndex(u.from));
  const top = tierUps[0];
  const topItem = top ? getItem(top.itemId) : null;
  const topLevel = top ? tierOf(top.to) : null;
  const kind = session.label === 'Welcome' ? 'Welcome lesson complete' : session.label ? `${session.label} complete` : 'Lesson complete';
  const message =
    session.kind === 'checkpoint' ? 'From here they come back on a spaced schedule: soon for any you found hard, then further apart each time you remember them.'
    : session.night ? 'Sleep now. Tonight’s questions are the ones sleep will keep, and you’ll recall them in the morning.'
    : session.rise ? 'Recalling it after a night’s sleep is the surest sign it’s being stored. Anything you missed comes back soon.'
    : session.kind === 'review' ? 'Each review waits until you’re close to forgetting, which is when recalling it helps most.'
    : partial ? `Part ${first!.part} of ${first!.of} learned. The next lesson continues it.`
    : lockTomorrow ? `That’s all of ${groupLabel(lockTomorrow.group)}. Lock them in tomorrow, after a night’s sleep: recalling them then is what fixes them in memory. Keep going if you like.`
    : activity?.kind === 'checkpoint' ? `That’s all of ${groupLabel(activity.group)}. Next: lock them in, all together, from memory.`
    : group ? `${groupLearned} of ${group.items.length} in ${groupLabel(group)}. The next lesson adds one and practices these again.` : '';
  // Started from a card on Today: back to Today, where the next card is waiting.
  const cta = session.card ? null : upNext?.kind === 'checkpoint' ? 'Lock them in now' : upNext ? 'Next lesson' : null;

  return (
    <>
    <main className="hr-page bare">
      <DoneWindow session={session} />
      {session.kind === 'checkpoint' && session.group ? (
        <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span className="hr-label">{kind}</span>
          <h1 className="serif" style={{ margin: 0, fontSize: 28, lineHeight: 1.18, fontWeight: 600 }}>{label} {session.group.items.length === 1 ? 'is' : 'are'} set in your foundation.</h1>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${session.group.items.length}, minmax(0, 1fr))`, gap: 6, textAlign: 'center' }}>
            {session.group.items.map((i) => (
              <span key={i.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <Stone level={mine.levels[i.id] ?? 0} size={40} />
                <span style={{ fontSize: 12, fontWeight: 700 }}>{itemLabel(i).replace(/, part /, ' ')}</span>
              </span>
            ))}
          </div>
          <p className="serif" style={{ margin: 0, fontSize: 17, lineHeight: 1.5, color: 'var(--muted)' }}>“You yourselves like living stones are being built up as a spiritual house.” <span style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontSize: 13, fontWeight: 600 }}>1 Peter 2:5</span></p>
        </section>
      ) : top && topItem && topLevel ? (
        <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
          <span className="hr-label">{kind}</span>
          <span className="hr-halo"><Stone level={top.to} size={112} /></span>
          <h1 className="serif" style={{ margin: '4px 0 0', fontSize: 28, lineHeight: 1.18, fontWeight: 600 }}>{itemLabel(topItem)} reached {topLevel.name}</h1>
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5, color: 'var(--muted)' }}>{topLevel.stone} · {topLevel.means}</p>
        </section>
      ) : (
        <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span className="hr-label">{kind}</span>
          {session.night ? (
            <>
              <p className="serif" style={{ margin: 0, fontSize: 26, lineHeight: 1.22, fontWeight: 600 }}>{finished.right} of {finished.total} went over tonight</p>
              <p className="serif" style={{ margin: 0, fontSize: 17, lineHeight: 1.5, color: 'var(--muted)' }}>“In peace I will both lie down and sleep; for you alone, O Lord, make me dwell in safety.” <span style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontSize: 13, fontWeight: 600 }}>Psalm 4:8</span></p>
            </>
          ) : session.rise ? (
            <>
              <p className="serif" style={{ margin: 0, fontSize: 26, lineHeight: 1.22, fontWeight: 600 }}>{finished.right} of {finished.total} stayed with you overnight</p>
              <p className="serif" style={{ margin: 0, fontSize: 17, lineHeight: 1.5, color: 'var(--muted)' }}>“O Lord, in the morning you hear my voice.” <span style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontSize: 13, fontWeight: 600 }}>Psalm 5:3</span></p>
            </>
          ) : <p className="serif" style={{ margin: 0, fontSize: 26, lineHeight: 1.22, fontWeight: 600 }}>{item ? (isVerse(item) ? item.prompt : `${itemLabel(item)}: ${item.prompt}`) : 'Every review makes the next one easier.'}</p>}
        </section>
      )}

      {(tierUps.length > (session.kind === 'checkpoint' ? 0 : 1)) && (
        <section className="hr-card" style={{ padding: '6px 20px' }}>
          {tierUps.slice(session.kind === 'checkpoint' ? 0 : 1).map((u) => {
            const it = getItem(u.itemId); const lv = tierOf(u.to);
            return it && lv ? (
              <div key={u.itemId} className="hr-row" style={{ justifyContent: 'flex-start', gap: 12 }}>
                <Stone level={u.to} size={30} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontWeight: 600 }}>{itemLabel(it)} · {lv.name}</span><span style={{ fontSize: 14, color: 'var(--muted)' }}>{lv.means}</span></span>
              </div>
            ) : null;
          })}
        </section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        <Stat label="Right first time" value={`${finished.right} of ${finished.total}`} />
        <Stat label="Time" value={`${finished.minutes} min`} />
        <Stat label="Days kept" value={`${finished.kept}`} />
      </div>
      {message && <p style={{ margin: '0 4px', fontSize: 15, lineHeight: 1.5 }}>{message}</p>}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {cta && !session.night && !session.rise && <button type="button" className="hr-btn" onClick={again}>{cta}</button>}
        <Link className={cta && !session.night && !session.rise ? 'hr-btn quiet' : 'hr-btn'} style={cta && !session.night && !session.rise ? { background: 'var(--card)' } : undefined} href={from}>{session.card && from === '/heir' ? 'Back to Today' : 'Done'}</Link>
      </div>
    </main>
    </>
  );
}

// The payoff: the window as it was before this lesson, then the glass just earned lights up while you watch.
// A review wipes the dust from the glass it refreshed.
function DoneWindow({ session }: { session: Session }) {
  const { items, track, mine, course } = useCourse(session.course);
  const { now } = useHeir();
  const win = useRef<WindowHandle>(null);
  const after = windowLight(items, track, mine, now);
  const before = session.before;
  const fresh = items.filter((_, i) => after.lit[i] > (before.lit[i] ?? 0) + 1e-6);
  // Show the part the new light went into (or, after a review, the part you're working in).
  const part = fresh.length ? partOf(course, fresh[0].id) : partWindow(course, track, mine, now).index;
  const pick = (all: number[] | boolean[]) => {
    const at = new Map(items.map((it, i) => [it.id, i]));
    return (courseParts(course)[part]?.items ?? []).map((it) => all[at.get(it.id) ?? 0]);
  };
  const beforeLit = pick(before.lit) as number[], afterLit = pick(after.lit) as number[];
  const shareOf = (l: number[]) => l.reduce((a, b) => a + b, 0) / Math.max(1, l.length);
  const [dusty, setDusty] = useState(pick(before.dusty) as boolean[]);
  const [share, setShare] = useState(shareOf(beforeLit));
  // The new glass lights round the window clockwise, a pane at a time, in about two and a half seconds however much
  // is new (a few panes take a moment each); then the gold arc on the frame moves on.
  const ready = () => {
    setTimeout(() => win.current?.revealTo(afterLit), 700);
    setTimeout(() => setDusty(pick(after.dusty) as boolean[]), 900);
    const pieces = win.current?.meta()?.count ?? 500;
    const newPanes = Math.max(1, Math.round((shareOf(afterLit) - shareOf(beforeLit)) * pieces));
    setTimeout(() => setShare(shareOf(afterLit)), 700 + Math.min(2400, newPanes * 130) + 400);
  };
  const names = fresh.map((i) => itemLabel(i)).join(', ');
  return (
    <section className="hr-rose-card" style={{ paddingTop: 20 }}>
      <div className="hr-rose-wash" style={{ backgroundImage: `url(${windowBase(course.id, part)}/glass.webp)` }} aria-hidden="true" />
      <RoundWindow ref={win} base={windowBase(course.id, part)} lit={beforeLit} dusty={dusty} share={share} onReady={ready} size={280}
        label={names ? `Your window: new light for ${names}` : 'Your window'} />
      {names && <span className="serif" style={{ fontSize: 19, textAlign: 'center' }}>New light: {names}</span>}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'var(--card)', borderRadius: 18, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span className="serif" style={{ fontSize: 20, fontWeight: 600 }}>{value}</span>
      <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>{label}</span>
    </div>
  );
}
