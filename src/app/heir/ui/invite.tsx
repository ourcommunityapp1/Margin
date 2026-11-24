'use client';

// Opening a friend's invite to Katekize. Signed out visitors are sent to sign in and back here (the app does that for
// every page); then they make a profile if they have none, see who invited them, and choose to accept.

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { acceptFriendInvite, cloud, peekFriendInvite } from './cloud';
import { Gate, useProfile } from './social';
import { Tabs } from './tabs';

type Peek = { status: 'ok' | 'friends' | 'used' | 'own' | 'invalid'; name?: string; username?: string };

export function InviteScreen({ code }: { code: string }) {
  const g = useProfile();
  const [peek, setPeek] = useState<Peek | null>(null);
  const [done, setDone] = useState<{ name: string } | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const asked = useRef(false);

  useEffect(() => {
    if (!code || !g.profile || asked.current) return;
    asked.current = true;
    const db = cloud();
    if (!db) return;
    peekFriendInvite(db, code).then(setPeek).catch(() => setPeek({ status: 'invalid' }));
  }, [code, g.profile]);

  const accept = async () => {
    const db = cloud();
    if (!db) return;
    setBusy(true); setError('');
    try { setDone(await acceptFriendInvite(db, code)); } catch (e) { setError((e as Error).message); }
    setBusy(false);
  };

  const heading = (t: string) => <p className="serif" style={{ margin: 0, fontSize: 28, lineHeight: 1.18, fontWeight: 600 }}>{t}</p>;
  const muted = (t: string) => <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5, color: 'var(--muted)' }}>{t}</p>;
  const here = `/heir/invite?code=${code}`;

  let body: React.ReactNode;
  if (!code) body = <>{heading('This invite link is incomplete.')}{muted('Ask for a new one.')}</>;
  else if (g.profile === undefined) body = heading('One moment…');
  else if (g.profile === null) body = (
    <>
      {heading('Someone invited you to Katekize.')}
      {muted('Make a profile first so your friend can find you. It takes a minute. Friends see your name and progress, never your answers.')}
      <Link className="hr-btn" href={`/heir/profile?next=${encodeURIComponent(here)}`}>Make my profile</Link>
    </>
  );
  else if (done) body = (
    <>
      {heading(`You and ${done.name} are friends.`)}
      {muted('You can see each other’s streaks and words in memory, and you’re on each other’s community board.')}
      <Link className="hr-btn" href="/heir/friends">See my friends</Link>
    </>
  );
  else if (!peek) body = heading('One moment…');
  else if (peek.status === 'ok') body = (
    <>
      {heading(`${peek.name} invited you to be friends on Katekize.`)}
      {muted('Friends see each other’s streaks, words in memory, stones and courses. Never answers.')}
      {error && <p role="alert" style={{ margin: 0, color: 'var(--miss)', fontSize: 15 }}>{error}</p>}
      <button type="button" className="hr-btn" disabled={busy} onClick={accept}>{busy ? 'Adding…' : `Be friends with ${peek.name}`}</button>
      <Link href="/heir" style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 15 }}>Not now</Link>
    </>
  );
  else if (peek.status === 'friends') body = <>{heading(`You and ${peek.name} are already friends.`)}<Link className="hr-btn" href="/heir/friends">See my friends</Link></>;
  else if (peek.status === 'own') body = <>{heading('This is your own invite.')}{muted('Send it to someone who isn’t on Katekize yet.')}<Link className="hr-btn" href="/heir/friends">Back to Friends</Link></>;
  else if (peek.status === 'used') body = <>{heading('This invite was already used or has expired.')}{muted('Ask your friend to send a new one.')}</>;
  else body = <>{heading('That invite didn’t work.')}{muted('Ask your friend to send a new one.')}</>;

  return (
    <Gate g={g}>
      <main className="hr-page">
        <section className="hr-card" style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>{body}</section>
      </main>
      <Tabs />
    </Gate>
  );
}
