import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adventSunday, easterSunday, seasonLabel } from '../season.ts';

const day = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

test('Advent and Easter fall on the right days', () => {
  assert.equal(day(adventSunday(2026)), '2026-11-29');
  assert.equal(day(adventSunday(2027)), '2027-11-28');
  assert.equal(day(adventSunday(2022)), '2022-11-27'); // Christmas on a Sunday
  assert.equal(day(easterSunday(2026)), '2026-4-5');
  assert.equal(day(easterSunday(2027)), '2027-3-28');
  assert.equal(day(easterSunday(2024)), '2024-3-31');
});

test('Christmas is in season from a week before Advent to Epiphany', () => {
  assert.equal(seasonLabel('christmas', new Date(2026, 10, 21)), null);
  assert.equal(seasonLabel('christmas', new Date(2026, 10, 22)), 'Advent starts Sunday');
  assert.equal(seasonLabel('christmas', new Date(2026, 11, 3)), 'Advent');
  assert.equal(seasonLabel('christmas', new Date(2026, 11, 26)), 'Christmas');
  assert.equal(seasonLabel('christmas', new Date(2027, 0, 6)), 'Christmas');
  assert.equal(seasonLabel('christmas', new Date(2027, 0, 7)), null);
  assert.equal(seasonLabel('christmas', new Date(2026, 5, 1)), null);
});

test('Easter is in season from Ash Wednesday to a week after Easter', () => {
  assert.equal(seasonLabel('easter', new Date(2027, 1, 9)), null);
  assert.equal(seasonLabel('easter', new Date(2027, 1, 10)), 'Lent');
  assert.equal(seasonLabel('easter', new Date(2027, 2, 24)), 'Holy Week');
  assert.equal(seasonLabel('easter', new Date(2027, 2, 28)), 'Easter');
  assert.equal(seasonLabel('easter', new Date(2027, 3, 5)), null);
});
