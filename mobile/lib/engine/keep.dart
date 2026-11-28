// Keeping words in memory: when a verse or answer counts, when it is due for review, and when it leaves your count.
// Port of src/heir/keep.ts; see there and docs/social/FRIENDS_ARCHITECTURE.md §2.6 for the rules.

import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

import 'lesson.dart';
import 'levels.dart';
import 'measures.dart';
import 'memory.dart';
import 'progress.dart';
import 'types.dart';
import 'util.dart';

const _day = dayMillis;

/// Days an item may go without a right recall, by the stone it has reached.
int windowDays(int level) => level >= expert ? 240 : 90;
const reviewNoticeDays = 14;

/// When the rules start. Nothing leaves anyone's count for 30 days after this.
final keepLaunch = DateTime.parse('2026-11-25T00:00:00Z');
const graceDaysAfterLaunch = 30;

/// The keep record for a person: what is stored, with anything newer in the answer log folded in.
Map<String, Keep> keepOf(MemberProgress p, [int? Function(String itemId)? partsOf]) {
  final out = <String, Keep>{...keepFromLog(p.log, partsOf)};
  for (final en in (p.keep ?? const <String, Keep>{}).entries) {
    final l = out[en.key] ?? const Keep();
    final k = en.value;
    out[en.key] = Keep(good: latestIso(l.good, k.good), miss: latestIso(l.miss, k.miss), full: latestIso(l.full, k.full));
  }
  return out;
}

sealed class KeepState {
  const KeepState();
  String get state;
}

class Kept extends KeepState {
  const Kept();
  @override
  String get state => 'kept';
}

class DueForReview extends KeepState {
  final DateTime deadline;
  const DueForReview(this.deadline);
  @override
  String get state => 'review';
}

class TryAgain extends KeepState {
  final DateTime deadline;
  const TryAgain(this.deadline);
  @override
  String get state => 'try-again';
}

class Out extends KeepState {
  final DateTime since;
  const Out(this.since);
  @override
  String get state => 'out';
}

class KeepOptions {
  /// 'whole' (the default: every part right in one lesson) or 'any-part'.
  final String mode;
  final DateTime? launch;
  final String? tz;
  final bool model;
  const KeepOptions({this.mode = 'whole', required this.launch, this.tz, this.model = true});
}

bool _tzReady = false;
final _zones = <String, tz.Location?>{};

/// The calendar day (yyyy-mm-dd) of a moment in a time zone (the phone's own zone when none is given).
String dayKeyIn(int ms, [String? zone]) {
  if (zone == null || zone.isEmpty) return localDay(fromMs(ms));
  if (!_tzReady) {
    tzdata.initializeTimeZones();
    _tzReady = true;
  }
  final loc = _zones.putIfAbsent(zone, () {
    try {
      return tz.getLocation(zone);
    } catch (_) {
      return null;
    }
  });
  if (loc == null) return localDay(fromMs(ms));
  final t = tz.TZDateTime.fromMillisecondsSinceEpoch(loc, ms);
  return '${t.year.toString().padLeft(4, '0')}-${t.month.toString().padLeft(2, '0')}-${t.day.toString().padLeft(2, '0')}';
}

/// Whether a missed recall (due by [deadline], the end of the day after the miss) happened today or yesterday.
String missedWhen(DateTime deadline, DateTime now, [String? zone]) =>
    dayKeyIn(deadline.millisecondsSinceEpoch, zone) == dayKeyIn(now.millisecondsSinceEpoch, zone) ? 'yesterday' : 'today';

