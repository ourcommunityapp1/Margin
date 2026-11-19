'use client';

// Runs one lesson or review: a progress bar, one step at a time, feedback after each answer.
// A step missed on the first try comes back once at the end, as in most language apps.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useHeir } from './provider';
import { useCourse } from './course';
import { Blanks, Cue, Intro, Letters, Meaning, Order, Say, type Report } from './steps';
import { buildLesson, buildReview, nextUnit, withoutSpeaking, type Step, type Unit } from '@/heir/lesson';
import { finishSession, memberProgress, weakestCards, type StepResult } from '@/heir/progress';
import { allItems, getItem, itemLabel } from '@/heir/content';

interface Session { steps: Step[]; unit: Unit | null; memberId: string; review: boolean }

const PRAISE = ['Correct.', 'That’s right.', 'Well done.'];

export function LessonRunner({ mode }: { mode: 'lesson' | 'review' }) {
  const router = useRouter();
  const { ready, household, updateProgress } = useHeir();
  const { me, items, track, mine, due } = useCourse();
  const [session, setSession] = useState<Session | null>(null);
  const [queue, setQueue] = useState<Step[]>([]);
  const [pos, setPos] = useState(0);
  const [results, setResults] = useState<Record<string, StepResult>>({});
  const [retried, setRetried] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<{ ok: boolean; reveal?: ReactNode } | null>(null);
  const [finished, setFinished] = useState<{ right: number; total: number; minutes: number } | null>(null);
  const startedAt = useRef(0);
  const sessionStart = useRef(0);

  useEffect(() => {
    if (!ready) return;
    if (!household.members.length) { router.replace('/heir/welcome'); return; }
    if (session || !me) return;
    const ids = new Set(items.map((i) => i.id));
    const toItems = (list: { itemId: string; strength: number }[]) => list.flatMap((d) => { const item = getItem(d.itemId); return item ? [{ item, strength: d.strength }] : []; });
    const unit = mode === 'lesson' ? nextUnit(items, track, new Set(mine.units)) : null;
    let next: Session;
    if (unit) {
      const item = getItem(unit.itemId)!;
      const reviews = toItems(due.filter((d) => d.itemId !== unit.itemId));
      next = { steps: buildLesson({ unit, item, track, due: reviews, pool: allItems(), rng: Math.random }), unit, memberId: me.id, review: false };
    } else {
      const list = due.length ? due : weakestCards(mine, ids);
      next = { steps: buildReview({ due: toItems(list), track, rng: Math.random }), unit: null, memberId: me.id, review: true };
    }
    Promise.resolve().then(() => {
      setSession(next);
      setQueue(next.steps);
      startedAt.current = Date.now();
      sessionStart.current = Date.now();
    });
  }, [ready, household.members.length, session, me, items, track, mine, due, mode, router]);

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

  if (finished) return <Done session={session} finished={finished} anotherLesson={() => { setSession(null); setPos(0); setResults({}); setRetried(new Set()); setFinished(null); }} />;

  const step = queue[pos];
  const item = getItem(step.itemId)!;

  const report: Report = (ok, hints, reveal) => {
    const ms = Date.now() - startedAt.current;
    const key = step.id.replace(/:typed$/, '');
    setResults((r) => (r[key] ? r : { ...r, [key]: { itemId: step.itemId, kind: step.kind, correct: ok, hints, ms, review: step.review } }));
    if (!ok && !retried.has(key)) {
      setRetried((s) => new Set(s).add(key));
      setQueue((q) => [...q, step]);
    }
    setFeedback({ ok, reveal });
  };

  const advance = () => {
    setFeedback(null);
    const n = pos + 1;
    startedAt.current = Date.now();
    if (n < queue.length) { setPos(n); return; }
    const recorded = Object.values(results);
    updateProgress((p) => ({ ...p, [session.memberId]: finishSession(memberProgress(p, session.memberId), { results: recorded, learned: session.unit, now: new Date() }) }));
    const recall = recorded.filter((r) => r.kind !== 'intro');
    setFinished({ right: recall.filter((r) => r.correct).length, total: recall.length, minutes: Math.max(1, Math.round((Date.now() - sessionStart.current) / 60000)) });
  };

  const cantSpeak = () => setQueue((q) => q.map((s, i) => (i >= pos ? withoutSpeaking(s) : s)));
  const title = step.review ? itemLabel(item) : session.unit && session.unit.of > 1 ? `${itemLabel(item)} · Part ${session.unit.part} of ${session.unit.of}` : itemLabel(item);

  return (
    <main className="hr-page bare" style={{ paddingBottom: feedback ? 260 : undefined }}>
      <div className="hr-lesson-top">
        <Link href="/heir" className="hr-back" aria-label="End lesson">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </Link>
        <div className="hr-progress" role="progressbar" aria-valuemin={0} aria-valuemax={queue.length} aria-valuenow={pos} aria-label="Lesson progress">
          <span style={{ width: `${Math.round((pos / queue.length) * 100)}%` }} />
        </div>
      </div>
      <section key={`${step.id}-${pos}`} className="hr-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18, pointerEvents: feedback ? 'none' : undefined }}>
        {step.kind === 'intro' ? (
          <Intro item={item} track={track} step={step} onNext={advance} />
        ) : (
          <>
            {step.kind !== 'meaning' && <Cue item={item} step={step} title={title} />}
            {step.kind === 'meaning' && <span className="hr-label">{title}</span>}
            {step.kind === 'order' && <Order step={step} onReport={report} />}
            {step.kind === 'meaning' && <Meaning step={step} onReport={report} />}
            {step.kind === 'blanks' && <Blanks step={step} onReport={report} />}
            {step.kind === 'letters' && <Letters step={step} onReport={report} />}
            {step.kind === 'say' && <Say step={step} onReport={report} onCantSpeak={cantSpeak} />}
          </>
        )}
      </section>
      {feedback && (
        <div className="hr-sheet" data-ok={feedback.ok} role="status">
          <div>
            <h2>{feedback.ok ? PRAISE[pos % PRAISE.length] : 'Not quite. It will come back at the end.'}</h2>
            {feedback.reveal}
            <button type="button" className="hr-btn" onClick={advance} autoFocus>Continue</button>
          </div>
        </div>
      )}
    </main>
  );
}

