'use client';

// What every Heir screen needs: the family on this device and the time of day.
// The household lives in this browser for now; the same rules (src/heir/household.ts) will run against the database later.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Household } from '@/heir/types';
import { emptyHousehold, parseHousehold } from '@/heir/household';
import { timeOfDay, type TimeOfDay } from '@/heir/time';

const KEY = 'heir-household-v1';

interface Heir {
  ready: boolean;
  household: Household;
  update(change: (h: Household) => Household): void;
  time: TimeOfDay;
  now: Date;
}

const Ctx = createContext<Heir | null>(null);

export function useHeir(): Heir {
  const v = useContext(Ctx);
  if (!v) throw new Error('useHeir outside HeirProvider');
  return v;
}

function load(): Household {
  try { return parseHousehold(localStorage.getItem(KEY)); } catch { return emptyHousehold(); }
}

export function HeirProvider({ children }: { children: React.ReactNode }) {
  const [household, setHousehold] = useState<Household>(emptyHousehold);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    Promise.resolve().then(() => { setHousehold(load()); setReady(true); });
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const update = useCallback((change: (h: Household) => Household) => {
    setHousehold((h) => {
      const next = change(h);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode: keeps working for this visit */ }
      return next;
    });
  }, []);

  const time = timeOfDay(now);
  const value = useMemo(() => ({ ready, household, update, time, now }), [ready, household, update, time, now]);

  return (
    <Ctx.Provider value={value}>
      <div className="hr" data-time={time}>
        <div className="hr-bg" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/heir/bg-${time}.jpg`} alt="" />
        </div>
        {children}
      </div>
    </Ctx.Provider>
  );
}
