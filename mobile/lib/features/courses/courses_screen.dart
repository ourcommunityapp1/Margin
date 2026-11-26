// Courses (src/app/heir/courses/page.tsx): "My courses" first (the one you chose, then every course you have begun), then
// the other courses on their shelves. Each is a card with its window (lit as far as you have come), its name, two lines on
// what it is, and how far you have got. The season's course card is not here yet.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../engine/content.dart';
import '../../engine/dayplan.dart' show startedCourses;
import '../../engine/lesson.dart' show unitsFor;
import '../../engine/path.dart';
import '../../engine/progress.dart';
import '../../engine/types.dart';
import '../../state/clock.dart';
import '../../state/household.dart';
import '../window/glass_window.dart';
import '../window/light.dart';
import '../../ui/screen_parts.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';

class CoursesScreen extends ConsumerWidget {
  const CoursesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final k = context.k;
    final track = ref.watch(meProvider)?.track ?? Track.adult;
    final mine = ref.watch(myProgressProvider);
    final now = ref.watch(clockProvider)();
    final focus = ref.watch(householdProvider).plan?.course;
    final mineCourses = startedCourses(mine, track, focus);
    final mineIds = mineCourses.map((c) => c.id).toSet();
    List<Course> onShelf(String id) => courses.where((c) => c.shelf == id && !mineIds.contains(c.id)).toList();
    return KPage(
      children: [
        const KTitle('Courses'),
        if (mineCourses.isNotEmpty) ...[
          Padding(
            padding: const EdgeInsets.fromLTRB(6, 8, 6, 0),
            child: Semantics(header: true, child: const KLabel('My courses')),
          ),
          for (final (i, c) in mineCourses.indexed) _CourseCard(c, k, track, mine, now, ListMotion(index: i, count: mineCourses.length, offset: 0)),
        ],
        for (final (n, (id, title)) in shelves.indexed)
          if (onShelf(id).isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(6, 8, 6, 0),
              child: Semantics(header: true, child: KLabel(title)),
            ),
            for (final (i, c) in onShelf(id).indexed) _CourseCard(c, k, track, mine, now, ListMotion(index: i, count: onShelf(id).length, offset: (n + 1) * 1700)),
          ],
      ],
    );
  }
}

class _CourseCard extends StatelessWidget {
  const _CourseCard(this.course, this.k, this.track, this.mine, this.now, this.motion);
  final Course course;
  final KColors k;
  final Track track;
  final MemberProgress mine;
  final DateTime now;
  final GlassMotion motion;

  @override
  Widget build(BuildContext context) {
    final w = partWindow(course, track, mine, now);
    final items = courseItems(course);
    final stats = courseStats(items, track, mine);
    final started = items.any((i) => unitsFor(i, track).any((u) => mine.units.contains(u.key)));
    final status = stats.learned >= stats.total ? 'Finished' : started ? '${stats.learned} of ${stats.total} learned' : '';
    return Semantics(
      button: true,
      child: Material(
        color: k.card,
        borderRadius: BorderRadius.circular(KSize.cardRadius),
        child: InkWell(
          borderRadius: BorderRadius.circular(KSize.cardRadius),
          onTap: () => context.push('/courses/${course.id}'),
          child: Padding(
            // Less padding than other cards, and no arrow (the whole card is tappable): the words get the room.
            padding: const EdgeInsets.fromLTRB(16, 18, 18, 18),
            child: Row(
              children: [
                MiniWindow(base: w.base, lit: w.lit, dusty: w.dusty, size: 92, started: started, motion: motion, inList: true, label: '${course.title} window'),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      KBalancedText(course.title, style: serif(20, weight: FontWeight.w500, color: k.ink, height: 1.15)),
                      const SizedBox(height: 5),
                      KBalancedText(course.short, style: sans(13.5, color: k.muted, height: 1.4)),
                      if (status.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Text(status, style: sans(13, weight: FontWeight.w600, color: k.ink)),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