function Done({ session, finished, anotherLesson }: { session: Session; finished: { right: number; total: number; minutes: number }; anotherLesson(): void }) {
  const { track, items, mine } = useCourse();
  const { now } = useHeir();
  const item = session.unit ? getItem(session.unit.itemId) : null;
  const more = !!nextUnit(items, track, new Set(mine.units));
  const card = item ? mine.cards[item.id] : undefined;
  const back = card ? Math.max(1, Math.round((new Date(card.due).getTime() - now.getTime()) / 86400000)) : null;
  const partial = session.unit && session.unit.part < session.unit.of;
  return (
    <main className="hr-page bare">
      <section className="hr-card" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <span className="hr-label">{session.review ? 'Review complete' : 'Lesson complete'}</span>
        <p className="serif" style={{ margin: 0, fontSize: 28, lineHeight: 1.2, fontWeight: 600 }}>
          {item ? `${itemLabel(item)}: ${item.prompt}` : 'Every review makes the next one easier to remember.'}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Stat label="Right the first time" value={`${finished.right} of ${finished.total}`} />
          <Stat label="Time" value={`${finished.minutes} min`} />
        </div>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: 'var(--muted)' }}>
          {partial ? `Part ${session.unit!.part} of ${session.unit!.of} learned. The next lesson continues it.`
            : back ? `It comes back for review in ${back} day${back === 1 ? '' : 's'}, about when you’d start to forget it.`
            : 'Each review waits until you’re about to forget, which is when recalling it helps most.'}
        </p>
        <Link className="hr-btn" href="/heir">Done</Link>
        {more && !session.review && <button type="button" className="hr-btn quiet" onClick={anotherLesson}>Another lesson</button>}
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
