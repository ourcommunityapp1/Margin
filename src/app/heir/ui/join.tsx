'use client';

// Accepting an invite to link accounts. The visitor signs in first (the app sends anyone signed out to sign-in and
// back here), then the two accounts are linked: each can see the other's progress, view only.

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useHeir } from './provider';
import { acceptInvite, cloud } from './cloud';

export function JoinScreen({ code }: { code: string }) {
  const router = useRouter();
  const { ready, email, accounts, household } = useHeir();
  const [state, setState] = useState<'working' | 'linked' | 'failed'>('working');
  const [error, setError] = useState('');
  const tried = useRef(false);

  useEffect(() => {
    if (!code || !ready || !email || tried.current) return;
    tried.current = true;
    const db = cloud();
    if (!db) return;
    acceptInvite(db, code).then(() => setState('linked')).catch((e: Error) => { setError(e.message || 'That invite didn’t work.'); setState('failed'); });
  }, [code, ready, email]);

  if (!accounts) return <main className="hr-page bare"><p style={{ margin: 'auto', textAlign: 'center' }}>Accounts aren’t switched on for this copy of Heir.</p></main>;
  if (!ready || !email) return <main className="hr-page bare" aria-busy="true" />;

  return (
    <main className="hr-page bare">
      <section className="hr-card" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {!code ? (
          <p className="serif" style={{ margin: 0, fontSize: 26, lineHeight: 1.2, fontWeight: 600 }}>This invite link is incomplete. Ask for a new one.</p>
        ) : state === 'working' ? (
          <p className="serif" style={{ margin: 0, fontSize: 26, lineHeight: 1.2, fontWeight: 600 }}>Linking your accounts…</p>
        ) : state === 'linked' ? (
          <>
            <p className="serif" style={{ margin: 0, fontSize: 28, lineHeight: 1.18 }}>
              <span style={{ fontWeight: 600 }}>You’re linked.</span> <span style={{ color: 'var(--muted)' }}>You each keep your own account and progress, and can see each other’s. Neither of you can change the other’s.</span>
            </p>
            <button type="button" className="hr-btn" onClick={() => router.push(household.members.length ? '/heir/family' : '/heir/start')}>{household.members.length ? 'See the Family page' : 'Set up my own account'}</button>
          </>
        ) : (
          <>
            <p className="serif" style={{ margin: 0, fontSize: 26, lineHeight: 1.2, fontWeight: 600 }}>That invite didn’t work.</p>
            <p role="alert" style={{ margin: 0, fontSize: 16, lineHeight: 1.5 }}>{error} Ask the person who invited you to send a new one.</p>
          </>
        )}
      </section>
    </main>
  );
}
