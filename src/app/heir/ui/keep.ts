'use client';

// Where each verse and answer stands for the keeping rules (see src/heir/keep.ts), for the person on this phone.

import { useMemo } from 'react';
import { allItems } from '@/heir/content';
import { KEEP_LAUNCH, heldItems, summarize, type KeepSummary } from '@/heir/keep';
import { activeMember } from '@/heir/household';
import { memberProgress } from '@/heir/progress';
import { useHeir } from './provider';

export const localTz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch { return null; } };

/** null when the rules are off for this account. */
export function useKeep(): KeepSummary | null {
  const { keepRules, household, progress, now } = useHeir();
  const me = activeMember(household);
  return useMemo(() => {
    if (!keepRules || !me) return null;
    return summarize(heldItems(allItems(), memberProgress(progress, me.id), me.track, now, { launch: KEEP_LAUNCH, tz: localTz(), mode: 'whole' }));
  }, [keepRules, me, progress, now]);
}

export const dayLabel = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
