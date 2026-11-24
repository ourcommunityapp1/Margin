'use client';

// Friends: your profile, search, requests, your friends and a friend's profile.
// The database decides what each person may see; these screens only show what it returns.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useHeir } from './provider';
import { Back, Tabs } from './tabs';
import {
  answerRequest, blockPerson, cancelRequest, cloud, getProfile, listFriends, listRequests, reportPerson, saveProfile, searchPeople, sendRequest,
  deleteProfile, unfriend, usernameFree, viewPerson, type FriendRow, type MyProfile, type Person, type RequestRow,
} from './cloud';
import { courseFor } from '@/heir/content';
import { LEVELS } from '@/heir/levels';
import { friendsCount, place, sinceLabel, streakLine, usernameProblem } from '@/heir/social';
import { localDay } from '@/heir/progress';

const COLORS = ['#9ad1d4', '#ffd6a5', '#c3b1e1', '#b5e48c', '#ffadad', '#a0c4ff', '#caffbf', '#fdffb6', '#ffc6ff'];
const colorFor = (s: string) => COLORS[[...s].reduce((n, c) => n + c.charCodeAt(0), 0) % COLORS.length];

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return <span aria-hidden="true" style={{ width: size, height: size, borderRadius: size / 2, background: colorFor(name), color: '#11161c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.4, flex: 'none' }}>{name[0]}</span>;
}

const chevron = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: 'var(--muted)', flex: 'none' }}><path d="M9 6l6 6-6 6" /></svg>;

