// Windows light up once when they appear. If the screen around them is rebuilt a moment later (the account syncs, the clock ticks,
// the screen is redrawn), a window that has just played must not go dark and play again. This remembers which ones played
// in the last half minute, across rebuilds; coming back to the screen later plays them again.

const WINDOW_MS = 30_000;
const at = new Map<string, number>();

export const playedRecently = (key: string, now = Date.now()) => { const t = at.get(key); return t !== undefined && now - t < WINDOW_MS; };
export const markPlayed = (key: string, now = Date.now()) => { at.set(key, now); if (at.size > 200) for (const [k, t] of at) if (now - t > WINDOW_MS) at.delete(k); };
