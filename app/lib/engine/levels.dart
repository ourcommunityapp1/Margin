// The stone levels: what each item has earned, worked out from the answer log, plus the counts, days kept and awards.
// Port of src/heir/levels.ts; see there for the research behind each stone.

import 'lesson.dart';
import 'models.dart';
import 'progress.dart';
import 'related.dart';
import 'types.dart';
import 'util.dart';

class Level {
  final int n;
  final String id, name, foundation, counts, means, rule;
  const Level(this.n, this.id, this.name, this.foundation, this.counts, this.means, this.rule);
}

const levelList = [
  Level(1, 'amethyst', 'Amethyst', '12th foundation', 'Remembered', 'You recalled it, unaided, after a night’s sleep: it has started to stick.',
      'Recalled in full with no hints on a day after you first recited it'),
  Level(2, 'topaz', 'Topaz', '9th foundation', 'Memorized', 'You’ve recalled it unaided on three different days: it’s yours, word for word.', 'Recalled in full with no hints on 3 different days'),
  Level(3, 'carnelian', 'Carnelian', '6th foundation', 'Lasting', 'Still there after three weeks away: it has moved past short-term memory.',
      'Recalled in full with no hints after a gap of 3 weeks or more'),
  Level(4, 'emerald', 'Emerald', '4th foundation', 'Long-term', 'Right every time for six months, including after two months away: it’s in long-term memory.',
      'Every recall right for 6 months, including one after a gap of 2 months or more'),
  Level(5, 'sapphire', 'Sapphire', '2nd foundation', 'Enduring', 'A year after you first knew it, still there after half a year away.',
      'Known for a year, and recalled in full with no hints after a gap of 6 months or more'),
  Level(6, 'diamond', 'Diamond', 'The top', 'Lifelong', 'Recalled after a whole year away, three years on. Memories that last this long tend to stay for life.',
      'Known for 3 years, and recalled in full with no hints after a gap of a year or more'),
];

final stages = <({int n, String name, String means})>[
  (n: 0, name: 'Recited', means: 'You’ve typed it in full, with no hints, at its lesson.'),
  for (final l in levelList) (n: l.n, name: l.counts, means: l.means),
];

Level? levelInfo(int n) => n >= 1 && n <= levelList.length ? levelList[n - 1] : null;

const _day = dayMillis;
const _full = {'type', 'say'};
bool _unaided(LogEntry e) => _full.contains(e.kind) && e.correct && e.hints == 0;

class _S {
  final int at;
  final List<LogEntry> entries;
  _S(this.at, this.entries);
  bool get anyUnaided => entries.any(_unaided);
}

List<_S> _sessions(List<LogEntry> log, String itemId) {
  final by = <String, List<LogEntry>>{};
  for (final e in log) {
    if (e.itemId == itemId && e.kind != 'intro') (by[e.at] ??= []).add(e);
  }
  return stableSorted(by.entries.map((en) => _S(parseMs(en.key), en.value)), (a, b) => a.at.compareTo(b.at));
}

/// Recited: every part typed in full and right with no hints.
bool recited(Item item, Track track, List<LogEntry> log) {
  final n = log.where((e) => e.itemId == item.id && e.kind == 'type' && e.correct && e.hints == 0).length;
  return n >= unitsFor(item, track).length;
}

/// The level the log shows right now (0: none yet).
int levelFromLog(Item item, Track track, List<LogEntry> log, DateTime now) {
  if (!recited(item, track, log)) return 0;
  final ss = _sessions(log, item.id);
  List<_S> afterGap(int days) => [
        for (var i = 0; i < ss.length; i++)
          if (i > 0 && ss[i].at - ss[i - 1].at >= days * _day && ss[i].anyUnaided) ss[i],
      ];
  final firstRecall = ss.where((s) => s.anyUnaided).firstOrNull;
  bool knownFor(int days) => firstRecall != null && firstRecall.at <= now.millisecondsSinceEpoch - days * _day;

  final firstDay = ss.isNotEmpty ? localDay(fromMs(ss[0].at)) : '';
  if (!ss.any((s) => localDay(fromMs(s.at)) != firstDay && s.anyUnaided)) return 0;
  if ({for (final s in ss) if (s.anyUnaided) localDay(fromMs(s.at))}.length < 3) return 1;
  if (afterGap(21).isEmpty) return 2;

  final gap60 = afterGap(60);
  bool longTermAt(int t) {
    final since = t - 182 * _day;
    if (firstRecall == null || firstRecall.at > since) return false;
    final recent = [for (final s in ss) if (s.at >= since && s.at <= t) ...s.entries.where((e) => _full.contains(e.kind))];
    return recent.length >= 2 && recent.every((e) => e.correct) && gap60.any((s) => s.at >= since && s.at <= t);
  }

  if (!longTermAt(now.millisecondsSinceEpoch) && !ss.any((s) => s.at <= now.millisecondsSinceEpoch && longTermAt(s.at))) return 3;
  if (!knownFor(365) || afterGap(182).isEmpty) return 4;
  if (!knownFor(3 * 365) || afterGap(365).isEmpty) return 5;
  return 6;
}

