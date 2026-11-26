// Today (src/app/heir/page.tsx, ui/today.tsx): what should I do now? The day's recommended lessons and reviews, one
// course each, as a carousel; the optional evening or morning recall; then every course you have started, to keep
// going. The plan is made once a day (engine/dayplan.dart). See docs/memory/ADR-002.
//
// The windows on the cards are plain placeholders until the stained glass exists (phase 3).

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../engine/content.dart';
import '../../engine/dayplan.dart';
import '../../engine/keep.dart';
import '../../engine/planner.dart' as planner;
import '../../engine/progress.dart';
import '../../engine/memory.dart' show recalledRecently;
import '../../engine/season.dart' show greeting, timeOfDay;
import '../../state/clock.dart';
import '../../state/household.dart';
import '../../state/keep.dart';
import '../../ui/screen_parts.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';
import '../lesson/labels.dart';
import '../window/light.dart';
import 'keep_going.dart';
import 'today_banners.dart';
import 'today_cards.dart';

const _weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
String _weekday(DateTime d) => _weekdays[d.toLocal().weekday - 1];

Set<String> _ids(Course c) => courseItems(c).map((i) => i.id).toSet();

/// About half a minute a question, at least one minute.
int _recallMinutes(int n) => (n * 0.5).round().clamp(1, 1 << 30);

class TodayScreen extends ConsumerStatefulWidget {
  const TodayScreen({super.key});

  @override
  ConsumerState<TodayScreen> createState() => _TodayScreenState();
}

class _TodayScreenState extends ConsumerState<TodayScreen> {
  /// Makes the day's plan once, the first time Today opens on a new day; adds a fix found later in the day at the end.
  void _ensurePlan() {
    final me = ref.read(meProvider);
    if (me == null) return;
    final now = ref.read(clockProvider)();
    final h = ref.read(householdProvider);
    final mine = ref.read(myProgressProvider);
    final keep = ref.read(keepProvider);
    final focus = h.plan?.course;
    final goal = h.plan?.minutes ?? 15;
    final day = localDay(now);
    final started = startedCourses(mine, me.track, focus);
    final fixIds = [for (final x in keep?.tryAgain ?? const <Held>[]) x.item.id];
    final today = mine.today;
    final planned = today?.day == day && today?.cards != null;
    final cards = planned ? null : planDay(p: mine, track: me.track, started: started, focus: focus, goal: goal, now: now, fix: fixIds);
    final lateFixes = planned
        ? planDay(p: mine, track: me.track, started: started, focus: null, goal: 0, now: now, fix: fixIds)
            .where((c) => c.kind == 'fix' && !today!.cards!.any((x) => x.course == c.course && x.kind != 'lesson'))
            .toList()
        : <DayCard>[];
    if (planned && lateFixes.isEmpty) return;
    ref.read(progressProvider.notifier).update((all) {
      final p = memberProgress(all, me.id);
      if (p.today?.day == day && p.today?.cards != null && lateFixes.isEmpty) return all;
      final next = cards != null ? withPlan(p.today, day, cards) : lateFixes.fold(p.today!, withFix);
      return {...all, me.id: p.copyWith(today: next)};
    });
  }