function Blocked({ children }: { children: React.ReactNode }) {
  return <main className="hr-page bare"><section className="hr-card" style={{ margin: 'auto 0', display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</section></main>;
}

/** Wraps a screen: not for everyone yet, needs an account, and loads the signed-in person's profile. */
function useProfile() {
  const { ready, accounts, email } = useHeir();
  const [profile, setProfile] = useState<MyProfile | null | undefined>(undefined);
  const reload = useCallback(() => {
    const db = cloud();
    if (!db) return;
    getProfile(db).then((p) => setProfile(p ?? null)).catch(() => setProfile(null));
  }, []);
  useEffect(() => { if (ready && accounts && email) reload(); }, [ready, accounts, email, reload]);
  return { ready, accounts, email, profile, reload, setProfile };
}

function Gate({ children, g }: { children: React.ReactNode; g: ReturnType<typeof useProfile> }) {
  if (!g.ready) return <main className="hr-page" aria-busy="true" />;
  if (!g.accounts || !g.email) return <Blocked><p className="serif" style={{ margin: 0, fontSize: 24 }}>Sign in to find friends and keep your progress on every phone.</p><Link className="hr-btn" href="/heir/signin?next=%2Fheir%2Ffriends">Sign in</Link></Blocked>;
  return <>{children}</>;
}

// ---------------------------------------------------------------------------------------------------- your profile

export function ProfileScreen() {
  const g = useProfile();
  const [first, setFirst] = useState(''), [last, setLast] = useState(''), [username, setUsername] = useState(''), [city, setCity] = useState(''), [region, setRegion] = useState('');
  const [discoverable, setDiscoverable] = useState(true), [fof, setFof] = useState(true), [ageOk, setAgeOk] = useState(false);
  const [avail, setAvail] = useState<'idle' | 'checking' | 'free' | 'taken' | 'bad'>('idle');
  const [availNote, setAvailNote] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(false);
  const { household } = useHeir();
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const filled = useRef(false);

  useEffect(() => {
    if (g.profile === undefined || filled.current) return;
    filled.current = true;
    Promise.resolve().then(() => {
      if (g.profile) {
        setFirst(g.profile.first_name); setLast(g.profile.last_name); setUsername(g.profile.username); setCity(g.profile.city ?? ''); setRegion(g.profile.region ?? '');
        setDiscoverable(g.profile.discoverable); setFof(g.profile.fof_visible);
      } else {
        const adult = household.members.find((m) => m.track === 'adult');
        if (adult) setFirst(adult.name.split(' ')[0] ?? '');
      }
    });
  }, [g.profile, household.members]);

  // Check the username as it's typed.
  useEffect(() => {
    const name = username.trim();
    if (!name || name === g.profile?.username) { Promise.resolve().then(() => { setAvail('idle'); setAvailNote(''); }); return; }
    const bad = usernameProblem(name);
    if (bad) { Promise.resolve().then(() => { setAvail('bad'); setAvailNote(bad); }); return; }
    Promise.resolve().then(() => setAvail('checking'));
    const t = setTimeout(() => {
      const db = cloud();
      if (!db) return;
      usernameFree(db, name).then((free) => { setAvail(free ? 'free' : 'taken'); setAvailNote(free ? 'Available' : `@${name} is taken. Try @${name}_2`); }).catch(() => { setAvail('idle'); setAvailNote(''); });
    }, 400);
    return () => clearTimeout(t);
  }, [username, g.profile?.username]);

  const creating = g.profile === null;
  const save = async () => {
    const db = cloud();
    if (!db) return;
    setBusy(true); setError(''); setSaved(false);
    try {
      const p = await saveProfile(db, { first, last, username: username.trim(), city, region, discoverable, fof, ageOk });
      g.setProfile(p); setSaved(true);
    } catch (e) { setError((e as Error).message); }
    setBusy(false);
  };
  const removeProfile = async () => {
    const db = cloud();
    if (!db) return;
    try { await deleteProfile(db); router.push('/heir/you'); } catch (e) { setError((e as Error).message); setConfirmDelete(false); }
  };
  const ready = first.trim() && last.trim() && !usernameProblem(username) && avail !== 'taken' && (!creating || ageOk);

  return (
    <Gate g={g}>
      <main className="hr-page">
        <div style={{ marginTop: 8 }}><Back href="/heir/you" /></div>
        <h1 className="serif" style={{ margin: '0 4px', fontSize: 30, fontWeight: 500 }}>Your profile</h1>
        {g.profile === undefined ? <p style={{ margin: '0 4px', color: 'var(--muted)' }}>Loading…</p> : (
          <>
            <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span className="hr-label">First name</span><input id="p-first" type="text" autoComplete="given-name" maxLength={40} value={first} onChange={(e) => setFirst(e.target.value)} /></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span className="hr-label">Last name</span><input id="p-last" type="text" autoComplete="family-name" maxLength={40} value={last} onChange={(e) => setLast(e.target.value)} /></label>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Friends see {first || 'Landon'} {last || 'Whitlock'}. Everyone else sees {first || 'Landon'} {(last || 'Whitlock')[0].toUpperCase()}.</p>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="hr-label">Username</span>
                <input id="p-username" type="text" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={20} value={username} onChange={(e) => setUsername(e.target.value.replace(/^@/, ''))} />
                <span role="status" style={{ fontSize: 13, color: avail === 'free' ? 'var(--good)' : avail === 'taken' || avail === 'bad' ? 'var(--miss)' : 'var(--muted)' }}>
                  {avail === 'checking' ? 'Checking…' : availNote || '3 to 20 letters, numbers or underscores. No two people can have the same one.'}
                </span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 10 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span className="hr-label">City (optional)</span><input id="p-city" type="text" autoComplete="address-level2" maxLength={60} value={city} onChange={(e) => setCity(e.target.value)} /></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span className="hr-label">State</span><input id="p-region" type="text" autoComplete="address-level1" maxLength={30} value={region} onChange={(e) => setRegion(e.target.value)} /></label>
              </div>
            </section>
            <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', flexDirection: 'column' }}><b>Let people find me</b><span style={{ fontSize: 13, color: 'var(--muted)' }}>In search, by name or username</span></span>
                <input type="checkbox" checked={discoverable} onChange={(e) => setDiscoverable(e.target.checked)} style={{ width: 24, height: 24, accentColor: 'var(--good)' }} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', flexDirection: 'column' }}><b>Friends of friends see my rank</b><span style={{ fontSize: 13, color: 'var(--muted)' }}>On the community board</span></span>
                <input type="checkbox" checked={fof} onChange={(e) => setFof(e.target.checked)} style={{ width: 24, height: 24, accentColor: 'var(--good)' }} />
              </label>
              {creating && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 15 }}>I’m 13 or older</span>
                  <input type="checkbox" checked={ageOk} onChange={(e) => setAgeOk(e.target.checked)} style={{ width: 24, height: 24, accentColor: 'var(--good)' }} />
                </label>
              )}
            </section>
            <p style={{ margin: '0 4px', fontSize: 13, color: 'var(--muted)' }}>Children in your family are never searchable and never shown to anyone.</p>
            {error && <p role="alert" style={{ margin: '0 4px', color: 'var(--miss)', fontSize: 15 }}>{error}</p>}
            {saved && <p role="status" style={{ margin: '0 4px', color: 'var(--good)', fontSize: 15 }}>Saved.</p>}
            <button type="button" className="hr-btn" disabled={!ready || busy} onClick={save}>{busy ? 'Saving…' : creating ? 'Make my profile' : 'Save'}</button>
            <p style={{ margin: '0 4px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>Your name, username and place are what friends and search can see. Read <Link href="/privacy" style={{ color: 'inherit' }}>how Katekize uses them</Link>.</p>
            {!creating && (
              <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {!confirmDelete ? (
                  <button type="button" className="hr-btn" style={{ background: 'transparent', color: 'var(--miss)' }} onClick={() => setConfirmDelete(true)}>Delete my profile</button>
                ) : (
                  <>
                    <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>Delete your profile? You’ll disappear from search, and your friendships and requests end. Your lessons and progress are not touched.</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <button type="button" className="hr-btn" style={{ background: 'var(--well)', color: 'var(--ink)' }} onClick={() => setConfirmDelete(false)}>Keep it</button>
                      <button type="button" className="hr-btn" style={{ background: 'var(--miss)', color: 'var(--card)' }} onClick={removeProfile}>Delete</button>
                    </div>
                  </>
                )}
              </section>
            )}
          </>
        )}
      </main>
      <Tabs />
    </Gate>
  );
}

// ---------------------------------------------------------------------------------------------------- the Friends tab

function relationButton(p: Person, act: (p: Person) => void, busy: boolean) {
  if (p.relation === 'friend') return <span className="hr-tag">Friends</span>;
  if (p.relation === 'requested') return <span className="hr-tag">Sent</span>;
  return <button type="button" className="hr-tag" disabled={busy} onClick={(e) => { e.preventDefault(); act(p); }} style={{ border: 0, cursor: 'pointer', background: 'var(--button)', color: 'var(--button-ink)', padding: '8px 14px', fontSize: 14 }}>{p.relation === 'incoming' ? 'Accept' : 'Add'}</button>;
}

export function FriendsScreen() {
  const g = useProfile();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Person[] | null>(null);
  const [friends, setFriends] = useState<FriendRow[] | null>(null);
  const [incoming, setIncoming] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { now } = useHeir();

  const load = useCallback(() => {
    const db = cloud();
    if (!db) return;
    listFriends(db).then(setFriends).catch(() => setError('Couldn’t load your friends. Check your connection.'));
    listRequests(db).then((r) => setIncoming(r.incoming.length)).catch(() => { /* the count is a convenience */ });
  }, []);
  useEffect(() => { if (g.profile) Promise.resolve().then(load); }, [g.profile, load]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { Promise.resolve().then(() => setResults(null)); return; }
    const t = setTimeout(() => {
      const db = cloud();
      if (!db) return;
      searchPeople(db, term).then((r) => { setResults(r); setError(''); }).catch((e: Error) => setError(e.message));
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const act = async (p: Person) => {
    const db = cloud();
    if (!db) return;
    setBusy(true); setError('');
    try {
      if (p.relation === 'incoming') {
        const r = await listRequests(db);
        const req = r.incoming.find((x) => x.username === p.username);
        if (req) await answerRequest(db, req.id, true);
        setResults((rs) => rs?.map((x) => x.username === p.username ? { ...x, relation: 'friend' } : x) ?? null);
        load();
      } else {
        const out = await sendRequest(db, p.username);
        setResults((rs) => rs?.map((x) => x.username === p.username ? { ...x, relation: out === 'friends' ? 'friend' : 'requested' } : x) ?? null);
        if (out === 'friends') load();
      }
    } catch (e) { setError((e as Error).message); }
    setBusy(false);
  };

  const today = localDay(now);
  return (
    <Gate g={g}>
      <main className="hr-page">
        <h1 className="serif" style={{ margin: '8px 4px 0', fontSize: 34, fontWeight: 500 }}>Friends</h1>
        {g.profile === undefined ? <p style={{ margin: '0 4px', color: 'var(--muted)' }}>Loading…</p> : g.profile === null ? (
          <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p className="serif" style={{ margin: 0, fontSize: 24, lineHeight: 1.2 }}>Memorize with friends. Make a profile to find people and be found.</p>
            <p style={{ margin: 0, fontSize: 15, color: 'var(--muted)' }}>Friends see your streak, words in memory, stones and courses. Never your answers. Children are never shown.</p>
            <Link className="hr-btn" href="/heir/profile">Make my profile</Link>
          </section>
        ) : (
          <>
            <input id="friend-search" type="text" role="searchbox" aria-label="Search by name or username" placeholder="Search by name or username" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={q} onChange={(e) => setQ(e.target.value)} />
            {error && <p role="alert" style={{ margin: '0 4px', color: 'var(--miss)', fontSize: 15 }}>{error}</p>}
            {results !== null ? (
              <section className="hr-card" style={{ padding: '4px 18px' }} aria-label="Search results">
                {results.length === 0 ? <p style={{ margin: '14px 0', color: 'var(--muted)' }}>No one found. They may not have turned on “Let people find me”.</p> : results.map((p) => (
                  <Link key={p.username} href={`/heir/u?name=${encodeURIComponent(p.username)}`} className="hr-row" style={{ gap: 12, minHeight: 72 }}>
                    <Avatar name={p.name} />
                    <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, gap: 1 }}>
                      <b>{p.name}</b>
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>@{p.username}{place(p.city, p.region) ? ` · ${place(p.city, p.region)}` : ''}</span>
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>{friendsCount(p.friends_count)}{p.mutual ? ` · ${p.mutual} in common` : ''}</span>
                    </span>
                    {relationButton(p, act, busy)}
                  </Link>
                ))}
              </section>
            ) : (
              <>
                <Link href="/heir/friends/requests" className="hr-card hr-row" style={{ minHeight: 56, padding: '10px 20px', gap: 12 }}>
                  <b style={{ flex: 1 }}>Friend requests</b>
                  {incoming > 0 && <span className="hr-tag" style={{ background: 'var(--button)', color: 'var(--button-ink)' }}>{incoming}</span>}
                  {chevron}
                </Link>
                <section className="hr-card" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 4 }} aria-label="Your friends">
                  <span className="hr-label">{friends ? friendsCount(friends.length) : 'Friends'}</span>
                  {friends && friends.length === 0 && <p style={{ margin: '10px 0 4px', color: 'var(--muted)', lineHeight: 1.5 }}>No friends yet. Search for someone above to send a request.</p>}
                  {(friends ?? []).map((f) => (
                    <Link key={f.username} href={`/heir/u?name=${encodeURIComponent(f.username)}`} className="hr-row" style={{ gap: 12, minHeight: 64 }}>
                      <Avatar name={f.name} size={36} />
                      <span style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                        <b>{f.name}</b>
                        <span style={{ fontSize: 13, color: 'var(--muted)' }}>{streakLine(f.streak, f.last_day, today)}</span>
                      </span>
                      <b style={{ fontVariantNumeric: 'tabular-nums' }}>{f.words_in_memory.toLocaleString('en-US')}</b>
                    </Link>
                  ))}
                  {friends && friends.length > 0 && <span style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'right' }}>words in memory</span>}
                </section>
              </>
            )}
          </>
        )}
      </main>
      <Tabs />
    </Gate>
  );
}

