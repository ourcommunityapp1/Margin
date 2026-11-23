'use client';

// What every Heir screen needs: the family, who is signed in, and the time of day.
// The household and everyone's progress always live on this device. When Heir's database is set up, both also
// sync to the signed-in account: what only lived on the phone is carried up on first sign-in, and from then on the
// phone's and the account's copies of each person's progress are merged, never overwritten.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Household, Track } from '@/heir/types';
import { addMember, emptyHousehold, parseHousehold } from '@/heir/household';
import { chooseOnSignIn } from '@/heir/sync';
import { memberProgress, mergeProgress, parseProgress, sameProgress, type MemberProgress, type Progress } from '@/heir/progress';
import { settle } from '@/heir/levels';
import { allItems } from '@/heir/content';
import { timeOfDay, type TimeOfDay } from '@/heir/time';
import { cloud, loadProgressRows, loadRemote, saveProgressRows, saveRemote, type Remote } from './cloud';
import { LABS } from '@/heir/labs';

const KEY = 'heir-household-v1';
const PROGRESS_KEY = 'heir-progress-v1';
const OPEN_PAGES = ['/heir/welcome', '/heir/signin', '/heir/about'];

type SyncState = 'local' | 'synced' | 'saving' | 'offline';

interface Heir {
  ready: boolean;
  household: Household;
  update(change: (h: Household) => Household): void;
  // Everyone's progress on this device, by member id.
  progress: Progress;
  updateProgress(change: (p: Progress) => Progress): void;
  time: TimeOfDay;
  now: Date;
  accounts: boolean;
  email: string | null;
  // Features still being tried out, shown only to the accounts in LABS (see labs.ts).
  labs: boolean;
  sync: SyncState;
  signOut(): Promise<void>;
  /** Bring back a removed person (saved progress still on this phone) under their old id, and save it to the account. */
  restorePerson(id: string, name: string, track: Track): Promise<boolean>;
  /** Fold a removed person's saved progress into someone already in the family. */
  mergeProgressInto(fromId: string, toId: string): void;
}

const Ctx = createContext<Heir | null>(null);

export function useHeir(): Heir {
  const v = useContext(Ctx);
  if (!v) throw new Error('useHeir outside HeirProvider');
  return v;
}

function loadLocal(): Household {
  try { return parseHousehold(localStorage.getItem(KEY)); } catch { return emptyHousehold(); }
}
function loadProgress(): Progress {
  let p: Progress = {};
  try { p = parseProgress(localStorage.getItem(PROGRESS_KEY)); } catch { return {}; }
  // Progress saved before stone levels existed: work out what its answer log has already earned.
  return Object.fromEntries(Object.entries(p).map(([id, m]) =>
    [id, Object.keys(m.levels).length || !m.log.length ? m : settle(m, allItems(), 'adult', new Date()).progress]));
}
function saveProgressLocal(p: Progress) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch { /* private mode: kept for this visit */ }
}

// The account's progress for these members, merged with this phone's; the merged copy is kept on the phone, and
// sent back to the account wherever the phone had something the account didn't.
async function pullProgress(db: NonNullable<ReturnType<typeof cloud>>, householdId: string, memberIds: string[]): Promise<Progress> {
  const local = loadProgress();
  const theirs = await loadProgressRows(db, householdId);
  const merged: Progress = { ...local };
  const send: Record<string, MemberProgress> = {};
  for (const id of memberIds) {
    const a = local[id], b = theirs[id];
    merged[id] = a && b ? mergeProgress(b, a) : (a ?? b);
    if (merged[id] && (!b || !sameProgress(b, merged[id]))) send[id] = merged[id];
    if (!merged[id]) delete merged[id];
  }
  if (Object.keys(send).length) await saveProgressRows(db, householdId, send);
  saveProgressLocal(merged);
  return merged;
}

function saveLocal(h: Household) {
  try { localStorage.setItem(KEY, JSON.stringify(h)); } catch { /* private mode: keeps working for this visit */ }
}

