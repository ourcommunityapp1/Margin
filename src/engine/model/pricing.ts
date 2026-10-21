// What Claude charges, per million tokens, so the engine can report and cap what questions cost.
// Rates from Anthropic's published prices; check them when models change.

import type { Usage } from './types.ts';

export interface Rates {
  input: number;
  output: number;
  cacheRead: number;
  // Five-minute cache writes, the only kind Margin makes.
  cacheWrite: number;
}

const RATES: Record<string, Rates> = {
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
};

// Unknown models are priced as the most expensive one, so a cap errs on the safe side.
export const ratesFor = (model: string): Rates => RATES[Object.keys(RATES).find((k) => model.startsWith(k)) ?? 'claude-opus-5-5'];

// Cost in US dollars of everything counted in `usage`; batch work is billed at half price.
export function costOf(usage: Usage): number {
  let usd = 0;
  for (const [model, u] of Object.entries(usage.byModel)) {
    const r = ratesFor(model);
    usd += (u.input * r.input + u.output * r.output + u.cacheRead * r.cacheRead + u.cacheWrite * r.cacheWrite) / 1e6 * (u.batch ? 0.5 : 1);
  }
  return usd;
}
