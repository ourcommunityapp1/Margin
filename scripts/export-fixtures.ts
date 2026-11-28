// Runs the website's engine on a fixed set of inputs and writes inputs and outputs to fixtures/engine/*.json.
// The Dart engine (mobile/lib/engine) must give the same outputs. Run: node scripts/export-fixtures.ts (ADR-0003).
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

// ---- journeys: simulated learners over months, run through the whole engine. Each step is an operation the Dart side
// replays from empty progress; after each, what it should look like.
import * as P from '../src/heir/progress.ts';
import * as Lv from '../src/heir/levels.ts';
import * as K from '../src/heir/keep.ts';
import * as D from '../src/heir/dayplan.ts';
import * as Pl from '../src/heir/planner.ts';
import * as Ms from '../src/heir/measures.ts';
import { relatedFor } from '../src/heir/related.ts';
import { getCourse, allItems } from '../src/heir/content/index.ts';

const snapshot = (p: P.MemberProgress) => ({ units: p.units, checkpoints: p.checkpoints, cards: p.cards, lessons: p.lessons, courseLessons: p.courseLessons, levels: p.levels, awards: p.awards, days: p.days, keep: p.keep, today: p.today, partSnap: p.partSnap, logLength: p.log.length });
const iso = (d: Date) => d.toISOString();
const journeys: unknown[] = [];
const plans: [string, string, 'adult' | 'child', number, string | null][] = [
  ['wsc', 'westminster-shorter', 'adult', 15, null], ['fv', 'first-verses', 'adult', 5, 'America/New_York'], ['xm', 'christmas', 'child', 25, 'America/Chicago'],
  ['cr', 'creeds', 'adult', 15, 'Asia/Kolkata'], ['ps', 'psalm-23', 'child', 5, null], ['gs', 'gospel', 'adult', 25, 'Europe/London'],
];
for (const [tag, focus, track, goal, tz] of plans) {
  const ops: unknown[] = [];
  let p = P.emptyProgress();
  let id = 0;
  const newId = () => `${tag}-${id++}`;
  let t = Date.UTC(2026, 0, 5, 13) + Math.floor(rng() * 86_400_000);
  const grading = tag === 'fv' ? undefined : 'v2' as const;
  const second = tag === 'wsc' ? 'creeds' : tag === 'xm' ? 'first-verses' : null;
  let mid: P.MemberProgress | null = null;
  for (let dayN = 0; dayN < 120; dayN++) {
    if (dayN === 60) mid = p;
    t += Math.round((rng() < 0.15 ? 2 + Math.floor(rng() * 4) : 1) * 86_400_000 + (rng() - 0.5) * 6 * 3_600_000);
    const now = new Date(t);
    const started = D.startedCourses(p, track, focus);
    if (second && dayN === 20) started.push(getCourse(second)!);
    const fix = Object.entries(p.keep ?? {}).filter(([, k]) => k.miss && (!k.good || k.miss > k.good)).map(([i]) => i).slice(0, 2);
    const cards = D.planDay({ p, track, started, focus, goal, now, fix });
    p = { ...p, today: D.withPlan(p.today, P.localDay(now), cards) };
    ops.push({ op: 'plan', now: iso(now), started: started.map((c) => c.id), fix, out: cards, today: p.today });
    for (const card of cards.slice(0, 1 + Math.floor(rng() * cards.length))) {
      const course = getCourse(card.course)!;
      const pool = courseItems(course);
      const sessionNow = new Date(now.getTime() + Math.floor(rng() * 3_600_000));
      const plan = Pl.planNext({ courseId: course.id, items: pool, track, p, now: sessionNow });
      if (!plan) continue;
      const byId = (i: string) => pool.find((x) => x.id === i)!;
      let targets: { item: typeof pool[number]; units: L.Unit[]; review: boolean }[] = [];
      let learned: L.Unit[] = [], checkpoint: string | null = null;
      if (plan.kind === 'learn' || plan.kind === 'welcome') {
        learned = plan.units;
        targets = plan.units.map((u) => ({ item: byId(u.itemId), units: [u], review: false }));
      } else if (plan.kind === 'checkpoint') {
        checkpoint = plan.group.key;
        targets = plan.group.items.map((i) => ({ item: i, units: L.unitsFor(i, track), review: true }));
      } else targets = plan.picks.map((x) => ({ item: byId(x.itemId), units: L.unitsFor(byId(x.itemId), track), review: true }));
      const skill = 0.6 + 0.35 * rng();
      const results: P.StepResult[] = [];
      for (const tg of targets) for (const u of tg.units) {
        const words = L.unitText(tg.item, track, u).text.split(' ').length;
        const kinds = tg.review ? ['letters', 'type', 'say'] : ['intro', 'order', 'blanks', 'letters', 'say', 'type'];
        for (const kind of kinds) {
          const ok = rng() < skill;
          const r: P.StepResult = { itemId: tg.item.id, kind: kind as L.StepKind, correct: ok, hints: !ok && rng() < 0.3 ? 1 : 0, ms: 2000 + Math.floor(rng() * 30_000), review: tg.review, part: u.key, of: u.of };
          if (kind === 'type' || kind === 'say') { r.words = words; r.misses = ok ? 0 : 1 + Math.floor(rng() * 3); }
          const pc = M.predictedChance(p.cards[tg.item.id], sessionNow);
          if (pc !== null && tg.review) r.p = pc;
          results.push(r);
        }
      }
      const keepRules = tag === 'wsc' || tag === 'cr' || tag === 'gs' ? { tz } : undefined;
      p = P.finishSession(p, { results, learned, checkpoint, courseId: course.id, now: sessionNow, newId, keepRules, grading });
      ops.push({ op: 'finish', now: iso(sessionNow), results, learned: learned.map((u) => u.key), checkpoint, courseId: course.id, keepRules: keepRules ?? null, grading: grading ?? null, out: snapshot(p) });
      const st = Lv.settle(p, allItems(), track, sessionNow);
      p = st.progress;
      ops.push({ op: 'settle', now: iso(sessionNow), ups: st.ups, awards: st.awards, out: snapshot(p) });
      const sess: D.DaySession = { id: newId(), at: iso(sessionNow), secs: 200 + Math.floor(rng() * 400), course: course.id, kind: plan.kind === 'learn' || plan.kind === 'welcome' ? 'lesson' : 'review', ...(rng() < 0.7 ? { card: card.id } : {}) };
      p = { ...p, today: D.withSession(p.today, P.localDay(sessionNow), sess) };
      ops.push({ op: 'session', session: sess, today: p.today, states: D.cardStates(p.today).map((s) => ({ id: s.card.id, done: s.done, secs: s.secs })), extras: D.extraSessions(p.today), minutes: D.minutesToday(p.today), events: D.dayEvents(p.today) });
    }
    if (dayN % 10 === 9) {
      // A full look at everything the screens read, worked out from the same progress.
      const items = allItems();
      const ids = new Set(courseItems(getCourse(focus)!).map((i) => i.id));
      const launch = new Date('2026-01-01T00:00:00Z');
      const held = K.heldItems(items, p, track, now, { launch, tz });
      const fixedHeld = K.heldItems(items, p, track, now, { launch: null, model: false });
      const sum = K.summarize(held);
      const st = (s: K.KeepState) => ({ state: s.state, at: 'deadline' in s ? (Number.isNaN(s.deadline.getTime()) ? null : iso(s.deadline)) : 'since' in s ? iso(s.since) : null });
      ops.push({
        op: 'look', now: iso(now),
        held: held.map((h) => ({ id: h.item.id, level: h.level, words: h.words, ...st(h.state) })),
        fixedHeld: fixedHeld.map((h) => ({ id: h.item.id, ...st(h.state) })),
        summary: { wordsKept: sum.wordsKept, wordsOut: sum.wordsOut, tryAgain: sum.tryAgain.map((h) => h.item.id), review: sum.review.map((h) => h.item.id), out: sum.out.map((h) => h.item.id) },
        levelsFromLog: items.filter((i) => p.log.some((e) => e.itemId === i.id)).map((i) => [i.id, Lv.levelFromLog(i, track, p.log, now), Lv.recited(i, track, p.log), Lv.understanding(i, p), Lv.nextStep(i, track, p, now), Lv.needsRefresh(p, i.id, now), K.strongUntilFor(i, p, track)?.toISOString() ?? null]),
        daysKept: Lv.daysKept(p.days, P.localDay(now)), best: Lv.bestDaysKept(p.days), awardsMet: Lv.awardsMet(p, items, P.localDay(now)),
        counts: Lv.countsFor(items, p), shelf: Lv.shelf(items, p), words: Ms.wordsIn(items, track, p), week: Ms.wordsRecitedThisWeek(items, track, p, now),
        risk: Pl.riskOrder(p, ids, now), riskParts: Pl.riskOrder(p, ids, now, M.partMemories(p.log, p.partSnap)), acc: Pl.recentAccuracy(p, ids), done: Pl.lessonsDone(p, focus, ids),
        next: (() => { const pl = Pl.planNext({ courseId: focus, items: courseItems(getCourse(focus)!), track, p, now }); return pl ? { kind: pl.kind, units: 'units' in pl ? pl.units.map((u) => u.key) : [], group: 'group' in pl ? pl.group.key : null, picks: 'picks' in pl ? pl.picks.map((x) => x.itemId) : [], why: 'why' in pl ? pl.why : null } : null; })(),
        nextLine: D.nextLine(p, track, getCourse(focus)!, now),
        project: (() => { const pr = Pl.project({ items: courseItems(getCourse(focus)!), track, p, minutes: goal, now }); return { ...pr, learnedBy: iso(pr.learnedBy), longTermBy: iso(pr.longTermBy) }; })(),
        bedtime: Pl.bedtimePicks(p, ids, now), night: Pl.nightOffer(p, ids, new Date(now.getTime() + 8 * 3_600_000)), rise: Pl.riseOffer(p, now), morning: Pl.morningPicks(p, ids, now),
        due: P.dueCards(p, now).map((c) => [c.itemId, iso(c.due), c.strength]), weakest: P.weakestCards(p).map((c) => c.itemId), seen: [...P.seenCounts(p)],
        keepOf: K.keepOf(p), endOfNextDay: K.endOfNextDay(now, tz).toISOString(), missedWhen: K.missedWhen(K.endOfNextDay(now, tz), new Date(now.getTime() + 20 * 3_600_000), tz),
        clamp: Object.keys(p.cards).slice(0, 5).map((i) => K.clampDue(new Date(p.cards[i].due), p.levels[i] ?? 1, (p.keep ?? {})[i], now, tz).toISOString()),
        related: [...ids].slice(0, 6).map((i) => relatedFor(allItems().find((x) => x.id === i)!)),
        parsed: P.parseProgress(JSON.stringify({ m: p })).m ? snapshot(P.parseProgress(JSON.stringify({ m: p })).m) : null,
      });
    }
  }
  // Two phones: a copy from halfway that went its own way (other answers, another plan for the day), merged back both ways.
  let b = mid!;
  const later = new Date(Date.parse(b.log[b.log.length - 1].at) + 2 * 86_400_000);
  const reviewed = Object.keys(b.cards).slice(0, 3);
  const rs: P.StepResult[] = reviewed.map((i, k) => ({ itemId: i, kind: 'type', correct: k !== 1, hints: 0, ms: 9000, review: true, words: 12, misses: k === 1 ? 4 : 0 }));
  b = P.finishSession(b, { results: rs, now: later, newId: () => `other-${id++}`, grading });
  b = { ...b, today: D.withPlan(b.today, P.localDay(later), [{ id: 'x', kind: 'review', course: focus, est: 3 }]), related: { 'John 3:16': later.toISOString() }, explained: { [reviewed[0]]: later.toISOString() } };
  const merges = { a: p, b, ab: P.mergeProgress(p, b), ba: P.mergeProgress(b, p), same: P.sameProgress(p, p), differ: P.sameProgress(p, b) };
  journeys.push({ tag, focus, track, goal, tz, ops, finalLog: p.log, merges });
}
write('journeys', journeys);

