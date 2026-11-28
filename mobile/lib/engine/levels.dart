// The stone levels: what each item has earned, worked out from the answer log, plus the counts, days kept and awards.
// Port of src/heir/levels.ts; see there for the research behind each stone.

import 'lesson.dart';
import 'models.dart';
import 'observe.dart';
export 'observe.dart' show lightWeight;
import 'progress.dart';
import 'related.dart';
import 'types.dart';
import 'util.dart';
export 'level_scale.dart';

// The five levels a question or verse climbs (ADR-005). Stored as `levels[itemId]`: 0 none yet, then
//   1 Familiar    you've been through its lesson
//   2 Recalled    recalled unaided on a later day than the lesson
//   3 Memorized   recalled on three different days, with variety
//   4 Proficient  typed or said in full, right, after three weeks or more away (whole answers only)
//   5 Expert      known six months, three or more whole answers in that time all right, one after two months away
// Names, gems and wording are in tiers.dart. A level never goes down. Words "in memory" start at Recalled.
const familiar = 1, recalled = 2, memorized = 3, proficient = 4, expert = 5;
const topLevel = expert;

const _day = dayMillis;
const _full = {'type', 'say'};
bool _unaided(LogEntry e) => _full.contains(e.kind) && e.correct && e.hints == 0;

class _S {
  final int at;
  final List<LogEntry> entries;
  _S(this.at, this.entries);
  bool get anyUnaided => entries.any(_unaided);
}

// Light recall (ADR-003; the same as src/heir/levels.ts). Reviews are light, so the first three stones can also be earned by
// consistent recall across a variety of light steps. Easy kinds weigh little and must be right the first time; the kinds that
// make you produce words weigh more and keep the slack for a slip or two. Whole recall counts in full; higher stones need it.
bool _lightPass(LogEntry e) => lightPass(e);

/// How much one session shows: 1 for a whole answer; else the weights of the distinct light kinds passed (a kind missed
/// first and passed on the retry counts half), at most 1.
double _evidence(_S s) {
  if (s.anyUnaided) return 1;
  var sum = 0.0;
  for (final kind in lightWeight.keys) {
    final es = s.entries.where((e) => e.kind == kind).toList();
    if (es.isEmpty) continue;
    sum += _lightPass(es.first) ? lightWeight[kind]! : es.any(_lightPass) ? lightWeight[kind]! / 2 : 0;
  }
  return sum > 1 ? 1.0 : sum;
}

bool _failedLight(_S s) => lightWeight.keys.any((kind) {
      final es = s.entries.where((e) => e.kind == kind).toList();
      return es.isNotEmpty && !es.any(_lightPass);
    });
Iterable<String> _lightKinds(_S s) => lightWeight.keys.where((k) => s.entries.any((e) => e.kind == k && _lightPass(e)));

/// The sessions that count toward a stone: whole answers always; light ones only after the last light miss, with `min` evidence.
List<_S> _countingSessions(List<_S> ss, double min) {
  var lastFail = -1;
  for (final s in ss) {
    if (_failedLight(s) && s.at > lastFail) lastFail = s.at;
  }
  return [for (final s in ss) if (s.anyUnaided || (s.at > lastFail && _evidence(s) >= min)) s];
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

  final firstDay = ss.isNotEmpty ? localDay(fromMs(ss[0].at)) : '';
  final counting = _countingSessions(ss, 0.5);
  if (!counting.any((s) => localDay(fromMs(s.at)) != firstDay)) return 0;
  final days = {for (final s in counting) localDay(fromMs(s.at))};
  final variety = counting.any((s) => s.anyUnaided && localDay(fromMs(s.at)) != firstDay) || {for (final s in counting) ..._lightKinds(s)}.length >= 2;
  if (days.length < 3 || !variety) return recalled;

  // Proficient: typed or said in full, right with no hints, after three weeks or more away. Whole answers only.
  if (afterGap(21).isEmpty) return memorized;

  // Expert: at some point, known six months, every whole answer in those six months right (at least three), one of them
  // after two months away. Checked as of each session, so a later long gap doesn't undo it.
  final gap60 = afterGap(60);
  bool expertAt(int t) {
    final since = t - 182 * _day;
    if (firstRecall == null || firstRecall.at > since) return false;
    final recent = [for (final s in ss) if (s.at >= since && s.at <= t) ...s.entries.where((e) => _full.contains(e.kind))];
    return recent.length >= 3 && recent.every((e) => e.correct) && gap60.any((s) => s.at >= since && s.at <= t);
  }

  if (!expertAt(now.millisecondsSinceEpoch) && !ss.any((s) => s.at <= now.millisecondsSinceEpoch && expertAt(s.at))) return proficient;
  return expert;
}

/// Learned: every part of it has been through its lesson.
bool isLearned(Item item, Track track, MemberProgress p) {
  final learned = p.units.toSet();
  return unitsFor(item, track).every((u) => learned.contains(u.key));
}