export function HeirProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const db = cloud();
  const accounts = !!db;
  const [household, setHousehold] = useState<Household>(emptyHousehold);
  const [progress, setProgress] = useState<Progress>({});
  const [ready, setReady] = useState(false);
  // Unknown until the page is running on the phone: pages are prebuilt, so the server's clock means nothing.
  const [clock, setClock] = useState<Date | null>(null);
  // undefined while checking; null when signed out.
  const [email, setEmail] = useState<string | null | undefined>(accounts ? undefined : null);
  const [userId, setUserId] = useState<string | null>(null);
  const [sync, setSync] = useState<SyncState>('local');
  const remote = useRef<Remote | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<Progress>({});

  // Lets the app be installed to the home screen (see public/heir-sw.js). Production only, so development isn't cached.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) navigator.serviceWorker.register('/heir-sw.js', { scope: '/heir' }).catch(() => { /* not installable here: the app still works */ });
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => setClock(new Date()));
    const t = setInterval(() => setClock(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Device only: read the stored household once.
  useEffect(() => {
    if (accounts) return;
    Promise.resolve().then(() => { setHousehold(loadLocal()); setProgress(loadProgress()); setReady(true); });
  }, [accounts]);

  // With accounts: follow the session, and on sign-in load (or carry up) the household.
  useEffect(() => {
    if (!db) return;
    let live = true;
    const arrive = async (userEmail: string | null, id: string | null) => {
      if (!live) return;
      setProgress(loadProgress());
      setEmail(userEmail);
      setUserId(id);
      if (!userEmail) { remote.current = null; setHousehold(loadLocal()); setSync('local'); setReady(true); return; }
      try {
        const found = await loadRemote(db);
        const pick = chooseOnSignIn(loadLocal(), found?.household ?? null);
        remote.current = found;
        if (pick.upload) remote.current = await saveRemote(db, pick.household, found);
        if (!live) return;
        setHousehold(pick.household);
        saveLocal(pick.household);
        if (remote.current) {
          const merged = await pullProgress(db, remote.current.householdId, pick.household.members.map((m) => m.id));
          if (!live) return;
          setProgress(merged);
        }
        setSync('synced');
      } catch {
        if (!live) return;
        setHousehold(loadLocal());
        setSync('offline');
      }
      setReady(true);
    };
    db.auth.getSession().then(({ data }) => arrive(data.session?.user.email ?? null, data.session?.user.id ?? null));
    const { data: sub } = db.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') arrive(session?.user.email ?? null, session?.user.id ?? null);
    });
    return () => { live = false; sub.subscription.unsubscribe(); };
  }, [db]);

  // Signed out with accounts on: everything except welcome, sign-in and about asks to sign in first.
  useEffect(() => {
    if (!accounts || email !== null || !ready || OPEN_PAGES.includes(path)) return;
    // A first visit opens on the welcome screen; anyone with a family on this phone already, or on any other page,
    // is asked to sign in (their phone's progress is then carried up) and returns.
    router.replace(path === '/heir' && !household.members.length ? '/heir/welcome' : `/heir/signin?next=${encodeURIComponent(path + window.location.search)}`);
  }, [accounts, email, ready, household.members.length, path, router]);

  const update = useCallback((change: (h: Household) => Household) => {
    setHousehold((h) => {
      const next = change(h);
      saveLocal(next);
      if (db && email) {
        setSync('saving');
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          saveRemote(db, next, remote.current)
            .then((r) => { remote.current = r; setSync('synced'); })
            .catch(() => setSync('offline'));
        }, 600);
      }
      return next;
    });
  }, [db, email]);

  const updateProgress = useCallback((change: (p: Progress) => Progress) => {
    setProgress((p) => {
      const next = change(p);
      saveProgressLocal(next);
      progressRef.current = next;
      if (db && email && remote.current) {
        setSync('saving');
        if (progressTimer.current) clearTimeout(progressTimer.current);
        progressTimer.current = setTimeout(() => {
          const r = remote.current;
          if (!r) return;
          const ids = new Set(r.memberRows.map((m) => m.id));
          const mine = Object.fromEntries(Object.entries(progressRef.current).filter(([id]) => ids.has(id)));
          saveProgressRows(db, r.householdId, mine)
            .then((saved) => {
              // Bring in anything another phone added, without undoing changes made while this was saving.
              setProgress((cur) => {
                const out = { ...cur };
                for (const [id, s] of Object.entries(saved)) out[id] = out[id] ? mergeProgress(out[id], s) : s;
                saveProgressLocal(out);
                progressRef.current = out;
                return out;
              });
              setSync('synced');
            })
            .catch(() => setSync('offline'));
        }, 800);
      }
      return next;
    });
  }, [db, email]);

  // Back on the app (another phone may have saved a lesson): bring the account's progress in.
  useEffect(() => {
    if (!db || !email) return;
    const onShow = () => {
      const r = remote.current;
      if (document.visibilityState !== 'visible' || !r) return;
      pullProgress(db, r.householdId, r.memberRows.map((m) => m.id)).then(setProgress).catch(() => setSync('offline'));
    };
    document.addEventListener('visibilitychange', onShow);
    return () => document.removeEventListener('visibilitychange', onShow);
  }, [db, email]);

  const signOut = useCallback(async () => {
    await db?.auth.signOut();
    try { localStorage.removeItem(KEY); } catch { /* nothing stored */ }
  }, [db]);

  const restorePerson = useCallback(async (id: string, name: string, track: Track) => {
    const next = addMember(household, name, track, id, new Date());
    if (next === household) return false;
    setHousehold(next);
    saveLocal(next);
    if (db && email) {
      setSync('saving');
      try {
        const r = await saveRemote(db, next, remote.current);
        remote.current = r;
        if (progress[id]) await saveProgressRows(db, r.householdId, { [id]: progress[id] });
        setSync('synced');
      } catch { setSync('offline'); }
    }
    return true;
  }, [household, progress, db, email]);

  const mergeProgressInto = useCallback((fromId: string, toId: string) => {
    updateProgress((all) => {
      const next = { ...all };
      if (all[fromId]) next[toId] = mergeProgress(memberProgress(all, toId), all[fromId]);
      delete next[fromId];
      return next;
    });
  }, [updateProgress]);

  const now = useMemo(() => clock ?? new Date(0), [clock]);
  const time = clock ? timeOfDay(clock) : 'day';
  const labs = !!userId && LABS.includes(userId);
  const value = useMemo(() => ({ ready, household, update, progress, updateProgress, time, now, accounts, email: email ?? null, labs, sync, signOut, restorePerson, mergeProgressInto }),
    [ready, household, update, progress, updateProgress, time, now, accounts, email, labs, sync, signOut, restorePerson, mergeProgressInto]);

  return (
    <Ctx.Provider value={value}>
      <div className="hr" data-time={time} data-theme="dark">
        <div className="hr-bg" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {clock && <img src={`/heir/bg-${time}.jpg`} alt="" />}
        </div>
        {children}
      </div>
    </Ctx.Provider>
  );
}