// ---------------------------------------------------------------------------------------------------- requests

export function RequestsScreen() {
  const g = useProfile();
  const [data, setData] = useState<{ incoming: RequestRow[]; outgoing: RequestRow[] } | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => { const db = cloud(); if (db) listRequests(db).then(setData).catch(() => setError('Couldn’t load requests. Check your connection.')); }, []);
  useEffect(() => { if (g.profile) Promise.resolve().then(load); }, [g.profile, load]);
  const run = async (fn: (db: NonNullable<ReturnType<typeof cloud>>) => Promise<void>) => {
    const db = cloud();
    if (!db) return;
    try { await fn(db); load(); } catch (e) { setError((e as Error).message); }
  };
  return (
    <Gate g={g}>
      <main className="hr-page">
        <div style={{ marginTop: 8 }}><Back href="/heir/friends" /></div>
        <h1 className="serif" style={{ margin: '0 4px', fontSize: 30, fontWeight: 500 }}>Friend requests</h1>
        {error && <p role="alert" style={{ margin: '0 4px', color: 'var(--miss)' }}>{error}</p>}
        <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span className="hr-label">For you{data ? ` · ${data.incoming.length}` : ''}</span>
          {data && data.incoming.length === 0 && <p style={{ margin: 0, color: 'var(--muted)' }}>No requests right now.</p>}
          {(data?.incoming ?? []).map((r) => (
            <div key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
              <Link href={`/heir/u?name=${encodeURIComponent(r.username)}`} style={{ display: 'flex', gap: 12, alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
                <Avatar name={r.name} />
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <b>{r.name}</b>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>@{r.username}{place(r.city, r.region) ? ` · ${place(r.city, r.region)}` : ''}</span>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>{friendsCount(r.friends_count ?? 0)}{r.mutual ? ` · ${r.mutual} in common` : ''}</span>
                </span>
              </Link>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button type="button" className="hr-btn" style={{ background: 'var(--well)', color: 'var(--ink)', minHeight: 46 }} onClick={() => run((db) => answerRequest(db, r.id, false))}>Not now</button>
                <button type="button" className="hr-btn" style={{ minHeight: 46 }} onClick={() => run((db) => answerRequest(db, r.id, true))}>Accept</button>
              </div>
            </div>
          ))}
          {data && data.incoming.length > 0 && <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>“Not now” doesn’t tell them.</p>}
        </section>
        {data && data.outgoing.length > 0 && (
          <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="hr-label">You sent · {data.outgoing.length}</span>
            {data.outgoing.map((r) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={r.name} size={32} />
                <span style={{ flex: 1 }}>{r.name}</span>
                <button type="button" className="hr-tag" style={{ border: 0, cursor: 'pointer' }} onClick={() => run((db) => cancelRequest(db, r.id))}>Cancel</button>
              </div>
            ))}
          </section>
        )}
      </main>
      <Tabs />
    </Gate>
  );
}

