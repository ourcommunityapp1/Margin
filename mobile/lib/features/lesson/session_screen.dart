// Opens a lesson: the person's next lesson of their course, or (with an item) a practice on that one question or
// verse. The session is built once, from the progress saved when the screen opens (lesson.tsx's session effect).

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_ui/material_ui.dart';

import '../../engine/content.dart';
import '../../engine/dayplan.dart' show withStarted;
import '../../engine/progress.dart';
import '../../state/clock.dart';
import '../../state/household.dart';
import '../../ui/screen_parts.dart';
import '../../ui/widgets.dart';
import '../window/light.dart';
import 'lesson_screen.dart';
import 'session.dart';

class SessionScreen extends ConsumerStatefulWidget {
  const SessionScreen({super.key, this.mode = 'lesson', this.courseId, this.cardId, this.itemIds = const [], this.itemId});

  /// lesson, review, keep, night, rise, extra or item.
  final String mode;

  /// The course for a lesson, review, night or rise; the person's chosen course when null.
  final String? courseId;

  /// The Today card this was opened from, if any.
  final String? cardId;

  /// The verses and answers to keep (mode keep), or the one to practise (mode item).
  final List<String> itemIds;
  final String? itemId;

  @override
  ConsumerState<SessionScreen> createState() => _SessionScreenState();
}

class _SessionScreenState extends ConsumerState<SessionScreen> {
  Session? _session;

  @override
  void initState() {
    super.initState();
    final me = ref.read(meProvider);
    if (me == null) return;
    final now = ref.read(clockProvider)();
    final mine = ref.read(myProgressProvider);
    final plan = ref.read(householdProvider).plan;
    final course = courseFor(widget.courseId ?? plan?.course) ?? courses.first;
    switch (widget.mode) {
      case 'item':
        final item = widget.itemId == null ? null : getItem(widget.itemId!);
        if (item != null) _session = buildItemSession(item: item, dayCourse: course.id, track: me.track, mine: mine, memberId: me.id, now: now);
      case 'keep':
        final items = [for (final id in widget.itemIds) ?getItem(id)];
        _session = buildKeepSession(items: items, track: me.track, mine: mine, memberId: me.id, dayCourse: course.id, now: now, cardId: widget.cardId);
      case 'night':
        _session = buildNightSession(course: course, track: me.track, mine: mine, memberId: me.id, now: now);
      case 'rise':
        _session = buildRiseSession(course: course, track: me.track, mine: mine, memberId: me.id, now: now);
      case 'extra':
        _session = buildExtraSession(focus: plan?.course, track: me.track, mine: mine, memberId: me.id, now: now);
      default:
        _session = buildLessonSession(course: course, track: me.track, mine: mine, memberId: me.id, now: now, mode: widget.mode, cardId: widget.cardId);
    }
    // The window as it is now, so the done screen can show the new light arriving.
    _session = _session?.withBefore(windowLight(courseItems(course), me.track, mine, now));
    // Opening a card from Today is recorded (finished or not), to tell whether the recommendations are used.
    final card = widget.cardId;
    if (card != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ref.read(progressProvider.notifier).update((all) {
          final p = memberProgress(all, me.id);
          if (p.today?.started?.contains(card) ?? false) return all;
          return {...all, me.id: p.copyWith(today: withStarted(p.today, localDay(now), card))};
        });
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = _session;
    final me = ref.watch(meProvider);
    if (session == null || me == null) return const KPage(bare: true, children: [KComingCard('We couldn’t find that one.')]);
    return LessonScreen(session: session, track: me.track);
  }
}
