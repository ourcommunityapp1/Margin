'use client';

// Runs one lesson, lock-in checkpoint or review: a progress bar, one step at a time, feedback after each.
// A step missed on the first try comes back once at the end, as in most language apps.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useHeir } from './provider';
import { groupLabel, useCourse } from './course';
import { Blanks, Cue, Intro, Letters, Match, Meaning, Next, Order, Say, Spot, Type, type Outcome, type Report } from './steps';
import { buildCheckpoint, buildLesson, buildLite, buildReview, buildWelcome, unitsFor, withoutSpeaking, type Group, type Mate, type Step, type Unit } from '@/heir/lesson';
import { finishSession, localDay, memberProgress, seenCounts, type StepResult } from '@/heir/progress';
import { lessonsDone, planNext, riskOrder } from '@/heir/planner';
import { INTROS } from '@/heir/content/intros';
import { AWARDS, daysKept, levelInfo, settle } from '@/heir/levels';
import { Stone } from './stone';
import { allItems, getItem, itemLabel } from '@/heir/content';

type Kind = 'learn' | 'checkpoint' | 'review';
interface Session { kind: Kind; steps: Step[]; units: Unit[]; group: Group | null; memberId: string; label: string; courseId: string }

const PRAISE = ['Correct.', 'That’s right.', 'Well done.'];

interface Finished { right: number; total: number; minutes: number; ups: { itemId: string; from: number; to: number }[]; awards: string[]; kept: number }

