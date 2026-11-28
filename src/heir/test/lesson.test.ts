import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCheckpoint, buildPractice, buildLesson, buildReview, groupsOf, nextActivity, nextUnit, phrases, practiceKinds, seeded, unitsFor, unitText, withoutSpeaking, type Mate } from '../lesson.ts';
import { checkOrder, closeWord, gradeSpoken, wordMatches, firstLetter, SPOKEN_PASS } from '../grade.ts';
import { afterSleep, dueCards, emptyProgress, finishSession, GRADES, parseProgress, ratingFor, seenCounts, waitingForSleep, type StepResult } from '../progress.ts';
import { planNext } from '../planner.ts';
import { courses, courseItems, getItem, allItems } from '../content/index.ts';
import { words } from '../words.ts';
import { coursePath, courseStats, streak } from '../path.ts';

const wsc1 = getItem('wsc-1')!;
const wlc4 = getItem('wlc-4')!;

test('units: long answers are learned in parts of at most four pieces', () => {
  assert.deepEqual(unitsFor(wsc1, 'adult').map((u) => [u.start, u.end]), [[0, 2]]);
  assert.deepEqual(unitsFor(wlc4, 'adult').map((u) => [u.start, u.end]), [[0, 4], [4, 8]]);
  assert.deepEqual(unitsFor(wlc4, 'child').map((u) => u.end - u.start), [4, 4, 4, 3]);
  const parts = unitsFor(wlc4, 'child').map((u) => unitText(wlc4, 'child', u).text);
  assert.equal(parts.join(' '), wlc4.text);
});

test('units: the next lesson is the first part not yet learned, in course order', () => {
  const items = courseItems(courses.find((c) => c.id === 'westminster-larger')!);
  assert.equal(nextUnit(items, 'adult', new Set())?.key, 'wlc-1#1');
  assert.equal(nextUnit(items, 'adult', new Set(['wlc-1#1', 'wlc-2#1', 'wlc-2#2', 'wlc-3#1']))?.key, 'wlc-4#1');
  assert.equal(nextUnit(items, 'adult', new Set(items.flatMap((i) => unitsFor(i, 'adult').map((u) => u.key)))), null);
});

test('phrases: short pieces are joined so a word bank has something to arrange', () => {
  assert.deepEqual(phrases(['Man’s chief end', 'is to glorify God,', 'and to enjoy him', 'forever.']), ['Man’s chief end is to glorify God,', 'and to enjoy him forever.']);
});

const learnedAll = (ids: string[]) => new Set(ids.flatMap((id) => unitsFor(getItem(id)!, 'adult').map((u) => u.key)));
const mate = (id: string, seen = 0): Mate => ({ item: getItem(id)!, units: unitsFor(getItem(id)!, 'adult'), seen });

test('groups: five at a time, never mixing collections, as even as possible', () => {
  const sizes = (id: string) => groupsOf(courseItems(courses.find((c) => c.id === id)!)).map((g) => [g.key, g.items.length]);
  const wsc = sizes('westminster-shorter');
  assert.equal(wsc.length, 22);
  assert.deepEqual(wsc.slice(0, 2), [['westminster-shorter:1-5', 5], ['westminster-shorter:6-10', 5]]);
  assert.ok(wsc.every(([, n]) => n === 4 || n === 5));
  assert.equal(wsc.reduce((t, [, n]) => t + Number(n), 0), 107);
  assert.deepEqual(sizes('creeds'), [['apostles-creed:1-4', 4], ['nicene-creed:1-3', 3], ['nicene-creed:4-6', 3]]);
});

