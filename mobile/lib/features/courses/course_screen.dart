// One course (src/app/heir/courses/[id]/page.tsx, ui/course-list.tsx CourseScreen): its name, what it is, and its
// questions or verses by part. Opening one shows it for reading (the item screen).
//
// Not yet here: the window, "N learned", "Start this course" and the unit folds. They need the household and
// progress storage and the windows (phase 3).

import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../engine/content.dart';
import '../../engine/types.dart';
import '../../ui/screen_parts.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';

class CourseScreen extends StatelessWidget {
  const CourseScreen({super.key, required this.id});
  final String id;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final course = getCourse(id);
    if (course == null) {
      return KPage(children: [
        Align(alignment: Alignment.centerLeft, child: KBack(label: 'Courses', onPressed: () => context.go('/courses'))),
        const KComingCard('We couldn’t find that course.'),
      ]);
    }
    final items = courseItems(course);
    final parts = courseParts(course);

    return KPage(
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Align(
            alignment: Alignment.centerLeft,
            child: KBack(label: 'Courses', onPressed: () => context.canPop() ? context.pop() : context.go('/courses')),
          ),
        ),
        KCard.column(
          gap: 8,
          children: [
            Semantics(
              header: true,
              child: Text(course.title, textAlign: TextAlign.center, style: serif(30, weight: FontWeight.w500, color: k.ink, height: 1.15)),
            ),
            Text(course.blurb, textAlign: TextAlign.center, style: sans(16, color: k.muted, height: 1.45)),
            Text(
              '${items.length} ${itemNoun(items.isEmpty ? null : items.first, items.length)}',
              textAlign: TextAlign.center,
              style: sans(13, color: k.muted),
            ),
          ],
        ),
        for (final p in parts)
          KCard(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (parts.length > 1)
                  Padding(
                    padding: const EdgeInsets.only(top: 14, bottom: 4),
                    child: Semantics(header: true, child: KLabel(p.title)),
                  ),
                for (final (n, item) in p.items.indexed) _ItemRow(item: item, first: n == 0 && parts.length <= 1),
              ],
            ),
          ),
      ],
    );
  }
}

class _ItemRow extends StatelessWidget {
  const _ItemRow({required this.item, required this.first});
  final Item item;
  final bool first;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    return Semantics(
      button: true,
      child: InkWell(
        onTap: () => context.push('/item/${Uri.encodeComponent(item.id)}'),
        child: Container(
          constraints: const BoxConstraints(minHeight: 64),
          decoration: BoxDecoration(border: first ? null : Border(top: BorderSide(color: k.line))),
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(itemLabel(item), style: sans(16, weight: FontWeight.w600, color: k.ink)),
                    const SizedBox(height: 2),
                    Text(itemSubtitle(item), maxLines: 2, overflow: TextOverflow.ellipsis, style: sans(14, color: k.muted)),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              KIcon('<path d="M9 6l6 6-6 6"/>', size: 16, color: k.muted, strokeWidth: 2.2),
            ],
          ),
        ),
      ),
    );
  }
}
