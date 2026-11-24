import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampDue, dayKeyIn, endOfNextDay, missedWhen, keepState, summarize, windowDays, type Held } from '../keep.ts';

const d = (s: string) => new Date(s);
const LAUNCH = d('2026-10-01T00:00:00Z'); // long before the dates below: the 30-day grace is over
const opts = { launch: LAUNCH, tz: 'UTC', mode: 'any-part' as const };

test('the window grows with the stone: 90 days, then 240 at Emerald, then 425 at Sapphire and above', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(windowDays), [90, 90, 90, 240, 425, 425]);
});

test('an item with no stone is not counted at all', () => {
  assert.deepEqual(keepState(0, { good: '2026-01-01T00:00:00Z' }, d('2026-12-01T00:00:00Z'), opts), { state: 'kept' });
});

test('rule 1: kept for 76 days, due for review from day 76 to 90, out on day 90', () => {
  const keep = { good: '2026-11-01T00:00:00Z' };
  assert.equal(keepState(2, keep, d('2026-12-01T00:00:00Z'), opts).state, 'kept');          // day 30
  assert.equal(keepState(2, keep, d('2027-01-15T00:00:00Z'), opts).state, 'kept');          // day 75
  const soon = keepState(2, keep, d('2027-01-16T00:00:00Z'), opts);                        // day 76
  assert.equal(soon.state, 'review');
  assert.equal((soon as { deadline: Date }).deadline.toISOString(), '2027-01-30T00:00:00.000Z');
  assert.equal(keepState(2, keep, d('2027-01-29T23:00:00Z'), opts).state, 'review');
  assert.equal(keepState(2, keep, d('2027-01-30T00:00:00Z'), opts).state, 'out');           // day 90
});

test('higher stones get longer windows', () => {
  const keep = { good: '2026-11-01T00:00:00Z' };
  assert.equal(keepState(4, keep, d('2027-03-01T00:00:00Z'), opts).state, 'kept');    // day 120 at Emerald: fine
  assert.equal(keepState(4, keep, d('2027-07-01T00:00:00Z'), opts).state, 'out');     // day 242
  assert.equal(keepState(5, keep, d('2027-07-01T00:00:00Z'), opts).state, 'kept');    // day 242 at Sapphire: fine
  assert.equal(keepState(6, keep, d('2028-01-01T00:00:00Z'), opts).state, 'out');     // day 426
});

test('rule 2: a miss keeps the words until the end of the next day; right by then loses nothing, otherwise they leave', () => {
  const keep = { good: '2026-11-01T00:00:00Z', miss: '2026-11-10T15:00:00Z' };
  const day0 = keepState(2, keep, d('2026-11-10T18:00:00Z'), opts);
  assert.equal(day0.state, 'try-again');
  assert.equal((day0 as { deadline: Date }).deadline.toISOString(), '2026-11-11T23:59:59.999Z');
  assert.equal(keepState(2, keep, d('2026-11-11T23:00:00Z'), opts).state, 'try-again');
  assert.equal(keepState(2, keep, d('2026-11-12T00:30:00Z'), opts).state, 'out');
  // Put right in time: a later right recall clears it.
  assert.equal(keepState(2, { good: '2026-11-11T09:00:00Z', miss: '2026-11-10T15:00:00Z' }, d('2026-11-12T10:00:00Z'), opts).state, 'kept');
});

test('a slipped item comes back with one right recall', () => {
  const out = { good: '2026-06-01T00:00:00Z' };
  assert.equal(keepState(2, out, d('2026-12-01T00:00:00Z'), opts).state, 'out');
  assert.equal(keepState(2, { good: '2026-12-01T00:00:00Z' }, d('2026-12-01T00:00:00Z'), opts).state, 'kept');
});

test('for 30 days after launch nothing leaves anyone’s count', () => {
  const launch = d('2026-12-01T00:00:00Z');
  const old = { good: '2026-06-01T00:00:00Z' }; // would be long out
  const during = keepState(2, old, d('2026-12-20T00:00:00Z'), { launch, tz: 'UTC', mode: 'any-part' as const });
  assert.equal(during.state, 'review');
  assert.equal((during as { deadline: Date }).deadline.toISOString(), '2026-12-31T00:00:00.000Z');
  assert.equal(keepState(2, old, d('2026-12-31T00:00:01Z'), { launch, tz: 'UTC', mode: 'any-part' as const }).state, 'out');
  // A miss during the grace period leaves nothing out either.
  assert.equal(keepState(2, { good: '2026-11-01T00:00:00Z', miss: '2026-12-02T10:00:00Z' }, d('2026-12-10T00:00:00Z'), { launch, tz: 'UTC', mode: 'any-part' as const }).state, 'review');
});

test('progress from before the keep record: the window starts when the rules do', () => {
  assert.equal(keepState(2, undefined, d('2026-12-15T00:00:00Z'), opts).state, 'kept');    // day 75 after launch
  assert.equal(keepState(2, undefined, d('2026-12-16T00:00:00Z'), opts).state, 'review');  // day 76
  assert.equal(keepState(2, undefined, d('2026-12-30T00:00:00Z'), opts).state, 'out');     // day 90
  assert.equal(keepState(2, undefined, d('2030-01-01T00:00:00Z'), { launch: null, mode: 'any-part' as const }).state, 'kept', 'not started yet');
});

test('whole-item mode counts only a recall of every part (reviews will ask for that later)', () => {
  const keep = { good: '2026-12-01T00:00:00Z', full: '2026-06-01T00:00:00Z' };
  assert.equal(keepState(2, keep, d('2026-12-10T00:00:00Z'), { ...opts, mode: 'any-part' }).state, 'kept');
  assert.equal(keepState(2, keep, d('2026-12-10T00:00:00Z'), { ...opts, mode: 'whole' }).state, 'out');
});

