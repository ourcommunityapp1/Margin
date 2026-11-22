'use client';

// What every Heir screen needs: the family, who is signed in, and the time of day.
// The household always lives on this device. When Heir's database is set up, it also syncs to the
// signed-in account, and a household that only lived on the phone is carried up on first sign-in.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Household } from '@/heir/types';
import { emptyHousehold, parseHousehold } from '@/heir/household';
import { chooseOnSignIn } from '@/heir/sync';
import { parseProgress, type Progress } from '@/heir/progress';
import { settle } from '@/heir/levels';
import { allItems } from '@/heir/content';
import { timeOfDay, type TimeOfDay } from '@/heir/time';
import { cloud, loadRemote, saveRemote, type Remote } from './cloud';

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
  sync: SyncState;
  signOut(): Promise<void>;
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
  const [sync, setSync] = useState<SyncState>('local');
  const remote = useRef<Remote | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const arrive = async (userEmail: string | null) => {
      if (!live) return;
      setProgress(loadProgress());
      setEmail(userEmail);
      if (!userEmail) { remote.current = null; setHousehold(loadLocal()); setSync('local'); setReady(true); return; }
      try {
        const found = await loadRemote(db);
        const pick = chooseOnSignIn(loadLocal(), found?.household ?? null);
        remote.current = found;
        if (pick.upload) remote.current = await saveRemote(db, pick.household, found);
        if (!live) return;
        setHousehold(pick.household);
        saveLocal(pick.household);
        setSync('synced');
      } catch {
        if (!live) return;
        setHousehold(loadLocal());
        setSync('offline');
      }
      setReady(true);
    };
    db.auth.getSession().then(({ data }) => arrive(data.session?.user.email ?? null));
    const { data: sub } = db.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') arrive(session?.user.email ?? null);
    });
    return () => { live = false; sub.subscription.unsubscribe(); };
  }, [db]);

  // Signed out with accounts on: everything except welcome, sign-in and about asks to sign in first.
  useEffect(() => {
    if (!accounts || email !== null || OPEN_PAGES.includes(path)) return;
    // A first visit opens on the welcome screen; any other page asks to sign in and then returns.
    router.replace(path === '/heir' ? '/heir/welcome' : `/heir/signin?next=${encodeURIComponent(path + window.location.search)}`);
  }, [accounts, email, path, router]);

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
      try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(next)); } catch { /* private mode: kept for this visit */ }
      return next;
    });
  }, []);

  const signOut = useCallback(async () => {
    await db?.auth.signOut();
    try { localStorage.removeItem(KEY); } catch { /* nothing stored */ }
  }, [db]);

  const now = useMemo(() => clock ?? new Date(0), [clock]);
  const time = clock ? timeOfDay(clock) : 'day';
  const value = useMemo(() => ({ ready, household, update, progress, updateProgress, time, now, accounts, email: email ?? null, sync, signOut }),
    [ready, household, update, progress, updateProgress, time, now, accounts, email, sync, signOut]);

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
