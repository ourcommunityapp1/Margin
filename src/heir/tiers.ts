// The five levels people see (ADR-004, ADR-005), by name and gem. They are the engine's own levels (levels.ts): stored level
// n is TIERS[n - 1]. Nothing here decides how a level is earned.
//
//   1 Familiar    recognize it                      4 Proficient  recall it fluently and reliably
//   2 Recalled    bring it to mind                  5 Expert      recall it effortlessly and accurately, even after long gaps
//   3 Memorized   recite it accurately

export interface Tier { n: number; id: string; name: string; stone: string; means: string; color: string; edge: string }

export const TIERS: Tier[] = [
  { n: 1, id: 'stone', stone: 'Stone', name: 'Familiar', means: 'Recognize it.', color: '#A9A39A', edge: '#7E786F' },
  { n: 2, id: 'bronze', stone: 'Bronze', name: 'Recalled', means: 'Bring it to mind.', color: '#C7814A', edge: '#8F5528' },
  { n: 3, id: 'silver', stone: 'Silver', name: 'Memorized', means: 'Recite it accurately.', color: '#C4CBD2', edge: '#8D969F' },
  { n: 4, id: 'gold', stone: 'Gold', name: 'Proficient', means: 'Recall it fluently and reliably.', color: '#E3B53F', edge: '#A97F14' },
  { n: 5, id: 'diamond', stone: 'Diamond', name: 'Expert', means: 'Recall it effortlessly and accurately, even after extended periods without practice.', color: '#9ED8F0', edge: '#4F9FC4' },
];

/** The tier for a stored level (1 to 5), or null when it has none yet. */
export const tierOf = (level: number): Tier | null => (level >= 1 ? TIERS[Math.min(level, 5) - 1] : null);

/** The tier's position (0 to 4) for a stored level, or -1 when none. */
export const tierIndex = (level: number): number => (level >= 1 ? Math.min(level, 5) - 1 : -1);