test('pacing: learn a group one item at a time, lock it in, then move to the next group', () => {
  const items = courseItems(courses.find((c) => c.id === 'westminster-shorter')!);
  const at = (learned: string[], checkpoints: string[] = []) => {
    const a = nextActivity(items, 'adult', learnedAll(learned), new Set(checkpoints));
    return a && (a.kind === 'learn' ? a.unit.key : `lock ${a.group.key}`);
  };
  assert.equal(at([]), 'wsc-1#1');
  assert.equal(at(['wsc-1', 'wsc-2']), 'wsc-3#1');
  assert.equal(at(['wsc-1', 'wsc-2', 'wsc-3', 'wsc-4', 'wsc-5']), 'lock westminster-shorter:1-5');
  assert.equal(at(['wsc-1', 'wsc-2', 'wsc-3', 'wsc-4', 'wsc-5'], ['westminster-shorter:1-5']), 'wsc-6#1');
  assert.equal(at(items.map((i) => i.id), groupsOf(items).map((g) => g.key)), null);
});

test('a first lesson walks from seeing it to saying it', () => {
  const unit = unitsFor(wsc1, 'adult')[0];
  const steps = buildLesson({ unit, item: wsc1, track: 'adult', mates: [], due: [], pool: allItems(), rng: seeded(1) });
  assert.deepEqual(steps.map((s) => s.kind), ['intro', 'order', 'order', 'meaning', 'order', 'blanks', 'letters', 'say', 'type']);
  assert.equal(new Set(steps.map((s) => s.id)).size, steps.length);
  const banks = steps.filter((s) => s.kind === 'order' && !s.pieces);
  assert.deepEqual(banks.map((s) => s.kind === 'order' && s.slots), [true, false], 'first word bank guided, later free');
});

test('later lessons practice every earlier item in the group, starting with a warm-up', () => {
  const unit = unitsFor(getItem('wsc-3')!, 'adult')[0];
  const steps = buildLesson({ unit, item: getItem('wsc-3')!, track: 'adult', mates: [mate('wsc-1', 2), mate('wsc-2', 1)], due: [{ item: getItem('wlc-1')!, strength: 3 }], pool: allItems(), rng: seeded(2) });
  assert.equal(steps[0].itemId, 'wsc-1', 'warm up on an earlier item first');
  assert.equal(steps.filter((s) => s.itemId === 'wsc-1').length, 2);
  assert.equal(steps.filter((s) => s.itemId === 'wsc-2').length, 2);
  assert.equal(steps.filter((s) => s.itemId === 'wlc-1').length, 1);
  assert.deepEqual(steps.slice(-2).map((s) => s.kind), ['say', 'type']);
  assert.ok(steps.length <= 17);
  // With four earlier items, each still gets practice, and the lesson stays short.
  const five = buildLesson({ unit: unitsFor(getItem('wsc-5')!, 'adult')[0], item: getItem('wsc-5')!, track: 'adult', mates: ['wsc-1', 'wsc-2', 'wsc-3', 'wsc-4'].map((id) => mate(id, 3)), due: [], pool: allItems(), rng: seeded(3) });
  for (const id of ['wsc-1', 'wsc-2', 'wsc-3', 'wsc-4']) assert.ok(five.some((s) => s.itemId === id), id);
  assert.ok(five.length <= 17, `${five.length} steps`);
});

test('practice gets harder the more an item has been seen', () => {
  assert.ok(practiceKinds(1).includes('blanks') && !practiceKinds(1).includes('type'));
  assert.ok(practiceKinds(2).includes('letters') && !practiceKinds(3).includes('say'));
  assert.ok(practiceKinds(4).includes('type') && practiceKinds(4).includes('say'));
});

test('lock it in: every part of every item in the group, typed or said, with a lighter check between', () => {
  const group = groupsOf(courseItems(courses.find((c) => c.id === 'westminster-larger')!))[0];
  const steps = buildCheckpoint({ group, track: 'adult', pool: allItems(), rng: seeded(4) });
  const full = steps.filter((s) => s.kind === 'type' || s.kind === 'say');
  const parts = group.items.reduce((n, i) => n + unitsFor(i, 'adult').length, 0);
  assert.equal(full.length, parts);
  assert.ok(full.some((s) => s.kind === 'type') && full.some((s) => s.kind === 'say'));
  for (const i of group.items) assert.ok(steps.some((s) => s.itemId === i.id && ['match', 'spot', 'next'].includes(s.kind)), i.id);
});

