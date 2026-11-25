// Progress, as one scroll (src/app/heir/progress/page.tsx): the week of days kept, the words in your memory and the next
// milestone, the stones ladder, the courses you have begun, the month's days kept, and awards. Wording matches the website.
//
// Not here yet: the community preview (needs the server), the stained-glass windows wall (phase 3, so the courses show as
// a plain list), and the Understanding ladder (the website shows it only to a few accounts).

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../engine/content.dart';
import '../../engine/lesson.dart' show unitsFor;
import '../../engine/levels.dart';
import '../../engine/measures.dart';
import '../../engine/path.dart';
import '../../engine/progress.dart';
import '../../engine/types.dart';
import '../../state/clock.dart';
import '../../state/household.dart';
import '../../state/keep.dart';
import '../../ui/screen_parts.dart';
import '../../ui/stone.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';
import '../lesson/step_frame.dart' show DashedBox;

// Recited (no stone yet) in warm glass, then each stone's own colour.
const _stageColors = [Color(0xFFC9A46A), Color(0xFF7B52B5), Color(0xFFD99A2B), Color(0xFFB0442A), Color(0xFF1E8657), Color(0xFF2F5DA8), Color(0xFFBFC6CC)];
const _monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

String _fmt(int n) => n.toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => ',');

class ProgressScreen extends ConsumerWidget {
  const ProgressScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final k = context.k;
    final me = ref.watch(meProvider);
    if (me == null) return const KPage(children: []);
    final mine = ref.watch(myProgressProvider);
    final keep = ref.watch(keepProvider);
    final plan = ref.watch(householdProvider).plan;
    final now = ref.watch(clockProvider)();
    final track = me.track;
    final items = allItems();
    final words = wordsIn(items, track, mine);
    // Words not recalled in time aren't counted.
    final inMemory = keep?.wordsKept ?? words.inMemory;
    final miles = milestones(inMemory);
    final prevMile = miles.reached.isEmpty ? 0 : miles.reached.last;
    final today = localDay(now);
    final kept = daysKept(mine.days, today);
    final best = kept > bestDaysKept(mine.days) ? kept : bestDaysKept(mine.days);
    // Each stone keeps the ones below it: an item at Topaz also counts toward Amethyst. So counts fall as you climb.
    int levelAt(String id) => mine.levels[id] ?? 0;
    final recitedCount = items.where((i) => levelAt(i.id) > 0 || recited(i, track, mine.log)).length;
    final holding = [for (final l in levelList) items.where((i) => levelAt(i.id) >= l.n).length];
    // Every course with anything learned, the one in progress first.
    final yours = [
      for (final c in courses)
        if (courseItems(c).any((i) => unitsFor(i, track).any((u) => mine.units.contains(u.key)))) c,
    ]..sort((a, b) => (b.id == plan?.course ? 1 : 0) - (a.id == plan?.course ? 1 : 0));
    final hints = [
      for (final i in (items.where((i) => levelAt(i.id) > 0 && !needsRefresh(mine, i.id, now)).toList()..sort((a, b) => levelAt(a.id) - levelAt(b.id))).take(2))
        if (nextStep(i, track, mine, now) case final step?) '${itemLabel(i)}: $step',
    ];
    final earned = awardList.where((a) => mine.awards.containsKey(a.id)).length;
    final nextAward = awardList.where((a) => !mine.awards.containsKey(a.id)).firstOrNull;

