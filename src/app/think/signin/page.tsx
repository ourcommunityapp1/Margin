'use client';

// Sign in with a code sent by email. A code (rather than a link) keeps the whole sign-in inside
// the home-screen app on an iPhone, where a tapped link would open Safari instead.

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/think/client/session';

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const db = supabase();

  useEffect(() => {
    if (!db) { router.replace('/think'); return; }
    db.auth.getSession().then(({ data }) => { if (data.session) router.replace('/think'); });
  }, [db, router]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    setBusy(true);
    setError('');
    const { error } = await db.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/think` } });
    setBusy(false);
    if (error) setError(error.message); else setSent(true);
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    setBusy(true);
    setError('');
    const { error } = await db.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) setError('That code didn’t work. Check it, or send a new one.'); else router.replace('/think');
  };

  const field = 'h-14 rounded-xl border border-[var(--rule)] bg-white px-4 text-[17px]';
  const primary = 'h-14 rounded-[28px] bg-[var(--ink)] text-[16px] font-medium text-[var(--paper)] disabled:opacity-60';

  return (
    <main className="dt-screen dt-top dt-bottom justify-center gap-7 px-6">
      <div className="flex flex-col gap-3">
        <h1 className="serif m-0 text-[36px] font-medium tracking-[-0.5px]">Deep Think</h1>
        <p className="serif m-0 text-[19px] leading-[1.5] text-[var(--body)]">A private place to think out loud. Every word on the page is yours.</p>
      </div>
      {!sent ? (
        <form onSubmit={send} className="flex flex-col gap-3">
          <label className="flex flex-col gap-2 text-[13px] text-[var(--muted)]">Your email
            <input type="email" required autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
          </label>
          <button disabled={busy} className={primary}>{busy ? 'Sending…' : 'Email me a sign-in code'}</button>
        </form>
      ) : (
        <form onSubmit={verify} className="flex flex-col gap-3">
          <label className="flex flex-col gap-2 text-[13px] text-[var(--muted)]">The code we sent to {email}
            <input required inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} className={`${field} tracking-[4px]`} />
          </label>
          <button disabled={busy} className={primary}>{busy ? 'Checking…' : 'Sign in'}</button>
          <button type="button" onClick={() => { setSent(false); setCode(''); }} className="h-11 text-[14px] text-[var(--accent)]">Use a different email</button>
        </form>
      )}
      {error && <p className="m-0 text-[14px] text-[var(--accent-deep)]" role="alert">{error}</p>}
      <p className="m-0 text-[12px] leading-[1.5] text-[var(--muted)]">Your notes are private to your account. Nothing in them is written by AI.</p>
    </main>
  );
}
