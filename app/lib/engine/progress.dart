// Each person's progress: which parts they have learned, when each item comes back (FSRS), and a log of every answer.
// Pure functions over plain JSON. Port of src/heir/progress.ts.

import 'dart:convert';
import 'dart:math' as math;

import 'dayplan.dart';
import 'fsrs.dart';
import 'keep.dart';
import 'lesson.dart';
import 'memory.dart';
import 'models.dart';
import 'util.dart';

export 'util.dart' show localDay;

/// How many answers the phone keeps (the account keeps them all).
const logKeep = 1500;

class Keep {
  final String? good, miss, full;
  const Keep({this.good, this.miss, this.full});
  factory Keep.fromJson(Map j) => Keep(good: j['good'] is String ? j['good'] as String : null, miss: j['miss'] is String ? j['miss'] as String : null, full: j['full'] is String ? j['full'] as String : null);
  Map<String, Object?> toJson() => {if (good != null) 'good': good, if (miss != null) 'miss': miss, if (full != null) 'full': full};
  Keep copyWith({String? good, String? miss, String? full}) => Keep(good: good ?? this.good, miss: miss ?? this.miss, full: full ?? this.full);
}

class Night {
  final String at;
  final List<String> items;
  final bool risen;
  const Night(this.at, this.items, [this.risen = false]);
  Map<String, Object?> toJson() => {'at': at, 'items': items, if (risen) 'risen': true};
}

class MemberProgress {
  final List<String> units, checkpoints, days;
  final Map<String, SavedCard> cards;
  final int lessons;
  final Map<String, int> courseLessons, levels;
  final Map<String, String> awards;
  final List<LogEntry> log;
  final Night? night;
  final Map<String, String>? related, explained;
  final Map<String, Keep>? keep;
  final Today? today;
  final PartSnapshot? partSnap;

  const MemberProgress({
    this.units = const [],
    this.checkpoints = const [],
    this.cards = const {},
    this.lessons = 0,
    this.courseLessons = const {},
    this.levels = const {},
    this.awards = const {},
    this.days = const [],
    this.log = const [],
    this.night,
    this.related,
    this.explained,
    this.keep,
    this.today,
    this.partSnap,
  });

  MemberProgress copyWith({
    List<String>? units,
    List<String>? checkpoints,
    Map<String, SavedCard>? cards,
    int? lessons,
    Map<String, int>? courseLessons,
    Map<String, int>? levels,
    Map<String, String>? awards,
    List<String>? days,
    List<LogEntry>? log,
    Night? night,
    Map<String, String>? related,
    Map<String, String>? explained,
    Map<String, Keep>? keep,
    Today? today,
    PartSnapshot? partSnap,
  }) =>
      MemberProgress(
        units: units ?? this.units,
        checkpoints: checkpoints ?? this.checkpoints,
        cards: cards ?? this.cards,
        lessons: lessons ?? this.lessons,
        courseLessons: courseLessons ?? this.courseLessons,
        levels: levels ?? this.levels,
        awards: awards ?? this.awards,
        days: days ?? this.days,
        log: log ?? this.log,
        night: night ?? this.night,
        related: related ?? this.related,
        explained: explained ?? this.explained,
        keep: keep ?? this.keep,
        today: today ?? this.today,
        partSnap: partSnap ?? this.partSnap,
      );

  Map<String, Object?> toJson() => {
        'units': units,
        'checkpoints': checkpoints,
        'cards': cards.map((k, v) => MapEntry(k, v.toJson())),
        'lessons': lessons,
        'courseLessons': courseLessons,
        'levels': levels,
        'awards': awards,
        'days': days,
        'log': log.map((e) => e.toJson()).toList(),
        if (night != null) 'night': night!.toJson(),
        if (related != null) 'related': related,
        if (explained != null) 'explained': explained,
        if (keep != null) 'keep': keep!.map((k, v) => MapEntry(k, v.toJson())),
        if (today != null) 'today': today!.toJson(),
        if (partSnap != null) 'partSnap': partSnap!.toJson(),
      };
}

MemberProgress emptyProgress() => const MemberProgress();

typedef Progress = Map<String, MemberProgress>;

MemberProgress memberProgress(Progress p, String? memberId) => (memberId != null && memberId.isNotEmpty ? p[memberId] : null) ?? emptyProgress();