    return KPage(
      children: [
        const KTitle('Progress'),
        _WeekCard(days: mine.days, today: today, now: now, kept: kept, best: best),
        // Words in your memory
        KCard.column(
          gap: 12,
          children: [
            const KLabel('Words in your memory'),
            Wrap(
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: 14,
              runSpacing: 4,
              children: [
                Text(_fmt(inMemory), style: serif(48, weight: FontWeight.w600, color: k.ink, height: 1)),
                if (words.recited > words.inMemory)
                  Text('${_fmt(words.recited - words.inMemory)} more recited, not yet recalled on a later day', style: sans(14, color: k.muted)),
              ],
            ),
            Row(
              children: [
                if (miles.reached.isNotEmpty) ...[_Mile(_fmt(prevMile), reached: true), const SizedBox(width: 10)],
                if (miles.next != null) ...[
                  Expanded(child: _Bar(fraction: (inMemory - prevMile) / (miles.next! - prevMile), color: _stageColors[1])),
                  const SizedBox(width: 10),
                  _Mile(_fmt(miles.next!)),
                ] else
                  Text('Every milestone reached', style: sans(14, color: k.muted)),
              ],
            ),
            if (miles.next != null)
              Text('${_fmt(miles.next! - inMemory)} more ${miles.next! - inMemory == 1 ? 'word' : 'words'} to ${_fmt(miles.next!)}', style: sans(14, color: k.muted)),
            if (keep != null && (keep.tryAgain.isNotEmpty || keep.review.isNotEmpty || keep.out.isNotEmpty))
              Container(
                padding: const EdgeInsets.only(top: 10),
                decoration: BoxDecoration(border: Border(top: BorderSide(color: k.line))),
                child: Column(
                  children: [
                    if (keep.tryAgain.isNotEmpty)
                      _KeepRow('Try again today', '${keep.tryAgain.length} ${keep.tryAgain.length == 1 ? 'verse or answer' : 'verses and answers'}', k.ink),
                    if (keep.review.isNotEmpty) _KeepRow('Review soon', '${_fmt(keep.review.fold(0, (n, h) => n + h.words))} words', k.ink),
                    if (keep.out.isNotEmpty) _KeepRow('Out of memory · one recall brings back', '${keep.out.length}', k.muted),
                  ],
                ),
              ),
            Text(
              'A word is in your memory once you’ve recalled it with no hints on a later day than you first recited it, and stays there as long as you recall it again in time.',
              style: sans(13, color: k.muted, height: 1.45),
            ),
          ],
        ),
        // Stones
        KCard.column(
          gap: 14,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [const KLabel('Stones'), Flexible(child: Text('All courses · $recitedCount recited', textAlign: TextAlign.right, style: sans(13, color: k.muted)))],
            ),
            _StoneRow(level: 0, name: stages[0].name, word: 'No stone yet', count: recitedCount, total: recitedCount, color: _stageColors[0], dim: false),
            for (final (i, l) in levelList.indexed)
              _StoneRow(level: l.n, name: l.name, word: l.counts, count: holding[i], total: recitedCount, color: _stageColors[l.n], dim: holding[i] == 0),
            if (hints.isNotEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(color: k.well, borderRadius: BorderRadius.circular(14)),
                child: Text.rich(
                  TextSpan(children: [
                    TextSpan(text: 'Closest next:', style: sans(14, weight: FontWeight.w700, color: k.ink, height: 1.45)),
                    TextSpan(text: ' ${hints.join('. ')}.'),
                  ]),
                  style: sans(14, color: k.ink, height: 1.45),
                ),
              ),
          ],
        ),
        // Your courses (the website shows each as a stained-glass window)
        KCard.column(
          gap: 14,
          children: [
            const KLabel('Your courses'),
            if (yours.isEmpty) Text('Finish your first lesson and its window starts to light here.', style: sans(15, color: k.muted)),
            for (final c in yours) _CourseLine(course: c, track: track, mine: mine),
          ],
        ),
        _MonthCard(days: mine.days, today: today, now: now, kept: kept, best: best),
        // Awards
        KCard.column(
          gap: 14,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [const KLabel('Awards'), Flexible(child: Text('$earned of ${awardList.length}', textAlign: TextAlign.right, style: sans(13, color: k.muted)))],
            ),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final a in awardList)
                  if (mine.awards.containsKey(a.id)) _Seal(a.name),
                if (nextAward != null) _Seal('Next: ${nextAward.name}', next: true),
              ],
            ),
            if (nextAward != null)
              Text.rich(
                TextSpan(children: [
                  TextSpan(text: 'Next: ${nextAward.name}', style: sans(14, weight: FontWeight.w700, color: k.ink)),
                  TextSpan(text: ' · ${nextAward.hint}', style: TextStyle(color: k.muted)),
                ]),
                style: sans(14, color: k.ink),
              ),
            _AllAwards(mine: mine),
          ],
        ),
      ],
    );
  }
}

