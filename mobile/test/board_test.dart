import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/data/board.dart';

BoardRow row(int idx, String u, {int? place, int? prev, String relation = 'friend', bool me = false, int words = 100, String? via, String? since}) =>
    BoardRow(place: place ?? idx, prevPlace: prev, idx: idx, username: u, relation: me ? 'me' : relation, words: words, name: u.toUpperCase(), isMe: me, via: via, friendsSince: since);

void main() {
  test('ordinals', () {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111].map(ordinal), ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '101st', '111th']);
  });

  test('movement and arrows', () {
    expect(movement(row(1, 'a', place: 2, prev: 5)), 3);
    expect(movement(row(1, 'a', place: 5, prev: 2)), -3);
    expect(movement(row(1, 'a')), 0);
    expect(arrow(3), '▲ 3');
    expect(arrow(-2), '▼ 2');
    expect(arrow(0), '');
  });

  test('the line under a name', () {
    expect(rowSub(row(1, 'a', since: '2026-03-10T12:00:00Z')), 'Friend since Mar 2026');
    expect(rowSub(row(1, 'a')), 'Friend');
    expect(rowSub(row(1, 'a', relation: 'fof', via: 'Cal')), 'Cal’s friend');
    expect(rowSub(row(1, 'a', relation: 'fof')), 'Friend of a friend');
    expect(rowSub(row(1, 'a', me: true)), '');
  });

  test('the preview: top three, then you if lower down', () {
    final rows = [row(1, 'a'), row(2, 'b'), row(3, 'c'), row(4, 'd'), row(5, 'e', me: true)];
    final b = Board(period: Period.all, total: 5, rows: rows);
    expect(previewRows(b).map((r) => r.username), ['a', 'b', 'c', 'e']);
    final top = Board(period: Period.all, total: 5, rows: [row(1, 'a'), row(2, 'b', me: true), row(3, 'c'), row(4, 'd')]);
    expect(previewRows(top).map((r) => r.username), ['a', 'b', 'c']);
  });

  test('slots put each row at the start and end of its move; gaps follow skipped places', () {
    final rows = [row(1, 'a', prev: 1), row(2, 'me', prev: 4, me: true), row(3, 'c', prev: 2), row(4, 'd', prev: 3), row(9, 'z', prev: 9)];
    final s = slots(rows);
    expect(s.end, {'a': 0, 'me': 1, 'c': 2, 'd': 3, 'z': 4});
    expect(s.start['me'], 3);
    expect(s.start['a'], 0);
    expect(gapsAfter(rows), {3});
  });

  test('the status: what counts as an alert, and what it says', () {
    expect(const BoardStatus().alert, isFalse);
    expect(const BoardStatus(moved: -1).alert, isTrue);
    expect(const BoardStatus(enteredTop10: true).topTenNote, 'Into the top 10');
    expect(const BoardStatus(leftTop10: true).topTenNote, 'Out of the top 10');
    expect(const BoardStatus(moved: 2, enteredTop10: true, place: 4, total: 9).seen().alert, isFalse);
  });

  test('a board is read from the database’s JSON', () {
    final b = Board.fromJson({
      'period': 'month',
      'total': 2,
      'my_place': 2,
      'rows': [
        {'place': 1, 'prev_place': null, 'idx': 1, 'username': 'cal', 'relation': 'friend', 'words': 12, 'name': 'Cal W', 'is_me': false, 'friends_since': null, 'via': null},
        {'place': 2, 'prev_place': 3, 'idx': 2, 'username': 'ann', 'relation': 'me', 'words': 9, 'name': 'Ann S', 'is_me': true},
      ],
    });
    expect(b.period, Period.month);
    expect(b.rows.last.isMe, isTrue);
    expect(movement(b.rows.last), 1);
  });
}
