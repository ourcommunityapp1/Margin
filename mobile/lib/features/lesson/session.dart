// Builds a lesson from a person's saved progress: what to learn next, what is due for review, and what needs keeping.
// A port of the session assembly in src/app/heir/ui/lesson.tsx (modes "lesson" and "item"), with the keeping rules on,
// as they are for every account on the website. The step builders themselves are the engine's (lesson.dart).
//
// Modes: lesson (the next lesson), review (a card's catch-up practice), keep (chosen verses and answers), night and rise
// (the optional evening and morning recalls), extra (practice after the day's cards) and item (one question or verse).

import 'dart:math' as math;

import '../../engine/content.dart';
import '../../engine/dayplan.dart' show startedCourses;
import '../../engine/keep.dart';
import '../../engine/lesson.dart' as lesson;
import '../../engine/memory.dart';
import '../../engine/models.dart' show PartMem;
import '../../engine/planner.dart' as planner;
import '../../engine/planner.dart' show riskOrder;
import '../../engine/progress.dart';
import '../../engine/types.dart';
import '../../engine/util.dart' show jsRound;
import '../window/light.dart' show Light;

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
    this.mode = 'lesson',
    this.dayCourse = '',
    this.cardId,
    this.night = false,
    this.rise = false,
    this.before,
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

  /// lesson, review, keep, night, rise, extra or item.
  final String mode;

  /// The course Today's record credits (a practice with no course of its own credits the person's chosen one).
  final String dayCourse;

  /// The Today card this session was opened from, if any.
  final String? cardId;
  final bool night, rise;

  /// How lit the course's window was before this session, so the done screen can show the new light arriving.
  final Light? before;

  Session withBefore(Light? light) => Session(
        label: label,
        kind: kind,
        steps: steps,
        units: units,
        group: group,
        courseId: courseId,
        memberId: memberId,
        why: why,
        mode: mode,
        dayCourse: dayCourse,
        cardId: cardId,
        night: night,
        rise: rise,
        before: light,
      );
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
  String mode = 'lesson',
  String? cardId,
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
  final plan = mode == 'review'
      ? () {
          // A review fits its time: the card's minutes (or about four) at this person's own pace, two steps an item.
          final est = mine.today?.cards?.where((c) => c.id == cardId).firstOrNull?.est ?? 4;
          final fit = math.min(8, math.max(3, jsRound(est * 60 / (2 * stepSeconds(mine.log)))));
          // Not something still waiting for its first night's sleep, or recalled in the last few hours: a review then
          // measures short-term memory, not what's kept.
          final recent = recalledRecently(mine.log, now);
          final all = riskOrder(mine, ids, now, parts);
          final fresh = all.where((x) => !waitingForSleep(mine, x.itemId, now) && !recent.contains(x.itemId)).toList();
          final picks = fresh.isNotEmpty ? fresh : all.where((x) => !waitingForSleep(mine, x.itemId, now)).toList();
          return picks.isEmpty ? null : planner.LessonPlan('practice', picks: picks.take(fit).toList(), why: 'catch-up');
        }()
      : planner.planNext(courseId: course.id, items: items, track: track, p: mine, now: now);
  final baseLabel = mode == 'review' ? 'Review · ${course.title}' : done == 0 ? 'Welcome' : 'Lesson ${done + 1}';

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
    mode: mode,
    dayCourse: course.id,
    cardId: cardId,
  );
}

