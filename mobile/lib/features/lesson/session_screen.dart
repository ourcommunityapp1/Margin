// Opens a lesson: the person's next lesson of their course, or (with an item) a practice on that one question or
// verse. The session is built once, from the progress saved when the screen opens (lesson.tsx's session effect).

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_ui/material_ui.dart';

import '../../engine/content.dart';
import '../../state/clock.dart';
import '../../state/household.dart';
import '../../ui/screen_parts.dart';
import '../../ui/widgets.dart';
import 'lesson_screen.dart';
import 'session.dart';

class SessionScreen extends ConsumerStatefulWidget {
  const SessionScreen({super.key, this.itemId});

  /// Set for a practice on one question or verse; null for the next lesson of the course.
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
    final item = widget.itemId == null ? null : getItem(widget.itemId!);
    if (widget.itemId != null) {
      if (item != null) _session = buildItemSession(item: item, track: me.track, mine: mine, memberId: me.id, now: now);
      return;
    }
    final course = courseFor(ref.read(householdProvider).plan?.course) ?? courses.first;
    _session = buildLessonSession(course: course, track: me.track, mine: mine, memberId: me.id, now: now);
  }

  @override
  Widget build(BuildContext context) {
    final session = _session;
    final me = ref.watch(meProvider);
    if (session == null || me == null) return const KPage(bare: true, children: [KComingCard('We couldn’t find that one.')]);
    return LessonScreen(session: session, track: me.track);
  }
}
