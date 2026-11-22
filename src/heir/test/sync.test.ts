import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseOnSignIn, fromRows, removedMemberIds, toRows, withRemoteMembers } from '../sync.ts';
import { addMember, emptyHousehold, setActive, setPlan } from '../household.ts';

const now = new Date('2026-11-19T12:00:00Z');
const later = new Date('2026-11-19T12:05:00Z');
const family = () => {
  let h = addMember(emptyHousehold(), 'June', 'child', 'm1', now);
  h = addMember(h, 'Dad', 'adult', 'm2', later);
  h = setActive(h, 'm2');
  return setPlan(h, { course: 'westminster-shorter' });
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

test('an account that has just joined a family has no active person until it adds itself', () => {
  const rows = toRows(family(), 'hh');
  const back = fromRows({ plan: null, active_member_id: null }, rows.members);
  assert.equal(back.activeMemberId, null);
  assert.equal(back.members.length, 2);
  assert.equal(back.plan, null);
});

test('people another account added are brought in, and nobody is dropped', () => {
  const mine = family();
  const theirs = addMember(family(), 'Mom', 'adult', 'm3', new Date('2026-11-19T13:00:00Z'));
  const merged = withRemoteMembers(mine, theirs);
  assert.deepEqual(merged.members.map((m) => m.name), ['June', 'Dad', 'Mom']);
  assert.equal(merged.activeMemberId, 'm2', 'this phone keeps its own active person');
  const offline = addMember(mine, 'Sam', 'child', 'm4', new Date('2026-11-19T14:00:00Z'));
  assert.deepEqual(withRemoteMembers(offline, theirs).members.map((m) => m.id), ['m1', 'm2', 'm3', 'm4']);
  assert.equal(withRemoteMembers(mine, mine), mine);
});
