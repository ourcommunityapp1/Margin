// The scale a question's level is stored on, and how saved progress from the earlier six-stone scale moves onto it (ADR-005).
// No imports: both progress.ts and levels.ts use it.
//
//   scale 2 (now):   0 none · 1 Familiar · 2 Recalled · 3 Memorized · 4 Proficient · 5 Expert
//   scale 1 (before): 0 none · 1 Amethyst · 2 Topaz · 3 Carnelian · 4 Emerald · 5 Sapphire · 6 Diamond

export const LEVEL_SCALE = 2;

/** One stored level from the earlier scale, on the current one: Amethyst to Recalled, Topaz to Memorized, Carnelian to
 *  Proficient, and Emerald, Sapphire and Diamond all to Expert. Nothing goes down. */
export const migrateLevel = (old: number): number => (old <= 0 ? 0 : Math.min(5, old + 1));

/** A progress record's levels on the current scale. A record with `levelScale` 2 is left as it is. */
export function onCurrentScale<T extends { levels: Record<string, number>; levelScale?: number }>(p: T): T {
  if ((p.levelScale ?? 1) >= LEVEL_SCALE) return p;
  return { ...p, levels: Object.fromEntries(Object.entries(p.levels).map(([id, n]) => [id, migrateLevel(n)])), levelScale: LEVEL_SCALE };
}
