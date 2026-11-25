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

// ---- memory: synthetic answer histories for a handful of people, and everything the memory model says about them
import { unitsFor } from '../src/heir/lesson.ts';
import { localDay, type LogEntry, type SavedCard, type StepResult } from '../src/heir/progress.ts';
import * as M from '../src/heir/memory.ts';

/** A made-up history: sessions over months, each answering some parts of a few items. Deterministic. */
export function history(n: number, start = Date.UTC(2026, 2, 1, 14)): LogEntry[] {
  const pool = items.filter((i) => i.chunks.adult.length > 0);
  const mine = Array.from({ length: 3 + (n % 5) }, () => pickOf(pool));
  const log: LogEntry[] = [];
  let t = start + Math.floor(rng() * 86_400_000);
  let k = 0;
  for (let s = 0; s < 10 + (n % 20); s++) {
    t += Math.round([0.05, 0.4, 1, 1, 1, 2, 3, 6, 12, 25][Math.floor(rng() * 10)] * 86_400_000 * (0.7 + rng() * 0.6));
    const at = new Date(t).toISOString(), day = localDay(new Date(t));
    for (const item of mine) {
      if (rng() < 0.35) continue;
      const units = unitsFor(item, 'adult');
      for (const u of units) {
        if (rng() < 0.3) continue;
        const kind = (['type', 'say', 'letters', 'blanks', 'type', 'order', 'match'] as const)[Math.floor(rng() * 7)];
        const words = item.chunks.adult.slice(u.start, u.end).join(' ').split(' ').length;
        const r = rng();
        const correct = r < 0.72, hints = r > 0.9 ? 1 : 0;
        const misses = kind === 'type' || kind === 'say' ? (correct ? 0 : 1 + Math.floor(rng() * 4)) : undefined;
        const e: LogEntry = { at, itemId: item.id, kind, correct, hints, ms: 1500 + Math.floor(rng() * 40_000), review: rng() < 0.6, id: `h${n}-${k++}`, part: u.key, of: u.of, day };
        if (misses !== undefined) { e.misses = misses; e.words = words; }
        if (rng() < 0.15) delete e.day;
        if (rng() < 0.1) delete e.part;
        log.push(e);
      }
    }
  }
  return log;
}

const cals: (null | { a: number; b: number })[] = [null, { a: 1.3, b: 0.4 }, { a: 0.8, b: -0.3 }];
const memCases: unknown[] = [];
for (let n = 0; n < 40; n++) {
  const log = history(n);
  const now = new Date(Date.parse(log[log.length - 1].at) + Math.floor(rng() * 40) * 86_400_000 + 3_600_000);
  const pop = cals[n % 3], person = n % 4 === 0 ? cals[(n + 1) % 3] : null;
  M.setPopulationCal(pop); M.setPersonCal(person);
  const parts = M.replayParts(log);
  const cut = Math.floor(log.length / 2);
  const snap = M.foldTrimmed(log.slice(0, cut));
  const fromSnap = M.partMemories(log.slice(cut), snap);
  const ids = [...new Set(log.map((e) => e.itemId))];
  const per = ids.map((id) => {
    const item = items.find((i) => i.id === id)!;
    const mems = M.itemParts(unitsFor(item, 'adult').map((u) => u.key), parts);
    const chance = M.itemChance(id, parts, now);
    return { id, chance, why: M.whyNow(id, log, chance, now), outAt: mems ? M.outAt(mems).toISOString() : null, strongUntil: mems ? M.strongUntil(mems).toISOString() : null };
  });
  const bySession = new Map<string, StepResult[]>();
  for (const e of log) bySession.set(`${e.itemId}|${e.at}`, [...(bySession.get(`${e.itemId}|${e.at}`) ?? []), e]);
  const speed = M.speedBaseline(log);
  const grades = [...bySession.values()].slice(0, 30).map((rs, i) => ({ rs, card: i % 3 === 0 ? undefined : { state: i % 3, reps: i % 5 }, out: M.gradeRecall(rs, i % 3 === 0 ? undefined : { state: i % 3, reps: i % 5 } as never, speed) }));
  const cards: SavedCard[] = Array.from({ length: 6 }, (_, i) => ({ due: new Date(now.getTime() - (i - 2) * 86_400_000 * 3).toISOString(), stability: [0.5, 2, 7.3, 30, 120, 400][i], difficulty: 5, scheduled_days: [1, 2, 7, 30, 120, 400][i], reps: i + 1, lapses: i % 2, learning_steps: 0, state: i === 0 ? 0 : 2, ...(i % 2 ? { last_review: new Date(now.getTime() - [1, 2, 7, 30, 120, 400][i] * 86_400_000).toISOString() } : {}) }) as SavedCard);
  memCases.push({
    pop, person, now: now.toISOString(), log,
    parts, snap: snap ?? null, fromSnap,
    weak: [...M.weakParts(log)], weakNow: [...M.weakPartsNow(log, parts, now)], stepSeconds: M.stepSeconds(log), speed,
    recent: [...M.recalledRecently(log, now)], per, grades,
    marks: log.map((e) => M.markOf(e)),
    cards: cards.map((c) => ({ c, recall: M.recallChance(c, now), predicted: M.predictedChance(c, now), until80: M.daysUntil(c, 0.8, now) })),
    toChance: [0.5, 0.7, 0.8, 0.9, 0.95].map((t) => [t, M.daysToChance(12.5, t), M.calibrate(t), M.rawFor(t)]),
    merged: M.mergeSnapshot(snap, { asOf: now.toISOString(), mem: Object.fromEntries(Object.entries(parts).slice(0, 3)) }),
  });
}
M.setPopulationCal(null); M.setPersonCal(null);
const texts = items.slice(0, 60).map((i) => i.chunks.adult.join(' '));
memCases.push({ overlap: texts.slice(0, 30).map((t, i) => [t, texts[i + 7], M.overlap(t, texts[i + 7])]), spread: M.spreadApart(texts.slice(0, 40), (x) => x) , texts: texts.slice(0, 40) });
write('memory', memCases);

