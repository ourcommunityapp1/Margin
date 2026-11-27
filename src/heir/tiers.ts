// The five levels people see (ADR-004). The engine still tracks six internal stones (levels.ts), which never go down;
// this file only decides what to call them. Nothing here changes how anything is earned or graded.
//
//   Familiar    recognize it                      engine level 0 (recited or practised, no stone yet)
//   Recalled    bring it to mind                  engine level 1
//   Memorized   recite it accurately              engine level 2
//   Proficient  recall it fluently and reliably   engine level 3
//   Expert      effortlessly, even after long gaps engine levels 4, 5 and 6

export interface Tier { n: number; id: string; name: string; stone: string; means: string; color: string; edge: string }

export const TIERS: Tier[] = [
  { n: 0, id: 'stone', stone: 'Stone', name: 'Familiar', means: 'Recognize it.', color: '#A9A39A', edge: '#7E786F' },
  { n: 1, id: 'bronze', stone: 'Bronze', name: 'Recalled', means: 'Bring it to mind.', color: '#C7814A', edge: '#8F5528' },
  { n: 2, id: 'silver', stone: 'Silver', name: 'Memorized', means: 'Recite it accurately.', color: '#C4CBD2', edge: '#8D969F' },
  { n: 3, id: 'gold', stone: 'Gold', name: 'Proficient', means: 'Recall it fluently and reliably.', color: '#E3B53F', edge: '#A97F14' },
  { n: 4, id: 'diamond', stone: 'Diamond', name: 'Expert', means: 'Recall it effortlessly and accurately, even after extended periods without practice.', color: '#9ED8F0', edge: '#4F9FC4' },
];

/** The tier an engine level shows as. Level 0 is "Familiar" only once something has been learned; ask `tierOf(level, true)`. */
export function tierOf(level: number, started = true): Tier | null {
  if (level <= 0) return started ? TIERS[0] : null;
  return TIERS[Math.min(level, 4)];
}

/** The tier index (0 to 4) for an engine level, or -1 when nothing has been started. */
export const tierIndex = (level: number, started = true): number => tierOf(level, started)?.n ?? -1;
