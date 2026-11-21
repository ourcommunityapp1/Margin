import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collections, getItem, allItems } from '../content/index.ts';
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