// ---- lessons: every kind of session, built with a seed, for many items, both tracks
import * as L from '../src/heir/lesson.ts';
import { courseItems, courses } from '../src/heir/content/index.ts';
import { INTROS } from '../src/heir/content/intros.ts';
const lessonCases: unknown[] = [];
const tracks = ['adult', 'child'] as const;
for (const course of courses) {
  const pool = courseItems(course);
  for (let n = 0; n < 8; n++) {
    const track = tracks[n % 2];
    const seed = 1000 + n * 37 + course.id.length;
    const item = pool[n % pool.length];
    const units = L.unitsFor(item, track);
    const unit = units[n % units.length];
    const mates = pool.slice(0, n % 4).filter((i) => i.id !== item.id).map((i, k) => ({ itemId: i.id, unitKeys: L.unitsFor(i, track).slice(0, 1 + (k % 2)).map((u) => u.key), seen: (n + k) % 6 }));
    const due = pool.slice(-(n % 5)).filter((i) => i.id !== item.id).map((i, k) => ({ itemId: i.id, strength: [1, 4, 8, 30][k % 4], ...(k % 2 ? { chance: [0.6, 0.8, 0.95][k % 3] } : {}), ...(k % 3 === 0 ? { weak: [L.unitsFor(i, track).at(-1)!.key] } : {}) }));
    const byId = (id: string) => pool.find((i) => i.id === id)!;
    const toMate = (m: { itemId: string; unitKeys: string[]; seen: number }) => ({ item: byId(m.itemId), units: L.unitsFor(byId(m.itemId), track).filter((u) => m.unitKeys.includes(u.key)), seen: m.seen });
    const toDue = (d: { itemId: string; strength: number; chance?: number; weak?: string[] }) => ({ ...d, item: byId(d.itemId) });
    const maxSteps = n % 3 === 0 ? 10 : undefined;
    const base = { course: course.id, track, seed, item: item.id, unit: unit.key };
    lessonCases.push({ fn: 'buildLesson', ...base, mates, due, maxSteps, out: L.buildLesson({ unit, item, track, mates: mates.map(toMate), due: due.map(toDue), pool, rng: L.seeded(seed), maxSteps }) });
    lessonCases.push({ fn: 'buildLite', ...base, out: L.buildLite({ unit, item, track, pool, rng: L.seeded(seed) }) });
    if (INTROS[course.id] && n < 2) lessonCases.push({ fn: 'buildWelcome', ...base, out: L.buildWelcome({ intro: INTROS[course.id], unit, item, track, pool, rng: L.seeded(seed) }) });
    lessonCases.push({ fn: 'buildReview', ...base, due, max: n % 2 ? 3 : undefined, out: L.buildReview({ due: due.map(toDue), track, pool, rng: L.seeded(seed), max: n % 2 ? 3 : undefined }) });
    const some = pool.slice(n % 3, (n % 3) + 1 + (n % 4));
    lessonCases.push({ fn: 'buildKeep', ...base, items: some.map((i) => i.id), out: L.buildKeep({ items: some, track, pool, rng: L.seeded(seed) }) });
    lessonCases.push({ fn: 'buildNight', ...base, items: some.map((i) => i.id), out: L.buildNight({ items: some, track, pool, rng: L.seeded(seed) }) });
    lessonCases.push({ fn: 'buildRise', ...base, items: some.map((i) => i.id), out: L.buildRise({ items: some, track, pool, rng: L.seeded(seed) }) });
    const groups = L.groupsOf(pool);
    const g = groups[n % groups.length];
    lessonCases.push({ fn: 'buildCheckpoint', ...base, group: g.key, out: L.buildCheckpoint({ group: g, track, pool, rng: L.seeded(seed) }) });
  }
  const groups = L.groupsOf(pool);
  const learned = new Set(pool.slice(0, 3).flatMap((i) => L.unitsFor(i, 'adult').map((u) => u.key)));
  const act = L.nextActivity(pool, 'adult', learned, new Set([groups[0].key]));
  lessonCases.push({ fn: 'structure', course: course.id, groups: groups.map((g) => ({ key: g.key, items: g.items.map((i) => i.id) })), units: pool.map((i) => [L.unitsFor(i, 'adult'), L.unitsFor(i, 'child')]), learned: [...learned], next: act ? { kind: act.kind, group: act.group.key, unit: act.kind === 'learn' ? act.unit.key : null } : null, phrases: pool.map((i) => L.phrases(i.chunks.adult)), blanks: pool.map((i, k) => L.pickBlanks(i.text, 0.3, 4, L.seeded(k))), seq: Array.from({ length: 20 }, L.seeded(course.id.length)) });
}
write('lesson', lessonCases);
