'use client';

// Sign in with a code sent by email. A code (rather than a link) keeps sign-in inside the home-screen app
// on an iPhone, where a tapped link would open Safari instead.

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useHeir } from './provider';
import { cloud } from './cloud';

export function SignIn({ next }: { next: string }) {
  const router = useRouter();
  const { accounts, email: signedIn, household } = useHeir();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accounts || signedIn) router.replace(next);
  }, [accounts, signedIn, next, router]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const db = cloud();
    if (!db) return;
    setBusy(true); setError('');
    const { error } = await db.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) setError('We couldn’t send a code. Check the address and try again.'); else setSent(true);
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    const db = cloud();
    if (!db) return;
    setBusy(true); setError('');
    const { error } = await db.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) setError('That code didn’t work. Check it, or send a new one.');
  };

  return (
    <main className="hr-page bare">
      <section className="hr-card" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <p className="serif" style={{ margin: 0, fontSize: 28, lineHeight: 1.18 }}>
          <span style={{ fontWeight: 600 }}>Sign in.</span> <span style={{ color: 'var(--muted)' }}>{household.members.length
            ? 'Your progress on this phone will be saved to your account, and kept on every phone you sign in on.'
            : 'One account for the family, so progress is kept on every phone.'}</span>
        </p>
        {!sent ? (
          <form onSubmit={send} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label htmlFor="heir-email" className="hr-label">Your email</label>
            <input id="heir-email" type="text" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <button type="submit" className="hr-btn" disabled={busy || !/.+@.+\..+/.test(email)}>{busy ? 'Sending…' : 'Email me a code'}</button>
          </form>
        ) : (
          <form onSubmit={verify} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label htmlFor="heir-code" className="hr-label">The code we sent to {email}</label>
            <input id="heir-code" type="text" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} required style={{ letterSpacing: 4 }} />
            <button type="submit" className="hr-btn" disabled={busy || code.trim().length < 6}>{busy ? 'Checking…' : 'Sign in'}</button>
            <button type="button" className="hr-btn quiet" onClick={() => { setSent(false); setCode(''); }}>Use a different email</button>
          </form>
        )}
        {error && <p role="alert" style={{ margin: 0, fontSize: 15 }}>{error}</p>}
      </section>
    </main>
  );
}
