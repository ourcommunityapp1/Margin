// Today (src/app/heir/page.tsx, ui/today.tsx, heir.css .hr-b4-*): one big thing at a time. The big card follows the time of
// day: "When you rise" in the morning, the next lesson or review by day, "When you lie down" from 7 pm, otherwise "Done for
// today". The rest of the day is quiet rows (not tappable): what's up next, then what follows, then "This evening", then Done.
// The plan is made once a day (engine/dayplan.dart). See docs/memory/ADR-002.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../data/household.dart' show dailyCourse;
import '../../data/photos.dart';
import '../../engine/content.dart';
import '../../engine/dayplan.dart';
import '../../engine/keep.dart';
import '../../engine/planner.dart' as planner;
import '../../engine/progress.dart';
import '../../engine/memory.dart' show recalledRecently;
import '../../engine/season.dart' show greeting, timeOfDay;
import '../../engine/types.dart';
import '../../state/clock.dart';
import '../../state/household.dart';
import '../../state/keep.dart';
import '../../ui/screen_parts.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';
import '../window/appear_window.dart';
import '../window/glass_window.dart';
import '../window/light.dart';
import 'photo_circle.dart';
import '../../platform/haptics.dart';
import 'today_banners.dart' show KeepWarning;

const _weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
String _weekday(DateTime d) => _weekdays[d.toLocal().weekday - 1];

Set<String> _ids(Course c) => courseItems(c).map((i) => i.id).toSet();

/// About half a minute a question, at least one minute.
int _recallMinutes(int n) => (n * 0.5).round().clamp(1, 1 << 30);
String _mins(num n) => '${n.round().clamp(1, 1 << 30)} min';

// Today's own colours (heir.css .hr-b4-*).
const _ink = Color(0xFFF4EFE6);
const _grey = Color(0xFFC9C1B3);
const _peach = Color(0xFFF3D8B6);
const _paleBlue = Color(0xFFC9D7F6);
const _evening = Color(0xFFA9BDE8);
const _dark = Color(0xFF15181B);

/// The background of the whole screen: dawn in the morning, night blue in the evening, plain dark by day.
enum Mood { dawn, day, night }