test('every part of every course builds sensible steps on both tracks', () => {
  for (const course of courses) {
    const items = courseItems(course);
    for (const item of items) {
      for (const track of ['adult', 'child'] as const) {
        for (const unit of unitsFor(item, track)) {
          const steps = buildLesson({ unit, item, track, mates: [], due: [], pool: allItems(), rng: seeded(7) });
          const { text } = unitText(item, track, unit);
          assert.ok(steps.length >= 6 && steps.length <= 14, `${unit.key} ${track}: ${steps.length} steps`);
          for (const s of steps) {
            if (s.kind === 'order') {
              assert.ok(text.includes(s.tiles.join(' ')), `${unit.key} tiles`);
              for (const d of s.decoys) assert.ok(!words(text).includes(words(d)[0]), `${unit.key} decoy ${d}`);
              assert.deepEqual([...s.bank].sort(), [...s.tiles, ...s.decoys].sort());
            }
            if (s.kind === 'blanks') assert.ok(s.blanks.length >= 1 && s.blanks.every((i) => i >= 0 && i < s.text.split(' ').length), `${unit.key} blanks`);
            if (s.kind === 'meaning') assert.equal(new Set(s.options).size, 4);
            if (s.kind === 'next') assert.ok(s.options.includes(s.answer) && new Set(s.options).size === 3, `${unit.key} next`);
          }
        }
      }
    }
    for (const group of groupsOf(items)) {
      for (const track of ['adult', 'child'] as const) {
        for (const s of buildCheckpoint({ group, track, pool: allItems(), rng: seeded(9) })) {
          if (s.kind === 'spot') {
            assert.notEqual(s.text, s.correctText);
            assert.equal(s.text.split(' ').length, s.correctText.split(' ').length);
            assert.notEqual(s.text.split(' ')[s.wrongIndex], s.rightWord);
          }
          if (s.kind === 'match') assert.ok(s.options.includes(s.answer) && s.options.length >= 3);
        }
      }
    }
  }
});

test('a review session is light: one quick step per due item, never the whole answer typed or said (ADR-003)', () => {
  const due = ['wsc-1', 'wsc-2', 'wsc-3'].map((id) => ({ item: getItem(id)!, strength: 2 }));
  const steps = buildReview({ due, track: 'adult', pool: allItems(), rng: seeded(3) });
  assert.equal(steps.length, 3);
  assert.ok(steps.every((s) => s.kind !== 'say' && s.kind !== 'type'), 'no whole recall in a review');
  for (const chance of [0.3, 0.6, 0.74, 0.8, 0.84, 0.86, 0.95]) {
    const one = buildReview({ due: [{ item: getItem('wsc-4')!, strength: 5, chance }], track: 'adult', pool: allItems(), rng: seeded(7) });
    assert.ok(one.every((s) => s.kind !== 'say' && s.kind !== 'type'), `no whole recall at ${chance}`);
    assert.equal(one.length, chance < 0.75 ? 2 : 1, `${chance}: two light steps when shaky, otherwise one`);
  }
  assert.equal(withoutSpeaking({ id: 'x', itemId: 'wsc-1', review: true, kind: 'say', lead: '', text: 'a' } as never).kind, 'type');
});

test('when you rise is light: one step per question, blanks and phrase order in turn, then a verse', async () => {
  const { buildRise } = await import('../lesson.ts');
  const items = ['wsc-1', 'wsc-2', 'wsc-3', 'wsc-4'].map((id) => getItem(id)!);
  const steps = buildRise({ items, track: 'adult', pool: allItems(), rng: seeded(5) });
  const asked = steps.filter((s) => s.kind !== 'verse');
  assert.equal(asked.length, items.length, 'one step per question');
  assert.deepEqual(asked.map((s) => s.kind), ['blanks', 'order', 'blanks', 'order']);
  assert.ok(steps.every((s) => s.kind !== 'say' && s.kind !== 'type'), 'nothing whole in the morning');
});

