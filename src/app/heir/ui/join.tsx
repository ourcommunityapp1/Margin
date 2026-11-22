'use client';

// Joining a family from an invite link. The visitor signs in first (the app sends anyone signed out to sign-in and
// back here), the invite adds their account to the family, and then they add themselves and choose a course.

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useHeir } from './provider';
import { cloud, joinWithInvite } from './cloud';
import { addMember } from '@/heir/household';
import { newId } from './ids';

export function JoinScreen({ code }: { code: string }) {
  const router = useRouter();
  const { ready, email, household, update, accounts } = useHeir();
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const tried = useRef(false);

  // Signed in with an invite: join, then reload so the family loads for this account.
  useEffect(() => {
    if (!code || !ready || !email || tried.current) return;
    tried.current = true;
    const db = cloud();
    if (!db) return;
    joinWithInvite(db, code)
      .then(() => window.location.replace('/heir/join'))
      .catch((e: Error) => setError(e.message || 'That invite didn’t work.'));
  }, [code, ready, email]);

  // Nothing to join and already someone here: carry on.
  const me = household.members.find((m) => m.id === household.activeMemberId);
  useEffect(() => {
    if (ready && !code && me) router.replace('/heir');
  }, [ready, code, me, router]);

  if (!accounts) return <main className="hr-page bare"><p style={{ margin: 'auto', textAlign: 'center' }}>Accounts aren’t switched on for this copy of Heir.</p></main>;
  if (!ready || (!email && code)) return <main className="hr-page bare" aria-busy="true" />;

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    update((h) => addMember(h, name, 'adult', newId(), new Date()));
    router.push('/heir/plan?setup=1');
  };

  return (
    <main className="hr-page bare">
      <section className="hr-card" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {error ? (
          <>
            <p className="serif" style={{ margin: 0, fontSize: 26, lineHeight: 1.2, fontWeight: 600 }}>That invite didn’t work.</p>
            <p role="alert" style={{ margin: 0, fontSize: 16, lineHeight: 1.5 }}>{error} Ask the person who invited you to send a new one.</p>
          </>
        ) : code ? (
          <p className="serif" style={{ margin: 0, fontSize: 26, lineHeight: 1.2, fontWeight: 600 }}>Joining the family…</p>
        ) : (
          <form onSubmit={add} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p className="serif" style={{ margin: 0, fontSize: 28, lineHeight: 1.18 }}>
              <span style={{ fontWeight: 600 }}>You’re in.</span> <span style={{ color: 'var(--muted)' }}>{household.members.length ? `You’re joining ${household.members.map((m) => m.name).join(', ')}. ` : ''}What’s your name?</span>
            </p>
            <label htmlFor="heir-join-name" className="hr-label">Your name</label>
            <input id="heir-join-name" type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" maxLength={40} />
            <button type="submit" className="hr-btn" disabled={!name.trim()}>Continue</button>
          </form>
        )}
      </section>
    </main>
  );
}
