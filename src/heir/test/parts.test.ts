import { test } from 'node:test';
import assert from 'node:assert/strict';
import { courseParts, getCourse } from '../content/index.ts';

test('the Shorter Catechism has three parts that cover every question once', () => {
  const parts = courseParts(getCourse('westminster-shorter')!);
  assert.deepEqual(parts.map((p) => p.items.length), [38, 43, 26]);
  assert.deepEqual(parts.map((p) => [p.items[0].number, p.items.at(-1)!.number]), [[1, 38], [39, 81], [82, 107]]);
});

test('a course without parts has one part per collection', () => {
  const parts = courseParts(getCourse('creeds')!);
  assert.deepEqual(parts.map((p) => p.title), ['Apostles’ Creed', 'Nicene Creed']);
  assert.ok(parts.every((p) => p.items.length > 0));
});
