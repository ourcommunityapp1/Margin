// Today (src/app/heir/page.tsx): a greeting and the You button; below, the day's cards.
//
// The cards (ui/today.tsx) come from the engine's day plan (dayplan.ts, planner.ts), still being ported.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../engine/content.dart';
import '../../engine/planner.dart' as planner;
import '../lesson/labels.dart';
import '../../state/clock.dart';
import '../../state/household.dart';
import '../../engine/season.dart' show greeting, timeOfDay;
import '../../ui/screen_parts.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';

class TodayScreen extends ConsumerWidget {
  const TodayScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final me = ref.watch(meProvider);
    final plan = ref.watch(householdProvider).plan;
    final course = courseFor(plan?.course);
    final hello = greeting(timeOfDay(ref.watch(clockProvider)()));
    return KPage(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(4, 12, 4, 0),
          child: Row(
            children: [
              Expanded(
                child: Semantics(
                  header: true,
                  child: Text(
                    me == null ? hello : '$hello, ${me.firstName}',
                    style: serif(26, weight: FontWeight.w500, color: context.k.ink, height: 1.15),
                  ),
                ),
              ),
              KInitial(
                me?.initial ?? '?',
                label: me == null ? 'You: settings and family' : 'You: ${me.name}, settings and family',
                onTap: () => context.push('/you'),
              ),
            ],
          ),
        ),
        if (course != null) _NextLesson(course: course, minutes: plan?.minutes ?? 15),
      ],
    );
  }
}

/// The person's course and what its next lesson is. Until Today's day plan is wired, this is the one card here.
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
