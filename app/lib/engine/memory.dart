// The memory model, in one place: the chance of recalling something now, how a recall is graded, and each person's
// typical speed. Wraps FSRS-6. Port of src/heir/memory.ts (ADR-001).

import 'dart:math' as math;

import 'fsrs.dart';
import 'models.dart';
import 'util.dart';

/// Stamped on every answer with the chance the model gave just before it.
const modelVersion = 'fsrs6-default-v1';

const _day = 86400000;
const _decay = fsrsDecay;
final double _factor = math.pow(0.9, -1 / _decay) - 1;

// ---- Calibration.
class Cal {
  final double a, b;
  const Cal(this.a, this.b);
}

final _identity = Cal(1, 0); // a fresh one, so only "no calibration" skips the correction
Cal _population = _identity;
Cal? _person;
void setPopulationCal(Cal? c) => _population = c ?? _identity;
void setPersonCal(Cal? c) => _person = c;
double _logit(double p) => math.log(p / (1 - p));
double _sigmoid(double x) => 1 / (1 + math.exp(-x));
double _clampP(double p) => math.min(0.999, math.max(0.001, p));

/// A raw model chance corrected by a calibration.
double calibrate(double p, [Cal? c]) {
  final cal = c ?? _population;
  return identical(cal, _identity) ? p : _sigmoid(cal.a * _logit(_clampP(p)) + cal.b);
}

/// The raw model chance that a calibrated chance of [target] corresponds to.
double rawFor(double target, [Cal? c]) {
  final cal = c ?? _population;
  return identical(cal, _identity) ? target : _sigmoid((_logit(_clampP(target)) - cal.b) / cal.a);
}

double _rawChance(double last, double s, DateTime now) =>
    math.pow(1 + _factor * (math.max(0, now.millisecondsSinceEpoch - last) / _day / math.max(0.1, s)), -_decay).toDouble();

double _lastOf(SavedCard card) => card.lastReview != null ? parseMs(card.lastReview!).toDouble() : parseMs(card.due) - card.scheduledDays * _day.toDouble();

/// The chance of recalling it now (the FSRS-6 curve), corrected by the person's calibration, else the population's.
double recallChance(SavedCard card, DateTime now) => calibrate(_rawChance(_lastOf(card), card.stability, now), _person ?? _population);

/// The raw chance the model gives before an answer; null for an item not yet recalled after sleep.
double? predictedChance(SavedCard? card, DateTime now) {
  if (card == null || card.state == stateNew) return null;
  return jsRound(_rawChance(_lastOf(card), card.stability, now) * 1000) / 1000;
}

/// Days from [now] until the chance falls to [target].
double daysUntil(SavedCard card, double target, DateTime now) {
  final last = card.lastReview != null ? parseMs(card.lastReview!).toDouble() : now.millisecondsSinceEpoch.toDouble();
  return math.max(0, (last + daysToChance(card.stability, target) * _day - now.millisecondsSinceEpoch) / _day);
}

/// Days after the last review until the (population-calibrated) chance falls to [target].
double daysToChance(double stability, double target) => (stability * (math.pow(rawFor(target), -1 / _decay) - 1)) / _factor;

// ---- Speed.
class Speed {
  final double msPerWord;
  final int n;
  const Speed(this.msPerWord, this.n);
}

const _full = {'type', 'say'};

/// The median time per word of right, unaided full recalls, for typing and for saying.
Map<String, Speed> speedBaseline(List<LogEntry> log) {
  final by = <String, List<double>>{};
  for (final e in log) {
    if (_full.contains(e.kind) && e.correct && e.hints == 0 && (e.words ?? 0) != 0 && e.ms > 0) (by[e.kind] ??= []).add(e.ms / e.words!);
  }
  return by.map((k, v) {
    final s = [...v]..sort();
    return MapEntry(k, Speed(s[s.length ~/ 2], s.length));
  });
}

// ---- Grading.
/// Wrong or missing words that still count as keeping it ("Nearly"): 1 in a short text, 2 in a longer one.
int allowedMisses(int? words) => words != null && words < 12 ? 1 : 2;

/// 'again', 'hard' or 'good' for one recall.
String markOf(StepResult r) {
  if (r.kind == 'letters') return r.correct ? 'hard' : 'again';
  if (r.correct && r.hints == 0) return 'good';
  if (r.correct) return 'hard';
  if (r.misses != null && r.misses! <= allowedMisses(r.words) && r.hints == 0) return 'hard';
  if (r.kind == 'say' && r.misses == 1) return 'hard';
  return 'again';
}

const recallKinds = {'type', 'say', 'letters'};

