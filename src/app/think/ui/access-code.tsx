'use client';

// Shown when Deep Think has no sign-in set up and this device hasn't entered the access code
// yet. It's the same code as the listening app on this site, so most devices skip this.

import { useState } from 'react';
import { enterAccessCode } from '@/think/client/session';

export function AccessCode({ onDone }: { onDone(): void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const problem = await enterAccessCode(code);
    setBusy(false);
    if (problem) setError(problem); else onDone();
  };

  return (
    <main className="dt-screen dt-top dt-bottom justify-center gap-7 px-6">
      <div className="flex flex-col gap-3">
        <h1 className="serif m-0 text-[36px] font-medium tracking-[-0.5px]">Deep Think</h1>
        <p className="serif m-0 text-[19px] leading-[1.5] text-[var(--body)]">A private place to think out loud. Every word on the page is yours.</p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-2 text-[13px] text-[var(--muted)]">Access code (the same one as Margin)
          <input required autoCapitalize="none" autoCorrect="off" value={code} onChange={(e) => setCode(e.target.value)} className="h-14 rounded-xl border border-[var(--rule)] bg-white px-4 text-[17px]" />
        </label>
        <button disabled={busy} className="h-14 rounded-[28px] bg-[var(--ink)] text-[16px] font-medium text-[var(--paper)] disabled:opacity-60">{busy ? 'Checking…' : 'Continue'}</button>
      </form>
      {error && <p className="m-0 text-[14px] text-[var(--accent-deep)]" role="alert">{error}</p>}
      <p className="m-0 text-[12px] leading-[1.5] text-[var(--muted)]">Your notes are kept on this device for now.</p>
    </main>
  );
}