// ---- the small files: stats, path, social, board, season, time, usfm, related
import * as St from '../src/heir/stats.ts';
import * as Pa from '../src/heir/path.ts';
import * as So from '../src/heir/social.ts';
import * as B from '../src/heir/board.ts';
import * as Se from '../src/heir/season.ts';
import * as Ti from '../src/heir/time.ts';
import { toUsfm, isOldTestament, tidyVerse } from '../src/heir/usfm.ts';
import { passagesOf, verseCount, isRelatedPassage } from '../src/heir/related.ts';
{
  const progressOf = journeys.map((j) => (j as { merges: { ab: P.MemberProgress } }).merges.ab);
  const at = new Date('2026-05-01T15:00:00Z');
  const small: Record<string, unknown> = {};
  small.stats = plans.map(([, focus, track], i) => St.statsFor([{ id: focus, items: courseItems(getCourse(focus)!) }], allItems(), track, progressOf[i], P.localDay(at), i % 2 ? { options: { launch: new Date('2026-01-01T00:00:00Z') }, now: at } : null));
  small.path = plans.map(([, focus, track], i) => Pa.coursePath(courseItems(getCourse(focus)!), track, progressOf[i], at).map((u) => ({ number: u.number, group: u.group.key, lessons: u.lessons, learned: u.learned, mastered: u.mastered, status: u.status, lockWaiting: u.lockWaiting })));
  small.courseStats = plans.map(([, focus, track], i) => Pa.courseStats(courseItems(getCourse(focus)!), track, progressOf[i]));
  small.streak = progressOf.map((p) => [Pa.streak(p.days, p.days.at(-1)!), Pa.streak(p.days, '2026-12-25')]);
  const names = ['ab', 'Abc', 'a_b_c', '1abc', 'admin', 'Katekize', 'x'.repeat(21), 'good_name9', ' padded ', 'Me'];
  small.usernames = names.map((n) => [n, So.usernameProblem(n)]);
  small.places = [[null, null], ['Franklin', 'TN'], [' Nashville ', ''], [null, 'TN']].map(([c, r]) => [c, r, So.place(c, r)]);
  small.since = ['2026-03-04T10:00:00Z', '', 'nonsense', '2025-12-31T23:30:00Z'].map((s) => [s, So.sinceLabel(s)]);
  small.streakLines = [[3, null, '2026-05-01'], [0, null, '2026-05-01'], [0, '2026-04-30', '2026-05-01'], [0, '2026-04-20', '2026-05-01']].map(([s, l, t]) => [s, l, t, So.streakLine(s as number, l as string | null, t as string)]);
  small.friends = [0, 1, 2, 38].map((n) => So.friendsCount(n));
  const rows: B.BoardRow[] = Array.from({ length: 12 }, (_, i) => ({ place: i + 1 + (i > 6 ? 3 : 0), prev_place: i % 3 === 0 ? null : i + 1 + ((i * 7) % 5) - 2, idx: i + 1 + (i > 6 ? 3 : 0), username: `u${i}`, relation: (i === 5 ? 'me' : i % 2 ? 'friend' : 'fof') as B.BoardRow['relation'], words: 500 - i * 20, name: `N${i}`, is_me: i === 5, friends_since: i % 4 === 1 ? '2026-02-10T00:00:00Z' : null, via: i % 4 === 2 ? 'Ann' : null }));
  small.board = { rows, subs: rows.map(B.rowSub), moves: rows.map(B.movement), arrows: [-3, 0, 4].map(B.arrow), ordinals: [1, 2, 3, 4, 11, 12, 13, 21, 22, 101, 111, 112].map(B.ordinal), preview: B.previewRows({ period: 'all', total: 12, my_place: 6, my_prev_place: 5, my_idx: 6, rows }).map((r) => r.username), slots: B.slots(rows), gaps: [...B.gapsAfter(rows)] };
  small.seasons = Array.from({ length: 70 }, (_, i) => { const d = new Date(Date.UTC(2025 + (i % 3), Math.floor(i / 6) % 12, 1 + ((i * 11) % 28), 18)); return [d.toISOString(), Se.seasonLabel('christmas', d), Se.seasonLabel('easter', d), Ti.timeOfDay(d), Ti.dayName(d)]; });
  small.feasts = [2024, 2025, 2026, 2027, 2028, 2030, 2040].map((y) => [y, P.localDay(Se.adventSunday(y)), P.localDay(Se.easterSunday(y))]);
  small.greetings = ['dawn', 'day', 'dusk', 'night'].map((t) => Ti.greeting(t as Ti.TimeOfDay));
  const refs = [...new Set(allItems().flatMap((i) => i.connected))].slice(0, 300);
  small.usfm = refs.map((r) => [r, toUsfm(r), isOldTestament(r), passagesOf(r), passagesOf(r).map(verseCount), passagesOf(r).map(isRelatedPassage)]);
  small.tidy = ['  In the  beginning\nGod ', 'Hear,  O Israel'].map((t) => [t, tidyVerse(t)]);
  write('small', [small]);
}
