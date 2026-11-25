// Courses (src/app/heir/courses/page.tsx): every course on its shelf, as a card with its window (lit as far as you have
// come), its name, two lines on what it is, and how far you have got. The season's course and "Continue" card are not
// here yet.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../engine/content.dart';
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
    return KPage(
      children: [
        const KTitle('Courses'),
        for (final (id, title) in shelves)
          if (courses.any((c) => c.shelf == id)) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(6, 8, 6, 0),
              child: Semantics(header: true, child: KLabel(title)),
            ),
            for (final c in courses.where((c) => c.shelf == id)) _CourseCard(c, k, track, mine, now),
          ],
      ],
    );
  }
}

class _CourseCard extends StatelessWidget {
  const _CourseCard(this.course, this.k, this.track, this.mine, this.now);
  final Course course;
  final KColors k;
  final Track track;
  final MemberProgress mine;
  final DateTime now;

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
            padding: const EdgeInsets.all(KSize.cardPadding),
            child: Row(
              children: [
                MiniWindow(base: w.base, lit: w.lit, dusty: w.dusty, size: 92, started: started, label: '${course.title} window'),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(course.title, style: serif(22, weight: FontWeight.w500, color: k.ink, height: 1.15)),
                      const SizedBox(height: 6),
                      Text(course.short, style: sans(14, color: k.muted, height: 1.4)),
                      if (status.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Text(status, style: sans(13, weight: FontWeight.w600, color: k.ink)),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                KIcon('<path d="M9 5l7 7-7 7"/>', size: 18, color: k.muted, strokeWidth: 2),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