/// Only producing the answer yourself counts as recall.
const recallKindsSet = recallKinds;

class GradeWord {
  final int rating;
  final String word, means;
  const GradeWord(this.rating, this.word, this.means);
}

const grades = {
  'forgot': GradeWord(ratingAgain, 'Forgot', 'Couldn’t recall it'),
  'shaky': GradeWord(ratingHard, 'Shaky', 'Recalled it with a slip or a hint'),
  'solid': GradeWord(ratingGood, 'Solid', 'Recalled it correctly'),
  'effortless': GradeWord(ratingEasy, 'Effortless', 'Recalled it perfectly, on a question you’ve already reviewed several times'),
};

/// How well an item was recalled in one session (the older grading), or null if nothing in it was recall.
int? ratingFor(List<StepResult> results, [FsrsCard? card]) {
  final recall = results.where((r) => recallKinds.contains(r.kind)).toList();
  if (recall.isEmpty) return null;
  final misses = recall.where((r) => !r.correct).length;
  final hints = recall.fold<int>(0, (n, r) => n + r.hints);
  if (misses == 0 && hints == 0) {
    final seasoned = card != null && card.state == stateReview && card.reps >= 3 && recall.every((r) => r.review);
    return seasoned ? ratingEasy : ratingGood;
  }
  if (misses <= 1) return ratingHard;
  return ratingAgain;
}

/// A newly learned question's first real recall waits for a night's sleep: the next morning (4 am), never sooner than 8 hours.
DateTime afterSleep(DateTime now) {
  final l = now.toLocal();
  final morning = DateTime(l.year, l.month, l.day + 1, 4);
  return fromMs(math.max(morning.millisecondsSinceEpoch, now.millisecondsSinceEpoch + 8 * 3600000));
}

/// Learned, but not yet recalled after sleep.
bool waitingForSleep(MemberProgress p, String itemId, DateTime now) {
  final c = p.cards[itemId];
  return c != null && c.state == stateNew && parseMs(c.due) > now.millisecondsSinceEpoch;
}

String _uuid() {
  final r = math.Random.secure();
  final b = List<int>.generate(16, (_) => r.nextInt(256));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  final h = b.map((x) => x.toRadixString(16).padLeft(2, '0')).join();
  return '${h.substring(0, 8)}-${h.substring(8, 12)}-${h.substring(12, 16)}-${h.substring(16, 20)}-${h.substring(20)}';
}

