'use client';

// Runs one lesson, lock-in checkpoint or review: a progress bar, one step at a time, feedback after each.
// A step missed on the first try comes back once at the end, as in most language apps.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useHeir } from './provider';
import { groupLabel, useCourse } from './course';
import { Blanks, Cue, Intro, Letters, Match, Meaning, Next, Order, Say, Spot, Type, type Outcome, type Report } from './steps';
import { buildCheckpoint, buildLesson, buildReview, unitsFor, withoutSpeaking, type Group, type Mate, type Step, type Unit } from '@/heir/lesson';
import { finishSession, memberProgress, seenCounts, weakestCards, type StepResult } from '@/heir/progress';
import { allItems, getItem, itemLabel } from '@/heir/content';

type Kind = 'learn' | 'checkpoint' | 'review';
interface Session { kind: Kind; steps: Step[]; unit: Unit | null; group: Group | null; memberId: string }

const PRAISE = ['Correct.', 'That’s right.', 'Well done.'];

export function LessonRunner({ mode }: { mode: 'lesson' | 'review' }) {
  const router = useRouter();
  const { ready, household, updateProgress } = useHeir();
  const { me, items, track, mine, due, activity } = useCourse();
  const [session, setSession] = useState<Session | null>(null);
  const [queue, setQueue] = useState<Step[]>([]);
  const [pos, setPos] = useState(0);
  const [results, setResults] = useState<Record<string, StepResult>>({});
  const [retried, setRetried] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<Outcome | null>(null);
  const [finished, setFinished] = useState<{ right: number; total: number; minutes: number } | null>(null);
  const startedAt = useRef(0);
  const sessionStart = useRef(0);

  useEffect(() => {
    if (!ready) return;
    if (!household.members.length) { router.replace('/heir/welcome'); return; }
    if (session || !me) return;
    const pool = allItems();
    const toDue = (list: { itemId: string; strength: number }[]) => list.flatMap((d) => { const item = getItem(d.itemId); return item ? [{ item, strength: d.strength }] : []; });
    const learnedUnits = new Set(mine.units);
    let next: Session;
    if (mode === 'lesson' && activity?.kind === 'learn') {
      const { unit, group } = activity;
      const item = getItem(unit.itemId)!;
      const seen = seenCounts(mine);
      const mates: Mate[] = group.items.flatMap((i) => {
        const units = unitsFor(i, track).filter((u) => learnedUnits.has(u.key));
        return units.length && i.id !== item.id ? [{ item: i, units, seen: seen.get(i.id) ?? 0 }] : [];
      });
      // Earlier parts of the item being learned count as practice too.
      const ownLearned = unitsFor(item, track).filter((u) => learnedUnits.has(u.key));
      if (ownLearned.length) mates.unshift({ item, units: ownLearned, seen: seen.get(item.id) ?? 0 });
      const inGroup = new Set(group.items.map((i) => i.id));
      const reviews = toDue(due.filter((d) => !inGroup.has(d.itemId)));
      next = { kind: 'learn', steps: buildLesson({ unit, item, track, mates, due: reviews, pool, rng: Math.random }), unit, group, memberId: me.id };
    } else if (mode === 'lesson' && activity?.kind === 'checkpoint') {
      next = { kind: 'checkpoint', steps: buildCheckpoint({ group: activity.group, track, pool, rng: Math.random }), unit: null, group: activity.group, memberId: me.id };
    } else {
      const list = due.length ? due : weakestCards(mine, new Set(items.map((i) => i.id)));
      next = { kind: 'review', steps: buildReview({ due: toDue(list), track, pool, rng: Math.random }), unit: null, group: null, memberId: me.id };
    }
    Promise.resolve().then(() => {
      setSession(next);
      setQueue(next.steps);
      startedAt.current = Date.now();
      sessionStart.current = Date.now();
    });
  }, [ready, household.members.length, session, me, items, track, mine, due, activity, mode, router]);

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
    updateProgress((p) => ({ ...p, [session.memberId]: finishSession(memberProgress(p, session.memberId), { results: recorded, learned: session.unit, checkpoint: session.kind === 'checkpoint' ? session.group?.key : null, now: new Date() }) }));
    const recall = recorded.filter((r) => r.kind !== 'intro');
    setFinished({ right: recall.filter((r) => r.correct).length, total: recall.length, minutes: Math.max(1, Math.round((Date.now() - sessionStart.current) / 60000)) });
  };

  const cantSpeak = () => setQueue((q) => q.map((s, i) => (i >= pos ? withoutSpeaking(s) : s)));
  const part = !step.review && session.unit && session.unit.itemId === step.itemId && session.unit.of > 1 ? ` · Part ${session.unit.part} of ${session.unit.of}` : '';
  const title = `${itemLabel(item)}${part}`;
  const retry = retried.has(step.id.replace(/:typed$/, '')) && queue.indexOf(step) !== pos;
  const heading = feedback?.ok ? PRAISE[pos % PRAISE.length] : feedback?.close ? 'Almost.' : 'Not quite.';

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
      {session.kind === 'checkpoint' && pos === 0 && !feedback && (
        <p style={{ margin: '0 4px', fontSize: 15, lineHeight: 1.45 }}><strong>Lock it in.</strong> Each of {session.group ? groupLabel(session.group) : 'these'}, from memory. This is meant to be hard.</p>
      )}
      <section key={`${step.id}-${pos}`} className="hr-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18, pointerEvents: feedback ? 'none' : undefined }}>
        {step.kind === 'intro' ? (
          <Intro item={item} track={track} step={step} onNext={advance} />
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
            {!feedback.ok && !retry && <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>You’ll get another try at the end.</p>}
            <button type="button" className="hr-btn" onClick={advance} autoFocus>Continue</button>
          </div>
        </div>
      )}
    </main>
  );
}