test('feedback says what went wrong with a word bank', () => {
  const tiles = ['how', 'we', 'may', 'glorify', 'and', 'enjoy', 'him.'];
  assert.ok(checkOrder(tiles, tiles).ok);
  const decoy = checkOrder(['how', 'we', 'may', 'glorify', 'but', 'enjoy', 'him.'], tiles);
  assert.deepEqual([decoy.ok, decoy.close, decoy.extra, decoy.missing], [false, true, ['but'], ['and']]);
  const swapped = checkOrder(['how', 'may', 'we', 'glorify', 'and', 'enjoy', 'him.'], tiles);
  assert.deepEqual([swapped.close, swapped.outOfPlace], [true, 2]);
  assert.ok(!checkOrder([...tiles].reverse(), tiles).close);
  const short = checkOrder(['how', 'we', 'may', 'glorify', 'and', 'enjoy'], tiles);
  assert.deepEqual([short.ok, short.close, short.missing], [false, true, ['him.']]);
  assert.ok(closeWord('glorfiy', 'glorify'));
  assert.ok(!closeWord('glory', 'glorify'));
  assert.ok(!closeWord('glorify', 'glorify'));
});

test('grading forgives punctuation, capitals, one slip in a long word, and split words', () => {
  assert.ok(wordMatches('glorfy', 'glorify'));
  assert.ok(wordMatches('Man’s', "man's"));
  assert.ok(!wordMatches('god', 'gods'));
  assert.ok(!wordMatches('', 'God'));
  assert.equal(firstLetter('“Man’s'), 'm');
  const all = gradeSpoken(wsc1.text, 'mans chief end is to glorify god and to enjoy him for ever');
  assert.equal(all.score, 1);
  const half = gradeSpoken(wsc1.text, 'mans chief end is to glorify god');
  assert.ok(half.score < SPOKEN_PASS && half.score > 0.5);
  assert.deepEqual(half.heard.slice(-3), [false, false, false]);
  const swapped = gradeSpoken('There is but one only, the living and true God.', 'there is but one only the true and living god');
  const word = (i: number) => words('There is but one only, the living and true God.')[i];
  assert.deepEqual(swapped.moved.flatMap((m, i) => (m ? [word(i)] : [])), ['living', 'true']);
  assert.ok(swapped.score < 1);
});

const at = (iso: string) => new Date(iso);
const ok = (itemId: string, kind: StepResult['kind'] = 'blanks'): StepResult => ({ itemId, kind, correct: true, hints: 0, ms: 1000, review: false });

test('progress: an item gets a schedule only once all its parts are learned', () => {
  const units = unitsFor(wlc4, 'adult');
  const now = at('2026-11-19T12:00:00Z');
  let p = finishSession(emptyProgress(), { results: [ok('wlc-4')], learned: units[0], now });
  assert.deepEqual(p.units, ['wlc-4#1']);
  assert.equal(p.cards['wlc-4'], undefined);
  p = finishSession(p, { results: [ok('wlc-4')], learned: units[1], now });
  assert.ok(p.cards['wlc-4']);
  assert.equal(p.lessons, 2);
  assert.equal(p.days.length, 1);
});

test('progress: a newly learned question comes back after a night’s sleep, however the lesson went', () => {
  const now = at('2026-11-19T12:00:00Z');
  const unit = unitsFor(wsc1, 'adult')[0];
  const good = finishSession(emptyProgress(), { results: [ok('wsc-1', 'intro'), ok('wsc-1')], learned: unit, now });
  const rough = finishSession(emptyProgress(), { results: [{ ...ok('wsc-1'), correct: false }, { ...ok('wsc-1', 'say'), correct: false }], learned: unit, now });
  const next = afterSleep(now).toISOString();
  assert.equal(good.cards['wsc-1'].due, next);
  assert.equal(rough.cards['wsc-1'].due, next);
  assert.ok(waitingForSleep(good, 'wsc-1', at('2026-11-19T20:00:00Z')));
  // Practising again the same evening is welcome, but doesn't count yet.
  const evening = finishSession(good, { results: [ok('wsc-1', 'type')], now: at('2026-11-19T20:00:00Z') });
  assert.deepEqual(evening.cards['wsc-1'], good.cards['wsc-1']);
  assert.equal(dueCards(good, at('2026-11-19T22:00:00Z')).length, 0);
  // The morning recall is the first real rating.
  const morning = at('2026-11-20T18:00:00Z');
  assert.deepEqual(dueCards(good, morning).map((c) => c.itemId), ['wsc-1']);
  const rated = finishSession(good, { results: [ok('wsc-1', 'type')], now: morning });
  const days = (new Date(rated.cards['wsc-1'].due).getTime() - morning.getTime()) / 86400000;
  assert.ok(days >= 1.5 && days <= 4.5, `next review in ${days} days`);
  assert.ok(!waitingForSleep(rated, 'wsc-1', morning));
});