/// Levels never go down: a stored level stays, and a higher one replaces it.
Map<String, int> earnedLevels(List<Item> items, Track track, MemberProgress p, DateTime now) {
  final out = <String, int>{...p.levels};
  for (final item in items) {
    final n = levelFromLog(item, track, p.log, now);
    if (n > (out[item.id] ?? 0)) out[item.id] = n;
  }
  return out;
}

const understandingLevels = [
  (n: 1, name: 'Learned', means: 'You’ve answered what it means.'),
  (n: 2, name: 'Understood', means: 'You’ve explained it in your own words and checked it against the notes.'),
  (n: 3, name: 'Mastered', means: 'Understood, and you’ve recalled every verse it rests on.'),
];

bool relatedDone(Item item, MemberProgress p) {
  final rel = relatedFor(item);
  return rel.isNotEmpty && rel.every((r) => p.related?[r] != null && p.related![r]!.isNotEmpty);
}

int understanding(Item item, MemberProgress p) {
  if (item.meaning.isEmpty) return 0;
  final explained = p.explained?[item.id];
  final learned = p.log.any((e) => e.itemId == item.id && e.kind == 'meaning' && e.correct) || (explained != null && explained.isNotEmpty);
  if (!learned) return 0;
  if (explained == null || explained.isEmpty) return 1;
  return relatedDone(item, p) || relatedFor(item).isEmpty ? 3 : 2;
}

int levelOf(MemberProgress p, String itemId) => p.levels[itemId] ?? 0;

/// Overdue for review: the level stays, but the stone fades until the next good review.
bool needsRefresh(MemberProgress p, String itemId, DateTime now) {
  final card = p.cards[itemId];
  return card != null && parseMs(card.due) < now.millisecondsSinceEpoch - _day / 2;
}

String? nextStep(Item item, Track track, MemberProgress p, DateTime now) {
  final n = levelOf(p, item.id);
  if (n == 0) return recited(item, track, p.log) ? 'Amethyst, once you recall it after a night’s sleep' : 'Type it in full with no hints to recite it';
  if (n == 1) {
    final days = {for (final s in _sessions(p.log, item.id)) if (s.anyUnaided) localDay(fromMs(s.at))}.length;
    final left = 3 - days < 1 ? 1 : 3 - days;
    return 'Topaz, once you recall it on $left more ${left == 1 ? 'day' : 'days'}';
  }
  if (n == 2) return 'Carnelian, once you recall it after three weeks away';
  if (n == 3) return 'Emerald, once it’s held for six months';
  if (n == 4) return 'Sapphire, once you recall it a year on, after six months away';
  if (n == 5) return 'Diamond, once you recall it three years on, after a year away';
  return null;
}

class Counts {
  final int know, memorized, mastered, longTerm;
  const Counts(this.know, this.memorized, this.mastered, this.longTerm);
}

Counts countsFor(List<Item> items, MemberProgress p) {
  final lv = items.map((i) => levelOf(p, i.id)).toList();
  return Counts(lv.where((n) => n >= 1).length, lv.where((n) => n >= 2).length, lv.where((n) => n >= 3).length, lv.where((n) => n >= 4).length);
}

List<int> shelf(List<Item> items, MemberProgress p) {
  final out = [0, 0, 0, 0, 0, 0];
  for (final i in items) {
    final n = levelOf(p, i.id);
    if (n > 0) out[n - 1]++;
  }
  return out;
}

// ---- Days kept: Sunday is a day of rest, and each week (Monday to Sunday) has one more free day.

(int, int, int) _ymd(String day) {
  final p = day.split('-').map(int.parse).toList();
  return (p[0], p[1], p[2]);
}

bool _isSunday(String day) {
  final (y, m, d) = _ymd(day);
  return DateTime(y, m, d).weekday == DateTime.sunday;
}

String _prevDay(String day) {
  final (y, m, d) = _ymd(day);
  return localDay(DateTime(y, m, d - 1));
}

