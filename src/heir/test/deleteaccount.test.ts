import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIRM_WORD, deleteAccount, type AccountStore } from '../deleteaccount.ts';

function fake(friends: string[], opts: { failDelete?: boolean; failRecount?: string } = {}) {
  const calls: string[] = [];
  const store: AccountStore = {
    async friendsOf() { calls.push('friends'); return friends; },
    async deleteUser(id) { calls.push(`delete:${id}`); if (opts.failDelete) throw new Error('no'); },
    async recount(id) { calls.push(`recount:${id}`); if (id === opts.failRecount) throw new Error('no'); },
  };
  return { store, calls };
}

test('the friends are read first, the account deleted, then their counts redone', async () => {
  const { store, calls } = fake(['a', 'b']);
  const r = await deleteAccount(store, 'me');
  assert.deepEqual(calls, ['friends', 'delete:me', 'recount:a', 'recount:b']);
  assert.equal(r.friendsRecounted, 2);
});

test('no friends: just deleted', async () => {
  const { store, calls } = fake([]);
  await deleteAccount(store, 'me');
  assert.deepEqual(calls, ['friends', 'delete:me']);
});

test('a failed delete stops before any recount, and says so', async () => {
  const { store, calls } = fake(['a'], { failDelete: true });
  await assert.rejects(() => deleteAccount(store, 'me'));
  assert.deepEqual(calls, ['friends', 'delete:me']);
});

test('a failed recount never undoes the deletion', async () => {
  const { store } = fake(['a', 'b'], { failRecount: 'a' });
  const r = await deleteAccount(store, 'me');
  assert.equal(r.friendsRecounted, 1);
});

test('the confirm word is DELETE', () => assert.equal(CONFIRM_WORD, 'DELETE'));