function Done({ session, finished, again }: { session: Session; finished: { right: number; total: number; minutes: number }; again(): void }) {
  const { activity, group, groupLearned } = useCourse();
  const item = session.unit ? getItem(session.unit.itemId) : null;
  const partial = session.unit && session.unit.part < session.unit.of;
  const label = session.group ? groupLabel(session.group) : '';
  const heading = session.kind === 'checkpoint' ? `${label}: locked in.` : item ? `${itemLabel(item)}: ${item.prompt}` : 'Every review makes the next one easier.';
  const message =
    session.kind === 'checkpoint' ? 'From here they come back on a spaced schedule: soon for any you found hard, then further apart each time you remember them, out to weeks and months.'
    : session.kind === 'review' ? 'Each review waits until you’re close to forgetting, which is when recalling it helps most.'
    : partial ? `Part ${session.unit!.part} of ${session.unit!.of} learned. The next lesson continues it.`
    : activity?.kind === 'checkpoint' ? `That’s all of ${groupLabel(activity.group)}. Next: lock them in, all together, from memory.`
    : group ? `${groupLearned} of ${group.items.length} in ${groupLabel(group)}. The next lesson adds one and practices these again.` : '';
  const cta = activity?.kind === 'checkpoint' ? 'Lock them in now' : activity ? 'Another lesson' : null;
  return (
    <main className="hr-page bare">
      <section className="hr-card" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <span className="hr-label">{session.kind === 'checkpoint' ? 'Checkpoint complete' : session.kind === 'review' ? 'Review complete' : 'Lesson complete'}</span>
        <p className="serif" style={{ margin: 0, fontSize: 28, lineHeight: 1.2, fontWeight: 600 }}>{heading}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Stat label="Right the first time" value={`${finished.right} of ${finished.total}`} />
          <Stat label="Time" value={`${finished.minutes} min`} />
        </div>
        {message && <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: 'var(--muted)' }}>{message}</p>}
        <Link className="hr-btn" href="/heir">Done</Link>
        {cta && session.kind !== 'review' && <button type="button" className="hr-btn quiet" onClick={again}>{cta}</button>}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'var(--well)', borderRadius: 16, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 20, fontWeight: 600 }}>{value}</span>
    </div>
  );
}