  @override
  Widget build(BuildContext context) {
    final me = ref.watch(meProvider);
    final h = ref.watch(householdProvider);
    final mine = ref.watch(myProgressProvider);
    final keep = ref.watch(keepProvider);
    final now = ref.watch(clockProvider)();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _ensurePlan();
    });
    final k = context.k;
    if (me == null) return const KPage(children: []);

    final focus = h.plan?.course;
    final track = me.track;
    final day = localDay(now);
    final started = startedCourses(mine, track, focus);
    final today = mine.today;
    final sameDay = today?.day == day;

    bool satisfied(DayCard c) {
      final course = courseFor(c.course);
      if (course == null) return true;
      if (c.kind == 'fix') return !(keep?.tryAgain.any((x) => _ids(course).contains(x.item.id)) ?? false);
      if (c.kind == 'review') {
        return dueCards(mine, now, _ids(course)).isEmpty && (today?.sessions ?? const []).any((s) => s.course == c.course);
      }
      return false;
    }

    final states = sameDay ? cardStates(today, satisfied) : <CardState>[];
    final left = states.where((s) => !s.done).toList();
    final allDone = states.isNotEmpty && left.isEmpty;
    final minutes = minutesToday(sameDay ? today : null);
    final focusCourse = courseFor(focus) ?? started.firstOrNull;

    Slide? cardSlide(CardState s) {
      final course = courseFor(s.card.course);
      if (course == null) return null;
      final fixItems = s.card.kind == 'fix' ? [for (final x in keep?.tryAgain ?? const <Held>[]) if (_ids(course).contains(x.item.id)) x.item.id] : <String>[];
      final card = Uri.encodeQueryComponent(s.card.id);
      final href = s.card.kind == 'fix' && fixItems.isNotEmpty
          ? '/lesson?mode=keep&items=${fixItems.join(',')}&course=${course.id}&card=$card'
          : '/lesson?mode=${s.card.kind == 'lesson' ? 'lesson' : 'review'}&course=${course.id}&card=$card';
      final lessonNo = (mine.courseLessons[course.id] ?? 0) + 1;
      final lockIn = s.card.kind == 'lesson' && nextLine(mine, track, course, now).text == 'Lock-in next';
      return CardSlide(
        state: s,
        course: course,
        window: windowFor(course, s.card.kind, track, mine, now),
        href: href,
        tag: s.card.kind == 'fix' ? 'Fix today' : 'Recommended',
        button: s.card.kind != 'lesson' ? 'Start review' : lockIn ? 'Lock it in' : lessonNo == 1 ? 'Begin' : 'Start lesson $lessonNo',
      );
    }

    // "When you rise" in the morning and "When you lie down" in the evening: optional, never part of the day's cards.
    final focusIds = focusCourse == null ? <String>{} : _ids(focusCourse);
    final rise = focusCourse == null ? null : planner.riseOffer(mine, now);
    final night = focusCourse != null && rise == null ? planner.nightOffer(mine, focusIds, now) : null;
    final LiveOffer? live = rise != null
        ? LiveOffer(key: 'rise', when: localDay(now), mode: 'rise', title: 'When you rise', line: 'Recall last night’s · ${_recallMinutes(rise.length)} min')
        : night != null
            ? LiveOffer(
                key: 'night',
                when: localDay(now.subtract(const Duration(hours: 3))),
                mode: 'night',
                title: 'When you lie down',
                line: 'A quiet recall · ${_recallMinutes(night.length)} min',
              )
            : null;

    final slides = <Slide>[
      for (final s in left) ?cardSlide(s),
    ];
    if (allDone) {
      final allIds = {for (final c in started) ..._ids(c)};
      final recent = recalledRecently(mine.log, now);
      final extra = planner.riskOrder(mine, allIds, now).any((x) => x.recall < 0.85 && !waitingForSleep(mine, x.itemId, now) && !recent.contains(x.itemId));
      // The window shown is the course you spent longest on today, lit only as far as you have learned. Never a finished
      // window that has not been earned.
      final most = [...states]..sort((a, b) => b.secs.compareTo(a.secs));
      final course = courseFor(most.firstOrNull?.card.course) ?? focusCourse;
      if (course != null) slides.add(DoneSlide(minutes: minutes, course: course, window: partWindow(course, track, mine, now), extra: extra));
    }
    for (final s in states.where((x) => x.done)) {
      final sl = cardSlide(s);
      if (sl != null) slides.add(sl);
    }
    // Sessions that finished no card (a review started from Keep going, extra practice, the evening or morning recall)
    // show as their own done card, so the day's minutes add up to what the cards show.
    String extraTag(String kind) => switch (kind) { 'night' => 'When you lie down', 'rise' => 'This morning', 'lesson' => 'Lesson', 'fix' => 'Fix', 'review' => 'Review', _ => 'Extra' };
    if (sameDay) {
      for (final x in extraSessions(today)) {
        final course = courseFor(x.course);
        if (course != null) slides.add(ExtraSlide(session: x, course: course, window: windowFor(course, 'extra', track, mine, now), tag: extraTag(x.kind)));
      }
    }

    // Warnings: words about to leave your count, or already gone. One line, at most.
    final soon = [
      for (final x in keep?.review ?? const <Held>[])
        if (x.state is DueForReview && (x.state as DueForReview).deadline.difference(now) < const Duration(days: 4)) x,
    ];
    DateTime deadline(Held x) => (x.state as DueForReview).deadline;
    final String? warning = keep != null && keep.wordsOut > 0
        ? '${_thousands(keep.wordsOut)} words have left your count. Review to bring them back.'
        : soon.length == 1
            ? 'Review ${itemLabel(soon.first.item)} by ${_weekday(deadline(soon.first))} to keep it in your count.'
            : soon.length > 1
                ? '${soon.length} need a review by ${_weekday(deadline(soon.first))} to stay in your count.'
                : null;

    final hello = greeting(timeOfDay(now));
    return KPage(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(4, 12, 4, 0),
          child: Row(
            children: [
              Expanded(
                child: Semantics(header: true, child: Text('$hello, ${me.firstName}', style: serif(26, weight: FontWeight.w500, color: k.ink, height: 1.15))),
              ),
              KInitial(me.initial, label: 'You: ${me.name}, settings and family', onTap: () => context.push('/you')),
            ],
          ),
        ),
        if (allDone)
          live != null ? LiveBanner(offer: live, doneMinutes: minutes) : DoneBanner(minutes: minutes)
        else if (states.isNotEmpty)
          DayLine(done: states.length - left.length, total: states.length, minutesLeft: left.fold<num>(0, (n, s) => n + s.card.est).round()),
        if (live != null && !allDone) LiveBanner(offer: live, doneMinutes: null),
        if (warning != null) KeepWarning(warning),
        if (slides.isNotEmpty)
          TodayCarousel(slides: slides)
        else if (focusCourse != null)
          // The plan is made a moment after Today opens; until then (or if there is nothing to plan) this one card
          // opens the next lesson.
          _NextLesson(course: focusCourse, minutes: h.plan?.minutes ?? 15),
        if (started.length > 1) KeepGoing(started: started, track: track, mine: mine, now: now),
      ],
    );
  }

  static String _thousands(int n) => n.toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => ',');
}

/// The person's course and what its next lesson is.
class _NextLesson extends ConsumerWidget {
  const _NextLesson({required this.course, required this.minutes});
  final Course course;
  final int minutes;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final k = context.k;
    final me = ref.watch(meProvider);
    final mine = ref.watch(myProgressProvider);
    final now = ref.watch(clockProvider)();
    final items = courseItems(course);
    final plan = me == null ? null : planner.planNext(courseId: course.id, items: items, track: me.track, p: mine, now: now);
    final done = planner.lessonsDone(mine, course.id, items.map((i) => i.id).toSet());
    return KCard.column(
      gap: 10,
      children: [
        const KLabel('Your course'),
        Text(course.title, style: serif(22, weight: FontWeight.w500, color: k.ink, height: 1.15)),
        Text('$minutes minutes a day', style: sans(15, color: k.muted)),
        if (plan != null) Text(planner.describe(plan, groupLabel), style: sans(15, color: k.ink, height: 1.5)),
        KButton(done == 0 ? 'Start the first lesson' : plan == null ? 'Nothing to do yet' : 'Start lesson', onPressed: plan == null ? null : () => context.push('/lesson')),
      ],
    );
  }
}
