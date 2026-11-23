'use client';

// First run: a name, what to memorize, a daily goal with what it means in dates, then the first lesson.
// Other family members and settings can wait; they live under Family.

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useHeir } from '../ui/provider';
import { CourseChoices } from '../ui/courses';
import { newId } from '../ui/ids';
import { addMember, setPlan } from '@/heir/household';
import { courseFor } from '@/heir/content';
import { emptyProgress } from '@/heir/progress';
import { AllCourses, GoalChoices, LongTermNote } from '../ui/goal';

export default function Start() {
  const router = useRouter();
  const { ready, household, update } = useHeir();
  const [step, setStep] = useState<'name' | 'course' | 'goal'>('name');
  const [name, setName] = useState('');
  const [course, setCourse] = useState<string | null>(null);
  const [minutes, setMinutes] = useState<number | null>(15);
  const hasSomeone = household.members.length > 0;
  const starting = useRef(false);

  // Someone already set up: only the course is missing, or nothing is.
  useEffect(() => {
    if (ready && hasSomeone && household.plan && !starting.current) router.replace('/heir');
  }, [ready, hasSomeone, household.plan, router]);

  if (!ready) return <main className="hr-page bare" aria-busy="true" />;
  const askName = step === 'name' && !hasSomeone;

  const begin = () => {
    if (!course) return;
    starting.current = true;
    // Made once, outside the update: an update function may run twice and must give the same result.
    const id = newId(), now = new Date();
    update((h) => setPlan(h.members.length ? h : addMember(h, name, 'adult', id, now), { course, minutes: minutes ?? 15 }));
    router.push('/heir/lesson');
  };

  return (
    <main className="hr-page bare">
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <span className="hr-mark" aria-hidden="true" style={{ width: 24, height: 28 }} />
        <span className="serif" style={{ fontSize: 24, fontWeight: 500 }}>Katekize</span>
      </div>
      {askName ? (
        <form className="hr-card" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}
          onSubmit={(e) => { e.preventDefault(); if (name.trim()) setStep('course'); }}>
          <label htmlFor="heir-name" className="serif" style={{ fontSize: 28, lineHeight: 1.2, fontWeight: 600 }}>What’s your name?</label>
          <input id="heir-name" type="text" autoComplete="given-name" autoCapitalize="words" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <button type="submit" className="hr-btn" disabled={!name.trim()}>Continue</button>
        </form>
      ) : step === 'goal' && course ? (
        <section className="hr-card" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 className="serif" style={{ margin: 0, fontSize: 28, lineHeight: 1.2, fontWeight: 600 }}>How long each day?</h1>
          <p style={{ margin: 0, fontSize: 15, color: 'var(--muted)', lineHeight: 1.5 }}>A goal to plan around. You can always do more.</p>
          <GoalChoices value={minutes} onChange={setMinutes} course={courseFor(course)!} track="adult" p={emptyProgress()} />
          {minutes && <AllCourses minutes={minutes} track="adult" p={emptyProgress()} />}
          <LongTermNote />
          <button type="button" className="hr-btn" disabled={!minutes} onClick={begin}>Start the first lesson</button>
          <button type="button" className="hr-btn quiet" onClick={() => setStep('course')}>Back</button>
        </section>
      ) : (
        <section className="hr-card" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 className="serif" style={{ margin: 0, fontSize: 28, lineHeight: 1.2, fontWeight: 600 }}>What would you like to memorize?</h1>
          <CourseChoices value={course} onChange={setCourse} />
          <button type="button" className="hr-btn" disabled={!course} onClick={() => setStep('goal')}>Continue</button>
          {!hasSomeone && <button type="button" className="hr-btn quiet" onClick={() => setStep('name')}>Back</button>}
        </section>
      )}
    </main>
  );
}
