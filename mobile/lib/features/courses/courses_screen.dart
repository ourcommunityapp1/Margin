// Courses (src/app/heir/courses/page.tsx): every course on its shelf, as a card with its name and two lines on
// what it is. The website's cards also show a stained-glass window and "N of M learned"; those arrive with the
// windows (phase 3) and the progress storage, and a card never shows a window it hasn't earned.

import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../engine/content.dart';
import '../../ui/screen_parts.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';

class CoursesScreen extends StatelessWidget {
  const CoursesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    return KPage(
      children: [
        const KTitle('Courses'),
        for (final (id, title) in shelves)
          if (courses.any((c) => c.shelf == id)) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(6, 8, 6, 0),
              child: Semantics(header: true, child: KLabel(title)),
            ),
            for (final c in courses.where((c) => c.shelf == id)) _CourseCard(c, k),
          ],
      ],
    );
  }
}

class _CourseCard extends StatelessWidget {
  const _CourseCard(this.course, this.k);
  final Course course;
  final KColors k;

  @override
  Widget build(BuildContext context) {
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
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(course.title, style: serif(22, weight: FontWeight.w500, color: k.ink, height: 1.15)),
                      const SizedBox(height: 6),
                      Text(course.short, style: sans(14, color: k.muted, height: 1.4)),
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
