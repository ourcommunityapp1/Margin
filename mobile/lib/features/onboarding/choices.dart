// What to memorize and how long each day (src/app/heir/ui/courses.tsx CourseChoices, ui/goal.tsx). Wording matches
// the website's.

import 'package:material_ui/material_ui.dart';

import '../../engine/content.dart';
import '../../engine/planner.dart' as planner;
import '../../engine/progress.dart';
import '../../engine/types.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';

const _months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/// "March 2027".
String monthYear(DateTime d) {
  final l = d.toLocal();
  return '${_months[l.month - 1]} ${l.year}';
}

/// "5 weeks", "3 months".
String span(int days) => days < 14 ? '$days days' : days < 60 ? '${(days / 7).round()} weeks' : '${(days / 30).round()} months';

/// The courses a person can choose to memorize.
class CourseChoices extends StatelessWidget {
  const CourseChoices({super.key, required this.value, required this.onChanged});
  final String? value;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    return Semantics(
      label: 'What to memorize',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final (i, c) in courses.indexed) ...[
            if (i > 0) const SizedBox(height: 10),
            KChoice(
              selected: value == c.id,
              onTap: () => onChanged(c.id),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(c.title, style: sans(17, weight: FontWeight.w600, color: k.ink)),
                  const SizedBox(height: 4),
                  Text('${c.blurb} ${_count(c)}', style: sans(15, color: value == c.id ? k.ink : k.muted, height: 1.4)),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  static String _count(Course c) {
    final items = courseItems(c);
    final n = items.length;
    if (items.isEmpty) return '';
    if (isVerse(items.first)) return '$n ${itemNoun(items.first, n)}.';
    if (c.id == 'creeds') return '$n sections.';
    return n >= 107 ? 'All $n questions.' : 'Questions 1–$n so far.';
  }
}

/// The daily practice goal, with what it means in dates: when the course could be learned, and when it could be in
/// long-term memory. You can always do more than the goal; it only sets the pace we plan for.
class GoalChoices extends StatelessWidget {
  const GoalChoices({super.key, required this.value, required this.onChanged, required this.course, required this.track, required this.progress, required this.now});
  final int? value;
  final ValueChanged<int> onChanged;
  final Course course;
  final Track track;
  final MemberProgress progress;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final items = courseItems(course);
    return Semantics(
      label: 'Daily goal',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final (i, minutes) in planner.goals.indexed) ...[
            if (i > 0) const SizedBox(height: 10),
            Builder(builder: (context) {
              final r = planner.project(items: items, track: track, p: progress, minutes: minutes, now: now);
              return KChoice(
                selected: value == minutes,
                onTap: () => onChanged(minutes),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('$minutes minutes a day', style: sans(17, weight: FontWeight.w600, color: k.ink)),
                    const SizedBox(height: 4),
                    Text(
                      '${r.learnDays == 0 ? 'Everything here is learned.' : 'Learned in about ${span(r.learnDays)}, by ${monthYear(r.learnedBy)}.'} In long-term memory by ${monthYear(r.longTermBy)}.',
                      style: sans(15, color: value == minutes ? k.ink : k.muted, height: 1.45),
                    ),
                  ],
                ),
              );
            }),
          ],
        ],
      ),
    );
  }
}

/// Every course at this pace.
class AllCourses extends StatelessWidget {
  const AllCourses({super.key, required this.minutes, required this.track, required this.progress, required this.now});
  final int minutes;
  final Track track;
  final MemberProgress progress;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    final r = planner.project(items: [for (final c in courses) ...courseItems(c)], track: track, p: progress, minutes: minutes, now: now);
    return Text(
      'Everything in Katekize at $minutes minutes a day: learned by ${monthYear(r.learnedBy)}, in long-term memory by ${monthYear(r.longTermBy)}.',
      style: sans(14, color: context.k.muted, height: 1.5),
    );
  }
}

class LongTermNote extends StatelessWidget {
  const LongTermNote({super.key});

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    return Text.rich(
      TextSpan(children: [
        TextSpan(text: 'What long-term memory means.', style: sans(14, weight: FontWeight.w700, color: k.ink, height: 1.55)),
        const TextSpan(
          text: ' By then you’ll have recalled each answer correctly for six months, including after two months away. Each recall spaced '
              'further apart slows forgetting, until a few minutes of review now and then keeps it for good. Studies of people who learned '
              'something well this way find it still there decades later. Learn as fast as you like: a question only counts as remembered '
              'once you’ve recalled it after a night’s sleep.',
        ),
      ]),
      style: sans(14, color: k.muted, height: 1.55),
    );
  }
}