test('progress: only recall moves the schedule, in four grades', () => {
  // Reading and recognising teach, but aren't recall.
  assert.equal(ratingFor([{ ...ok('x', 'intro'), correct: false }, { ...ok('x', 'match'), correct: false }]), null);
  assert.equal(ratingFor([{ ...ok('x', 'spot'), correct: false }, ok('x', 'type')]), GRADES.solid.rating);
  assert.equal(ratingFor([{ ...ok('x', 'type'), hints: 1 }]), GRADES.shaky.rating);
  assert.equal(ratingFor([{ ...ok('x', 'letters'), correct: false }, ok('x', 'say')]), GRADES.shaky.rating);
  assert.equal(ratingFor([{ ...ok('x', 'type'), correct: false }, { ...ok('x', 'say'), correct: false }]), GRADES.forgot.rating);
  // Effortless only for a question already reviewed several times, recalled perfectly in review.
  const seasoned = { state: 2, reps: 4 } as Parameters<typeof ratingFor>[1];
  assert.equal(ratingFor([{ ...ok('x', 'type'), review: true }], seasoned), GRADES.effortless.rating);
  assert.equal(ratingFor([ok('x', 'type')], seasoned), GRADES.solid.rating);
});

test('planner: a unit’s lock-in waits for a night’s sleep, and learning carries on meanwhile', () => {
  const items = courseItems(courses.find((c) => c.id === 'westminster-shorter')!);
  const first = groupsOf(items)[0];
  const noon = at('2026-11-19T12:00:00Z');
  const learned = first.items.flatMap((i) => unitsFor(i, 'adult'));
  const p = finishSession({ ...emptyProgress(), courseLessons: { 'westminster-shorter': 3 } }, { results: first.items.map((i) => ok(i.id)), learned, courseId: 'westminster-shorter', now: noon });
  const later = planNext({ courseId: 'westminster-shorter', items, track: 'adult', p, now: at('2026-11-19T15:00:00Z') });
  assert.equal(later?.kind === 'learn' && later.group.key !== first.key, true, JSON.stringify(later?.kind));
  const tomorrow = planNext({ courseId: 'westminster-shorter', items, track: 'adult', p, now: at('2026-11-20T18:00:00Z') });
  assert.equal(tomorrow?.kind, 'checkpoint');
  const path = coursePath(items, 'adult', p, at('2026-11-19T15:00:00Z'));
  assert.equal(path[0].lockWaiting, true);
  assert.equal(path[0].status, 'current');
  assert.equal(path[1].lessons[0].status, 'current');
});

test('progress: practice is counted in sessions, not in single answers', () => {
  const unit = unitsFor(wsc1, 'adult')[0];
  let p = finishSession(emptyProgress(), { results: [ok('wsc-1', 'intro'), ok('wsc-1'), ok('wsc-1', 'letters')], learned: unit, now: at('2026-11-19T12:00:00Z') });
  p = finishSession(p, { results: [ok('wsc-1'), ok('wsc-1', 'say')], now: at('2026-11-20T12:00:00Z') });
  assert.equal(seenCounts(p).get('wsc-1'), 2);
});

