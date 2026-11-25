// A course's window up close (src/app/heir/progress/page.tsx WindowView): full screen, with a way back and a quiet way into
// the course. Opened from the windows on Progress.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../engine/content.dart';
import '../../engine/path.dart';
import '../../engine/types.dart';
import '../../state/clock.dart';
import '../../state/household.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';
import 'glass_window.dart';
import 'light.dart';

class WindowViewScreen extends ConsumerWidget {
  const WindowViewScreen({super.key, required this.courseId, this.part});
  final String courseId;
  final int? part;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final course = getCourse(courseId);
    final track = ref.watch(meProvider)?.track ?? Track.adult;
    final mine = ref.watch(myProgressProvider);
    final now = ref.watch(clockProvider)();
    final size = MediaQuery.sizeOf(context);
    final pad = MediaQuery.paddingOf(context);
    if (course == null) {
      return Center(child: KButton('Back', quiet: true, onPressed: () => context.canPop() ? context.pop() : context.go('/progress')));
    }
    final w = partWindow(course, track, mine, now, part);
    final stats = courseStats(courseItems(course), track, mine);
    final learned = stats.learned >= stats.total ? 'Finished' : '${stats.learned} of ${stats.total} learned';
    final side = (size.width - 32).clamp(200.0, 720.0).toDouble();
    final window = side < size.height - 260 - pad.vertical ? side : (size.height - 260 - pad.vertical).clamp(200.0, 720.0).toDouble();
    return Material(
      color: const Color(0xFF15181B),
      child: Semantics(
        label: '${course.title} window',
        child: Stack(
          children: [
            Padding(
              padding: EdgeInsets.fromLTRB(16, pad.top + 8, 16, pad.bottom + 20),
              child: Column(
                children: [
                  Align(alignment: Alignment.centerLeft, child: KBack(onPressed: () => context.canPop() ? context.pop() : context.go('/progress'))),
                  Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        RoundWindow(base: w.base, lit: w.lit, dusty: w.dusty, share: w.share, size: window, started: w.started, beam: const CircleMotion(), label: '${course.title} window: $learned'),
                        const SizedBox(height: 18),
                        Text(course.title, textAlign: TextAlign.center, style: serif(26, weight: FontWeight.w500, color: const Color(0xFFF4EFE6), height: 1.15)),
                        const SizedBox(height: 4),
                        Text(
                          '${w.count > 1 ? 'Part ${w.index + 1} · ${w.title} · ' : ''}$learned',
                          textAlign: TextAlign.center,
                          style: sans(14, color: const Color(0xFFC9C1B3)),
                        ),
                        const SizedBox(height: 18),
                        SizedBox(width: 260, child: KButton('Go to course', onPressed: () => context.pushReplacement('/courses/${course.id}'))),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