const _sky = {
  Mood.day: [Color(0xFF11161C), Color(0xFF11161C), Color(0xFF11161C)],
  Mood.dawn: [Color(0xFF3A2A26), Color(0xFF1D1D24), Color(0xFF11161C)],
  Mood.night: [Color(0xFF141D38), Color(0xFF0D1224), Color(0xFF0A0E1B)],
};
const _skyStops = {
  Mood.day: [0.0, 0.5, 1.0],
  Mood.dawn: [0.0, 0.45, 1.0],
  Mood.night: [0.0, 0.6, 1.0],
};

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
    final focus = dailyCourse(h.plan);
    final goal = h.plan?.minutes ?? planner.defaultGoal;
    final day = localDay(now);
    final started = startedCourses(mine, me.track, focus, h.plan?.removed ?? const [], h.plan?.verses ?? const []);
    final fixIds = [for (final x in keep?.tryAgain ?? const <Held>[]) x.item.id];
    final today = mine.today;
    final planned = today?.day == day && today?.cards != null;
    final cards = planned ? null : planDay(p: mine, track: me.track, started: started, focus: focus, goal: goal, now: now, fix: fixIds, verses: h.plan?.verses ?? const []);
    final lateFixes = planned
        ? planDay(
            p: mine,
            track: me.track,
            started: started,
            focus: null,
            goal: 0,
            now: now,
            fix: fixIds,
          ).where((c) => c.kind == 'fix' && !today!.cards!.any((x) => x.course == c.course && x.kind != 'lesson')).toList()
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

    final focus = dailyCourse(h.plan);
    final track = me.track;
    final day = localDay(now);
    final started = startedCourses(mine, track, focus, h.plan?.removed ?? const [], h.plan?.verses ?? const []);
    final today = mine.today;
    final sameDay = today?.day == day;
    final sessions = sameDay ? today!.sessions : const <DaySession>[];

    bool satisfied(DayCard c) {
      final course = courseFor(c.course);
      if (course == null) return true;
      if (c.kind == 'fix') return !(keep?.tryAgain.any((x) => _ids(course).contains(x.item.id)) ?? false);
      if (c.kind == 'review') return dueCards(mine, now, _ids(course)).isEmpty && sessions.any((s) => s.course == c.course);
      return false;
    }

    final states = sameDay ? cardStates(today, satisfied) : <CardState>[];
    final allDone = states.isNotEmpty && states.every((s) => s.done);
    final minutes = minutesToday(sameDay ? today : null);
    final focusCourse = courseFor(focus) ?? started.firstOrNull;

    // "When you rise" and "When you lie down" are on Today every day from 5 am (once something is learned): the morning
    // recall until it's done or the evening comes, and the evening one shown all day, startable from 7 pm.
    final focusIds = focusCourse == null ? <String>{} : _ids(focusCourse);
    final hour = now.toLocal().hour;
    bool doneToday(String kind) => sessions.any((x) => x.kind == kind);
    final riseItems = focusCourse != null && hour >= planner.morningFrom && hour < planner.eveningFrom && !doneToday('rise')
        ? planner.morningPicks(mine, focusIds, now)
        : const <String>[];
    final rise = riseItems.isNotEmpty ? riseItems : null;
    final nightOpen = hour >= planner.eveningFrom || hour < 3;
    String eveningOf(DateTime d) => localDay(d.subtract(const Duration(hours: 3)));
    final nightDone = mine.night != null && eveningOf(DateTime.parse(mine.night!.at)) == eveningOf(now);
    List<String>? nightFallback() {
      final m = planner.morningPicks(mine, focusIds, now);
      return m.isNotEmpty ? m : null;
    }

    List<String>? night;
    if (focusCourse != null) {
      if (nightOpen) {
        night = nightDone ? null : planner.nightOffer(mine, focusIds, now) ?? nightFallback();
      } else if (hour >= planner.morningFrom && !doneToday('night')) {
        final preview = planner.bedtimePicks(mine, focusIds, now);
        night = preview.isNotEmpty ? preview : nightFallback();
      }
    }

    // The day's cards: what is left, then what is done.
    final todo = [
      for (final s in states)
        if (!s.done) ?_card(s, mine, keep, track, now),
    ];
    final finished = [
      for (final s in states)
        if (s.done) ?_card(s, mine, keep, track, now),
    ];

    var extraOffer = false;
    final most = [...states]..sort((a, b) => b.secs.compareTo(a.secs));
    final doneCourse = courseFor(most.firstOrNull?.card.course) ?? focusCourse;
    if (allDone) {
      final allIds = {for (final c in started) ..._ids(c)};
      final recent = recalledRecently(mine.log, now);
      extraOffer = planner.riskOrder(mine, allIds, now).any((x) => x.recall < 0.85 && !waitingForSleep(mine, x.itemId, now) && !recent.contains(x.itemId));
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

    // The big card follows the time of day.
    // "When you rise" comes first whenever it isn't done yet (until the evening takes over at 7 pm): the screen is in time order.
    final riseFirst = rise != null;
    final hero = riseFirst
        ? _Hero.rise
        : todo.isNotEmpty
        ? _Hero.card
        : rise != null
        ? _Hero.rise
        : night != null && nightOpen
        ? _Hero.night
        : _Hero.done;
    final first = hero == _Hero.card ? todo.first : null;
    final later = first != null ? todo.sublist(1) : todo;
    final dawn = photoFor(dawnPhotos, day), dusk = photoFor(duskPhotos, day, 7);
    final mood = hero == _Hero.rise
        ? Mood.dawn
        : hero == _Hero.night
        ? Mood.night
        : Mood.day;

    // The rows after the big card, in order: what's next, then what follows, then the evening.
    final upcoming = <_Row>[];
    for (final (i, c) in later.indexed) {
      final r = refList(c.items);
      upcoming.add(
        _Row(
          label: i == 0 ? 'Up next' : 'Then',
          left: AppearWindow(
            mini: true,
            base: c.window.base,
            lit: c.window.lit,
            dusty: c.window.dusty,
            share: c.window.share,
            size: 48,
            started: c.window.share > 0,
            label: '${c.course.title} window',
          ),
          title: r.isEmpty ? c.course.title : '${c.course.title} · $r',
          right: '${_effort(c).full ? '✎ ' : ''}${_mins(c.state.card.est)}',
        ),
      );
    }
    if (rise != null && hero != _Hero.rise) {
      upcoming.add(
        _Row(
          label: upcoming.isEmpty ? 'Up next' : 'Then',
          left: PhotoThumb(photo: dawn),
          title: 'When you rise · ${refList(_items(rise))}',
          right: _mins(_recallMinutes(rise.length)),
        ),
      );
    }
    if (night != null && hero != _Hero.night) {
      upcoming.add(
        _Row(
          label: 'This evening',
          evening: true,
          left: PhotoThumb(photo: dusk),
          title: 'When you lie down · ${refList(_items(night))}',
          right: nightOpen ? _mins(_recallMinutes(night.length)) : 'opens ${planner.eveningFrom - 12} pm',
        ),
      );
    }

    // Finished today, at the bottom: small and dim, with a tick where the minutes were.
    final doneRows = <_Row>[];
    for (final c in finished) {
      final at = sessions.where((y) => y.card == c.state.card.id).firstOrNull;
      final r = refList(at == null ? const [] : sessionItems(mine, at, c.course));
      final word = c.state.card.kind == 'fix'
          ? 'fix '
          : c.state.card.kind == 'review'
          ? 'review '
          : '';
      final w = windowFor(c.course, c.state.card.kind, track, mine, now);
      doneRows.add(
        _Row(
          left: AppearWindow(mini: true, base: w.base, lit: w.lit, dusty: w.dusty, share: w.share, size: 36, started: w.share > 0, label: '${c.course.title} window'),
          title: '${c.course.title}${r.isEmpty ? '' : ' · $word$r'}',
        ),
      );
    }
    if (sameDay) {
      for (final x in extraSessions(today)) {
        final course = courseFor(x.course);
        if (course == null) continue;
        final r = refList(sessionItems(mine, x, course));
        if (x.kind == 'night' || x.kind == 'rise') {
          doneRows.add(
            _Row(
              left: PhotoThumb(photo: x.kind == 'night' ? dusk : dawn, small: true),
              title: '${x.kind == 'night' ? 'When you lie down' : 'When you rise'}${r.isEmpty ? '' : ' · $r'}',
            ),
          );
          continue;
        }
        final w = windowFor(course, 'extra', track, mine, now);
        final word = x.kind == 'fix'
            ? 'fix '
            : x.kind == 'lesson'
            ? ''
            : 'review ';
        doneRows.add(
          _Row(
            left: AppearWindow(mini: true, base: w.base, lit: w.lit, dusty: w.dusty, share: w.share, size: 36, started: w.share > 0, label: '${course.title} window'),
            title: '${course.title}${r.isEmpty ? '' : ' · $word$r'}',
          ),
        );
      }
    }

    final Widget big = switch (hero) {
      _Hero.rise => _HeroBlock(
        art: PhotoCircle(photo: dawn, night: false),
        title: 'When you rise',
        line: heroRefs(_items(rise!), named: true),
        effort: (full: false, label: 'Light'),
        button: 'Start',
        minutes: _mins(_recallMinutes(rise.length)),
        onStart: () => context.push('/lesson?mode=rise'),
      ),
      _Hero.night => _HeroBlock(
        art: PhotoCircle(photo: dusk, night: true),
        title: 'When you lie down',
        line: heroRefs(_items(night!), named: true),
        effort: (full: false, label: 'Light'),
        button: 'Start',
        minutes: _mins(_recallMinutes(night.length)),
        night: true,
        onStart: () => context.push('/lesson?mode=night'),
      ),
      _Hero.card => _HeroBlock(
        art: AppearWindow(
          key: ValueKey('hero-${first!.window.base}'),
          base: first.window.base,
          lit: first.window.lit,
          dusty: first.window.dusty,
          share: first.window.share,
          started: first.window.share > 0,
          size: 190,
            feel: true,
          beam: const CircleMotion(),
          label: '${first.course.title} window',
        ),
        title: first.course.title,
        line: heroRefs(first.items, reviewOf: first.state.card.kind != 'lesson' ? first.course.title : null),
        effort: _effort(first),
        button: first.button,
        minutes: _mins(first.state.card.est),
        onStart: () => context.push(first.href),
      ),
      _Hero.done => () {
        final w = doneCourse == null ? null : partWindow(doneCourse, track, mine, now);
        return _HeroBlock(
          // The course you spent longest on today, lit only as far as you've learned.
          art: w == null
              ? null
              : AppearWindow(
                  key: ValueKey('done-${w.base}'),
                  base: w.base,
                  lit: w.lit,
                  dusty: w.dusty,
                  share: w.share,
                  started: w.share > 0,
                  size: 190,
            feel: true,
                  beam: const CircleMotion(),
                  label: '${doneCourse!.title} window',
                ),
          // The evening recall is still to come: not "done for today" yet.
          title: states.isEmpty ? 'Today' : night != null ? 'Done for now' : 'Done for today',
          line: states.isEmpty
              ? ''
              : '$minutes minute${minutes == 1 ? '' : 's'}'
                    '${night == null ? '' : nightOpen ? ' · one light recall tonight' : ' · one light recall tonight, from ${planner.eveningFrom - 12} pm'}',
          button: extraOffer ? 'Extra practice' : null,
          onStart: extraOffer ? () => context.push('/lesson?mode=extra') : null,
        );
      }(),
    };

    // "Done for today": felt once, the first time Today shows it that day.
    if (hero == _Hero.done && states.isNotEmpty) {
      final store = ref.read(storeProvider);
      if (store.read('hr-done-felt') != day) {
        store.write('hr-done-felt', day);
        WidgetsBinding.instance.addPostFrameCallback((_) => Haptics.doneForToday());
      }
    }

    final hello = greeting(timeOfDay(now));
    final emptyPlan = h.plan != null && (h.plan!.verses.isEmpty) && started.isEmpty;
    return Stack(
      children: [
        Positioned.fill(
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: _sky[mood]!, stops: _skyStops[mood]),
            ),
          ),
        ),
        KPage(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(4, 12, 4, 0),
              child: Row(
                children: [
                  Expanded(
                    child: Semantics(
                      header: true,
                      child: Text(
                        '$hello, ${me.firstName}',
                        style: serif(26, weight: FontWeight.w500, color: k.ink, height: 1.15),
                      ),
                    ),
                  ),
                  KInitial(me.initial, label: 'You: ${me.name}, settings and family', onTap: () => context.push('/you')),
                ],
              ),
            ),
            if (warning != null) KeepWarning(warning),
            // Everything taken out of the plan: nothing for Today to fill (progress in removed courses is kept).
            if (emptyPlan)
              KCard.column(
                gap: 12,
                children: [
                  Semantics(header: true, child: Text('Your plan is empty', textAlign: TextAlign.center, style: serif(24, weight: FontWeight.w500, color: k.ink))),
                  Text(
                    'Add a course and Today will fill with its lessons and reviews. Your progress in the courses you removed is kept.',
                    textAlign: TextAlign.center,
                    style: sans(15, color: k.muted, height: 1.5),
                  ),
                  KButton('Add a course', onPressed: () => context.go('/courses')),
                ],
              )
            else
              Semantics(container: true, label: 'Now', child: big),
            if (!emptyPlan && (upcoming.isNotEmpty || doneRows.isNotEmpty))
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  for (final (i, u) in upcoming.indexed) _RowView(row: u, line: i < upcoming.length - 1),
                  if (doneRows.isNotEmpty) const _Divider('Done'),
                  for (final (i, d) in doneRows.indexed) _RowView(row: d, line: i < doneRows.length - 1, done: true),
                ],
              ),
          ],
        ),
      ],
    );
  }

  static List<Item> _items(List<String> ids) => [for (final id in ids) ?getItem(id)];

  static String _thousands(int n) => n.toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => ',');
}

