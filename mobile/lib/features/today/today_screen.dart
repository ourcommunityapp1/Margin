// Today (src/app/heir/page.tsx): a greeting and the You button; below, the day's cards.
//
// The cards (ui/today.tsx) come from the engine's day plan (dayplan.ts, planner.ts), still being ported.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../engine/content.dart';
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
        if (plan != null && courseFor(plan.course) != null)
          KCard.column(
            gap: 8,
            children: [
              const KLabel('Your course'),
              Text(courseFor(plan.course)!.title, style: serif(22, weight: FontWeight.w500, color: context.k.ink, height: 1.15)),
              Text('${plan.minutes ?? 15} minutes a day', style: sans(15, color: context.k.muted)),
            ],
          ),
        const KComingCard('Your lessons for today will show here: a card for each course, with its window.'),
      ],
    );
  }
}
