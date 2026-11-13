'use client';

// What every Deep Think screen needs: what this deployment can do, who is signed in, and where
// notes are stored. It also sends people to sign-in and onboarding when those come first.

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getStatus, supabase, type Status } from '@/think/client/session';
import { cloudStore, deviceStore, type Store } from '@/think/client/store';
import type { Profile } from '@/think/types';

interface Think {
  status: Status;
  store: Store;
  email: string | null;
  profile: Profile | null;
  setProfile(p: Profile): void;
  signOut(): Promise<void>;
}

const Ctx = createContext<Think | null>(null);

export function useThink(): Think {
  const v = useContext(Ctx);
  if (!v) throw new Error('useThink outside ThinkProvider');
  return v;
}

interface Session { userId: string | null; email: string | null }

export function ThinkProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [status, setStatus] = useState<Status | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  // undefined: not loaded yet. null: loaded, and onboarding hasn't happened.
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    getStatus().then((s) => { if (live) setStatus(s); });
    const db = supabase();
    if (!db) {
      Promise.resolve().then(() => { if (live) setSession({ userId: null, email: null }); });
      return () => { live = false; };
    }
    db.auth.getSession().then(({ data }) => {
      if (live) setSession({ userId: data.session?.user.id ?? null, email: data.session?.user.email ?? null });
    });
    const { data: sub } = db.auth.onAuthStateChange((_event, s) => {
      const next = { userId: s?.user.id ?? null, email: s?.user.email ?? null };
      setSession((cur) => (cur && cur.userId === next.userId && cur.email === next.email ? cur : next));
    });
    return () => { live = false; sub.subscription.unsubscribe(); };
  }, []);

  const accounts = !!supabase();
  const known = !!session;
  const userId = session?.userId ?? null;
  const email = session?.email ?? null;
  // Keyed on who is signed in, not on each token refresh, so a note being written is never
  // interrupted by one.
  const store = useMemo<Store | null>(() => {
    if (!known) return null;
    const db = supabase();
    if (!db) return deviceStore();
    return userId ? cloudStore(db, userId) : null;
  }, [known, userId]);

  useEffect(() => {
    if (!store) return;
    let live = true;
    store.profile().then((p) => { if (live) setProfile(p); });
    return () => { live = false; };
  }, [store]);

  const needsSignIn = !!session && accounts && !userId;
  const needsWelcome = !!store && profile === null;
  useEffect(() => {
    if (needsSignIn && path !== '/think/signin') router.replace('/think/signin');
    else if (needsWelcome && path !== '/think/welcome') router.replace('/think/welcome');
  }, [needsSignIn, needsWelcome, path, router]);

  const value = useMemo<Think | null>(() => {
    if (!status || !store || profile === undefined) return null;
    return {
      status, store, email, profile, setProfile,
      async signOut() {
        await supabase()?.auth.signOut();
        setProfile(undefined);
      },
    };
  }, [status, store, profile, email]);

  if (path === '/think/signin') return <>{children}</>;
  if (!value || needsSignIn || (needsWelcome && path !== '/think/welcome')) return <div className="dt-screen" aria-busy="true" />;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