enum _Hero { rise, card, night, done }

/// How hard a card is, said before it starts (ADR-003): reviews are light; a lesson ends with one full answer; a fix is
/// typed whole.
({bool full, String label}) _effort(_Card c) => c.state.card.kind == 'review'
    ? (full: false, label: 'Light')
    : c.state.card.kind == 'fix'
    ? (full: true, label: '✎ Type it from memory')
    : c.button == 'Lock it in'
    ? (full: true, label: '✎ Lock it in: each from memory')
    : (full: true, label: 'Ends with one full answer');

/// One of the day's cards: its course, window, where it starts, its button and what it covers.
class _Card {
  const _Card({required this.state, required this.course, required this.window, required this.href, required this.button, required this.items});
  final CardState state;
  final Course course;
  final PartWindow window;
  final String href, button;
  final List<Item> items;
}

_Card? _card(CardState s, MemberProgress mine, KeepSummary? keep, Track track, DateTime now) {
  final course = courseFor(s.card.course);
  if (course == null) return null;
  final ids = _ids(course);
  final fixHeld = [
    for (final x in keep?.tryAgain ?? const <Held>[])
      if (ids.contains(x.item.id)) x.item,
  ];
  final card = Uri.encodeQueryComponent(s.card.id);
  final href = s.card.kind == 'fix' && fixHeld.isNotEmpty
      ? '/lesson?mode=keep&items=${fixHeld.map((i) => i.id).join(',')}&course=${course.id}&card=$card'
      : s.card.item != null
      ? '/lesson?mode=learn&item=${Uri.encodeQueryComponent(s.card.item!)}&course=${course.id}&card=$card'
      : '/lesson?mode=${s.card.kind == 'lesson' ? 'lesson' : 'review'}&course=${course.id}&card=$card';
  final lessonNo = (mine.courseLessons[course.id] ?? 0) + 1;
  final lockIn = s.card.kind == 'lesson' && s.card.item == null && nextLine(mine, track, course, now).text == 'Lock-in next';
  final button = s.card.kind != 'lesson'
      ? 'Start review'
      : s.card.item != null
      ? 'Learn it'
      : lockIn
      ? 'Lock it in'
      : lessonNo == 1
      ? 'Begin'
      : 'Start lesson $lessonNo';
  final items = switch (s.card.kind) {
    'lesson' => s.card.item != null ? [?getItem(s.card.item!)] : lessonItems(course, mine, track, now),
    'fix' => fixHeld,
    _ => [for (final d in dueCards(mine, now, ids)) ?getItem(d.itemId)],
  };
  return _Card(state: s, course: course, window: windowFor(course, s.card.kind, track, mine, now), href: href, button: button, items: items);
}

