'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useHeir } from './provider';
import { Tabs } from './tabs';
import { addMember, removeMember, setActive, updateMember } from '@/heir/household';
import type { Track } from '@/heir/types';
import { newId } from './ids';
import { cloud, createInvite } from './cloud';

export function FamilyScreen({ setup }: { setup: boolean }) {
  const { ready, household, update, accounts, email, sync, signOut, updateProgress } = useHeir();
  const [confirmReset, setConfirmReset] = useState(false);
  const [name, setName] = useState('');
  const [track, setTrack] = useState<Track>('adult');

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const id = newId(), now = new Date();
    update((h) => addMember(h, name, track, id, now));
    setName('');
  };

  if (!ready) return <main className="hr-page" aria-busy="true" />;
  const members = household.members;

  return (
    <>
      <main className={`hr-page${setup ? ' bare' : ''}`}>
        <section className="hr-card" style={{ marginTop: setup ? 40 : 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 className="serif" style={{ margin: 0, fontSize: 30, fontWeight: 500, lineHeight: 1.15 }}>{setup ? 'Who’s memorizing with you?' : 'Family'}</h1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: 'var(--muted)' }}>Everyone gets their own pace and progress. The child track uses shorter pieces. Tap a name to make it the active person on this phone.</p>

          {members.length > 0 && (
            <div>
              {members.map((m) => (
                <div key={m.id} className="hr-row">
                  <button type="button" onClick={() => update((h) => setActive(h, m.id))} aria-pressed={household.activeMemberId === m.id}
                    style={{ flex: 1, minHeight: 56, border: 0, background: 'transparent', color: 'var(--ink)', textAlign: 'left', font: 'inherit', display: 'flex', flexDirection: 'column', gap: 2, cursor: 'pointer' }}>
                    <span style={{ fontWeight: 600, fontSize: 16 }}>{m.name}{household.activeMemberId === m.id ? ' · active' : ''}</span>
                    <span style={{ fontSize: 14, color: 'var(--muted)' }}>{m.track === 'child' ? 'Child track' : 'Adult track'}</span>
                  </button>
                  <button type="button" className="hr-tag" style={{ border: 0, cursor: 'pointer', minHeight: 36 }}
                    onClick={() => update((h) => updateMember(h, m.id, { track: m.track === 'child' ? 'adult' : 'child' }))}
                    aria-label={`Switch ${m.name} to the ${m.track === 'child' ? 'adult' : 'child'} track`}>
                    {m.track === 'child' ? 'Child' : 'Adult'}
                  </button>
                  <button type="button" onClick={() => update((h) => removeMember(h, m.id))} aria-label={`Remove ${m.name}`}
                    style={{ width: 44, height: 44, border: 0, background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={add} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label htmlFor="heir-name" className="hr-label">Add someone</label>
            <input id="heir-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" autoComplete="off" maxLength={40} />
            <div className="hr-seg" role="group" aria-label="Track" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', background: 'var(--well)' }}>
              <button type="button" aria-pressed={track === 'adult'} onClick={() => setTrack('adult')}>Adult track</button>
              <button type="button" aria-pressed={track === 'child'} onClick={() => setTrack('child')}>Child track</button>
            </div>
            <button type="submit" className="hr-btn" disabled={!name.trim()} style={{ background: 'var(--well)', color: 'var(--ink)' }}>Add</button>
          </form>
        </section>
        {!setup && accounts && email && <InviteCard />}
        {setup && (
          <Link className="hr-btn" href={members.length ? '/heir/plan?setup=1' : '#'} aria-disabled={!members.length}
            style={{ marginTop: 'auto', opacity: members.length ? 1 : 0.45, pointerEvents: members.length ? 'auto' : 'none' }}>Continue</Link>
        )}
        {!setup && accounts && email && (
          <p style={{ margin: 0, textAlign: 'center', fontSize: 14 }}>
            Signed in as {email}{sync === 'offline' ? ' · couldn’t reach the server; changes are kept on this phone' : ''} ·{' '}
            <button type="button" onClick={signOut} style={{ background: 'none', border: 0, padding: 0, font: 'inherit', color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}>Sign out</button>
          </p>
        )}
        {!setup && (
          <StartOver name={household.members.find((m) => m.id === household.activeMemberId)?.name ?? ''} armed={confirmReset} setArmed={setConfirmReset}
            erase={() => { const id = household.activeMemberId; if (id) updateProgress((p) => { const next = { ...p }; delete next[id]; return next; }); setConfirmReset(false); }} />
        )}
        {!setup && (
          <Link href="/heir/about" style={{ alignSelf: 'center', fontSize: 14, color: 'var(--ink)', padding: 12 }}>About Heir and photo credits</Link>
        )}
      </main>
      {!setup && <Tabs />}
    </>
  );
}

// Erases one person's progress (lessons, stones, days kept, awards) on this phone. Two taps, so it can't happen by accident.
function StartOver({ name, armed, setArmed, erase }: { name: string; armed: boolean; setArmed(v: boolean): void; erase(): void }) {
  const [done, setDone] = useState(false);
  if (!name) return null;
  return (
    <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span className="hr-label">Start over</span>
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>
        {done ? `${name}’s progress is cleared. The next lesson starts from the welcome.` : `Clear ${name}’s lessons, stones, days kept and awards on this phone, and begin again from the welcome lesson.`}
      </p>
      {!done && (armed ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button type="button" className="hr-btn" style={{ background: 'var(--well)', color: 'var(--ink)' }} onClick={() => setArmed(false)}>Keep it</button>
          <button type="button" className="hr-btn" style={{ background: 'var(--miss)', color: 'var(--card)' }} onClick={() => { erase(); setDone(true); }}>Erase progress</button>
        </div>
      ) : (
        <button type="button" className="hr-btn" style={{ background: 'var(--well)', color: 'var(--ink)' }} onClick={() => setArmed(true)}>Start over</button>
      ))}
    </section>
  );
}

// Make a single-use link (good for a week) that adds someone's own account to this family, and send it.
function InviteCard() {
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const make = async () => {
    const db = cloud();
    if (!db) return;
    setBusy(true); setError(''); setCopied(false);
    try {
      const code = await createInvite(db);
      setLink(`${window.location.origin}/heir/join?code=${code}`);
    } catch {
      setError('Couldn’t make an invite. Check your connection and try again.');
    }
    setBusy(false);
  };
  const send = async () => {
    try {
      if (navigator.share) { await navigator.share({ title: 'Join my family on Heir', text: 'Join my family on Heir:', url: link }); return; }
    } catch { /* cancelled: fall through to copying */ }
    try { await navigator.clipboard.writeText(link); setCopied(true); } catch { /* the link is shown, so it can be copied by hand */ }
  };

  return (
    <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span className="hr-label">Invite your spouse</span>
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>They sign in with their own email, and get their own progress, stones and course. You’ll see each other in the family. The link works once, for a week.</p>
      {link ? (
        <>
          <input readOnly value={link} aria-label="Invite link" onFocus={(e) => e.currentTarget.select()} style={{ fontSize: 13 }} />
          <button type="button" className="hr-btn" onClick={send}>{copied ? 'Link copied' : 'Send the link'}</button>
        </>
      ) : (
        <button type="button" className="hr-btn" style={{ background: 'var(--well)', color: 'var(--ink)' }} onClick={make} disabled={busy}>{busy ? 'Making a link…' : 'Make an invite link'}</button>
      )}
      {error && <p role="alert" style={{ margin: 0, fontSize: 14, color: 'var(--miss)' }}>{error}</p>}
    </section>
  );
}
