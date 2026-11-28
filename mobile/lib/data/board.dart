// The community leaderboard on the phone (src/heir/board.ts): what a row says under the name, how far someone moved, which
// rows the Progress preview shows, and where each row sits while it moves. The database decides who is on the board and in
// what order; this only turns what it returns into words and positions. Pure, so it is tested without a database.

import 'social.dart' show sinceLabel;

enum Period { all, month }

class BoardRow {
  const BoardRow({
    required this.place,
    this.prevPlace,
    required this.idx,
    required this.username,
    required this.relation,
    required this.words,
    required this.name,
    required this.isMe,
    this.friendsSince,
    this.via,
  });

  final int place, idx, words;
  final int? prevPlace;
  final String username, relation, name; // relation: me, friend, fof
  final bool isMe;
  final String? friendsSince, via;

  factory BoardRow.fromJson(Map<String, dynamic> j) => BoardRow(
        place: (j['place'] as num).toInt(),
        prevPlace: (j['prev_place'] as num?)?.toInt(),
        idx: (j['idx'] as num).toInt(),
        username: j['username'] as String? ?? '',
        relation: j['relation'] as String? ?? 'fof',
        words: (j['words'] as num?)?.toInt() ?? 0,
        name: j['name'] as String? ?? '',
        isMe: j['is_me'] == true,
        friendsSince: j['friends_since'] as String?,
        via: j['via'] as String?,
      );
}

class Board {
  const Board({required this.period, required this.total, this.myPlace, required this.rows});
  final Period period;
  final int total;
  final int? myPlace;
  final List<BoardRow> rows;

  factory Board.fromJson(Map<String, dynamic> j) => Board(
        period: j['period'] == 'month' ? Period.month : Period.all,
        total: (j['total'] as num?)?.toInt() ?? 0,
        myPlace: (j['my_place'] as num?)?.toInt(),
        rows: [for (final r in (j['rows'] as List? ?? const [])) BoardRow.fromJson((r as Map).cast<String, dynamic>())],
      );
}

class BoardStatus {
  const BoardStatus({this.moved = 0, this.enteredTop10 = false, this.leftTop10 = false, this.place, this.total = 0});
  final int moved, total;
  final bool enteredTop10, leftTop10;
  final int? place;

  factory BoardStatus.fromJson(Map<String, dynamic> j) => BoardStatus(
        moved: (j['moved'] as num?)?.toInt() ?? 0,
        enteredTop10: j['entered_top10'] == true,
        leftTop10: j['left_top10'] == true,
        place: (j['place'] as num?)?.toInt(),
        total: (j['total'] as num?)?.toInt() ?? 0,
      );

  /// What it is once the board has been opened: nothing moved any more.
  BoardStatus seen() => BoardStatus(place: place, total: total);

  /// Something moved since you last looked: the dot on Progress.
  bool get alert => moved != 0 || enteredTop10 || leftTop10;

  /// The note beside a move into or out of the top ten.
  String get topTenNote => enteredTop10 ? 'Into the top 10' : (leftTop10 ? 'Out of the top 10' : '');
}

/// The line under a name: when you became friends, who connects you, or (for you) nothing.
String rowSub(BoardRow r) {
  if (r.relation == 'friend') return r.friendsSince != null ? 'Friend since ${sinceLabel(r.friendsSince)}' : 'Friend';
  if (r.relation == 'fof') return r.via != null ? '${r.via}’s friend' : 'Friend of a friend';
  return '';
}

/// Places gained (positive) or lost (negative) since the viewer last looked; 0 when there is nothing to compare.
int movement(BoardRow r) => r.prevPlace == null ? 0 : r.prevPlace! - r.place;

String arrow(int n) => n > 0 ? '▲ $n' : (n < 0 ? '▼ ${-n}' : '');

/// "1st", "2nd", "23rd".
String ordinal(int n) {
  final v = n % 100;
  if (v >= 11 && v <= 13) return '${n}th';
  return '$n${const {1: 'st', 2: 'nd', 3: 'rd'}[n % 10] ?? 'th'}';
}

/// The Progress preview: the top three, then you if you are lower down.
List<BoardRow> previewRows(Board b) {
  final top = b.rows.where((r) => r.idx <= 3).toList();
  final me = b.rows.where((r) => r.isMe).firstOrNull;
  return me != null && me.idx > 3 ? [...top, me] : top;
}

/// Where each row sits, as an order (0 first): at the start of the move (by where it was) and at the end (by where it is).
({Map<String, int> start, Map<String, int> end}) slots(List<BoardRow> rows) {
  final byNow = [...rows]..sort((a, b) => a.idx - b.idx);
  final byThen = [...rows]..sort((a, b) {
      final d = (a.prevPlace ?? a.place) - (b.prevPlace ?? b.place);
      return d != 0 ? d : a.idx - b.idx;
    });
  return (start: {for (final (i, r) in byThen.indexed) r.username: i}, end: {for (final (i, r) in byNow.indexed) r.username: i});
}

/// Where a "···" gap belongs: after the row at this order, when the places skip.
Set<int> gapsAfter(List<BoardRow> rows) {
  final byNow = [...rows]..sort((a, b) => a.idx - b.idx);
  return {for (final (i, r) in byNow.indexed) if (i > 0 && r.idx - byNow[i - 1].idx > 1) i - 1};
}