test('the end of the next day follows the person’s time zone', () => {
  // 10pm Chicago on Nov 10 is 04:00 UTC Nov 11. End of the next local day is the end of Nov 11 Chicago = 06:00 UTC Nov 12.
  assert.equal(endOfNextDay(d('2026-11-11T04:00:00Z'), 'America/Chicago').toISOString(), '2026-11-12T05:59:59.999Z');
  // Across a daylight saving change (US clocks went back Nov 1, 2026): 11pm Oct 31 Chicago, the next day is Nov 1.
  assert.equal(endOfNextDay(d('2026-11-01T04:00:00Z'), 'America/Chicago').toISOString(), '2026-11-02T05:59:59.999Z');
  assert.equal(endOfNextDay(d('2026-11-10T15:00:00Z'), 'Asia/Kathmandu').toISOString(), '2026-11-11T18:14:59.999Z');
  assert.equal(endOfNextDay(d('2026-11-10T15:00:00Z'), 'UTC').toISOString(), '2026-11-11T23:59:59.999Z');
});

test('the summary counts kept words, lists what to try again and review, and counts what is out', () => {
  const mk = (id: string, state: Held['state'], words: number): Held => ({ item: { id } as Held['item'], level: 2, state, words });
  const s = summarize([mk('a', { state: 'kept' }, 10), mk('b', { state: 'review', deadline: d('2026-12-08T00:00:00Z') }, 20), mk('c', { state: 'review', deadline: d('2026-12-02T00:00:00Z') }, 5),
    mk('d', { state: 'try-again', deadline: d('2026-12-01T00:00:00Z') }, 7), mk('e', { state: 'out', since: d('2026-11-01T00:00:00Z') }, 30)]);
  assert.equal(s.wordsKept, 42);
  assert.equal(s.wordsOut, 30);
  assert.deepEqual(s.review.map((h) => h.item.id), ['c', 'b'], 'soonest first');
  assert.deepEqual(s.tryAgain.map((h) => h.item.id), ['d']);
});

test('the scheduler never sets a review past two weeks before the window ends, or past the day after a miss', () => {
  const now = d('2026-11-20T00:00:00Z');
  const far = d('2027-06-01T00:00:00Z');
  assert.equal(clampDue(far, 2, { good: '2026-11-15T00:00:00Z' }, now, 'UTC', 'any-part').toISOString(), '2027-01-30T00:00:00.000Z', 'recalled Nov 15 + 76 days');
  assert.equal(clampDue(d('2026-12-01T00:00:00Z'), 2, { good: '2026-11-15T00:00:00Z' }, now, 'UTC', 'any-part').toISOString(), '2026-12-01T00:00:00.000Z', 'earlier than the limit: unchanged');
  assert.equal(clampDue(far, 2, { good: '2026-11-01T00:00:00Z', miss: '2026-11-19T20:00:00Z' }, now, 'UTC', 'any-part').toISOString(), '2026-11-20T23:59:59.999Z', 'after a miss: tomorrow');
  assert.equal(clampDue(far, 4, { good: '2026-11-15T00:00:00Z' }, now, 'UTC', 'any-part').toISOString(), '2027-06-01T00:00:00.000Z', 'Emerald: 226 days is later than this due date, so unchanged');
  assert.equal(clampDue(far, 2, undefined, now, 'UTC', 'any-part').toISOString(), far.toISOString());
});

test('by default a recall means the whole item: a right recall of one part keeps nothing', () => {
  const onlyPart = { good: '2026-12-20T00:00:00Z', full: '2026-06-01T00:00:00Z' };
  assert.equal(keepState(2, onlyPart, d('2026-12-25T00:00:00Z'), { launch: LAUNCH, tz: 'UTC' }).state, 'out');
  assert.equal(keepState(2, { good: '2026-12-20T00:00:00Z', full: '2026-12-20T00:00:00Z' }, d('2026-12-25T00:00:00Z'), { launch: LAUNCH, tz: 'UTC' }).state, 'kept');
  assert.equal(clampDue(d('2027-06-01T00:00:00Z'), 2, { good: '2026-12-20T00:00:00Z', full: '2026-11-15T00:00:00Z' }, d('2026-11-20T00:00:00Z'), 'UTC').toISOString(), '2027-01-30T00:00:00.000Z', 'the whole-item recall sets the limit');
});

test('a missed recall says whether it happened today or yesterday', () => {
  const miss = d('2026-11-10T15:00:00Z');
  const deadline = endOfNextDay(miss, 'America/Chicago');
  assert.equal(missedWhen(deadline, d('2026-11-10T20:00:00Z'), 'America/Chicago'), 'today');
  assert.equal(missedWhen(deadline, d('2026-11-11T15:00:00Z'), 'America/Chicago'), 'yesterday');
  // Late evening in Chicago is already the next day in UTC: the zone decides.
  assert.equal(missedWhen(deadline, d('2026-11-11T03:00:00Z'), 'America/Chicago'), 'today');
});

test('day keys follow the zone, and an unknown zone falls back instead of throwing', () => {
  assert.equal(dayKeyIn(d('2026-11-11T03:00:00Z').getTime(), 'America/Chicago'), '2026-11-10');
  assert.equal(dayKeyIn(d('2026-11-11T03:00:00Z').getTime(), 'UTC'), '2026-11-11');
  assert.equal(typeof dayKeyIn(d('2026-11-11T03:00:00Z').getTime(), 'Not/AZone'), 'string');
});
