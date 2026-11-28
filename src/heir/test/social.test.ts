import { test } from 'node:test';
import assert from 'node:assert/strict';
import { friendsCount, place, sinceLabel, streakLine, usernameProblem } from '../social.ts';

test('usernames: 3 to 20 letters, numbers or underscores, starting with a letter, and not reserved', () => {
  for (const ok of ['sarahk', 'Sarah_K', 'a1_', 'x'.repeat(20)]) assert.equal(usernameProblem(ok), null, ok);
  for (const bad of ['ab', '1abc', '_abc', 'sarah k', 'x'.repeat(21), 'sarah!', '']) assert.ok(usernameProblem(bad), bad);
  assert.equal(usernameProblem('Admin'), 'That name is reserved.');
  assert.equal(usernameProblem('  sarahk  '), null, 'spaces around are trimmed');
});

test('place, since, streak and friend count wording', () => {
  assert.equal(place('Franklin', 'TN'), 'Franklin, TN');
  assert.equal(place('', 'TN'), 'TN');
  assert.equal(place(null, null), '');
  assert.equal(sinceLabel('2026-03-14T12:00:00Z'), 'Mar 2026');
  assert.equal(sinceLabel(null), '');
  assert.equal(streakLine(12, '2026-11-24', '2026-11-24'), '12-day streak');
  assert.equal(streakLine(0, '2026-11-15', '2026-11-24'), 'Last lesson 9 days ago');
  assert.equal(streakLine(0, '2026-11-23', '2026-11-24'), 'Last lesson yesterday');
  assert.equal(streakLine(0, null, '2026-11-24'), 'No lessons yet');
  assert.equal(friendsCount(1), '1 friend');
  assert.equal(friendsCount(38), '38 friends');
});
