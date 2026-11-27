// The planner: what the next lesson in a course should hold. Port of src/heir/planner.ts.

import 'dart:math' as math;

import 'lesson.dart';
import 'memory.dart';
import 'models.dart';
import 'progress.dart';
import 'types.dart';
import 'util.dart';

export 'memory.dart' show recallChance;

const _day = dayMillis;
const awayDays = 21;
const practiceEvery = 3;

class Pick {
  final String itemId;
  final double risk, recall, strength;
  const Pick(this.itemId, this.risk, this.recall, this.strength);
  Map<String, Object?> toJson() => {'itemId': itemId, 'risk': risk, 'recall': recall, 'strength': strength};
}

/// What the next lesson is. [kind]: welcome, learn, practice, checkpoint or welcome-back.
class LessonPlan {
  final String kind;
  final List<Unit> units;
  final Group? group;
  final List<Pick> picks;
  final String? why; // practice: rhythm, catch-up, steady, all-learned
  const LessonPlan(this.kind, {this.units = const [], this.group, this.picks = const [], this.why});
}

/// Learned items, most at risk first: likely forgotten by now, weighted up for a history of misses.
List<Pick> riskOrder(MemberProgress p, Set<String> itemIds, DateTime now, [Map<String, PartMem>? parts]) {
  final misses = <String, int>{};
  for (final e in p.log) {
    if (!e.correct && e.kind != 'intro' && itemIds.contains(e.itemId)) misses[e.itemId] = (misses[e.itemId] ?? 0) + 1;
  }
  return stableSorted(
    [
      for (final en in p.cards.entries)
        if (itemIds.contains(en.key))
          () {
            final card = en.value;
            final byPart = parts != null ? itemChance(en.key, parts, now) : null;
            final recall = byPart == null ? recallChance(card, now) : math.min(recallChance(card, now), byPart);
            final trouble = 1 + 0.4 * card.lapses + 0.15 * math.min(6, misses[en.key] ?? 0);
            return Pick(en.key, (1 - recall) * trouble, recall, card.stability);
          }(),
    ],
    (a, b) => b.risk.compareTo(a.risk),
  );
}

/// Each session's share of first-try right answers, newest first.
List<double> recentAccuracy(MemberProgress p, Set<String> itemIds, [int sessions = 2]) {
  final by = <String, List<int>>{};
  for (final e in p.log) {
    if (!itemIds.contains(e.itemId) || e.kind == 'intro') continue;
    final s = by[e.at] ??= [0, 0];
    s[1]++;
    if (e.correct) s[0]++;
  }
  final sorted = stableSorted(by.entries, (a, b) => a.key.compareTo(b.key) < 0 ? 1 : -1);
  return sorted.take(sessions).map((en) => en.value[0] / en.value[1]).toList();
}

/// Lessons finished in this course.
int lessonsDone(MemberProgress p, String courseId, Set<String> itemIds) {
  final stored = p.courseLessons[courseId];
  if (stored != null) return stored;
  return {for (final e in p.log) if (itemIds.contains(e.itemId)) e.at}.length;
}

int? _lastSeen(MemberProgress p, Set<String> itemIds) {
  int? last;
  for (final e in p.log) {
    if (itemIds.contains(e.itemId)) {
      final t = parseMs(e.at);
      if (last == null || t > last) last = t;
    }
  }
  return last;
}

LessonPlan? planNext({required String courseId, required List<Item> items, required Track track, required MemberProgress p, required DateTime now}) {
  final ids = items.map((i) => i.id).toSet();
  final done = lessonsDone(p, courseId, ids);
  final picks = riskOrder(p, ids, now);
  final learned = p.units.toSet();
  final waiting = lockInsWaiting(items, (id) => waitingForSleep(p, id, now));
  final act = nextActivity(items, track, learned, p.checkpoints.toSet(), waiting);

  if (done == 0 && act?.kind == 'learn') return LessonPlan('welcome', units: [act!.unit!], group: act.group);

  final last = _lastSeen(p, ids);
  if (picks.isNotEmpty && last != null && now.millisecondsSinceEpoch - last >= awayDays * _day) return LessonPlan('welcome-back', picks: picks.take(8).toList());

  if (act == null) return picks.isNotEmpty ? LessonPlan('practice', picks: picks.take(6).toList(), why: 'all-learned') : null;
  if (act.kind == 'checkpoint') return LessonPlan('checkpoint', group: act.group);

  final dueNow = picks.where((x) => x.recall < 0.9).length;
  final acc = recentAccuracy(p, ids);
  final struggling = acc.isNotEmpty && acc[0] < 0.8;
  final lessonNumber = done + 1;
  if (picks.length >= 3 && (dueNow >= 6 || struggling)) return LessonPlan('practice', picks: picks.take(6).toList(), why: struggling ? 'steady' : 'catch-up');
  if (picks.length >= 3 && lessonNumber % practiceEvery == 0) return LessonPlan('practice', picks: picks.take(6).toList(), why: 'rhythm');

  final units = [act.unit!];
  final flying = acc.length == 2 && acc.every((a) => a >= 0.9) && dueNow == 0;
  if (flying && act.unit!.of == 1) {
    final after = nextActivity(items, track, {...learned, act.unit!.key}, p.checkpoints.toSet(), waiting);
    if (after?.kind == 'learn' && after!.group.key == act.group.key && after.unit!.of == 1) units.add(after.unit!);
  }
  return LessonPlan('learn', units: units, group: act.group);
}