// ── Pieces ──

class _Bar extends StatelessWidget {
  const _Bar({required this.fraction, required this.color});
  final double fraction;
  final Color color;

  @override
  Widget build(BuildContext context) => ClipRRect(
        borderRadius: BorderRadius.circular(5),
        child: Container(
          height: 10,
          color: context.k.well,
          alignment: Alignment.centerLeft,
          child: FractionallySizedBox(widthFactor: fraction.isNaN ? 0 : fraction.clamp(0, 1), child: Container(color: color)),
        ),
      );
}

class _Mile extends StatelessWidget {
  const _Mile(this.text, {this.reached = false});
  final String text;
  final bool reached;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final box = Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: reached
          ? BoxDecoration(borderRadius: BorderRadius.circular(999), border: Border.all(color: const Color(0xFFE8B867), width: 1.5), color: const Color(0x24E8B867))
          : null,
      child: Text(text, style: sans(14, weight: FontWeight.w700, color: reached ? const Color(0xFFF4EFE6) : k.muted)),
    );
    return Semantics(label: reached ? 'Milestone reached: $text' : 'Next milestone: $text', excludeSemantics: true, child: reached ? box : DashedBox(radius: 999, child: box));
  }
}

class _KeepRow extends StatelessWidget {
  const _KeepRow(this.left, this.right, this.color);
  final String left, right;
  final Color color;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Flexible(child: Text(left, style: sans(14, color: color))),
            const SizedBox(width: 10),
            Text(right, style: sans(14, weight: FontWeight.w700, color: color)),
          ],
        ),
      );
}

class _StoneRow extends StatelessWidget {
  const _StoneRow({required this.level, required this.name, required this.word, required this.count, required this.total, required this.color, required this.dim});
  final int level, count, total;
  final String name, word;
  final Color color;
  final bool dim;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    return Row(
      children: [
        KStone(level: level, size: 36, dim: level > 0 && dim),
        const SizedBox(width: 10),
        SizedBox(
          width: 96,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(name, style: sans(15, weight: FontWeight.w600, color: k.ink)),
              Text(word, style: sans(12.5, color: k.muted)),
            ],
          ),
        ),
        const SizedBox(width: 10),
        Expanded(child: _Bar(fraction: total == 0 ? 0 : count / total, color: color)),
        const SizedBox(width: 10),
        SizedBox(width: 36, child: Text('$count', textAlign: TextAlign.right, style: sans(15, weight: FontWeight.w600, color: k.ink))),
      ],
    );
  }
}