String _weekOf(String day) {
  final (y, m, d) = _ymd(day);
  final w = DateTime(y, m, d);
  final jsDay = w.weekday % 7; // Sunday 0 … Saturday 6
  return localDay(DateTime(y, m, d - ((jsDay + 6) % 7)));
}

int daysKept(List<String> days, String today) {
  final set = days.toSet();
  var d = set.contains(today) ? today : _prevDay(today);
  final freeUsed = <String>{};
  var n = 0;
  for (var guard = 0; guard < 4000; guard++) {
    if (set.contains(d)) {
      n++;
    } else if (!_isSunday(d)) {
      final week = _weekOf(d);
      if (freeUsed.contains(week)) break;
      freeUsed.add(week);
    }
    d = _prevDay(d);
  }
  return n;
}

int bestDaysKept(List<String> days) {
  final sorted = days.toSet().toList()..sort();
  var best = 0;
  for (final d in sorted) {
    final k = daysKept(sorted.where((x) => x.compareTo(d) <= 0).toList(), d);
    if (k > best) best = k;
  }
  return best;
}

class Award {
  final String id, name, hint;
  const Award(this.id, this.name, this.hint);
}

const awardList = [
  Award('first-lesson', 'First lesson', 'Finish a lesson'),
  Award('first-amethyst', 'First Amethyst', 'Recall one unaided after a night’s sleep'),
  Award('first-lock', 'First unit locked in', 'Finish a unit’s Lock it in'),
  Award('kept-7', '7 days kept', 'Keep 7 days in a row'),
  Award('first-topaz', 'First Topaz', 'Recall one unaided on 3 different days'),
  Award('kept-30', '30 days kept', 'Keep 30 days in a row'),
  Award('first-carnelian', 'First Carnelian', 'Recall one after three weeks away'),
  Award('wsc-memorized', 'Shorter Catechism memorized', 'Every Shorter question at Topaz'),
  Award('wlc-memorized', 'Larger Catechism memorized', 'Every Larger question at Topaz'),
  Award('apostles-memorized', 'Apostles’ Creed memorized', 'Every section at Topaz'),
  Award('nicene-memorized', 'Nicene Creed memorized', 'Every section at Topaz'),
  Award('first-emerald', 'First Emerald', 'Six months of right recalls'),
];

List<String> awardsMet(MemberProgress p, List<Item> all, String today) {
  final lv = p.levels.values.toList();
  final a = bestDaysKept(p.days), b = daysKept(p.days, today);
  final best = a > b ? a : b;
  bool memorized(String collection) {
    final list = all.where((i) => i.collection == collection).toList();
    return list.isNotEmpty && list.every((i) => levelOf(p, i.id) >= 2);
  }

  final met = {
    'first-lesson': p.lessons > 0,
    'first-amethyst': lv.any((n) => n >= 1),
    'first-lock': p.checkpoints.isNotEmpty,
    'kept-7': best >= 7,
    'first-topaz': lv.any((n) => n >= 2),
    'kept-30': best >= 30,
    'first-carnelian': lv.any((n) => n >= 3),
    'wsc-memorized': memorized('westminster-shorter'),
    'wlc-memorized': memorized('westminster-larger'),
    'apostles-memorized': memorized('apostles-creed'),
    'nicene-memorized': memorized('nicene-creed'),
    'first-emerald': lv.any((n) => n >= 4),
  };
  return [for (final aw in awardList) if (met[aw.id] == true) aw.id];
}

class Settled {
  final MemberProgress progress;
  final List<({String itemId, int from, int to})> ups;
  final List<String> awards;
  const Settled(this.progress, this.ups, this.awards);
}

/// After a session: raise any levels the log now shows, stamp new awards, and say what changed.
Settled settle(MemberProgress p, List<Item> items, Track track, DateTime now) {
  final levels = earnedLevels(items, track, p, now);
  final ups = [for (final en in levels.entries) if (en.value > (p.levels[en.key] ?? 0)) (itemId: en.key, from: p.levels[en.key] ?? 0, to: en.value)];
  final withLevels = p.copyWith(levels: levels);
  final fresh = awardsMet(withLevels, items, localDay(now)).where((id) => p.awards[id] == null).toList();
  final awards = <String, String>{...p.awards};
  for (final id in fresh) {
    awards[id] = iso(now);
  }
  return Settled(withLevels.copyWith(awards: awards), stableSorted(ups, (a, b) => b.to.compareTo(a.to)), fresh);
}