MemberProgress finishSession(
  MemberProgress p, {
  required List<StepResult> results,
  List<Unit> learned = const [],
  String? checkpoint,
  String? courseId,
  required DateTime now,
  String Function()? newId,
  ({String? tz})? keepRules,
  String? grading,
}) {
  final v2 = grading == 'v2';
  final cards = <String, SavedCard>{...p.cards};
  final at = iso(now);
  final day = localDay(now);
  final nid = newId ?? _uuid;
  final log = [...p.log, for (final r in results) LogEntry.stamp(r, at: at, id: nid(), day: day, mv: r.p != null ? modelVersion : null)];
  final speed = v2 ? speedBaseline(p.log) : const <String, Speed>{};
  final byItem = <String, List<StepResult>>{};
  for (final r in results) {
    (byItem[r.itemId] ??= []).add(r);
  }
  for (final en in byItem.entries) {
    final itemId = en.key, rs = en.value;
    final existing = cards[itemId];
    final finishesItem = learned.any((u) => u.itemId == itemId && u.part == u.of);
    if (existing == null) {
      if (finishesItem) cards[itemId] = SavedCard.fromCard(createEmptyCard(now)..due = afterSleep(now));
      continue;
    }
    final card = existing.toCard();
    if (card.state == stateNew && now.isBefore(card.due)) continue;
    final grade = v2 ? gradeRecall(rs, (state: card.state, reps: card.reps), speed) : ratingFor(rs, card);
    if (grade == null) continue;
    cards[itemId] = SavedCard.fromCard(fsrsNext(card, now, grade, fuzz: true));
  }
  if (v2) {
    final parts = partMemories(log, p.partSnap);
    for (final itemId in byItem.keys) {
      final c = cards[itemId];
      if (c == null || c.state == stateNew) continue;
      final mine = [for (final en in parts.entries) if (en.key.startsWith('$itemId#')) parseMs(en.value.last) + daysToChance(en.value.s, 0.9) * dayMillis];
      if (mine.isEmpty) continue;
      final due = math.max(math.min(parseMs(c.due).toDouble(), minD(mine)), (now.millisecondsSinceEpoch + 12 * 3600000).toDouble());
      cards[itemId] = c.withDue(iso(fromMsD(due)));
    }
  }
  final keep = updateKeep(p.keep ?? keepFromLog(p.log), results, at);
  if (keepRules != null) {
    for (final itemId in byItem.keys) {
      final c = cards[itemId], level = p.levels[itemId] ?? 0;
      if (c != null && level >= 1) cards[itemId] = c.withDue(iso(clampDue(DateTime.parse(c.due), level, keep[itemId], now, keepRules.tz, 'whole')));
    }
  }
  final partSnap = log.length > logKeep ? foldTrimmed(log.sublist(0, log.length - logKeep), p.partSnap) : p.partSnap;
  return MemberProgress(
    units: [...p.units, ...learned.map((u) => u.key).where((k) => !p.units.contains(k))],
    checkpoints: checkpoint != null && checkpoint.isNotEmpty && !p.checkpoints.contains(checkpoint) ? [...p.checkpoints, checkpoint] : p.checkpoints,
    cards: cards,
    lessons: p.lessons + 1,
    courseLessons: courseId != null && courseId.isNotEmpty ? {...p.courseLessons, courseId: (p.courseLessons[courseId] ?? _lessonsBefore(p, results)) + 1} : p.courseLessons,
    levels: p.levels,
    awards: p.awards,
    days: p.days.contains(day) ? p.days : _lastN([...p.days, day], 400),
    log: _lastN(log, logKeep),
    night: p.night,
    related: p.related,
    explained: p.explained,
    keep: keep,
    today: p.today,
    partSnap: partSnap,
  );
}

List<T> _lastN<T>(List<T> l, int n) => l.length > n ? l.sublist(l.length - n) : l;

const _fullRecall = {'type', 'say'};

/// Whether a typed or said answer keeps the item: no hints, and right, or "Nearly" (a couple of slips).
bool keptRecall(StepResult r) => r.hints == 0 && (r.correct || (r.misses != null && r.misses! <= allowedMisses(r.words)));

String? latestIso(String? a, String? b) => a == null ? b : b == null ? a : (a.compareTo(b) >= 0 ? a : b);
String? earliestIso(String? a, String? b) => a == null ? b : b == null ? a : (a.compareTo(b) <= 0 ? a : b);

/// Fold one lesson's typed and said answers into the keep record.
Map<String, Keep> updateKeep(Map<String, Keep>? keep, List<StepResult> results, String at) {
  final out = <String, Keep>{...?keep};
  final rightParts = <String, ({Set<String> parts, int of})>{};
  for (final r in results) {
    if (!_fullRecall.contains(r.kind)) continue;
    var k = out[r.itemId] ?? const Keep();
    if (keptRecall(r)) {
      k = k.copyWith(good: latestIso(k.good, at));
      final w = rightParts[r.itemId] ?? (parts: <String>{}, of: r.of ?? 1);
      w.parts.add(r.part ?? '*');
      rightParts[r.itemId] = (parts: w.parts, of: math.max(w.of, r.of ?? 1));
    } else {
      k = k.copyWith(miss: latestIso(k.miss, at));
    }
    out[r.itemId] = k;
  }
  for (final en in rightParts.entries) {
    if (en.value.parts.length >= en.value.of) out[en.key] = out[en.key]!.copyWith(full: latestIso(out[en.key]!.full, at));
  }
  return out;
}

