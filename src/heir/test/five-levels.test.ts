import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyProgress, mergeProgress, parseProgress, type LogEntry } from '../progress.ts';
import { earnedLevels, levelShown, FAMILIAR, RECALLED } from '../levels.ts';
import { wordsIn } from '../measures.ts';
import { allItems, getItem } from '../content/index.ts';
import { unitsFor } from '../lesson.ts';

const q1 = getItem('wsc-1')!, q2 = getItem('wsc-2')!;
const items = [q1, q2];
const rec = (levels: Record<string, number>, scale?: number) => JSON.stringify({ m1: { ...emptyProgress(), levels, ...(scale ? { levelScale: scale } : { levelScale: undefined }) } });

test('saved progress from the six-stone scale is moved onto the five levels when read, and only once', () => {
  const old = parseProgress(rec({ 'wsc-1': 1, 'wsc-2': 4 })).m1;
  assert.deepEqual(old.levels, { 'wsc-1': 2, 'wsc-2': 5 });
  assert.equal(old.levelScale, 2);
  const again = parseProgress(JSON.stringify({ m1: old })).m1;
  assert.deepEqual(again.levels, old.levels, 'reading a migrated record again changes nothing');
});

test('merging an older-scale copy with a current one never reads the old levels as higher ones', () => {
  const oldCopy = parseProgress(JSON.stringify({ m1: { ...emptyProgress(), levels: { 'wsc-1': 2 }, levelScale: undefined } })).m1; // Topaz
  const current = { ...emptyProgress(), levels: { 'wsc-1': 3, 'wsc-2': 2 } }; // Memorized, Recalled
  const merged = mergeProgress(current, { ...emptyProgress(), levels: { 'wsc-1': 2 }, levelScale: undefined });
  assert.deepEqual(merged.levels, { 'wsc-1': 3, 'wsc-2': 2 });
  assert.deepEqual(mergeProgress(oldCopy, current).levels, merged.levels, 'order does not matter');
  assert.equal(merged.levelScale, 2);
});

test('Familiar: anything learned is at least Familiar; Recalled is where it counts as in memory', () => {
  const learned = { ...emptyProgress(), units: unitsFor(q1, 'adult').map((u) => u.key) };
  const log: LogEntry[] = unitsFor(q1, 'adult').map((u) => ({ at: '2026-11-02T10:00:00.000Z', itemId: 'wsc-1', kind: 'type', correct: true, hints: 0, ms: 1, review: false, part: u.key }));
  const p = { ...learned, log };
  assert.equal(earnedLevels(items, 'adult', p, new Date('2026-11-02T12:00:00Z'))['wsc-1'], FAMILIAR);
  assert.equal(earnedLevels(items, 'adult', p, new Date('2026-11-02T12:00:00Z'))['wsc-2'], undefined, 'not learned: no level');
  assert.equal(levelShown({ ...p, levels: {} }, q1, 'adult'), FAMILIAR, 'shown at once, before the next lesson settles it');
  // Familiar adds to words started but not to words in memory.
  const w = wordsIn(items, 'adult', { ...p, levels: { 'wsc-1': FAMILIAR } });
  assert.ok(w.recited > 0);
  assert.equal(w.inMemory, 0);
  assert.ok(wordsIn(items, 'adult', { ...p, levels: { 'wsc-1': RECALLED } }).inMemory > 0);
});

test('words in memory are the same before and after moving a record onto the five levels', () => {
  const log: LogEntry[] = [];
  const oldRecord = { ...emptyProgress(), levels: { 'wsc-1': 1, 'wsc-2': 2 }, levelScale: undefined, log };
  const before = [q1, q2].reduce((n, i) => n + i.chunks.adult.join(' ').split(/\s+/).length, 0); // both had a stone
  const migrated = parseProgress(JSON.stringify({ m1: oldRecord })).m1;
  assert.equal(wordsIn(allItems(), 'adult', migrated).inMemory, before);
});
