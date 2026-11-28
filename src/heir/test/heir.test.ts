import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { collections, getItem, allItems } from '../content/index.ts';
import { tidyVerse, verseFromHtml } from '../usfm.ts';
import { collectionProblems, itemProblems } from '../validate.ts';
import { sameWords, words } from '../words.ts';
import { timeOfDay } from '../time.ts';
import { addMember, emptyHousehold, parseHousehold, removeMember, setActive, setPlan, activeMember } from '../household.ts';

test('every collection passes the content checks', () => {
  for (const c of collections) assert.deepEqual(collectionProblems(c), [], c.id);
});

test('the content check catches a chunk that changes a word', () => {
  const item = structuredClone(getItem('wsc-1')!);
  item.chunks.adult = ['Man’s chief end is to glorify God,', 'and to enjoy him always.'];
  assert.ok(itemProblems(item).some((p) => p.includes('adult chunks do not rebuild the text')));
});

test('the content check catches a meaning phrase that is not in the text', () => {
  const item = structuredClone(getItem('wsc-1')!);
  item.meaning[0].phrase = 'main purpose';
  assert.ok(itemProblems(item).some((p) => p.includes('not in the text')));
});

test('every Bible verse is word for word the NASB 2020, as the publisher gives it', () => {
  // test/nasb-passages.json holds the YouVersion Platform's HTML for each passage (NASB 2020, Bible 2692).
  const html = JSON.parse(readFileSync(new URL('./nasb-passages.json', import.meta.url), 'utf8')) as Record<string, string>;
  for (const c of collections.filter((c) => c.kind === 'scripture')) {
    for (const i of c.items) {
      const ref = /\(([^)]+)\)$/.exec(i.prompt)?.[1] ?? i.prompt;
      assert.ok(html[ref], `${i.id}: no saved passage for ${ref}`);
      assert.equal(i.text, tidyVerse(verseFromHtml(html[ref], ref)), `${i.id} (${ref})`);
    }
  }
});

test('every Bible course is short enough for a first window in a few weeks', () => {
  for (const c of collections.filter((c) => c.kind === 'scripture')) assert.ok(c.items.length >= 5 && c.items.length <= 10, `${c.id}: ${c.items.length} items`);
});