// ---------------------------------------------------------------------------------------------------- a person

export function PersonScreen({ name }: { name: string }) {
  const g = useProfile();
  const router = useRouter();
  const [p, setP] = useState<Person | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState<'unfriend' | 'block' | 'report' | null>(null);
  const [note, setNote] = useState('');
  const { now } = useHeir();
  const load = useCallback(() => { const db = cloud(); if (db && name) viewPerson(db, name).then(setP).catch(() => setP(null)); }, [name]);
  useEffect(() => { if (g.profile) Promise.resolve().then(load); }, [g.profile, load]);

  const run = async (fn: (db: NonNullable<ReturnType<typeof cloud>>) => Promise<unknown>, after?: () => void) => {
    const db = cloud();
    if (!db) return;
    setError('');
    try { await fn(db); setConfirm(null); if (after) after(); else load(); } catch (e) { setError((e as Error).message); }
  };
  const today = localDay(now);

  return (
    <Gate g={g}>
      <main className="hr-page">
        <div style={{ marginTop: 8 }}><Back href="/heir/friends" /></div>
        {p === undefined ? <p style={{ margin: '0 4px', color: 'var(--muted)' }}>Loading…</p> : p === null ? (
          <section className="hr-card"><p className="serif" style={{ margin: 0, fontSize: 24 }}>We couldn’t find that person.</p></section>
        ) : (
          <>
            <header style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
              <Avatar name={p.name} size={72} />
              <h1 className="serif" style={{ margin: '6px 0 0', fontSize: 30, fontWeight: 500 }}>{p.name}</h1>
              <span style={{ color: 'var(--muted)' }}>@{p.username}{place(p.city, p.region) ? ` · ${place(p.city, p.region)}` : ''}</span>
              <span style={{ color: 'var(--muted)', fontSize: 14 }}>{friendsCount(p.friends_count)}{p.mutual ? ` · ${p.mutual} in common` : ''}</span>
              {p.relation === 'friend' && p.friends_since && <span className="hr-tag" style={{ marginTop: 4 }}>Friends since {sinceLabel(p.friends_since)}</span>}
            </header>
            {p.relation === 'none' && <button type="button" className="hr-btn" onClick={() => run((db) => sendRequest(db, p.username))}>Add friend</button>}
            {p.relation === 'incoming' && <button type="button" className="hr-btn" onClick={() => run(async (db) => { const r = await listRequests(db); const req = r.incoming.find((x) => x.username === p.username); if (req) await answerRequest(db, req.id, true); })}>Accept request</button>}
            {p.relation === 'requested' && <p style={{ margin: 0, textAlign: 'center', color: 'var(--muted)' }}>Request sent.</p>}
            {(p.relation === 'none' || p.relation === 'requested' || p.relation === 'incoming') && (
              <p className="hr-card" style={{ margin: 0, fontSize: 14, color: 'var(--muted)', textAlign: 'center', border: '1px dashed var(--line)', background: 'transparent' }}>Their streak, words in memory, stones and courses show here once you’re friends.</p>
            )}
            {(p.relation === 'friend' || p.relation === 'me') && p.stones && (
              <>
                <section className="hr-card" aria-label="Summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', textAlign: 'center', gap: 4 }}>
                  <span style={{ display: 'flex', flexDirection: 'column' }}><b className="serif" style={{ fontSize: 24 }}>{(p.words_in_memory ?? 0).toLocaleString('en-US')}</b><span style={{ fontSize: 12, color: 'var(--muted)' }}>words in memory</span></span>
                  <span style={{ display: 'flex', flexDirection: 'column' }}><b className="serif" style={{ fontSize: 24 }}>{p.streak ?? 0}</b><span style={{ fontSize: 12, color: 'var(--muted)' }}>{(p.streak ?? 0) > 0 ? 'day streak' : streakLine(0, p.last_day, today)}</span></span>
                  <span style={{ display: 'flex', flexDirection: 'column' }}><b className="serif" style={{ fontSize: 24 }}>{p.friends_count}</b><span style={{ fontSize: 12, color: 'var(--muted)' }}>friends</span></span>
                </section>
                <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} aria-label="Stones">
                  <span className="hr-label">Stones</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, textAlign: 'center' }}>
                    {LEVELS.map((l, i) => (
                      <div key={l.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, opacity: (p.stones?.[i] ?? 0) > 0 ? 1 : 0.4 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/heir/stones/${l.id}.jpg`} alt="" width={40} height={40} style={{ borderRadius: 20, objectFit: 'cover', filter: (p.stones?.[i] ?? 0) > 0 ? 'none' : 'grayscale(1)' }} />
                        <b style={{ fontVariantNumeric: 'tabular-nums' }}>{p.stones?.[i] ?? 0}</b>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{l.counts}</span>
                      </div>
                    ))}
                  </div>
                </section>
                {(p.courses ?? []).length > 0 && (
                  <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} aria-label="Courses">
                    <span className="hr-label">Courses</span>
                    {(p.courses ?? []).map((c) => (
                      <div key={c.course} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <span style={{ display: 'flex', justifyContent: 'space-between' }}><b>{courseFor(c.course)?.title ?? c.course}</b><span style={{ color: 'var(--muted)', fontSize: 14 }}>{c.learned} of {c.total}</span></span>
                        <span style={{ height: 6, borderRadius: 3, background: 'var(--well)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: `${Math.round((c.learned / Math.max(1, c.total)) * 100)}%`, background: 'var(--good)' }} /></span>
                      </div>
                    ))}
                  </section>
                )}
                {(p.friends ?? []).length > 0 && (
                  <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-label="Their friends">
                    <span className="hr-label">Friends · {p.friends_count}</span>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      {(p.friends ?? []).map((f) => (
                        <Link key={f.username} href={`/heir/u?name=${encodeURIComponent(f.username)}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textDecoration: 'none', color: 'inherit', width: 64 }}>
                          <Avatar name={f.name} size={44} /><span style={{ fontSize: 12, textAlign: 'center' }}>{f.name.split(' ')[0]}</span>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
            {error && <p role="alert" style={{ margin: 0, color: 'var(--miss)', textAlign: 'center' }}>{error}</p>}
            {p.relation !== 'me' && (
              <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {confirm === null ? (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {p.relation === 'friend' && <button type="button" className="hr-tag" style={{ border: 0, cursor: 'pointer', padding: '8px 12px' }} onClick={() => setConfirm('unfriend')}>Remove friend</button>}
                    <button type="button" className="hr-tag" style={{ border: 0, cursor: 'pointer', padding: '8px 12px' }} onClick={() => setConfirm('block')}>Block</button>
                    <button type="button" className="hr-tag" style={{ border: 0, cursor: 'pointer', padding: '8px 12px' }} onClick={() => setConfirm('report')}>Report</button>
                  </div>
                ) : confirm === 'report' ? (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span className="hr-label">What’s wrong? (optional)</span><input id="report-note" type="text" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} /></label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <button type="button" className="hr-btn" style={{ background: 'var(--well)', color: 'var(--ink)' }} onClick={() => setConfirm(null)}>Cancel</button>
                      <button type="button" className="hr-btn" onClick={() => run((db) => reportPerson(db, p.username, 'abuse', note), () => setConfirm(null))}>Send report</button>
                    </div>
                  </>
                ) : (
                  <>
                    <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>{confirm === 'unfriend' ? `Remove ${p.name} as a friend? They won’t be told.` : `Block ${p.name}? You’ll be hidden from each other everywhere, and any friendship or request ends.`}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <button type="button" className="hr-btn" style={{ background: 'var(--well)', color: 'var(--ink)' }} onClick={() => setConfirm(null)}>Keep</button>
                      <button type="button" className="hr-btn" style={{ background: 'var(--miss)', color: 'var(--card)' }} onClick={() => run((db) => confirm === 'unfriend' ? unfriend(db, p.username) : blockPerson(db, p.username), () => router.push('/heir/friends'))}>{confirm === 'unfriend' ? 'Remove' : 'Block'}</button>
                    </div>
                  </>
                )}
              </section>
            )}
          </>
        )}
      </main>
      <Tabs />
    </Gate>
  );
}