/// One item's grade for a session; null when nothing in it was recall.
int? gradeRecall(List<StepResult> results, ({int state, int reps})? card, [Map<String, Speed> speed = const {}]) {
  final recall = results.where((r) => recallKinds.contains(r.kind)).toList();
  if (recall.isEmpty) return null;
  final marks = recall.map(markOf).toList();
  if (marks.contains('again')) return ratingAgain;
  if (marks.contains('hard')) return ratingHard;
  final seasoned = card != null && card.state == stateReview && card.reps >= 2 && recall.every((r) => r.review);
  final full = recall.where((r) => _full.contains(r.kind) && (r.words ?? 0) != 0).toList();
  final fast = full.isNotEmpty &&
      full.every((r) {
        final b = speed[r.kind];
        return b != null && b.n >= 20 && r.ms / r.words! < b.msPerWord;
      });
  return seasoned && fast ? ratingEasy : ratingGood;
}

// ---- Parts.
/// Parts whose most recent recall was wrong (or hinted).
Set<String> weakParts(List<LogEntry> log) {
  final last = <String, bool>{};
  for (final e in stableSorted(log, (a, b) => a.at.compareTo(b.at))) {
    if (e.part != null && recallKinds.contains(e.kind)) {
      last[e.part!] = e.correct && e.hints == 0;
    }
  }
  return {for (final en in last.entries) if (!en.value) en.key};
}

/// Typical seconds for one review step (25 until there are enough answers).
double stepSeconds(List<LogEntry> log) {
  final ms = log.where((e) => e.review && e.ms > 0 && e.ms < 180000).map((e) => e.ms).toList()..sort();
  return ms.length >= 20 ? math.max(8, ms[ms.length ~/ 2] / 1000) : 25;
}

const _grade = {'again': ratingAgain, 'hard': ratingHard, 'good': ratingGood};

class _Sess {
  final String part, at, day;
  final List<String> marks = [];
  _Sess(this.part, this.at, this.day);
}

/// Replay answers (any order) on top of [start]. Only the first graded recall of a part on a given day moves its memory.
Map<String, PartMem> replayParts(List<LogEntry> entries, [Map<String, PartMem> start = const {}]) {
  final mem = <String, PartMem>{...start};
  final sessions = <String, _Sess>{};
  for (final e in entries) {
    if (e.part == null || !recallKinds.contains(e.kind)) continue;
    final key = '${e.part}|${e.at}';
    final s = sessions[key] ?? _Sess(e.part!, e.at, e.day ?? e.at.substring(0, 10));
    s.marks.add(markOf(e));
    sessions[key] = s;
  }
  final seenDay = <String>{};
  for (final s in stableSorted(sessions.values, (a, b) => a.at.compareTo(b.at))) {
    final m = mem[s.part];
    if (m != null && s.at.compareTo(m.last) <= 0) continue;
    if (seenDay.contains('${s.part}|${s.day}') || (m != null && m.last.substring(0, 10) == s.day)) continue;
    seenDay.add('${s.part}|${s.day}');
    final mark = s.marks.contains('again') ? 'again' : s.marks.contains('hard') ? 'hard' : 'good';
    final at = DateTime.parse(s.at);
    final card = m != null
        ? FsrsCard(
            due: fromMsD(parseMs(m.last) + m.s * _day),
            stability: m.s,
            difficulty: m.d,
            reps: m.reps,
            lapses: m.lapses,
            state: m.state,
            lastReview: DateTime.parse(m.last))
        : createEmptyCard(at);
    final next = fsrsNext(card, at, _grade[mark]!, fuzz: false);
    mem[s.part] = PartMem(s: next.stability, d: next.difficulty, last: s.at, reps: next.reps, lapses: next.lapses, state: next.state);
  }
  return mem;
}

/// Every part's memory now: the snapshot, then the answers after it.
Map<String, PartMem> partMemories(List<LogEntry> log, [PartSnapshot? snap]) => replayParts(log, snap?.mem ?? const {});

/// When the phone trims old answers, fold them into the snapshot first so no part forgets its history.
PartSnapshot? foldTrimmed(List<LogEntry> dropped, [PartSnapshot? snap]) {
  final graded = dropped.where((e) => e.part != null && (snap == null || e.at.compareTo(snap.asOf) > 0)).toList();
  if (graded.isEmpty) return snap;
  final asOf = graded.fold<String>(snap?.asOf ?? '', (m, e) => e.at.compareTo(m) > 0 ? e.at : m);
  return PartSnapshot(asOf: asOf, mem: replayParts(graded, snap?.mem ?? const {}));
}

/// The chance of recalling one part now.
double partChance(PartMem m, DateTime now) => calibrate(_rawChance(parseMs(m.last).toDouble(), m.s, now), _person ?? _population);

/// An item's chance is its weakest part's.
double? itemChance(String itemId, Map<String, PartMem> parts, DateTime now) {
  double? min;
  for (final en in parts.entries) {
    if (en.key.startsWith('$itemId#')) {
      final c = partChance(en.value, now);
      if (min == null || c < min) min = c;
    }
  }
  return min;
}

/// Parts to ask first: last recalled wrong, or with a chance under [below].
Set<String> weakPartsNow(List<LogEntry> log, Map<String, PartMem> parts, DateTime now, [double below = 0.85]) {
  final out = weakParts(log);
  for (final en in parts.entries) {
    if (partChance(en.value, now) < below) out.add(en.key);
  }
  return out;
}