test('item ids are unique across collections', () => {
  const ids = allItems().map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('nothing is marked reviewed until the owner approves it', () => {
  assert.ok(allItems().every((i) => i.reviewed === false));
});

test('word comparison ignores capitals, curly quotes and punctuation, but not words', () => {
  assert.ok(sameWords('Man’s chief end is to glorify God,', "man's chief end is to glorify god"));
  assert.ok(!sameWords('and to enjoy him forever', 'and to enjoy him always'));
  assert.deepEqual(words('  God, the Father;  Almighty. '), ['god', 'the', 'father', 'almighty']);
});

test('time of day boundaries', () => {
  const at = (h: number) => timeOfDay(new Date(2026, 10, 19, h, 30));
  assert.equal(at(4), 'night');
  assert.equal(at(5), 'dawn');
  assert.equal(at(8), 'dawn');
  assert.equal(at(9), 'day');
  assert.equal(at(16), 'day');
  assert.equal(at(17), 'dusk');
  assert.equal(at(19), 'dusk');
  assert.equal(at(20), 'night');
});

test('household: the first member becomes active, removing them moves to the next', () => {
  const now = new Date('2026-11-19T12:00:00Z');
  let h = addMember(emptyHousehold(), '  June ', 'child', 'a', now);
  h = addMember(h, 'Dad', 'adult', 'b', now);
  assert.equal(activeMember(h)?.name, 'June');
  assert.equal(h.members[0].track, 'child');
  h = setActive(h, 'b');
  assert.equal(activeMember(h)?.name, 'Dad');
  h = removeMember(h, 'b');
  assert.equal(activeMember(h)?.name, 'June');
  assert.equal(addMember(h, '   ', 'adult', 'c', now).members.length, 1);
});

test('household: a plan is a course, and older plans that named a collection still load', () => {
  assert.deepEqual(setPlan(emptyHousehold(), { course: 'creeds' }).plan, { course: 'creeds' });
  const old = (collection: string) => parseHousehold(JSON.stringify({ members: [], plan: { collection, through: 10, minutes: 5 } })).plan;
  assert.deepEqual(old('westminster-shorter'), { course: 'westminster-shorter', minutes: 5 });
  assert.deepEqual(old('apostles-creed'), { course: 'creeds', minutes: 5 });
  // The daily goal stays when the course changes.
  const withGoal = setPlan(emptyHousehold(), { course: 'westminster-shorter', minutes: 15 });
  assert.deepEqual(setPlan(withGoal, { course: 'creeds' }).plan, { course: 'creeds', minutes: 15 });
});

test('household: stored data that is broken becomes an empty household', () => {
  assert.deepEqual(parseHousehold('not json'), emptyHousehold());
  assert.deepEqual(parseHousehold(null), emptyHousehold());
  const h = parseHousehold(JSON.stringify({ members: [{ id: 'x', name: 'Mom', track: 'weird' }, { nope: 1 }], activeMemberId: 'gone', plan: null }));
  assert.equal(h.members.length, 1);
  assert.equal(h.members[0].track, 'adult');
  assert.equal(h.activeMemberId, 'x');
});

test('related references split into passages, and unusable ones are left out', async () => {
  const { passagesOf, relatedFor, verseCount } = await import('../related.ts');
  assert.deepEqual(passagesOf('Acts 15:14–15, 18'), ['Acts 15:14–15', 'Acts 15:18']);
  assert.deepEqual(passagesOf('Romans 3:10–18, 23'), ['Romans 3:10–18', 'Romans 3:23']);
  assert.deepEqual(passagesOf('Psalm 103:1–5; 136'), ['Psalm 103:1–5']);
  assert.deepEqual(passagesOf('cf. John 1:14, 18'), ['John 1:14', 'John 1:18']);
  assert.deepEqual(passagesOf('Genesis 1:1'), ['Genesis 1:1']);
  assert.equal(verseCount('Acts 15:14–15'), 2);
  assert.equal(verseCount('John 3:16'), 1);
  assert.deepEqual(relatedFor(getItem('fv-3')!), ['Romans 5:8', '1 John 4:9']);
  assert.ok(allItems().filter((i) => i.connected.length).every((i) => relatedFor(i).length > 0), 'every item with references has some that can be looked up');
});

test('understanding: Learned, then Understood (explained), then Mastered (every related verse recalled); separate from stones', async () => {
  const { understanding, earnedLevels } = await import('../levels.ts');
  const { emptyProgress, markExplained, recallRelated, mergeProgress } = await import('../progress.ts');
  const { relatedFor } = await import('../related.ts');
  const item = getItem('fv-3')!;
  const now = new Date('2026-12-01T12:00:00Z');
  const meaning = { at: now.toISOString(), itemId: item.id, kind: 'meaning' as const, correct: true, hints: 0, ms: 1000, review: false };
  let p = emptyProgress();
  assert.equal(understanding(item, p), 0);
  p = { ...p, log: [meaning] };
  assert.equal(understanding(item, p), 1);
  // Related verses alone don't make it mastered.
  for (const r of relatedFor(item)) p = recallRelated(p, r, now);
  assert.equal(understanding(item, p), 1);
  p = markExplained(p, item.id, now);
  assert.equal(understanding(item, p), 3);
  const partial = markExplained({ ...emptyProgress(), log: [meaning] }, item.id, now);
  assert.equal(understanding(item, partial), 2);
  // Explanations survive merging two copies, and never raise a stone.
  assert.ok(mergeProgress(emptyProgress(), p).explained?.[item.id]);
  assert.equal(earnedLevels([item], 'adult', p, now)[item.id], undefined);
  // An item with no meaning notes has no understanding track.
  assert.equal(understanding({ ...item, meaning: [] }, p), 0);
});

test('words in memory: learned parts count their words; each stage counts whole items at or above it', async () => {
  const { wordsIn, milestones, wordCount } = await import('../measures.ts');
  const { emptyProgress } = await import('../progress.ts');
  const { unitsFor } = await import('../lesson.ts');
  const a = getItem('fv-1')!, b = getItem('fv-3')!;
  const typed = (itemId: string, hints = 0) => ({ at: '2026-11-02T15:00:00.000Z', itemId, kind: 'type' as const, correct: true, hints, ms: 1000, review: false });
  const units = [...unitsFor(a, 'adult'), ...unitsFor(b, 'adult')].map((u) => u.key);
  const p = { ...emptyProgress(), units, log: unitsFor(b, 'adult').map(() => typed(b.id)), levels: { [a.id]: 2 } };
  const w = wordsIn([a, b], 'adult', p);
  assert.equal(w.recited, wordCount(a.text) + wordCount(b.text));
  assert.equal(wordsIn([a, b], 'adult', { ...p, log: unitsFor(b, 'adult').map(() => typed(b.id, 1)) }).recited, wordCount(a.text), 'typed with hints is not recited');
  assert.equal(w.atStage[1], wordCount(a.text), 'Remembered counts only the item with a stone');
  assert.equal(w.atStage[2], wordCount(a.text));
  assert.equal(w.atStage[3], 0);
  assert.equal(w.inMemory, w.atStage[1]);
  assert.deepEqual(milestones(9), { reached: [], next: 10 });
  assert.deepEqual(milestones(84), { reached: [10, 25, 50, 75], next: 100 });
  assert.deepEqual(milestones(1200).next, null);
});
