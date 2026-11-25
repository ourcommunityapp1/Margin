// The community leaderboard on the phone: words and positions for what the database returns. Port of src/heir/board.ts.

import 'social.dart';
import 'util.dart';

class BoardRow {
  final int place, idx, words;
  final int? prevPlace;
  final String username, relation, name; // relation: me | friend | fof
  final bool isMe;
  final String? friendsSince, via;
  const BoardRow({required this.place, this.prevPlace, required this.idx, required this.username, required this.relation, required this.words, required this.name, required this.isMe, this.friendsSince, this.via});
  factory BoardRow.fromJson(Map j) => BoardRow(
        place: (j['place'] as num).toInt(),
        prevPlace: (j['prev_place'] as num?)?.toInt(),
        idx: (j['idx'] as num).toInt(),
        username: j['username'] as String,
        relation: j['relation'] as String,
        words: (j['words'] as num).toInt(),
        name: j['name'] as String,
        isMe: j['is_me'] == true,
        friendsSince: j['friends_since'] as String?,
        via: j['via'] as String?,
      );
}

class BoardStatus {
  final int moved, total;
  final bool enteredTop10, leftTop10;
  final int? place;
  const BoardStatus(this.moved, this.enteredTop10, this.leftTop10, this.place, this.total);
}

String rowSub(BoardRow r) {
  if (r.relation == 'friend') return r.friendsSince != null && r.friendsSince!.isNotEmpty ? 'Friend since ${sinceLabel(r.friendsSince)}' : 'Friend';
  if (r.relation == 'fof') return r.via != null && r.via!.isNotEmpty ? '${r.via}’s friend' : 'Friend of a friend';
  return '';
}

int movement(BoardRow r) => r.prevPlace == null ? 0 : r.prevPlace! - r.place;

String arrow(int n) => n > 0 ? '▲ $n' : n < 0 ? '▼ ${-n}' : '';

String ordinal(int n) {
  final v = n % 100;
  if (v >= 11 && v <= 13) return '${n}th';
  return '$n${const {1: 'st', 2: 'nd', 3: 'rd'}[n % 10] ?? 'th'}';
}

List<BoardRow> previewRows(List<BoardRow> rows) {
  final top = rows.where((r) => r.idx <= 3).toList();
  final me = rows.where((r) => r.isMe).firstOrNull;
  return me != null && me.idx > 3 ? [...top, me] : top;
}

bool hasAlert(BoardStatus? s) => s != null && (s.moved != 0 || s.enteredTop10 || s.leftTop10);

String topTenNote(BoardStatus s) => s.enteredTop10 ? 'Into the top 10' : s.leftTop10 ? 'Out of the top 10' : '';

({Map<String, int> start, Map<String, int> end}) slots(List<BoardRow> rows) {
  final byNow = stableSorted(rows, (a, b) => a.idx.compareTo(b.idx));
  final byThen = stableSorted(rows, (a, b) {
    final c = (a.prevPlace ?? a.place).compareTo(b.prevPlace ?? b.place);
    return c != 0 ? c : a.idx.compareTo(b.idx);
  });
  return (start: {for (final (i, r) in byThen.indexed) r.username: i}, end: {for (final (i, r) in byNow.indexed) r.username: i});
}

Set<int> gapsAfter(List<BoardRow> rows) {
  final byNow = stableSorted(rows, (a, b) => a.idx.compareTo(b.idx));
  return {for (var i = 1; i < byNow.length; i++) if (byNow[i].idx - byNow[i - 1].idx > 1) i - 1};
}