/// What the next lesson will teach (or lock in, or practise), as items.
List<Item> lessonItems(Course course, MemberProgress p, Track track, DateTime now) {
  final plan = planner.planNext(courseId: course.id, items: courseItems(course), track: track, p: p, now: now);
  if (plan == null) return const [];
  if (plan.kind == 'learn' || plan.kind == 'welcome') return [for (final u in plan.units) ?getItem(u.itemId)];
  if (plan.kind == 'checkpoint') return plan.group?.items ?? const [];
  return [for (final x in plan.picks) ?getItem(x.itemId)];
}

/// The questions or verses answered in a finished session: the answers logged in its time, from its course.
List<Item> sessionItems(MemberProgress p, DaySession s, Course course) {
  final end = DateTime.parse(s.at).millisecondsSinceEpoch;
  final start = end - (s.secs * 1000).round() - 120000;
  final mine = _ids(course);
  final out = <Item>[];
  for (final e in p.log) {
    final t = DateTime.parse(e.at).millisecondsSinceEpoch;
    if (t < start || t > end + 10000) continue;
    if (s.kind != 'night' && s.kind != 'rise' && !mine.contains(e.itemId)) continue;
    final i = getItem(e.itemId);
    if (i != null) out.add(i);
  }
  return out;
}

String shortLabel(Item i) => isVerse(i)
    ? i.prompt
    : getCollection(i.collection)?.unit == 'Question'
    ? 'Q${i.number}'
    : 'Part ${i.number}';