String describe(LessonPlan plan, String Function(Group g) groupName) {
  switch (plan.kind) {
    case 'welcome':
      return 'Welcome: what this is and how Katekize helps you remember, then your first question.';
    case 'learn':
      return plan.units.length > 1 ? 'Two new questions, and practice on the ones before.' : 'A new question, and practice on the ones before.';
    case 'checkpoint':
      return 'Lock in ${groupName(plan.group!)}: each one from memory.';
    case 'welcome-back':
      return 'Welcome back. Catch up on ${plan.picks.length} questions, starting with the ones most likely to have slipped.';
    default:
      return plan.why == 'steady'
          ? 'Practice: ${plan.picks.length} questions to steady what you’ve learned.'
          : plan.why == 'catch-up'
              ? 'Practice: ${plan.picks.length} questions that are due, most at risk first.'
              : 'Practice: ${plan.picks.length} questions, starting with the ones most likely to slip.';
  }
}

const lessonMinutes = 6;
const _lockInMinutes = 4;
const goals = [5, 7, 15, 25];

/// The default daily goal: about seven minutes. People can always do more.
const defaultGoal = 7;

class Projection {
  final int remaining, learnDays;
  final DateTime learnedBy, longTermBy;
  const Projection(this.remaining, this.learnDays, this.learnedBy, this.longTermBy);
}

double _lessonMinutesFor(int words) => math.min(lessonMinutes.toDouble(), math.max(2.5, (lessonMinutes * words) / 20));

Projection project({required List<Item> items, required Track track, required MemberProgress p, required num minutes, required DateTime now}) {
  final learned = p.units.toSet(), locks = p.checkpoints.toSet();
  final todo = [
    for (final i in items)
      for (final u in unitsFor(i, track))
        if (!learned.contains(u.key)) unitText(i, track, u).text.split(RegExp(r'\s+')).length,
  ];
  final lockIns = groupsOf(items).where((g) => !locks.contains(g.key)).length;
  final remaining = todo.length + lockIns;
  final work = todo.fold<double>(0, (s, w) => s + _lessonMinutesFor(w)) + lockIns * _lockInMinutes;
  final perDay = minutes * (2 / 3) / 1.2;
  final learnDays = remaining == 0 ? 0 : (work / perDay).ceil();
  final learnedBy = fromMs(now.millisecondsSinceEpoch + learnDays * _day);
  return Projection(remaining, learnDays, learnedBy, fromMs(learnedBy.millisecondsSinceEpoch + 182 * _day));
}

const eveningFrom = 19;

List<String> bedtimePicks(MemberProgress p, Set<String> itemIds, DateTime now) {
  final fresh = [for (final id in p.cards.keys) if (itemIds.contains(id) && waitingForSleep(p, id, now)) id];
  final edge = [for (final x in riskOrder(p, itemIds, now)) if (!fresh.contains(x.itemId) && x.recall >= 0.55 && x.recall <= 0.88) x.itemId];
  return [...fresh.take(4), ...edge].take(5).toList();
}

String _eveningOf(DateTime d) => localDay(fromMs(d.millisecondsSinceEpoch - 3 * 3600000));

List<String>? nightOffer(MemberProgress p, Set<String> itemIds, DateTime now) {
  final h = now.toLocal().hour;
  if (h < eveningFrom && h >= 3) return null;
  if (p.night != null && _eveningOf(DateTime.parse(p.night!.at)) == _eveningOf(now)) return null;
  final picks = bedtimePicks(p, itemIds, now);
  return picks.isNotEmpty ? picks : null;
}

List<String>? riseOffer(MemberProgress p, DateTime now) {
  final n = p.night;
  if (n == null || n.risen || n.items.isEmpty) return null;
  final h = now.toLocal().hour;
  if (h < 4 || h >= 12) return null;
  return _eveningOf(DateTime.parse(n.at)) != _eveningOf(now) ? n.items : null;
}

const morningFrom = 5;

List<String> morningPicks(MemberProgress p, Set<String> itemIds, DateTime now) {
  final n = p.night;
  if (n != null && !n.risen && n.items.isNotEmpty && _eveningOf(DateTime.parse(n.at)) != _eveningOf(now) &&
      now.millisecondsSinceEpoch - DateTime.parse(n.at).millisecondsSinceEpoch < 30 * 3600000) {
    return n.items;
  }
  final order = [for (final x in riskOrder(p, itemIds, now)) if (!waitingForSleep(p, x.itemId, now)) x];
  final edge = [for (final x in order) if (x.recall >= 0.55 && x.recall <= 0.92) x];
  return (edge.isNotEmpty ? edge : order).take(5).map((x) => x.itemId).toList();
}
