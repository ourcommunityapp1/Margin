// Writes fixtures/window/sweep.json: for every bundled window, the order the website's `sweepOrder` puts each question's panes in.
// The Dart port (mobile/lib/features/window/light.dart) must give exactly these. Run: node scripts/export-sweep-fixture.ts
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { sweepOrder } from '../src/app/heir/ui/glass/light-motion.ts';

const root = 'mobile/assets/glass';
const out: Record<string, number[][]> = {};
for (const name of readdirSync(root).sort()) {
  let meta;
  try { meta = JSON.parse(readFileSync(`${root}/${name}/pieces.json`, 'utf8')); } catch { continue; }
  const flat: number[] = meta.questions.flat();
  const n = meta.questions.length, P = flat.length;
  out[name] = Array.from({ length: n }, (_, i) => sweepOrder(flat.slice(Math.floor((i * P) / n), Math.floor(((i + 1) * P) / n)), meta.centres));
}
mkdirSync('fixtures/window', { recursive: true });
writeFileSync('fixtures/window/sweep.json', JSON.stringify(out));
console.log(`wrote ${Object.keys(out).length} windows`);