/// The keep record worked out from an answer log.
Map<String, Keep> keepFromLog(List<LogEntry> log, [int? Function(String itemId)? partsOf]) {
  final out = <String, Keep>{};
  final sessions = <String, ({String itemId, String at, Set<String> parts, num of})>{};
  for (final e in log) {
    if (!_fullRecall.contains(e.kind)) continue;
    var k = out[e.itemId] ?? const Keep();
    if (keptRecall(e)) {
      k = k.copyWith(good: latestIso(k.good, e.at));
      if (e.part != null) {
        final key = '${e.itemId}|${e.at}';
        final s = sessions[key] ?? (itemId: e.itemId, at: e.at, parts: <String>{}, of: e.of ?? partsOf?.call(e.itemId) ?? double.infinity);
        s.parts.add(e.part!);
        sessions[key] = s;
      } else if ((partsOf?.call(e.itemId) ?? 0) == 1) {
        k = k.copyWith(full: latestIso(k.full, e.at));
      }
    } else {
      k = k.copyWith(miss: latestIso(k.miss, e.at));
    }
    out[e.itemId] = k;
  }
  for (final s in sessions.values) {
    if (s.parts.length >= s.of) out[s.itemId] = (out[s.itemId] ?? const Keep()).copyWith(full: latestIso(out[s.itemId]?.full, s.at));
  }
  return out;
}

/// How many separate sessions each item has been practiced in.
Map<String, int> seenCounts(MemberProgress p) {
  final sessions = <String, Set<String>>{};
  for (final e in p.log) {
    if (e.kind == 'intro') continue;
    (sessions[e.itemId] ??= {}).add(e.at);
  }
  return sessions.map((k, v) => MapEntry(k, v.length));
}

int _lessonsBefore(MemberProgress p, List<StepResult> results) {
  final ids = results.map((r) => r.itemId).toSet();
  return p.log.where((e) => ids.contains(e.itemId)).map((e) => e.at).toSet().length;
}

class DueCard {
  final String itemId;
  final DateTime due;
  final double strength;
  const DueCard(this.itemId, this.due, this.strength);
}

List<DueCard> dueCards(MemberProgress p, DateTime now, [Set<String>? itemIds]) => stableSorted(
      [
        for (final en in p.cards.entries)
          if (itemIds == null || itemIds.contains(en.key)) DueCard(en.key, DateTime.parse(en.value.due), en.value.stability),
      ].where((c) => !c.due.isAfter(now)),
      (a, b) => a.due.millisecondsSinceEpoch.compareTo(b.due.millisecondsSinceEpoch),
    );

List<DueCard> weakestCards(MemberProgress p, [Set<String>? itemIds, int count = 4]) => stableSorted(
      [
        for (final en in p.cards.entries)
          if (itemIds == null || itemIds.contains(en.key)) DueCard(en.key, DateTime.parse(en.value.due), en.value.stability),
      ],
      (a, b) => a.strength.compareTo(b.strength),
    ).take(count).toList();

Map<String, String>? _strings(Object? v) {
  if (v is! Map) return null;
  return {for (final en in v.entries) if (en.value is String) en.key as String: en.value as String};
}

Map<String, int> _ints(Object? v) => v is Map ? {for (final en in v.entries) if (en.value is num) en.key as String: (en.value as num).toInt()} : {};

/// Reads stored progress leniently (as the website does): anything malformed is left out, never thrown.
Progress parseProgress(String? raw) {
  if (raw == null || raw.isEmpty) return {};
  try {
    final v = jsonDecode(raw);
    if (v is! Map) return {};
    final out = <String, MemberProgress>{};
    for (final en in v.entries) {
      final m = en.value;
      if (m is! Map) continue;
      final night = m['night'];
      out[en.key as String] = MemberProgress(
        units: m['units'] is List ? (m['units'] as List).whereType<String>().toList() : [],
        checkpoints: m['checkpoints'] is List ? (m['checkpoints'] as List).whereType<String>().toList() : [],
        cards: m['cards'] is Map ? {for (final c in (m['cards'] as Map).entries) if (c.value is Map && (c.value as Map)['due'] is String) c.key as String: SavedCard.fromJson((c.value as Map).cast<String, dynamic>())} : {},
        lessons: m['lessons'] is num ? (m['lessons'] as num).toInt() : (int.tryParse('${m['lessons']}') ?? 0),
        courseLessons: _ints(m['courseLessons']),
        levels: _ints(m['levels']),
        awards: _strings(m['awards']) ?? {},
        days: m['days'] is List ? (m['days'] as List).whereType<String>().toList() : [],
        log: m['log'] is List ? (m['log'] as List).whereType<Map>().map((e) => LogEntry.fromJson(e.cast<String, dynamic>())).toList() : [],
        night: night is Map && night['at'] is String && night['items'] is List ? Night(night['at'] as String, (night['items'] as List).whereType<String>().toList(), night['risen'] == true) : null,
        related: _strings(m['related']),
        explained: _strings(m['explained']),
        keep: m['keep'] is Map ? {for (final k in (m['keep'] as Map).entries) if (k.value is Map) k.key as String: Keep.fromJson(k.value as Map)} : null,
        today: parseToday(m['today']),
        partSnap: parseSnapshot(m['partSnap']),
      );
    }
    return out;
  } catch (_) {
    return {};
  }
}

