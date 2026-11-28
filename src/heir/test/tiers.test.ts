import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TIERS, tierOf, tierIndex } from '../tiers.ts';
import { migrateLevel, onCurrentScale } from '../level-scale.ts';

test('five tiers in order, with the names the owner chose', () => {
  assert.deepEqual(TIERS.map((t) => t.name), ['Familiar', 'Recalled', 'Memorized', 'Proficient', 'Expert']);
  assert.deepEqual(TIERS.map((t) => t.stone), ['Stone', 'Bronze', 'Silver', 'Gold', 'Diamond']);
  assert.deepEqual(TIERS.map((t) => t.n), [1, 2, 3, 4, 5]);
});

test('a stored level is its tier; 0 has none', () => {
  assert.equal(tierOf(0), null);
  assert.deepEqual([1, 2, 3, 4, 5].map((l) => tierOf(l)!.name), ['Familiar', 'Recalled', 'Memorized', 'Proficient', 'Expert']);
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(tierIndex), [-1, 0, 1, 2, 3, 4]);
});

test('levels from the six-stone scale move up or across, never down, and only once', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(migrateLevel), [0, 2, 3, 4, 5, 5, 5]);
  const old: { levels: Record<string, number>; levelScale?: number } = { levels: { a: 1, b: 2, c: 3, d: 6 } };
  const once = onCurrentScale(old);
  assert.deepEqual(once.levels, { a: 2, b: 3, c: 4, d: 5 });
  assert.equal(once.levelScale, 2);
  assert.deepEqual(onCurrentScale(once), once, 'a record already on the current scale is left alone');
});
