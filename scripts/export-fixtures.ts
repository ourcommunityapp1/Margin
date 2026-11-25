// Runs the website's engine on a fixed set of inputs and writes inputs and outputs to fixtures/engine/*.json.
// The Dart engine (app/lib/engine) must give the same outputs. Run: node scripts/export-fixtures.ts (ADR-0003).
import { mkdirSync, writeFileSync } from 'node:fs';
import { collections } from '../src/heir/content/index.ts';
import { seeded } from '../src/heir/lesson.ts';
import { checkOrder, closeWord, firstLetter, gradeSpoken, wordMatches } from '../src/heir/grade.ts';
import { normalizeWord, sameWords, words } from '../src/heir/words.ts';

const OUT = 'fixtures/engine';
mkdirSync(OUT, { recursive: true });
const write = (name: string, cases: unknown[]) => { writeFileSync(`${OUT}/${name}.json`, JSON.stringify(cases)); console.log(`${name}: ${cases.length} cases`); };

const items = collections.flatMap((c) => c.items);
const rng = seeded(20261125);
const pickOf = <T>(l: T[]) => l[Math.floor(rng() * l.length)];

// ---- words and grade
const sample = ['Man’s', 'GOD', 'for ever', 'enjoy', '“Hear,', 'principally', 'duty;', "don't", 'Ünïcode', '', '   ', 'a-b', 'forever.'];
write('words', [
  ...sample.map((w) => ({ fn: 'normalizeWord', args: [w], out: normalizeWord(w) })),
  ...items.slice(0, 40).map((i) => ({ fn: 'words', args: [i.text], out: words(i.text) })),
  ...items.slice(0, 20).flatMap((i) => [{ fn: 'sameWords', args: [i.text, i.text.toUpperCase()], out: sameWords(i.text, i.text.toUpperCase()) }, { fn: 'sameWords', args: [i.text, i.prompt], out: sameWords(i.text, i.prompt) }]),
]);

const slip = (w: string) => {
  const k = Math.floor(rng() * 5);
  if (k === 0 && w.length > 2) return w.slice(0, -1);
  if (k === 1) return w + w[w.length - 1];
  if (k === 2 && w.length > 3) return w.slice(0, 1) + w.slice(2);
  if (k === 3) return w + 's';
  return w + 'ly';
};
const allWords = [...new Set(items.flatMap((i) => i.text.split(' ')))];
const wordCases = Array.from({ length: 700 }, () => {
  const e = pickOf(allWords), r = rng();
  const t = r < 0.3 ? e : r < 0.75 ? slip(e) : pickOf(allWords);
  return { fn: 'wordMatches', args: [t, e], out: wordMatches(t, e) };
});
const closeCases = wordCases.map((c) => ({ fn: 'closeWord', args: c.args, out: closeWord(c.args[0] as string, c.args[1] as string) }));
const letterCases = allWords.slice(0, 60).map((w) => ({ fn: 'firstLetter', args: [w], out: firstLetter(w) }));
const orderCases = Array.from({ length: 80 }, () => {
  const tiles = pickOf(items).chunks.adult[0].split(' ');
  const picked = [...tiles];
  const m = rng();
  if (m < 0.25 && picked.length > 1) picked.splice(Math.floor(rng() * picked.length), 1);
  else if (m < 0.5 && picked.length > 2) { const a = Math.floor(rng() * picked.length), b = Math.floor(rng() * picked.length); [picked[a], picked[b]] = [picked[b], picked[a]]; }
  else if (m < 0.7) picked.push(pickOf(allWords));
  return { fn: 'checkOrder', args: [picked, tiles], out: checkOrder(picked, tiles) };
});
const spokenCases = Array.from({ length: 160 }, () => {
  const text = pickOf(items).chunks.adult.slice(0, 3).join(' ');
  let said = text.split(' ');
  const r = rng();
  if (r > 0.2) {
    said = said.filter(() => rng() > 0.15).map((w) => (rng() > 0.85 ? slip(normalizeWord(w) || w) : w));
    if (rng() > 0.7 && said.length > 3) { const k = Math.floor(rng() * (said.length - 1)); [said[k], said[k + 1]] = [said[k + 1], said[k]]; }
    if (rng() > 0.8) said = said.flatMap((w) => (w.length > 6 && rng() > 0.6 ? [w.slice(0, 3), w.slice(3)] : [w]));
  }
  return { fn: 'gradeSpoken', args: [text, said.join(' ')], out: gradeSpoken(text, said.join(' ')) };
});
write('grade', [...wordCases, ...closeCases, ...letterCases, ...orderCases, ...spokenCases]);

// ---- fsrs: runs of reviews at random gaps and grades, with and without fuzz, one card after each review
import { createEmptyCard, fsrs, generatorParameters, type Card, type Grade } from 'ts-fsrs';
const saved = (c: Card) => ({ ...c, due: c.due.toISOString(), last_review: c.last_review ? c.last_review.toISOString() : undefined });
const fsrsRuns = Array.from({ length: 260 }, (_, n) => {
  const fuzz = n % 2 === 0;
  const f = fsrs(generatorParameters({ enable_fuzz: fuzz, enable_short_term: false }));
  let at = new Date(Date.UTC(2026, 0, 1 + Math.floor(rng() * 300), Math.floor(rng() * 24), Math.floor(rng() * 60), Math.floor(rng() * 60), Math.floor(rng() * 1000)));
  const start = at.toISOString();
  let card = createEmptyCard(at);
  const steps: { gapMs: number; grade: number }[] = [];
  const out: unknown[] = [];
  for (let i = 0; i < 14; i++) {
    const gapDays = i === 0 ? 0 : [0.2, 0.5, 1, 1, 2, 3, 5, 8, 13, 21, 40, 90, 200][Math.floor(rng() * 13)];
    const gapMs = Math.round(gapDays * 86_400_000 * (0.8 + rng() * 0.4));
    at = new Date(at.getTime() + gapMs);
    const r = rng();
    const grade = (r < 0.12 ? 1 : r < 0.3 ? 2 : r < 0.92 ? 3 : 4) as Grade;
    card = f.next(card, at, grade).card;
    steps.push({ gapMs, grade });
    out.push(saved(card));
  }
  return { fn: 'fsrsRun', fuzz, start, steps, out };
});
write('fsrs', fsrsRuns);