/// Levels never go down: a stored level stays, and a higher one replaces it.
Map<String, int> earnedLevels(List<Item> items, Track track, MemberProgress p, DateTime now) {
  final out = <String, int>{...p.levels};
  for (final item in items) {
    var n = levelFromLog(item, track, p.log, now);
    if (n == 0 && isLearned(item, track, p)) n = familiar;
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

/// The level to show: the stored one, and at least Familiar for anything learned.
int levelShown(MemberProgress p, Item item, Track track) {
  final n = levelOf(p, item.id);
  return n > 0 ? n : (isLearned(item, track, p) ? familiar : 0);
}

/// Overdue for review: the level stays, but the stone fades until the next good review.
bool needsRefresh(MemberProgress p, String itemId, DateTime now) {
  final card = p.cards[itemId];
  return card != null && parseMs(card.due) < now.millisecondsSinceEpoch - _day / 2;
}

/// What the next level asks for, in a few words, or null at the top (Expert).
String? nextStep(Item item, Track track, MemberProgress p, DateTime now) {
  final n = levelOf(p, item.id);
  if (n == 0) return 'Finish its lesson to make it Familiar';
  if (n == familiar) {
    return recited(item, track, p.log)
        ? 'Recalled, once you recall it after a night’s sleep'
        : 'Recalled, once you type it in full with no hints and recall it after a night’s sleep';
  }
  if (n == recalled) {
    final days = {for (final s in _countingSessions(_sessions(p.log, item.id), 0.5)) localDay(fromMs(s.at))}.length;
    final left = 3 - days < 1 ? 1 : 3 - days;
    return 'Memorized, once you recall it on $left more ${left == 1 ? 'day' : 'days'}';
  }
  if (n == memorized) return 'Proficient, once you type it right after three weeks away';
  if (n == proficient) return 'Expert, once it’s held for six months';
  return null;
}

/// How many items are at each level or higher: Recalled, Memorized, Proficient, Expert (Familiar is "learned").
class Counts {
  final int know, memorized, mastered, longTerm;
  const Counts(this.know, this.memorized, this.mastered, this.longTerm);
}

Counts countsFor(List<Item> items, MemberProgress p) {
  final lv = items.map((i) => levelOf(p, i.id)).toList();
  return Counts(lv.where((n) => n >= recalled).length, lv.where((n) => n >= memorized).length, lv.where((n) => n >= proficient).length,
      lv.where((n) => n >= expert).length);
}

/// How many items sit at each level (their highest), level 1 to 5.
List<int> shelf(List<Item> items, MemberProgress p) {
  final out = [0, 0, 0, 0, 0];
  for (final i in items) {
    final n = levelOf(p, i.id);
    if (n > 0) out[(n > topLevel ? topLevel : n) - 1]++;
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
  Award('first-amethyst', 'First Recalled', 'Recall one unaided after a night’s sleep'),
  Award('first-lock', 'First unit locked in', 'Finish a unit’s Lock it in'),
  Award('kept-7', '7 days kept', 'Keep 7 days in a row'),
  Award('first-topaz', 'First Memorized', 'Recall one unaided on 3 different days'),
  Award('kept-30', '30 days kept', 'Keep 30 days in a row'),
  Award('first-carnelian', 'First Proficient', 'Type one right after three weeks away'),
  Award('wsc-memorized', 'Shorter Catechism memorized', 'Every Shorter question Memorized'),
  Award('wlc-memorized', 'Larger Catechism memorized', 'Every Larger question Memorized'),
  Award('apostles-memorized', 'Apostles’ Creed memorized', 'Every section Memorized'),
  Award('nicene-memorized', 'Nicene Creed memorized', 'Every section Memorized'),
  Award('first-emerald', 'First Expert', 'Six months of right typed answers'),
];

List<String> awardsMet(MemberProgress p, List<Item> all, String today) {
  final lv = p.levels.values.toList();
  final a = bestDaysKept(p.days), b = daysKept(p.days, today);
  final best = a > b ? a : b;
  bool allMemorized(String collection) {
    final list = all.where((i) => i.collection == collection).toList();
    return list.isNotEmpty && list.every((i) => levelOf(p, i.id) >= memorized);
  }

  final met = {
    'first-lesson': p.lessons > 0,
    'first-amethyst': lv.any((n) => n >= recalled),
    'first-lock': p.checkpoints.isNotEmpty,
    'kept-7': best >= 7,
    'first-topaz': lv.any((n) => n >= memorized),
    'kept-30': best >= 30,
    'first-carnelian': lv.any((n) => n >= proficient),
    'wsc-memorized': allMemorized('westminster-shorter'),
    'wlc-memorized': allMemorized('westminster-larger'),
    'apostles-memorized': allMemorized('apostles-creed'),
    'nicene-memorized': allMemorized('nicene-creed'),
    'first-emerald': lv.any((n) => n >= expert),
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
