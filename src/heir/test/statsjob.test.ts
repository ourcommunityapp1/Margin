import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayIn, progressForStats, refreshStats, type AnswerIn, type Store } from '../statsjob.ts';
import { emptyProgress } from '../progress.ts';
import { getItem, courses, courseItems } from '../content/index.ts';
import { unitsFor } from '../lesson.ts';
import type { Stats } from '../stats.ts';

const q1 = getItem('wsc-1')!;
const course = courses.find((c) => c.id === 'westminster-shorter')!;
const inputs = [{ id: course.id, items: courseItems(course) }];
const parts = unitsFor(q1, 'adult');
const row = (at: string, extra: Partial<AnswerIn> = {}): AnswerIn => ({ item_id: 'wsc-1', kind: 'type', correct: true, hints: 0, ms: 1, review: false, part: null, misses: null, session_at: at, local_day: at.slice(0, 10), ...extra });
const NOW = new Date('2026-12-30T12:00:00Z');
// Typed in full on three different days, then again after three weeks: Carnelian (Lasting).
const history: AnswerIn[] = [
  ...parts.map((u) => row('2026-11-20T10:00:00Z', { part: u.key })),
  ...parts.map((u) => row('2026-11-21T10:00:00Z', { part: u.key })),
  ...parts.map((u) => row('2026-11-22T10:00:00Z', { part: u.key })),
  ...parts.map((u) => row('2026-12-20T10:00:00Z', { part: u.key })),
];

function memoryStore(rows: AnswerIn[], last: { words: number; updatedAt: string; source: string } | null = null, lastPoint: number | null = null) {
  const saved: { stats?: Stats; words: number[] } = { words: [] };
  const store: Store = {
    profileFor: async () => ({ memberId: 'm1', track: 'adult', tz: 'America/Chicago' }),
    progressFor: async () => ({ ...emptyProgress(), units: parts.map((u) => u.key) }),
    answersFor: async () => rows,
    lastStats: async () => last,
    lastRecordedWords: async () => lastPoint,
    save: async (_u, s) => { saved.stats = s; },
    recordWords: async (_u, w) => { saved.words.push(w); },
  };
  return { store, saved };
}
const opts = { courses: inputs, items: [q1], now: NOW, today: dayIn };

test('stones come from the full answer history, not the phone’s trimmed log', () => {
  const p = progressForStats({ ...emptyProgress(), log: history.slice(-2).map((r) => ({ at: r.session_at, itemId: r.item_id, kind: 'type' as const, correct: true, hints: 0, ms: 1, review: false })) }, history, 'adult', [q1], NOW);
  assert.ok((p.levels['wsc-1'] ?? 0) >= 3, `level ${p.levels['wsc-1']}`);
  assert.equal(p.log.length, history.length);
  assert.deepEqual(p.days, ['2026-11-20', '2026-11-21', '2026-11-22', '2026-12-20']);
});

test('refreshing works out and saves the numbers, and records the first words point', async () => {
  const { store, saved } = memoryStore(history);
  const out = await refreshStats(store, 'u1', opts);
  assert.ok(out.ok);
  assert.ok(saved.stats && saved.stats.stones[2] >= 1, 'a Lasting stone');
  assert.ok(saved.stats!.wordsInMemory > 0);
  assert.deepEqual(saved.words, [saved.stats!.wordsInMemory]);
  assert.equal(saved.stats!.courses[0].learned, 1);
});

test('words history only grows a point when the number changed', async () => {
  const first = memoryStore(history);
  await refreshStats(first.store, 'u1', opts);
  const w = first.saved.stats!.wordsInMemory;
  const same = memoryStore(history, { words: w, updatedAt: '2026-12-30T11:00:00Z', source: 'server' }, w);
  await refreshStats(same.store, 'u1', opts);
  assert.deepEqual(same.saved.words, []);
  const moved = memoryStore(history, { words: w, updatedAt: '2026-12-30T11:00:00Z', source: 'server' }, w - 7);
  await refreshStats(moved.store, 'u1', opts);
  assert.deepEqual(moved.saved.words, [w]);
  // A number saved earlier by the phone, but no history yet: the first server run still records a starting point.
  const firstRun = memoryStore(history, { words: w, updatedAt: '2026-12-30T11:00:00Z', source: 'phone' }, null);
  await refreshStats(firstRun.store, 'u1', opts);
  assert.deepEqual(firstRun.saved.words, [w]);
});

test('it doesn’t redo work within 20 seconds, and does nothing without a profile', async () => {
  const soon = memoryStore(history, { words: 5, updatedAt: new Date(NOW.getTime() - 5000).toISOString(), source: 'server' });
  assert.deepEqual(await refreshStats(soon.store, 'u1', opts), { ok: false, reason: 'too-soon' });
  assert.equal(soon.saved.stats, undefined);
  const none = memoryStore(history); none.store.profileFor = async () => null;
  assert.deepEqual(await refreshStats(none.store, 'u1', opts), { ok: false, reason: 'no-profile' });
  const phone = memoryStore(history, { words: 5, updatedAt: new Date(NOW.getTime() - 5000).toISOString(), source: 'phone' });
  assert.ok((await refreshStats(phone.store, 'u1', opts)).ok, 'a phone-sent row is replaced at once');
});

test('the day is worked out in the person’s time zone', () => {
  assert.equal(dayIn('America/Chicago', new Date('2026-12-30T03:00:00Z')), '2026-12-29');
  assert.equal(dayIn('Pacific/Auckland', new Date('2026-12-30T03:00:00Z')), '2026-12-30');
  assert.equal(dayIn('Not/AZone', new Date('2026-12-30T03:00:00Z')), '2026-12-30');
  assert.equal(dayIn(null, new Date('2026-12-30T03:00:00Z')), '2026-12-30');
});
