import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orphanedProgress } from '../recover.ts';
import { emptyProgress } from '../progress.ts';

test('progress left on the phone after a person is removed can be found again', () => {
  const kept = { id: 'a', name: 'A', track: 'adult' as const, createdAt: '2026-11-01T00:00:00Z' };
  const lost = { ...emptyProgress(), lessons: 21, units: ['wsc-1#1', 'wsc-2#1'], days: ['2026-11-20'], levels: { 'wsc-1': 2, 'wsc-2': 0 } };
  const p = { a: { ...emptyProgress(), lessons: 3 }, gone: lost, blank: emptyProgress() };
  assert.deepEqual(orphanedProgress(p, [kept]), [{ id: 'gone', lessons: 21, units: 2, days: 1, stones: 1 }]);
  assert.deepEqual(orphanedProgress(p, [kept, { ...kept, id: 'gone' }]), [], 'nothing is orphaned once the person is back');
});
