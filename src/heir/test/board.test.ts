import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arrow, gapsAfter, hasAlert, movement, ordinal, previewRows, rowSub, slots, topTenNote, type Board, type BoardRow } from '../board.ts';

const row = (idx: number, extra: Partial<BoardRow> = {}): BoardRow => ({ place: idx, prev_place: idx, idx, username: `u${idx}`, relation: 'friend', words: 1000 - idx, name: `P${idx}`, is_me: false, friends_since: '2026-03-14T00:00:00Z', via: null, ...extra });

test('the line under a name: friend since, who connects you, or nothing for you', () => {
  assert.equal(rowSub(row(1)), 'Friend since Mar 2026');
  assert.equal(rowSub(row(1, { friends_since: null })), 'Friend');
  assert.equal(rowSub(row(2, { relation: 'fof', via: 'Sarah' })), 'Sarah’s friend');
  assert.equal(rowSub(row(2, { relation: 'fof', via: null })), 'Friend of a friend');
  assert.equal(rowSub(row(3, { relation: 'me', is_me: true })), '');
});

test('movement is places gained since you last looked, with an arrow and a number', () => {
  assert.equal(movement(row(4, { prev_place: 7 })), 3);
  assert.equal(movement(row(7, { prev_place: 4 })), -3);
  assert.equal(movement(row(4, { prev_place: null })), 0);
  assert.equal(arrow(3), '▲ 3');
  assert.equal(arrow(-2), '▼ 2');
  assert.equal(arrow(0), '');
});

test('places read as 1st, 2nd, 3rd, 11th, 23rd', () => {
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111].map(ordinal), ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '101st', '111th']);
});

test('the preview is the top three and then you; only three rows when you are in the top three', () => {
  const board = (my: number): Board => ({ period: 'all', total: 20, my_place: my, my_prev_place: my, my_idx: my, rows: [1, 2, 3, my - 1, my, my + 1].filter((n, i, a) => a.indexOf(n) === i && n > 0).map((n) => row(n, { is_me: n === my })) });
  assert.deepEqual(previewRows(board(12)).map((r) => r.idx), [1, 2, 3, 12]);
  assert.deepEqual(previewRows(board(2)).map((r) => r.idx), [1, 2, 3]);
  assert.deepEqual(previewRows(board(1)).map((r) => r.idx), [1, 2, 3]);
});

test('the alert shows for any move or a top ten crossing, and says which', () => {
  assert.equal(hasAlert(null), false);
  assert.equal(hasAlert({ moved: 0, entered_top10: false, left_top10: false, place: 5, total: 9 }), false);
  assert.equal(hasAlert({ moved: -2, entered_top10: false, left_top10: false, place: 5, total: 9 }), true);
  assert.equal(hasAlert({ moved: 0, entered_top10: true, left_top10: false, place: 9, total: 30 }), true);
  assert.equal(topTenNote({ moved: 4, entered_top10: true, left_top10: false, place: 9, total: 30 }), 'Into the top 10');
  assert.equal(topTenNote({ moved: -4, entered_top10: false, left_top10: true, place: 11, total: 30 }), 'Out of the top 10');
  assert.equal(topTenNote({ moved: 1, entered_top10: false, left_top10: false, place: 4, total: 30 }), '');
});

test('rows start in the order they were in and end in the order they are in', () => {
  // You were 26th and are now 23rd: the three you passed each move down one.
  const rows = [row(1), row(2), row(3), row(20), row(21), row(22), row(23, { is_me: true, prev_place: 26 }), row(24, { prev_place: 23 }), row(25, { prev_place: 24 }), row(26, { prev_place: 25 })];
  const { start, end } = slots(rows);
  assert.equal(end.u23, 6);
  assert.equal(start.u23, 9, 'you started at the bottom of the window');
  assert.equal(start.u24, 6);
  assert.equal(start.u26, 8);
  assert.deepEqual(Object.keys(start).sort(), Object.keys(end).sort());
});

test('rows with no earlier place stay where they are; gaps are found where places skip', () => {
  const { start, end } = slots([row(1, { prev_place: null }), row(2, { prev_place: null })]);
  assert.deepEqual(start, end);
  const gaps = gapsAfter([row(1), row(2), row(3), row(20), row(21)]);
  assert.deepEqual([...gaps], [2]);
  assert.equal(gapsAfter([row(1), row(2), row(3)]).size, 0);
});
