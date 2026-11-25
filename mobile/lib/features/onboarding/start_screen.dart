// First run (src/app/heir/start/page.tsx): a name, what to memorize, a daily goal with what it means in dates, then the
// first lesson. Other family members and settings can wait; they live under Family (not built yet).
//
// The first lesson itself needs the lesson session builder wired to the saved progress, which comes next, so for now
// "Start" saves the plan and goes to Today.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../data/household.dart';
import '../../engine/content.dart';
import '../../engine/progress.dart';
import '../../engine/types.dart';
import '../../state/clock.dart';
import '../../state/household.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';
import 'choices.dart';

enum _Step { name, course, goal }

class StartScreen extends ConsumerStatefulWidget {
  const StartScreen({super.key});

  @override
  ConsumerState<StartScreen> createState() => _StartScreenState();
}

class _StartScreenState extends ConsumerState<StartScreen> {
  final _name = TextEditingController();
  _Step _step = _Step.name;
  String? _course;
  int? _minutes = 15;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  void _begin(bool hasSomeone) {
    final course = _course;
    if (course == null) return;
    final id = newId(), now = ref.read(clockProvider)();
    ref.read(householdProvider.notifier).update(
          (h) => setPlan(hasSomeone ? h : addMember(h, _name.text, Track.adult, id, now), Plan(course: course, minutes: _minutes ?? 15)),
        );
    context.go('/today');
  }

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final household = ref.watch(householdProvider);
    final hasSomeone = household.members.isNotEmpty;
    final askName = _step == _Step.name && !hasSomeone;
    final now = ref.watch(clockProvider)();

    Widget heading(String text) => Semantics(header: true, child: Text(text, style: serif(28, weight: FontWeight.w600, color: k.ink, height: 1.2)));

    final Widget card;
    if (askName) {
      card = KCard.column(children: [
        heading('What’s your name?'),
        ListenableBuilder(
          listenable: _name,
          builder: (context, _) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              KTextField(
                controller: _name,
                label: 'What’s your name?',
                autofocus: true,
                maxLength: 40,
                autofillHints: const [AutofillHints.givenName],
                textCapitalization: TextCapitalization.words,
                textInputAction: TextInputAction.next,
                onSubmitted: (_) {
                  if (_name.text.trim().isNotEmpty) setState(() => _step = _Step.course);
                },
              ),
              const SizedBox(height: 16),
              KButton('Continue', onPressed: _name.text.trim().isEmpty ? null : () => setState(() => _step = _Step.course)),
            ],
          ),
        ),
      ]);
    } else if (_step == _Step.goal && _course != null) {
      final course = courseFor(_course)!;
      final progress = emptyProgress();
      card = KCard.column(children: [
        heading('How long each day?'),
        Text('A goal to plan around. You can always do more.', style: sans(15, color: k.muted, height: 1.5)),
        GoalChoices(value: _minutes, onChanged: (m) => setState(() => _minutes = m), course: course, track: Track.adult, progress: progress, now: now),
        if (_minutes != null) AllCourses(minutes: _minutes!, track: Track.adult, progress: progress, now: now),
        const LongTermNote(),
        KButton('Start', onPressed: _minutes == null ? null : () => _begin(hasSomeone)),
        KButton('Back', quiet: true, onPressed: () => setState(() => _step = _Step.course)),
      ]);
    } else {
      card = KCard.column(children: [
        heading('What would you like to memorize?'),
        CourseChoices(value: _course, onChanged: (c) => setState(() => _course = c)),
        KButton('Continue', onPressed: _course == null ? null : () => setState(() => _step = _Step.goal)),
        if (!hasSomeone) KButton('Back', quiet: true, onPressed: () => setState(() => _step = _Step.name)),
      ]);
    }

    return KPage(
      // A new step starts at the top, not where the last one was scrolled to.
      key: ValueKey(askName ? 'name' : _step),
      bare: true,
      pushDown: true,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const KMark(width: 24, height: 28),
              const SizedBox(width: 10),
              Text('Katekize', style: serif(24, weight: FontWeight.w500, color: k.ink)),
            ],
          ),
        ),
        card,
      ],
    );
  }
}