/// The references, short: "Q4, Q9", "Luke 2:11", "Q1, Q2, Q3 +2". In course order.
String refList(List<Item> items) {
  final seen = <String>{};
  final list = [
    for (final i in items)
      if (seen.add(i.id)) i,
  ];
  // A stable sort by number within a collection, as the website's (it compares only items of the same collection).
  final sorted = [...list];
  for (var a = 1; a < sorted.length; a++) {
    final x = sorted[a];
    var b = a - 1;
    while (b >= 0 && sorted[b].collection == x.collection && sorted[b].number > x.number) {
      sorted[b + 1] = sorted[b];
      b--;
    }
    sorted[b + 1] = x;
  }
  final shown = sorted.take(3).map(shortLabel).join(', ');
  return sorted.length > 3 ? '$shown +${sorted.length - 3}' : shown;
}

/// What the big card is about, in words: "Questions 1–4", "Questions 1, 2 and 4", "Luke 2:11". Several verses on a review
/// shorten to "Christmas review". With no course title above (the morning and evening recalls), it says whose questions.
String heroRefs(List<Item> items, {String? reviewOf, bool named = false}) {
  final seen = <String>{};
  final list = [
    for (final i in items)
      if (seen.add(i.id)) i,
  ];
  if (list.isEmpty) return '';
  final verses = list.where(isVerse).toList();
  final numbered = list.where((i) => !isVerse(i)).toList();
  final out = <String>[];
  if (verses.isNotEmpty) {
    out.add(
      verses.length > 1 && reviewOf != null
          ? '$reviewOf review'
          : verses.take(3).map((v) => v.prompt).join(', ') + (verses.length > 3 ? ' +${verses.length - 3}' : ''),
    );
  }
  if (numbered.isNotEmpty) {
    final collection = getCollection(numbered.first.collection);
    final unit = collection?.unit == 'Question' ? 'Question' : 'Part';
    final nums = numbered.map((i) => i.number).toSet().toList()..sort();
    final parts = <String>[];
    for (var i = 0; i < nums.length;) {
      var j = i;
      while (j + 1 < nums.length && nums[j + 1] == nums[j] + 1) {
        j++;
      }
      if (j - i >= 2) {
        parts.add('${nums[i]}–${nums[j]}');
      } else {
        for (var k = i; k <= j; k++) {
          parts.add('${nums[k]}');
        }
      }
      i = j + 1;
    }
    final joined = parts.length > 1 ? '${parts.sublist(0, parts.length - 1).join(', ')} and ${parts.last}' : parts.first;
    final word = '$unit${nums.length > 1 ? 's' : ''}';
    out.add(named ? '${collection?.title ?? ''} ${word.toLowerCase()} $joined'.trim() : '$word $joined');
  }
  return out.join(' · ');
}

