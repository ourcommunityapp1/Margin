// Builds a lesson from a person's saved progress: what to learn next, what is due for review, and what needs keeping.
// A port of the session assembly in src/app/heir/ui/lesson.tsx (modes "lesson" and "item"), with the keeping rules on,
// as they are for every account on the website. The step builders themselves are the engine's (lesson.dart).
//
// Not yet ported here: the night and rise recalls, the lock-in/keep trips chosen from Today's cards, and extra
// practice. They need Today's day plan, which comes next.

import 'dart:math' as math;

import '../../engine/content.dart';
import '../../engine/keep.dart';
import '../../engine/lesson.dart' as lesson;
import '../../engine/memory.dart';
import '../../engine/models.dart' show PartMem;
import '../../engine/planner.dart' as planner;
import '../../engine/progress.dart';
import '../../engine/types.dart';
import '../../engine/util.dart' show jsRound;

/// One run of steps, with what the finish needs to record it.
class Session {
  const Session({
    required this.label,
    required this.kind,
    required this.steps,
    required this.units,
    required this.group,
    required this.courseId,
    required this.memberId,
    this.why = const {},
  });

  /// "Welcome", "Lesson 3", "Practice · Q1".
  final String label;

  /// 'learn', 'checkpoint' or 'review'.
  final String kind;
  final List<lesson.Step> steps;

  /// The parts this lesson teaches, recorded as learned when it finishes.
  final List<lesson.Unit> units;
  final lesson.Group? group;

  /// The course this counts towards ('' for a practice on one item, which is not a lesson of the course).
  final String courseId;
  final String memberId;

  /// Why each review is here, by item id ("Missed last time", "Strong until…").
  final Map<String, String> why;
}

math.Random _random = math.Random();

/// The next lesson of [course] for this person.
Session buildLessonSession({
  required Course course,
  required Track track,
  required MemberProgress mine,
  required String memberId,
  required DateTime now,
  lesson.Rng? rng,
}) {
  final r = rng ?? _random.nextDouble;
  final items = courseItems(course);
  final ids = items.map((i) => i.id).toSet();
  final pool = allItems();
  final parts = partMemories(mine.log, mine.partSnap);
  final weak = weakPartsNow(mine.log, parts, now);

  List<lesson.Due> toDue(Iterable<(String, double)> list) => [
        for (final (id, strength) in list)
          if (getItem(id) case final item?)
            () {
              final card = mine.cards[id];
              final byPart = itemChance(id, parts, now);
              final chance = card != null ? math.min(recallChance(card, now), byPart ?? 1) : byPart;
              return lesson.Due(item, strength, weak: [for (final k in weak) if (k.startsWith('$id#')) k], chance: chance);
            }(),
      ];

  final learnedUnits = mine.units.toSet();
  final seen = seenCounts(mine);
  final done = planner.lessonsDone(mine, course.id, ids);
  final due = dueCards(mine, now, ids);
  final plan = planner.planNext(courseId: course.id, items: items, track: track, p: mine, now: now);
  final baseLabel = done == 0 ? 'Welcome' : 'Lesson ${done + 1}';

  String label = baseLabel, kind = 'review';
  var steps = <lesson.Step>[];
  var units = <lesson.Unit>[];
  lesson.Group? group;

  if (plan != null && plan.kind == 'welcome') {
    final unit = plan.units.first;
    final item = getItem(unit.itemId)!;
    final intro = intros[course.id];
    steps = intro != null
        ? lesson.buildWelcome(intro: intro, unit: unit, item: item, track: track, pool: pool, rng: r)
        : lesson.buildLesson(unit: unit, item: item, track: track, mates: const [], due: const [], pool: pool, rng: r);
    kind = 'learn';
    units = plan.units;
    group = plan.group;
  } else if (plan != null && plan.kind == 'learn') {
    final unit = plan.units.first;
    final second = plan.units.length > 1 ? plan.units[1] : null;
    final item = getItem(unit.itemId)!;
    final fresh = plan.units.map((u) => u.itemId).toSet();
    final mates = <lesson.Mate>[
      for (final i in plan.group!.items)
        if (!fresh.contains(i.id))
          if (lesson.unitsFor(i, track).where((u) => learnedUnits.contains(u.key)).toList() case final us when us.isNotEmpty)
            lesson.Mate(i, us, seen[i.id] ?? 0),
    ];
    // Earlier parts of the item being learned count as practice too.
    final own = lesson.unitsFor(item, track).where((u) => learnedUnits.contains(u.key)).toList();
    if (own.isNotEmpty) mates.insert(0, lesson.Mate(item, own, seen[item.id] ?? 0));
    final inGroup = plan.group!.items.map((i) => i.id).toSet();
    final reviews = toDue([for (final d in due) if (!inGroup.contains(d.itemId)) (d.itemId, d.strength)]);
    // A lesson fits about six minutes at this person's own pace.
    final maxSteps = math.min(18, math.max(10, jsRound(6 * 60 / stepSeconds(mine.log))));
    steps = lesson.buildLesson(
      unit: unit,
      item: item,
      track: track,
      mates: second != null ? mates.take(1).toList() : mates,
      due: second != null ? const [] : reviews,
      pool: pool,
      rng: r,
      maxSteps: maxSteps,
    );
    if (second != null) {
      steps = [...steps, ...lesson.buildLite(unit: second, item: getItem(second.itemId)!, track: track, pool: pool, rng: r)];
    }
    kind = 'learn';
    units = plan.units;
    group = plan.group;
  } else if (plan != null && plan.kind == 'checkpoint') {
    steps = lesson.buildCheckpoint(group: plan.group!, track: track, pool: pool, rng: r);
    kind = 'checkpoint';
    group = plan.group;
  } else if (plan != null) {
    label = plan.kind == 'welcome-back' ? 'Welcome back · $baseLabel' : baseLabel;
    steps = lesson.buildReview(due: toDue([for (final p in plan.picks) (p.itemId, p.strength)]), track: track, pool: pool, rng: r, max: plan.picks.length);
  }

  // A lesson also carries up to two whole-verse reviews for what needs keeping most (a miss to put right first, then
  // what is due soonest), so everyday lessons keep words in memory without a separate trip. Only from this lesson's own
  // course, and not anything recalled in the last few hours.
  if (steps.isNotEmpty) {
    final inLesson = steps.map((s) => s.itemId).toSet();
    final urgent = summarize(heldItems(pool, mine, track, now, KeepOptions(launch: keepLaunch, tz: null)));
    final recent = recalledRecently(mine.log, now);
    final extra = [
      for (final h in [...urgent.tryAgain, ...urgent.review])
        if (!inLesson.contains(h.item.id) && ids.contains(h.item.id) && !recent.contains(h.item.id)) h.item,
    ].take(2).toList();
    if (extra.isNotEmpty) steps = [...steps, ...lesson.buildKeep(items: extra, track: track, pool: pool, rng: r)];
  }

  return Session(
    label: label,
    kind: kind,
    steps: steps,
    units: units,
    group: group,
    courseId: course.id,
    memberId: memberId,
    why: _why(steps, mine, parts, now),
  );
}