class _CourseLine extends StatelessWidget {
  const _CourseLine({required this.course, required this.track, required this.mine});
  final Course course;
  final Track track;
  final MemberProgress mine;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final s = courseStats(courseItems(course), track, mine);
    return Semantics(
      button: true,
      child: InkWell(
        onTap: () => context.push('/courses/${course.id}'),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(course.title, style: serif(16, weight: FontWeight.w600, color: k.ink, height: 1.2)),
                    const SizedBox(height: 2),
                    Text(s.learned >= s.total ? 'Finished' : '${s.learned} of ${s.total} learned', style: sans(13, color: k.muted)),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              SizedBox(width: 90, child: _Bar(fraction: s.total == 0 ? 0 : s.learned / s.total, color: _stageColors[4])),
              const SizedBox(width: 8),
              KIcon('<path d="M9 6l6 6-6 6"/>', size: 16, color: k.muted, strokeWidth: 2.2),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Days kept ──

/// The week's days kept: one circle a day, Sunday and one more day each week free (ui/days-kept.tsx).
class _WeekCard extends StatelessWidget {
  const _WeekCard({required this.days, required this.today, required this.now, required this.kept, required this.best});
  final List<String> days;
  final String today;
  final DateTime now;
  final int kept, best;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final set = days.toSet();
    final l = now.toLocal();
    final monday = DateTime(l.year, l.month, l.day - (l.weekday - 1));
    var week = [
      for (var i = 0; i < 7; i++)
        () {
          final d = DateTime(monday.year, monday.month, monday.day + i);
          final key = localDay(d);
          final state = set.contains(key) ? 'kept' : key == today ? 'today' : d.weekday == 7 ? 'rest' : key.compareTo(today) < 0 ? 'missed' : 'later';
          return (key: key, label: 'MTWTFSS'[i], state: state);
        }(),
    ];
    // The first skipped weekday of the week is its free day (shown as rest); a second skipped day shows as missed.
    final firstMissed = week.indexWhere((d) => d.state == 'missed');
    week = [for (final (i, d) in week.indexed) i == firstMissed ? (key: d.key, label: d.label, state: 'rest') : d];
    final doneToday = set.contains(today);
    final sunday = l.weekday == 7;
    final line = sunday && !doneToday
        ? 'Sunday is a day of rest: learn if you like, but skipping it never breaks the count. Each week also has one more free day.'
        : doneToday
            ? 'Today is kept.'
            : 'One lesson or review keeps the day.';
    return KCard(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text('$kept', style: serif(34, weight: FontWeight.w600, color: k.ink, height: 1)),
                  const SizedBox(width: 8),
                  Text(kept == 1 ? 'day kept' : 'days kept', style: sans(16, weight: FontWeight.w600, color: k.ink)),
                ],
              ),
              if (best > 0) Text('Best: $best', style: sans(13, weight: FontWeight.w600, color: k.muted)),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              for (final d in week)
                Expanded(
                  child: Semantics(
                    label: '${d.key}: ${d.state}',
                    child: Column(
                      children: [
                        Text(d.label, style: sans(12, weight: FontWeight.w600, color: k.muted)),
                        const SizedBox(height: 6),
                        _DayDot(state: d.state),
                      ],
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 14),
          Text(line, style: sans(14, color: k.muted, height: 1.45)),
        ],
      ),
    );
  }
}

class _DayDot extends StatelessWidget {
  const _DayDot({required this.state});
  final String state;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final kept = state == 'kept', rest = state == 'rest';
    final circle = Container(
      width: 32,
      height: 32,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: kept ? k.ink : rest ? k.well : null,
        border: rest ? null : Border.all(color: kept || state == 'today' ? k.ink : k.edge, width: 2),
      ),
      child: rest ? Text('Rest', style: sans(10, weight: FontWeight.w700, color: k.muted)) : null,
    );
    final dot = rest ? CustomPaint(painter: _DashedCircle(k.edge), child: circle) : circle;
    return Opacity(opacity: state == 'later' ? 0.6 : 1, child: dot);
  }
}

class _DashedCircle extends CustomPainter {
  _DashedCircle(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color..style = PaintingStyle.stroke..strokeWidth = 2;
    final path = Path()..addOval(Rect.fromLTWH(1, 1, size.width - 2, size.height - 2));
    for (final m in path.computeMetrics()) {
      for (var d = 0.0; d < m.length; d += 6) {
        canvas.drawPath(m.extractPath(d, (d + 3.5).clamp(0, m.length)), paint);
      }
    }
  }

  @override
  bool shouldRepaint(_DashedCircle old) => old.color != color;
}