/// The big card: a window or photo, the serif title, one grey line, and the pill button.
class _HeroBlock extends StatelessWidget {
  const _HeroBlock({required this.art, required this.title, required this.line, required this.button, this.effort, this.minutes, this.night = false, this.onStart});
  final Widget? art;
  final String title, line;

  /// How hard it is, said before it starts (ADR-003): "Light", or a full answer marked with ✎.
  final ({bool full, String label})? effort;
  final String? button, minutes;
  final bool night;
  final VoidCallback? onStart;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 6, bottom: 4),
    child: Column(
      children: [
        ?art,
        if (art != null) const SizedBox(height: 10),
        Semantics(
          header: true,
          child: Text(
            title,
            textAlign: TextAlign.center,
            style: serif(23, weight: FontWeight.w500, color: _ink, height: 1.15),
          ),
        ),
        if (line.isNotEmpty) ...[
          const SizedBox(height: 10),
          Text(
            line,
            textAlign: TextAlign.center,
            style: sans(13, color: _grey),
          ),
        ],
        if (effort case final e?) ...[
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: e.full ? const Color(0x29F3D8B6) : const Color(0x14FFFFFF),
              borderRadius: BorderRadius.circular(99),
            ),
            child: Text(e.label, style: sans(12, weight: FontWeight.w600, color: e.full ? _peach : _grey)),
          ),
        ],
        if (button != null && onStart != null) ...[
          const SizedBox(height: 14),
          Semantics(
            button: true,
            label: minutes == null ? button : '$button, $minutes',
            excludeSemantics: true,
            child: Material(
              color: night ? _paleBlue : _peach,
              borderRadius: BorderRadius.circular(999),
              child: InkWell(
                borderRadius: BorderRadius.circular(999),
                onTap: onStart,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 12),
                  child: Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(text: button),
                        if (minutes != null)
                          TextSpan(
                            text: ' · $minutes',
                            style: sans(15, weight: FontWeight.w600, color: _dark.withValues(alpha: 0.6)),
                          ),
                      ],
                    ),
                    style: sans(15, weight: FontWeight.w700, color: _dark),
                  ),
                ),
              ),
            ),
          ),
        ],
      ],
    ),
  );
}

