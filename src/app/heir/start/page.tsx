'use client';

// First run: a name, then what to memorize, then straight into the first lesson.
// Other family members and settings can wait; they live under Family.

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useHeir } from '../ui/provider';
import { CourseChoices } from '../ui/courses';
import { newId } from '../ui/ids';
import { addMember, setPlan } from '@/heir/household';

export default function Start() {
  const router = useRouter();
  const { ready, household, update } = useHeir();
  const [step, setStep] = useState<'name' | 'course'>('name');
  const [name, setName] = useState('');
  const [course, setCourse] = useState<string | null>(null);
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
    update((h) => setPlan(h.members.length ? h : addMember(h, name, 'adult', newId(), new Date()), { course }));
    router.push('/heir/lesson');
  };

  return (
    <main className="hr-page bare">
      <span className="serif" style={{ fontSize: 24, fontWeight: 500, textAlign: 'center', marginTop: 8 }}>Heir</span>
      {askName ? (
        <form className="hr-card" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}
          onSubmit={(e) => { e.preventDefault(); if (name.trim()) setStep('course'); }}>
          <label htmlFor="heir-name" className="serif" style={{ fontSize: 28, lineHeight: 1.2, fontWeight: 600 }}>What’s your name?</label>
          <input id="heir-name" type="text" autoComplete="given-name" autoCapitalize="words" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <button type="submit" className="hr-btn" disabled={!name.trim()}>Continue</button>
        </form>
      ) : (
        <section className="hr-card" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 className="serif" style={{ margin: 0, fontSize: 28, lineHeight: 1.2, fontWeight: 600 }}>What would you like to memorize?</h1>
          <CourseChoices value={course} onChange={setCourse} />
          <button type="button" className="hr-btn" disabled={!course} onClick={begin}>Start the first lesson</button>
          {!hasSomeone && <button type="button" className="hr-btn quiet" onClick={() => setStep('name')}>Back</button>}
        </section>
      )}
    </main>
  );
}