/// Two phones' snapshots: each part keeps whichever memory was reviewed most recently.
PartSnapshot? mergeSnapshot(PartSnapshot? a, PartSnapshot? b) {
  if (a == null || b == null) return a ?? b;
  final mem = <String, PartMem>{...a.mem};
  for (final en in b.mem.entries) {
    final cur = mem[en.key];
    if (cur == null || en.value.last.compareTo(cur.last) > 0) mem[en.key] = en.value;
  }
  return PartSnapshot(asOf: a.asOf.compareTo(b.asOf) >= 0 ? a.asOf : b.asOf, mem: mem);
}

PartSnapshot? parseSnapshot(Object? v) {
  if (v is! Map) return null;
  final asOf = v['asOf'], mem = v['mem'];
  if (asOf is! String || mem is! Map) return null;
  final out = <String, PartMem>{};
  for (final en in mem.entries) {
    final m = en.value;
    if (m is Map && m['s'] is num && m['d'] is num && m['last'] is String) out[en.key as String] = PartMem.fromJson(m.cast<String, dynamic>());
  }
  return PartSnapshot(asOf: asOf, mem: out);
}

// ---- Look-alikes.
final _notLetters = RegExp(r"[^a-z\s']");
final _ws = RegExp(r'\s+');
Set<String> _distinct(String t) => t.toLowerCase().replaceAll(_notLetters, ' ').split(_ws).where((w) => w.length > 3).toSet();

/// Share of distinctive words two texts have in common (0 to 1).
double overlap(String a, String b) {
  final x = _distinct(a), y = _distinct(b);
  if (x.isEmpty || y.isEmpty) return 0;
  var n = 0;
  for (final w in x) {
    if (y.contains(w)) n++;
  }
  return n / math.min(x.length, y.length);
}

/// Reorder so no two neighbours are look-alikes (overlap of 0.5 or more), keeping the order otherwise.
List<T> spreadApart<T>(List<T> list, String Function(T) text) {
  final left = [...list], out = <T>[];
  while (left.isNotEmpty) {
    final i = out.isEmpty ? 0 : left.indexWhere((x) => overlap(text(out.last), text(x)) < 0.5);
    out.add(left.removeAt(i == -1 ? 0 : i));
  }
  return out;
}

/// Why a review is here, in a few plain words.
String? whyNow(String itemId, List<LogEntry> log, double? chance, DateTime now) {
  LogEntry? last;
  for (final e in log) {
    if (e.itemId == itemId && recallKinds.contains(e.kind) && (last == null || e.at.compareTo(last.at) > 0)) last = e;
  }
  final sameDay = last != null && (now.millisecondsSinceEpoch - parseMs(last.at)) < 20 * 3600000;
  final strength = chance == null || sameDay ? '' : ' · strength ${jsRound(chance * 100)}%';
  if (last == null) return chance == null ? null : 'Strength ${jsRound(chance * 100)}%';
  if (!last.correct || last.hints != 0) {
    final misses = last.misses ?? 0;
    final off = misses != 0
        ? '$misses ${misses == 1 ? 'word' : 'words'} off last time'
        : last.hints != 0
            ? 'Needed a hint last time'
            : 'Missed last time';
    return '$off$strength';
  }
  final days = ((now.millisecondsSinceEpoch - parseMs(last.at)) / _day).floor();
  final ago = days <= 0 ? 'Practiced today' : days == 1 ? 'Last practiced yesterday' : 'Last practiced $days days ago';
  return '$ago$strength';
}

/// Items recalled in the last [hours]: not picked again for a review so soon.
Set<String> recalledRecently(List<LogEntry> log, DateTime now, [double hours = 16]) {
  final since = now.millisecondsSinceEpoch - hours * 3600000;
  return {for (final e in log) if (recallKinds.contains(e.kind) && parseMs(e.at) >= since) e.itemId};
}

// ---- In memory, from the model (ADR-001 Decision 6).
const outBelow = 0.7;
const outAfterDays = 7;
const strongAbove = 0.8;

/// The memories of every part of an item, or null if any part has none yet.
List<PartMem>? itemParts(List<String> unitKeys, Map<String, PartMem> parts) {
  final mems = unitKeys.map((k) => parts[k]).toList();
  return mems.isNotEmpty && mems.every((m) => m != null) ? mems.cast<PartMem>() : null;
}

/// When the item leaves your count if nothing more is recalled: its weakest line crossing 70%, plus a week.
DateTime outAt(List<PartMem> mems) => fromMsD(minD(mems.map((m) => parseMs(m.last) + (daysToChance(m.s, outBelow) + outAfterDays) * _day)));

/// When the item's weakest line falls to 80%.
DateTime strongUntil(List<PartMem> mems) => fromMsD(minD(mems.map((m) => parseMs(m.last) + daysToChance(m.s, strongAbove) * _day)));
