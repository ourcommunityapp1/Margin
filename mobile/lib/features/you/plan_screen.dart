// Choosing what to memorize and how long each day, with what that means in dates, and what the stones and grades mean
// (src/app/heir/ui/plan.tsx). Progress on every course is kept, so switching is safe.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../data/household.dart';
import '../../engine/content.dart';
import '../../engine/tiers.dart';
import '../../engine/path.dart';
import '../../engine/types.dart';
import '../../state/clock.dart';
import '../../state/household.dart';
import '../../ui/stone.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';
import '../onboarding/choices.dart';

/// How each recall is graded (the website's GRADES): the words and what they mean.
const gradeWords = [
  ('Forgot', 'Couldn’t recall it'),
  ('Shaky', 'Recalled it with a slip or a hint'),
  ('Solid', 'Recalled it correctly'),
  ('Effortless', 'Recalled it perfectly, on a question you’ve already reviewed several times'),
];

class PlanScreen extends ConsumerWidget {
  const PlanScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final k = context.k;
    final household = ref.watch(householdProvider);
    final me = ref.watch(meProvider);
    final mine = ref.watch(myProgressProvider);
    final now = ref.watch(clockProvider)();
    final track = me?.track ?? Track.adult;
    final course = courseFor(household.plan?.course);
    final minutes = household.plan?.minutes ?? 15;
    final stats = {for (final c in courses) c.id: courseStats(courseItems(c), track, mine)};

    Widget heading(String t, {double size = 24}) => Semantics(header: true, child: Text(t, style: serif(size, weight: FontWeight.w600, color: k.ink, height: 1.2)));

    return KPage(
      bare: true,
      children: [
        Align(alignment: Alignment.centerLeft, child: KBack(onPressed: () => context.canPop() ? context.pop() : context.go('/you'))),
        KCard.column(
          children: [
            heading('Courses', size: 28),
            CourseChoices(
              value: course?.id,
              stats: {for (final e in stats.entries) e.key: (learned: e.value.learned, total: e.value.total)},
              onChanged: (id) {
                ref.read(householdProvider.notifier).update((h) => setPlan(h, Plan(course: id)));
                context.go('/today');
              },
            ),
            Text('Progress in each course is kept when you switch. Passages of Scripture come later.', style: sans(15, color: k.muted, height: 1.5)),
          ],
        ),
        if (course != null)
          KCard.column(
            children: [
              heading('Your daily goal'),
              GoalChoices(
                value: minutes,
                onChanged: (m) => ref.read(householdProvider.notifier).update((h) => setPlan(h, Plan(course: course.id, minutes: m))),
                course: course,
                track: track,
                progress: mine,
                now: now,
              ),
              AllCourses(minutes: minutes, track: track, progress: mine, now: now),
              const LongTermNote(),
            ],
          ),
        KCard.column(
          gap: 14,
          children: [
            heading('What the levels mean'),
            for (final l in tiers)
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  KStone(level: l.n, size: 30),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text.rich(
                          TextSpan(children: [
                            TextSpan(text: l.name, style: sans(16, weight: FontWeight.w600, color: k.ink)),
                            TextSpan(text: ' · ${l.stone}', style: sans(16, weight: FontWeight.w500, color: k.muted)),
                          ]),
                        ),
                        const SizedBox(height: 2),
                        Text(l.means, style: sans(14, color: k.muted, height: 1.45)),
                      ],
                    ),
                  ),
                ],
              ),
          ],
        ),
        KCard.column(
          gap: 12,
          children: [
            heading('How each recall is graded'),
            Text('Only answers you produce yourself count: typing it, saying it, or its first letters. The grade decides when it comes back.', style: sans(14, color: k.muted, height: 1.5)),
            for (final (word, means) in gradeWords)
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(width: 92, child: Text(word, style: sans(16, weight: FontWeight.w600, color: k.ink))),
                  const SizedBox(width: 12),
                  Expanded(child: Text(means, style: sans(14, color: k.muted, height: 1.45))),
                ],
              ),
          ],
        ),
      ],
    );
  }
}