/// The last moment of the local day after [from]'s day.
DateTime endOfNextDay(DateTime from, [String? zone]) {
  String key(int ms) => dayKeyIn(ms, zone);
  const quarter = 15 * 60000;
  var t = from.millisecondsSinceEpoch, seen = key(t), changes = 0;
  while (changes < 2) {
    t += quarter;
    final k = key(t);
    if (k != seen) {
      seen = k;
      changes++;
    }
  }
  var lo = t - quarter, hi = t;
  final before = key(lo);
  while (hi - lo > 1) {
    final mid = ((lo + hi) / 2).floor();
    if (key(mid) == before) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return fromMs(hi - 1);
}

/// Where one item stands.
KeepState keepState(int level, Keep? keep, DateTime now, KeepOptions o, [DateTime? modelOut]) {
  if (level < 1) return const Kept();
  final good = o.mode == 'whole' ? keep?.full : keep?.good;
  final miss = keep?.miss;
  final t = now.millisecondsSinceEpoch;
  final graceEnds = o.launch != null ? o.launch!.millisecondsSinceEpoch + graceDaysAfterLaunch * _day : null;
  KeepState leave(DateTime since) => graceEnds == null || t < graceEnds ? DueForReview(graceEnds == null ? _never : fromMs(graceEnds)) : Out(since);

  if (miss != null && (good == null || miss.compareTo(good) > 0)) {
    final deadline = endOfNextDay(DateTime.parse(miss), o.tz);
    return t <= deadline.millisecondsSinceEpoch ? TryAgain(deadline) : leave(deadline);
  }
  if (modelOut != null) {
    if (t >= modelOut.millisecondsSinceEpoch) return leave(modelOut);
    return t >= modelOut.millisecondsSinceEpoch - reviewNoticeDays * _day ? DueForReview(modelOut) : const Kept();
  }
  if (good == null) {
    if (o.launch == null) return const Kept();
    final end = o.launch!.millisecondsSinceEpoch + windowDays(level) * _day;
    return t >= end ? leave(fromMs(end)) : t >= end - reviewNoticeDays * _day ? DueForReview(fromMs(end)) : const Kept();
  }
  final end = parseMs(good) + windowDays(level) * _day;
  if (t >= end) return leave(fromMs(end));
  if (t >= end - reviewNoticeDays * _day) return DueForReview(fromMs(end));
  return const Kept();
}

/// JavaScript's `new Date(Infinity)`: an invalid date, the deadline while the rules haven't started.
final _never = DateTime.utc(275760, 9, 13);

class Held {
  final Item item;
  final int level, words;
  final KeepState state;
  const Held(this.item, this.level, this.state, this.words);
}

/// Every item that has a stone, with where it stands.
List<Held> heldItems(List<Item> items, MemberProgress p, Track track, DateTime now, KeepOptions o) {
  final counts = {for (final i in items) i.id: unitsFor(i, track).length};
  final keep = keepOf(p, (id) => counts[id]);
  final parts = o.model ? partMemories(p.log, p.partSnap) : null;
  return [
    for (final item in items)
      if (levelOf(p, item.id) >= recalled)
        () {
          final mems = parts != null ? itemParts(unitsFor(item, track).map((u) => u.key).toList(), parts) : null;
          final level = levelOf(p, item.id);
          final model = mems != null
              ? fromMsD([outAt(mems).millisecondsSinceEpoch.toDouble(), maxInt(mems.map((m) => parseMs(m.last))) + 2.0 * windowDays(level) * _day].reduce((a, b) => a < b ? a : b))
              : null;
          return Held(item, level, keepState(level, keep[item.id], now, o, model), itemWords(item, track));
        }(),
  ];
}

class KeepSummary {
  final int wordsKept, wordsOut;
  final List<Held> tryAgain, review, out;
  const KeepSummary(this.wordsKept, this.wordsOut, this.tryAgain, this.review, this.out);
}

KeepSummary summarize(List<Held> held) {
  List<Held> by(String s) => held.where((h) => h.state.state == s).toList();
  final out = by('out');
  return KeepSummary(
    held.where((h) => h.state.state != 'out').fold(0, (n, h) => n + h.words),
    out.fold(0, (n, h) => n + h.words),
    by('try-again'),
    stableSorted(by('review'), (a, b) => (a.state as DueForReview).deadline.compareTo((b.state as DueForReview).deadline)),
    out,
  );
}

/// The latest a review may be scheduled: two weeks before its window ends, or the next day after a miss.
DateTime clampDue(DateTime due, int level, Keep? keep, DateTime now, [String? zone, String mode = 'whole']) {
  final goodIso = mode == 'whole' ? keep?.full : keep?.good;
  final miss = keep?.miss;
  if (miss != null && (goodIso == null || miss.compareTo(goodIso) > 0)) {
    final e = endOfNextDay(DateTime.parse(miss), zone).millisecondsSinceEpoch;
    return fromMs(due.millisecondsSinceEpoch < e ? due.millisecondsSinceEpoch : e);
  }
  if (goodIso == null) return due;
  final latest = parseMs(goodIso) + (windowDays(level) - reviewNoticeDays) * _day;
  final floor = latest > now.millisecondsSinceEpoch ? latest : now.millisecondsSinceEpoch;
  return fromMs(due.millisecondsSinceEpoch < floor ? due.millisecondsSinceEpoch : floor);
}

/// "Strong until about": when the weakest line falls to 80%, never later than one stone-window after the last recall.
DateTime? strongUntilFor(Item item, MemberProgress p, Track track) {
  final mems = itemParts(unitsFor(item, track).map((u) => u.key).toList(), partMemories(p.log, p.partSnap));
  if (mems == null) return null;
  final last = maxInt(mems.map((m) => parseMs(m.last)));
  final a = strongUntil(mems).millisecondsSinceEpoch, b = last + windowDays(levelOf(p, item.id)) * _day;
  return fromMs(a < b ? a : b);
}

