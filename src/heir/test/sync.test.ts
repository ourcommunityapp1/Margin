import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseOnSignIn, fromRows, removedMemberIds, toRows } from '../sync.ts';
import { addMember, emptyHousehold, setActive, setPlan } from '../household.ts';

const now = new Date('2026-11-19T12:00:00Z');
const later = new Date('2026-11-19T12:05:00Z');
const family = () => {
  let h = addMember(emptyHousehold(), 'June', 'child', 'm1', now);
  h = addMember(h, 'Dad', 'adult', 'm2', later);
  h = setActive(h, 'm2');
  return setPlan(h, { collection: 'westminster-shorter', through: 10, minutes: 5 });
};

test('a household survives the trip to rows and back', () => {
  const h = family();
  const rows = toRows(h, 'hh');
  assert.equal(rows.household.active_member_id, 'm2');
  assert.deepEqual(fromRows(rows.household, rows.members), h);
});

test('members come back in the order they were added, whatever order the database returns', () => {
  const rows = toRows(family(), 'hh');
  const back = fromRows(rows.household, [...rows.members].reverse());
  assert.deepEqual(back.members.map((m) => m.name), ['June', 'Dad']);
});

test('an active member that no longer exists falls back to the first', () => {
  const rows = toRows(family(), 'hh');
  const back = fromRows({ ...rows.household, active_member_id: 'gone' }, rows.members);
  assert.equal(back.activeMemberId, 'm1');
});

test('removed members are found for deletion', () => {
  const rows = toRows(family(), 'hh');
  const after = { ...family(), members: family().members.filter((m) => m.id !== 'm1') };
  assert.deepEqual(removedMemberIds(rows.members, after), ['m1']);
});

test('first sign-in: the phone household is carried up only when the account has none', () => {
  const local = family();
  assert.deepEqual(chooseOnSignIn(local, null), { household: local, upload: true });
  assert.deepEqual(chooseOnSignIn(local, emptyHousehold()), { household: local, upload: true });
  const remote = addMember(emptyHousehold(), 'Mom', 'adult', 'r1', now);
  assert.deepEqual(chooseOnSignIn(local, remote), { household: remote, upload: false });
  assert.deepEqual(chooseOnSignIn(emptyHousehold(), null), { household: emptyHousehold(), upload: false });
});