/// This month, Monday first.
class _MonthCard extends StatelessWidget {
  const _MonthCard({required this.days, required this.today, required this.now, required this.kept, required this.best});
  final List<String> days;
  final String today;
  final DateTime now;
  final int kept, best;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final l = now.toLocal();
    final first = DateTime(l.year, l.month, 1);
    final blanks = first.weekday - 1;
    final daysIn = DateTime(l.year, l.month + 1, 0).day;
    final set = days.toSet();
    final cells = [
      for (var i = 0; i < daysIn; i++)
        () {
          final d = DateTime(l.year, l.month, i + 1);
          final key = localDay(d);
          final state = set.contains(key) ? 'kept' : key == today ? 'today' : key.compareTo(today) > 0 ? 'later' : d.weekday == 7 ? 'rest' : 'missed';
          return (n: i + 1, state: state);
        }(),
    ];
    return KCard.column(
      gap: 14,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text('$kept', style: serif(30, weight: FontWeight.w600, color: k.ink, height: 1)),
                const SizedBox(width: 8),
                Text(kept == 1 ? 'day kept' : 'days kept', style: sans(16, weight: FontWeight.w600, color: k.ink)),
              ],
            ),
            Flexible(child: Text('${_monthNames[l.month - 1]}${best > 0 ? ' · Best $best' : ''}', textAlign: TextAlign.right, style: sans(13, weight: FontWeight.w600, color: k.muted))),
          ],
        ),
        LayoutBuilder(
          builder: (context, c) {
            final cell = (c.maxWidth - 6 * 6) / 7;
            return Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final d in 'MTWTFSS'.split('')) SizedBox(width: cell, child: Center(child: Text(d, style: sans(11, weight: FontWeight.w700, color: k.muted)))),
                for (var i = 0; i < blanks; i++) SizedBox(width: cell, height: 34),
                for (final c in cells) SizedBox(width: cell, height: 34, child: _CalCell(n: c.n, state: c.state)),
              ],
            );
          },
        ),
        Text(
          'A day is kept by finishing a lesson or review. Sundays are days of rest, and each week has one more free day: learning on them counts, and skipping one never breaks the run.',
          style: sans(13, color: k.muted, height: 1.45),
        ),
      ],
    );
  }
}

class _CalCell extends StatelessWidget {
  const _CalCell({required this.n, required this.state});
  final int n;
  final String state;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final kept = state == 'kept';
    final box = Container(
      alignment: Alignment.center,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(17),
        color: kept ? k.ink : state == 'rest' ? k.well : null,
        border: state == 'today' ? Border.all(color: k.ink, width: 2) : null,
      ),
      child: Text('$n', style: sans(12, weight: FontWeight.w600, color: kept ? k.card : k.muted)),
    );
    return Opacity(opacity: state == 'later' ? 0.55 : 1, child: Semantics(label: '$n: $state', excludeSemantics: true, child: box));
  }
}

// ── Awards ──

class _Seal extends StatelessWidget {
  const _Seal(this.label, {this.next = false});
  final String label;
  final bool next;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final star = KIcon('<path d="M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.4 6.8 19.2l1-5.9L3.5 9.2l5.9-.8z"/>', size: 18, color: next ? k.muted : k.card, strokeWidth: 2);
    return Semantics(
      image: true,
      label: label,
      child: next
          ? DashedBox(radius: 20, width: 40, height: 40, child: Center(child: star))
          : Container(width: 40, height: 40, decoration: BoxDecoration(color: k.ink, shape: BoxShape.circle), child: Center(child: star)),
    );
  }
}

class _AllAwards extends StatefulWidget {
  const _AllAwards({required this.mine});
  final MemberProgress mine;

  @override
  State<_AllAwards> createState() => _AllAwardsState();
}

class _AllAwardsState extends State<_AllAwards> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(
          button: true,
          expanded: _open,
          child: InkWell(
            onTap: () => setState(() => _open = !_open),
            child: Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: Text(_open ? 'Hide awards' : 'See all awards', style: sans(14, weight: FontWeight.w600, color: k.ink))),
          ),
        ),
        if (_open)
          for (final a in awardList)
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Opacity(
                opacity: widget.mine.awards.containsKey(a.id) ? 1 : 0.65,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(child: Text(a.name, style: sans(15, weight: FontWeight.w600, color: k.ink))),
                    const SizedBox(width: 10),
                    Flexible(
                      child: Text(
                        widget.mine.awards[a.id] != null ? _dayMonth(widget.mine.awards[a.id]!) : a.hint,
                        textAlign: TextAlign.right,
                        style: sans(13, color: k.muted),
                      ),
                    ),
                  ],
                ),
              ),
            ),
      ],
    );
  }

  static String _dayMonth(String iso) {
    final d = DateTime.tryParse(iso)?.toLocal();
    return d == null ? '' : '${d.day} ${_monthNames[d.month - 1]}';
  }
}