class _Row {
  const _Row({this.label, this.evening = false, required this.left, required this.title, this.right});
  final String? label;
  final bool evening;
  final Widget left;
  final String title;
  final String? right;
}

/// One quiet row (not tappable): window or photo, a small-caps label over "Course · references", minutes on the right.
class _RowView extends StatelessWidget {
  const _RowView({required this.row, required this.line, this.done = false});
  final _Row row;
  final bool line, done;

  @override
  Widget build(BuildContext context) {
    final r = row;
    return Opacity(
      opacity: done ? 0.45 : 1,
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 4, vertical: done ? 8 : 12),
        decoration: BoxDecoration(
          border: line ? const Border(bottom: BorderSide(color: Color(0x12FFFFFF))) : null,
        ),
        child: Row(
          children: [
            r.left,
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (r.label != null)
                    Text(
                      r.label!.toUpperCase(),
                      style: sans(10.5, weight: FontWeight.w700, color: r.evening ? _evening : _grey).copyWith(letterSpacing: 1.26),
                    ),
                  if (r.label != null) const SizedBox(height: 2),
                  Text(
                    r.title,
                    style: sans(done ? 14 : 15.5, weight: done ? FontWeight.w500 : FontWeight.w600, color: _ink, height: 1.25),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 14),
            if (done)
              Semantics(
                label: 'Done',
                child: Container(
                  width: 22,
                  height: 22,
                  decoration: const BoxDecoration(color: _peach, shape: BoxShape.circle),
                  child: const Center(child: KIcon('<path d="M5 12l5 5 9-10"/>', size: 14, color: _dark, strokeWidth: 3.2)),
                ),
              )
            else if (r.right != null)
              Text(
                r.right!,
                style: sans(13, weight: FontWeight.w600, color: _grey),
              ),
          ],
        ),
      ),
    );
  }
}

/// "DONE" (grey) or "THIS EVENING" (blue) with a thin line after it.
class _Divider extends StatelessWidget {
  const _Divider(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(4, 18, 4, 2),
    child: Row(
      children: [
        Text(
          text.toUpperCase(),
          style: sans(11, weight: FontWeight.w700, color: _grey).copyWith(letterSpacing: 1.32),
        ),
        const SizedBox(width: 8),
        const Expanded(
          child: SizedBox(height: 1, child: ColoredBox(color: Color(0x40C9C1B3))),
        ),
      ],
    ),
  );
}
