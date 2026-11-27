import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TIERS, tierOf, tierIndex } from '../tiers.ts';
import { LEVELS } from '../levels.ts';

test('five tiers in order, with the names the owner chose', () => {
  assert.deepEqual(TIERS.map((t) => t.name), ['Familiar', 'Recalled', 'Memorized', 'Proficient', 'Expert']);
  assert.deepEqual(TIERS.map((t) => t.stone), ['Stone', 'Bronze', 'Silver', 'Gold', 'Diamond']);
});

test('engine levels fold into tiers; the top three stones are all Expert', () => {
  assert.equal(tierOf(0, false), null);
  assert.equal(tierOf(0, true)?.name, 'Familiar');
  assert.deepEqual([1, 2, 3, 4, 5, 6].map((l) => tierOf(l)!.name), ['Recalled', 'Memorized', 'Proficient', 'Expert', 'Expert', 'Expert']);
  assert.equal(LEVELS.length, 6);
});

test('tier index never goes down as the level goes up', () => {
  let prev = -1;
  for (let l = 0; l <= 6; l++) { const t = tierIndex(l); assert.ok(t >= prev); prev = t; }
});