MemberProgress markNight(MemberProgress p, List<String> items, DateTime now) => p.copyWith(night: Night(iso(now), items));
MemberProgress markRisen(MemberProgress p) => p.night == null ? p : p.copyWith(night: Night(p.night!.at, p.night!.items, true));

MemberProgress markExplained(MemberProgress p, String itemId, DateTime now) =>
    p.explained?[itemId] != null ? p : p.copyWith(explained: {...?p.explained, itemId: iso(now)});

MemberProgress recallRelated(MemberProgress p, String passage, DateTime now) =>
    p.related?[passage] != null ? p : p.copyWith(related: {...?p.related, passage: iso(now)});

// ---- Combining two copies of one person's progress, so nothing is ever lost.

List<String> _union(List<String> a, List<String> b) => {...a, ...b}.toList();

Map<String, T> _mergeRecord<T>(Map<String, T> a, Map<String, T> b, T Function(T x, T y) pick) {
  final out = <String, T>{...a};
  for (final en in b.entries) {
    out[en.key] = out.containsKey(en.key) ? pick(out[en.key] as T, en.value) : en.value;
  }
  return out;
}

String _logKey(LogEntry e) => e.id ?? '${e.at}|${e.itemId}|${e.kind}|${e.review ? 1 : 0}';

MemberProgress mergeProgress(MemberProgress a, MemberProgress b) {
  final log = <String, LogEntry>{};
  for (final e in [...a.log, ...b.log]) {
    log.putIfAbsent(_logKey(e), () => e);
  }
  final night = a.night == null ? b.night : b.night == null ? a.night : (a.night!.at.compareTo(b.night!.at) >= 0 ? a.night : b.night);
  final related = a.related != null || b.related != null ? _mergeRecord<String>(a.related ?? {}, b.related ?? {}, (x, y) => earliestIso(x, y)!) : null;
  final explained = a.explained != null || b.explained != null ? _mergeRecord<String>(a.explained ?? {}, b.explained ?? {}, (x, y) => earliestIso(x, y)!) : null;
  final keep = a.keep != null || b.keep != null
      ? _mergeRecord<Keep>(a.keep ?? {}, b.keep ?? {}, (x, y) => Keep(good: latestIso(x.good, y.good), miss: latestIso(x.miss, y.miss), full: latestIso(x.full, y.full)))
      : null;
  return MemberProgress(
    units: _union(a.units, b.units),
    checkpoints: _union(a.checkpoints, b.checkpoints),
    cards: _mergeRecord<SavedCard>(a.cards, b.cards, (x, y) => (latestIso(x.lastReview, y.lastReview) ?? '') == (y.lastReview ?? '') && y.lastReview != null ? y : x),
    lessons: math.max(a.lessons, b.lessons),
    courseLessons: _mergeRecord<int>(a.courseLessons, b.courseLessons, math.max),
    levels: _mergeRecord<int>(a.levels, b.levels, math.max),
    awards: _mergeRecord<String>(a.awards, b.awards, (x, y) => earliestIso(x, y)!),
    days: _union(a.days, b.days)..sort(),
    log: stableSorted(log.values, (x, y) => x.at.compareTo(y.at)),
    night: night,
    related: related,
    explained: explained,
    keep: keep,
    today: mergeToday(a.today, b.today),
    partSnap: mergeSnapshot(a.partSnap, b.partSnap),
  );
}

/// Whether two copies hold the same progress (so there's nothing to send).
bool sameProgress(MemberProgress a, MemberProgress b) => jsonEncode(a.toJson()) == jsonEncode(b.toJson());
