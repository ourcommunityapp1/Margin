// The dim light that moves behind dark glass, shared by the small windows (mini.tsx) and the full glass
// engine (window.tsx) so both move the same way. Tuned in the "Glints in dark glass" mockup.

export const LIGHT = {
  /** How bright dark glass is at rest. */
  rest: 0.045,
  /** The light's size, as a share of the window's width. */
  r: 0.27,
  /** How bright glass is at the middle of the light. */
  peak: 0.58,
  /** 0 crisp to 1 very soft. */
  soft: 0.85,
  /** One pass, and the pause before the next (ms). */
  pass: 2300,
  gap: 1100,
};
const FALLOFF = 1.6 / (0.35 + 1.6 * LIGHT.soft);

// Every window keys off one clock, so in a list the light passes from one window into the next.
const T0 = typeof performance === 'undefined' ? 0 : performance.now();

export type Motion = { kind: 'circle'; delay?: number } | { kind: 'list'; index: number; count: number };

/** Where the light is behind one window now (window coordinates 0..1) and how strong it is; null while it's away. */
export function lightAt(motion: Motion, now: number): { x: number; y: number; k: number } | null {
  const { pass, gap, r } = LIGHT;
  if (motion.kind === 'circle') {
    // Clockwise once round, a pause, then anticlockwise back, and so on, fading in and out of each turn.
    const cycle = pass + gap, t0 = now - T0 + (motion.delay ?? 0) * pass;
    const n = Math.floor(t0 / cycle), t = (t0 - n * cycle) / pass;
    if (t > 1) return null;
    const tt = n % 2 ? 1 - t : t;
    const a = -Math.PI / 2 + tt * Math.PI * 2;
    return { x: 0.5 + 0.3 * Math.cos(a), y: 0.5 + 0.3 * Math.sin(a), k: Math.sin(Math.PI * t) };
  }
  // Down through every window in the list, one after another at the same pace, a pause, then back up.
  const leg = motion.count * pass, cycle = 2 * (leg + gap), t0 = (now - T0) % cycle;
  const down = t0 < leg + gap;
  const u = down ? t0 : t0 - (leg + gap);
  if (u > leg) return null;
  const pos = down ? u / pass : motion.count - u / pass; // in windows, from the top of the first
  const t = pos - motion.index;
  if (t < -0.2 || t > 1.2) return null;
  return { x: 0.5 + 0.05 * Math.sin(t * Math.PI * 2), y: -r + (1 + 2 * r) * t, k: 1 };
}

/** A fixed small variation per pane, as real glass of different thickness catches light differently. */
export const paneGain = (id: number) => 0.82 + (((id * 2654435761) % 1000) / 1000) * 0.18;

/** How much of the light reaches a pane centred at (cx, cy): 0 to 1, before `peak`. */
export function lightOn(s: { x: number; y: number; k: number } | null, cx: number, cy: number, gain: number): number {
  if (!s) return 0;
  const d = Math.hypot(cx - s.x, cy - s.y) / LIGHT.r;
  return d < 2.2 ? s.k * gain * Math.exp(-d * d * FALLOFF) : 0;
}