/// One question or verse, practised on its own from its page: a quick recall, then said or typed in full. Not numbered
/// as a lesson of the course.
Session buildItemSession({
  required Item item,
  required Track track,
  required MemberProgress mine,
  required String memberId,
  required DateTime now,
  lesson.Rng? rng,
}) {
  final r = rng ?? _random.nextDouble;
  final parts = partMemories(mine.log, mine.partSnap);
  final weak = weakPartsNow(mine.log, parts, now);
  final card = mine.cards[item.id];
  final byPart = itemChance(item.id, parts, now);
  final chance = card != null ? math.min(recallChance(card, now), byPart ?? 1) : byPart;
  final steps = lesson.buildReview(
    due: [lesson.Due(item, math.min(6, card?.stability ?? 1), weak: [for (final k in weak) if (k.startsWith('${item.id}#')) k], chance: chance)],
    track: track,
    pool: allItems(),
    rng: r,
    max: 1,
  );
  return Session(
    label: 'Practice · ${itemLabel(item)}',
    kind: 'review',
    steps: steps,
    units: const [],
    group: null,
    courseId: '',
    memberId: memberId,
    why: _why(steps, mine, parts, now),
  );
}

/// Why each review is here, shown on it: how it went last time or how long ago, and its strength now.
Map<String, String> _why(List<lesson.Step> steps, MemberProgress mine, Map<String, PartMem> parts, DateTime now) {
  final why = <String, String>{};
  for (final st in steps) {
    if (!st.review || why.containsKey(st.itemId)) continue;
    final card = mine.cards[st.itemId];
    final byPart = itemChance(st.itemId, parts, now);
    final chance = card != null ? math.min(recallChance(card, now), byPart ?? 1) : byPart;
    final w = whyNow(st.itemId, mine.log, chance, now);
    if (w != null) why[st.itemId] = w;
  }
  return why;
}