export function LessonRunner({ mode }: { mode: 'lesson' | 'review' }) {
  const router = useRouter();
  const { ready, household, updateProgress, progress } = useHeir();
  const { me, items, track, mine, due, course } = useCourse();
  const [session, setSession] = useState<Session | null>(null);
  const [queue, setQueue] = useState<Step[]>([]);
  const [pos, setPos] = useState(0);
  const [results, setResults] = useState<Record<string, StepResult>>({});
  const [retried, setRetried] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<Outcome | null>(null);
  const [finished, setFinished] = useState<Finished | null>(null);
  const startedAt = useRef(0);
  const sessionStart = useRef(0);

  useEffect(() => {
    if (!ready) return;
    if (!household.members.length) { router.replace('/heir/welcome'); return; }
    if (session || !me) return;
    const pool = allItems();
    const toDue = (list: { itemId: string; strength: number }[]) => list.flatMap((d) => { const item = getItem(d.itemId); return item ? [{ item, strength: d.strength }] : []; });
    const learnedUnits = new Set(mine.units);
    const ids = new Set(items.map((i) => i.id));
    const done = lessonsDone(mine, course.id, ids);
    const plan = mode === 'review'
      ? (() => { const picks = riskOrder(mine, ids, new Date()); return picks.length ? { kind: 'practice' as const, picks: picks.slice(0, 6), why: 'catch-up' as const } : null; })()
      : planNext({ courseId: course.id, items, track, p: mine, now: new Date() });
    const seen = seenCounts(mine);
    const fromPicks = (picks: { itemId: string; strength: number }[]) => toDue(picks);
    const base = { memberId: me.id, courseId: course.id, label: done === 0 ? 'Welcome' : `Lesson ${done + 1}` };
    let next: Session;
    if (plan?.kind === 'welcome') {
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
      let steps = buildLesson({ unit, item, track, mates: second ? mates.slice(0, 1) : mates, due: second ? [] : reviews, pool, rng: Math.random });
      if (second) steps = [...steps, ...buildLite({ unit: second, item: getItem(second.itemId)!, track, pool, rng: Math.random })];
      next = { ...base, kind: 'learn', steps, units: plan.units, group: plan.group };
    } else if (plan?.kind === 'checkpoint') {
      next = { ...base, kind: 'checkpoint', steps: buildCheckpoint({ group: plan.group, track, pool, rng: Math.random }), units: [], group: plan.group };
    } else if (plan) {
      next = { ...base, label: plan.kind === 'welcome-back' ? `Welcome back · ${base.label}` : base.label, kind: 'review', steps: buildReview({ due: fromPicks(plan.picks), track, pool, rng: Math.random, max: plan.picks.length }), units: [], group: null };
    } else {
      next = { ...base, kind: 'review', steps: [], units: [], group: null };
    }
    Promise.resolve().then(() => {
      setSession(next);
      setQueue(next.steps);
      startedAt.current = Date.now();
      sessionStart.current = Date.now();
    });
  }, [ready, household.members.length, session, me, items, track, mine, due, course.id, mode, router]);

  if (!ready || !session) return <main className="hr-page bare" aria-busy="true" />;

  if (!queue.length) {
    return (
      <main className="hr-page bare">
        <section className="hr-card" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p className="serif" style={{ margin: 0, fontSize: 26, lineHeight: 1.25 }}><span style={{ fontWeight: 600 }}>Nothing to review yet.</span> <span style={{ color: 'var(--muted)' }}>Finish a lesson first, and it will come back here.</span></p>
          <Link className="hr-btn" href="/heir">Back to Today</Link>
        </section>
      </main>
    );
  }

  if (finished) return <Done session={session} finished={finished} again={() => { setSession(null); setPos(0); setResults({}); setRetried(new Set()); setFinished(null); }} />;

  const step = queue[pos];
  const item = getItem(step.itemId)!;

  const report: Report = (o) => {
    const ms = Date.now() - startedAt.current;
    const key = step.id.replace(/:typed$/, '');
    // The welcome lesson's easy questions teach about the catechism, not the answer: not graded or repeated.
    if (step.kind === 'quiz') { setFeedback(o); return; }
    setResults((r) => (r[key] ? r : { ...r, [key]: { itemId: step.itemId, kind: step.kind, correct: o.ok, hints: o.hints ?? 0, ms, review: step.review } }));
    if (!o.ok && !retried.has(key)) {
      setRetried((s) => new Set(s).add(key));
      setQueue((q) => [...q, step]);
    }
    setFeedback(o);
  };

  const advance = () => {
    setFeedback(null);
    const n = pos + 1;
    startedAt.current = Date.now();
    if (n < queue.length) { setPos(n); return; }
    const recorded = Object.values(results);
    const now = new Date();
    const next = finishSession(memberProgress(progress, session.memberId), { results: recorded, learned: session.units, courseId: session.courseId, checkpoint: session.kind === 'checkpoint' ? session.group?.key : null, now });
    // Raise levels the log now shows and stamp new awards, so the done screen can show what changed.
    const settled = settle(next, allItems(), track, now);
    updateProgress((p) => ({ ...p, [session.memberId]: settled.progress }));
    const recall = recorded.filter((r) => r.kind !== 'intro');
    setFinished({ right: recall.filter((r) => r.correct).length, total: recall.length, minutes: Math.max(1, Math.round((Date.now() - sessionStart.current) / 60000)), ups: settled.ups, awards: settled.awards, kept: daysKept(settled.progress.days, localDay(now)) });
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
  // A pass with a slip is "Good", not "Well done": praise should match what happened.
  const heading = feedback?.ok ? (feedback.slip ? 'Good.' : PRAISE[pos % PRAISE.length]) : feedback?.close ? 'Almost.' : 'Not quite.';

  return (
    <main className="hr-page bare" style={{ paddingBottom: feedback ? 300 : undefined }}>
      <div className="hr-lesson-top">
        <Link href="/heir" className="hr-back" aria-label="End lesson">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </Link>
        <div className="hr-progress" role="progressbar" aria-valuemin={0} aria-valuemax={queue.length} aria-valuenow={pos} aria-label="Lesson progress">
          <span style={{ width: `${Math.round((pos / queue.length) * 100)}%` }} />
        </div>
      </div>
      {session.label && <span className="hr-label" style={{ margin: '-4px 4px 0' }}>{session.label}</span>}
      {session.kind === 'checkpoint' && pos === 0 && !feedback && (
        <p style={{ margin: '0 4px', fontSize: 15, lineHeight: 1.45 }}><strong>Lock it in.</strong> Each of {session.group ? groupLabel(session.group) : 'these'}, from memory. This is meant to be hard.</p>
      )}
      <section key={`${step.id}-${pos}`} className="hr-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18, pointerEvents: feedback ? 'none' : undefined }}>
        {step.kind === 'intro' ? (
          <Intro item={item} track={track} step={step} onNext={advance} />
        ) : step.kind === 'info' ? (
          <>
            <span className="hr-label">Welcome</span>
            <h2 className="serif" style={{ margin: 0, fontSize: 26, lineHeight: 1.2, fontWeight: 600 }}>{step.title}</h2>
            <p style={{ margin: 0, fontSize: 18, lineHeight: 1.55 }}>{step.body}</p>
            <button type="button" className="hr-btn" style={{ marginTop: 'auto' }} onClick={advance}>Continue</button>
          </>
        ) : step.kind === 'quiz' ? (
          <>
            <span className="hr-label">Welcome</span>
            <Meaning step={{ ...step, kind: 'meaning' }} onReport={report} />
          </>
        ) : (
          <>
            {step.kind === 'match' || step.kind === 'meaning'
              ? <span className="hr-label" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{step.review && <span className="hr-tag">Review</span>}{step.kind === 'meaning' ? title : 'Match'}{retry ? ' · Second try' : ''}</span>
              : <Cue item={item} step={step} title={`${title}${retry ? ' · Second try' : ''}`} />}
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
      {feedback && (
        <div className="hr-sheet" data-ok={feedback.ok} role="status">
          <div>
            <h2>{heading}</h2>
            {feedback.note && <p style={{ margin: 0, fontSize: 16, lineHeight: 1.45, fontWeight: 500 }}>{feedback.note}</p>}
            {feedback.reveal}
            {!feedback.ok && !retry && step.kind !== 'quiz' && <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>You’ll get another try at the end.</p>}
            <button type="button" className="hr-btn" onClick={advance} autoFocus>Continue</button>
          </div>
        </div>
      )}
    </main>
  );
}

function Done({ session, finished, again }: { session: Session; finished: Finished; again(): void }) {
  const { activity, group, groupLearned, mine, items, track, course } = useCourse();
  const { now } = useHeir();
  const upNext = planNext({ courseId: course.id, items, track, p: mine, now });
  const first = session.units[0];
  const item = first ? getItem(first.itemId) : null;
  const partial = first && first.part < first.of;
  const label = session.group ? groupLabel(session.group) : '';
  const top = finished.ups[0];
  const topItem = top ? getItem(top.itemId) : null;
  const topLevel = top ? levelInfo(top.to) : null;
  const kind = session.label === 'Welcome' ? 'Welcome lesson complete' : session.label ? `${session.label} complete` : 'Lesson complete';
  const message =
    session.kind === 'checkpoint' ? 'From here they come back on a spaced schedule: soon for any you found hard, then further apart each time you remember them.'
    : session.kind === 'review' ? 'Each review waits until you’re close to forgetting, which is when recalling it helps most.'
    : partial ? `Part ${first!.part} of ${first!.of} learned. The next lesson continues it.`
    : activity?.kind === 'checkpoint' ? `That’s all of ${groupLabel(activity.group)}. Next: lock them in, all together, from memory.`
    : group ? `${groupLearned} of ${group.items.length} in ${groupLabel(group)}. The next lesson adds one and practices these again.` : '';
  const cta = upNext?.kind === 'checkpoint' ? 'Lock them in now' : upNext ? 'Next lesson' : null;
  const awardNames = finished.awards.map((id) => AWARDS.find((a) => a.id === id)?.name).filter(Boolean);

  return (
    <main className="hr-page bare">
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
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5, color: 'var(--muted)' }}>{topLevel.rule}.{topLevel.counts ? ` It now counts as ${topLevel.counts.toLowerCase()}.` : ''}</p>
        </section>
      ) : (
        <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span className="hr-label">{kind}</span>
          <p className="serif" style={{ margin: 0, fontSize: 26, lineHeight: 1.22, fontWeight: 600 }}>{item ? `${itemLabel(item)}: ${item.prompt}` : 'Every review makes the next one easier.'}</p>
        </section>
      )}

      {(finished.ups.length > (session.kind === 'checkpoint' ? 0 : 1) || awardNames.length > 0) && (
        <section className="hr-card" style={{ padding: '6px 20px' }}>
          {finished.ups.slice(session.kind === 'checkpoint' ? 0 : 1).map((u) => {
            const it = getItem(u.itemId); const lv = levelInfo(u.to);
            return it && lv ? (
              <div key={u.itemId} className="hr-row" style={{ justifyContent: 'flex-start', gap: 12 }}>
                <Stone level={u.to} size={30} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontWeight: 600 }}>{itemLabel(it)} · {lv.name}</span><span style={{ fontSize: 14, color: 'var(--muted)' }}>{lv.rule}</span></span>
              </div>
            ) : null;
          })}
          {awardNames.map((n) => (
            <div key={n} className="hr-row" style={{ justifyContent: 'flex-start', gap: 12 }}>
              <span className="hr-seal" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.4 6.8 19.2l1-5.9L3.5 9.2l5.9-.8z" /></svg></span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontWeight: 600 }}>Award: {n}</span><span style={{ fontSize: 14, color: 'var(--muted)' }}>See it in Progress</span></span>
            </div>
          ))}
        </section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        <Stat label="Right first time" value={`${finished.right} of ${finished.total}`} />
        <Stat label="Time" value={`${finished.minutes} min`} />
        <Stat label="Days kept" value={`${finished.kept}`} />
      </div>
      {message && <p style={{ margin: '0 4px', fontSize: 15, lineHeight: 1.5 }}>{message}</p>}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Link className="hr-btn" href="/heir">Done</Link>
        {cta && <button type="button" className="hr-btn quiet" style={{ background: 'var(--card)' }} onClick={again}>{cta}</button>}
      </div>
    </main>
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