test('progress: stored data that is broken is ignored', () => {
  assert.deepEqual(parseProgress('nope'), {});
  assert.deepEqual(parseProgress(JSON.stringify({ m1: { units: ['a', 3], lessons: 'x' } })).m1, { units: ['a'], checkpoints: [], cards: {}, lessons: 0, courseLessons: {}, levels: {}, awards: {}, days: [], log: [] });
});

test('path: units of named lessons, with exactly one current lesson', () => {
  const items = courseItems(courses.find((c) => c.id === 'westminster-shorter')!);
  const p = { ...emptyProgress(), units: ['wsc-1#1', 'wsc-2#1'] };
  const path = coursePath(items, 'adult', p);
  assert.equal(path.length, 22);
  assert.deepEqual(path[0].lessons.map((l) => `${l.kind === 'checkpoint' ? 'lock' : l.itemId}:${l.status}`),
    ['wsc-1:done', 'wsc-2:done', 'wsc-3:current', 'wsc-4:upcoming', 'wsc-5:upcoming', 'lock:upcoming']);
  assert.equal(path[0].status, 'current');
  assert.equal(path[1].status, 'upcoming');
  assert.equal(path.flatMap((u) => u.lessons).filter((l) => l.status === 'current').length, 1);
  assert.equal(path[0].learned, 2);
  const locked = coursePath(items, 'adult', { ...p, units: ['wsc-1#1', 'wsc-2#1', 'wsc-3#1', 'wsc-4#1', 'wsc-5#1'], checkpoints: ['westminster-shorter:1-5'] });
  assert.equal(locked[0].status, 'done');
  assert.equal(locked[1].lessons[0].status, 'current');
});

test('path: mastered means recalled well after long gaps; streaks count days in a row', () => {
  const items = courseItems(courses.find((c) => c.id === 'westminster-shorter')!);
  const card = (stability: number) => ({ due: '2027-01-01T00:00:00Z', stability, difficulty: 5, scheduled_days: 1, reps: 3, lapses: 0, learning_steps: 0, state: 2 as const });
  const stats = courseStats(items, 'adult', { ...emptyProgress(), units: ['wsc-1#1', 'wsc-2#1'], cards: { 'wsc-1': card(30), 'wsc-2': card(4) } });
  assert.deepEqual(stats, { learned: 2, mastered: 1, total: 107 });
  assert.equal(streak(['2026-11-18', '2026-11-19', '2026-11-20'], '2026-11-20'), 3);
  assert.equal(streak(['2026-11-18', '2026-11-19'], '2026-11-20'), 2);
  assert.equal(streak(['2026-11-17'], '2026-11-20'), 0);
  assert.equal(streak(['2026-02-28', '2026-03-01'], '2026-03-01'), 2);
});

test('voice typing slips are forgiven, different words are not', () => {
  assert.ok(wordMatches('Mann', 'man'));
  assert.ok(wordMatches('principal', 'principally'));
  assert.ok(wordMatches('duties', 'duty'));
  assert.ok(wordMatches('works', 'work'));
  assert.ok(!wordMatches('Cards', "God's"));
  assert.ok(!wordMatches('word', 'lord'));
  assert.ok(!wordMatches('glory', 'glorify'));
  assert.ok(!wordMatches('men', 'man'));
  assert.ok(!wordMatches('his', 'him'));
  assert.ok(!wordMatches('good', 'God'));
  assert.ok(!wordMatches('thee', 'the'));
});

test('practice on one verse is about two minutes: a varied run of quick steps, then the whole thing typed', () => {
  const item = getItem('wsc-2')!;
  const pool = courseItems(courses.find((c) => c.id === 'westminster-shorter')!);
  const steps = buildPractice({ item, track: 'adult', pool, rng: seeded(7) });
  assert.ok(steps.length >= 4 && steps.length <= 6, `${steps.length} steps`);
  assert.equal(steps[steps.length - 1].kind, 'type');
  assert.ok(steps.every((s) => s.itemId === 'wsc-2' && s.review && s.part));
  for (let i = 1; i < steps.length; i++) assert.notEqual(steps[i].kind, steps[i - 1].kind, 'no step twice in a row');
});
