'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useHeir } from './provider';
import { Back, Tabs } from './tabs';
import { addMember, removeMember, setActive, updateMember } from '@/heir/household';
import type { Track } from '@/heir/types';
import { newId } from './ids';

export function FamilyScreen({ setup }: { setup: boolean }) {
  const { ready, household, update } = useHeir();
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
        {!setup && <div style={{ marginTop: 8 }}><Back href="/heir/you" /></div>}
        <section className="hr-card" style={{ marginTop: setup ? 40 : 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 className="serif" style={{ margin: 0, fontSize: 30, fontWeight: 500, lineHeight: 1.15 }}>{setup ? 'Who’s memorizing with you?' : 'Family'}</h1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: 'var(--muted)' }}>Everyone gets their own pace and progress. The child track uses shorter pieces.{members.length > 1 ? ' Tap a name to make it the active person on this phone.' : ''}</p>

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
        {setup && (
          <Link className="hr-btn" href={members.length ? '/heir/plan?setup=1' : '#'} aria-disabled={!members.length}
            style={{ marginTop: 'auto', opacity: members.length ? 1 : 0.45, pointerEvents: members.length ? 'auto' : 'none' }}>Continue</Link>
        )}
      </main>
      {!setup && <Tabs />}
    </>
  );
}