/// One question or verse, practised on its own from its page: a quick recall, then said or typed in full. Not numbered
/// as a lesson of the course.
Session buildItemSession({
  required String dayCourse,
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
    mode: 'item',
    dayCourse: dayCourse,
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

/// Keeping words in memory: the verses and answers chosen (a "fix" card's, or picked from Keep), each recalled whole.
Session buildKeepSession({
  required List<Item> items,
  required Track track,
  required MemberProgress mine,
  required String memberId,
  required String dayCourse,
  required DateTime now,
  String courseId = '',
  String? cardId,
  lesson.Rng? rng,
}) {
  final r = rng ?? _random.nextDouble;
  final steps = lesson.buildKeep(items: items, track: track, pool: allItems(), rng: r);
  final parts = partMemories(mine.log, mine.partSnap);
  return Session(
    label: items.length == 1 ? 'Review · ${itemLabel(items.first)}' : 'Review · ${items.length} to keep',
    kind: 'review',
    steps: steps,
    units: const [],
    group: null,
    courseId: courseId,
    memberId: memberId,
    why: _why(steps, mine, parts, now),
    mode: 'keep',
    dayCourse: dayCourse,
    cardId: cardId,
  );
}

/// When you lie down: today's questions first, then a few on the edge, one quiet step each.
Session buildNightSession({
  required Course course,
  required Track track,
  required MemberProgress mine,
  required String memberId,
  required DateTime now,
  lesson.Rng? rng,
}) {
  final r = rng ?? _random.nextDouble;
  final ids = courseItems(course).map((i) => i.id).toSet();
  // Tonight's picks; with nothing new today and nothing on the edge, the ones most worth recalling (as the website).
  final tonight = planner.bedtimePicks(mine, ids, now);
  final picked = [for (final id in tonight.isNotEmpty ? tonight : planner.morningPicks(mine, ids, now)) ?getItem(id)];
  final steps = lesson.buildNight(items: picked, track: track, pool: allItems(), rng: r);
  return Session(
    label: 'When you lie down',
    kind: 'review',
    steps: steps,
    units: const [],
    group: null,
    courseId: course.id,
    memberId: memberId,
    mode: 'night',
    dayCourse: course.id,
    night: true,
  );
}

/// When you rise: last night's questions (or ones on the edge of being forgotten), recalled in full from the question alone.
Session buildRiseSession({
  required Course course,
  required Track track,
  required MemberProgress mine,
  required String memberId,
  required DateTime now,
  lesson.Rng? rng,
}) {
  final r = rng ?? _random.nextDouble;
  // Last night's questions if "When you lie down" came the evening before; otherwise learned ones on the edge (morningPicks).
  final ids = courseItems(course).map((i) => i.id).toSet();
  final risen = [for (final id in planner.morningPicks(mine, ids, now)) ?getItem(id)];
  final steps = lesson.buildRise(items: risen, track: track, pool: allItems(), rng: r);
  return Session(
    label: 'When you rise',
    kind: 'review',
    steps: steps,
    units: const [],
    group: null,
    courseId: course.id,
    memberId: memberId,
    mode: 'rise',
    dayCourse: course.id,
    rise: true,
  );
}

/// Extra practice, after the day's lessons: what is most likely to slip, across every course you've started.
Session buildExtraSession({
  required String? focus,
  required Track track,
  required MemberProgress mine,
  required String memberId,
  required DateTime now,
  lesson.Rng? rng,
}) {
  final r = rng ?? _random.nextDouble;
  final parts = partMemories(mine.log, mine.partSnap);
  final weak = weakPartsNow(mine.log, parts, now);
  final started = startedCourses(mine, track, focus);
  final allIds = {for (final c in started) ...courseItems(c).map((i) => i.id)};
  final recent = recalledRecently(mine.log, now);
  final picks = riskOrder(mine, allIds, now, parts).where((x) => !waitingForSleep(mine, x.itemId, now) && !recent.contains(x.itemId)).toList();
  final slipping = picks.where((x) => x.recall < 0.85).toList();
  final chosen = (slipping.isNotEmpty ? slipping : picks).take(5);
  final due = [
    for (final p in chosen)
      if (getItem(p.itemId) case final item?)
        () {
          final card = mine.cards[p.itemId];
          final byPart = itemChance(p.itemId, parts, now);
          final chance = card != null ? math.min(recallChance(card, now), byPart ?? 1) : byPart;
          return lesson.Due(item, p.strength, weak: [for (final k in weak) if (k.startsWith('${p.itemId}#')) k], chance: chance);
        }(),
  ];
  final steps = lesson.buildReview(due: due, track: track, pool: allItems(), rng: r, max: 5);
  return Session(
    label: 'Extra practice',
    kind: 'review',
    steps: steps,
    units: const [],
    group: null,
    courseId: '',
    memberId: memberId,
    why: _why(steps, mine, parts, now),
    mode: 'extra',
    dayCourse: focus ?? '',
  );
}
