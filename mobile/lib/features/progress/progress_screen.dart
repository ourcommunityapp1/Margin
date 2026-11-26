// Progress, as one scroll (src/app/heir/progress/page.tsx, Nov 26 layout): a row of rings, the words in your memory (an arc over
// the blurred glass of your first course) and how they have grown, the keeping rows, the days kept with the month in a fold,
// the stones, the window of every course you've begun (each lights up when seen), the community preview, and awards.
// Wording matches the website. The Understanding ladder is shown only to a few accounts on the website, so not here.

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
import '../../state/memory_history.dart';
import '../../ui/screen_parts.dart';
import '../../ui/stone.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';
import '../lesson/step_frame.dart' show DashedBox;
import '../window/appear_window.dart';
import 'community_preview.dart';
import '../window/light.dart';
import 'progress_parts.dart';

// Recited (no stone yet) in warm glass, then each stone's own colour.
const _stageColors = [Color(0xFFC9A46A), Color(0xFF7B52B5), Color(0xFFD99A2B), Color(0xFFB0442A), Color(0xFF1E8657), Color(0xFF2F5DA8), Color(0xFFBFC6CC)];
const _monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

String _fmt(int n) => fmtWords(n);

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
    final stats = {for (final c in yours) c.id: courseStats(courseItems(c), track, mine)};
    final learnedAll = stats.values.fold(0, (n, s) => n + s.learned), totalAll = stats.values.fold(0, (n, s) => n + s.total);
    final hints = [
      for (final i in (items.where((i) => levelAt(i.id) > 0 && !needsRefresh(mine, i.id, now)).toList()..sort((a, b) => levelAt(a.id) - levelAt(b.id))).take(2))
        if (nextStep(i, track, mine, now) case final step?) '${itemLabel(i)}: $step',
    ];
    final earned = awardList.where((a) => mine.awards.containsKey(a.id)).length;
    final nextAward = awardList.where((a) => !mine.awards.containsKey(a.id)).firstOrNull;
    final history = wordsHistory(items, track, mine, now, inMemory);
    final wash = yours.isEmpty ? null : partWindow(yours.first, track, mine, now).base;

    // One plain sentence for where you stand, and one line of what to do.
    final toNext = miles.next == null ? 0 : miles.next! - inMemory;
    final tryAgain = keep?.tryAgain.length ?? 0, review = keep?.review.length ?? 0, out = keep?.out.length ?? 0;
    final say = tryAgain > 0
        ? 'A few to bring back'
        : review > 0
            ? 'Keep them strong'
            : inMemory == 0
                ? 'Your first words are coming'
                : miles.next != null
                    ? 'Steady does it'
                    : 'Every milestone reached';
    final guide = inMemory == 0
        ? 'Recall a verse or answer on a later day and it counts here.'
        : tryAgain > 0
            ? '$tryAgain ${tryAgain == 1 ? 'needs' : 'need'} another go today to stay in your count.'
            : review > 0
                ? 'Review $review soon to keep ${review == 1 ? 'it' : 'them'} in your count.'
                : miles.next != null
                    ? 'Next milestone: ${_fmt(miles.next!)} words. You’re ${_fmt(toNext)} ${toNext == 1 ? 'word' : 'words'} away.'
                    : 'Every word you’ve learned is holding.';
    final wordsFrac = miles.next != null ? (inMemory - prevMile) / (miles.next! - prevMile) : 1.0;
    final firstWords = history.where((q) => q.words > 0).firstOrNull ?? history.firstOrNull;

    return KPage(
      children: [
        const KTitle('Progress'),
        Semantics(
          container: true,
          label: 'At a glance',
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: RingChip(frac: wordsFrac, value: _fmt(inMemory), label: 'Words', color: const Color(0xFFF3D8B6))),
              Expanded(child: RingChip(frac: best > 0 ? (kept / best).clamp(0, 1).toDouble() : 0, value: '$kept', label: 'Days kept', color: const Color(0xFF9FB8E8))),
              Expanded(child: RingChip(frac: recitedCount > 0 ? holding[0] / recitedCount : 0, value: '${holding[0]}', label: 'Stones', color: const Color(0xFFB9A1E6))),
              Expanded(child: RingChip(frac: totalAll > 0 ? learnedAll / totalAll : 0, value: '${yours.length}', label: 'Windows', color: const Color(0xFFE5B66A))),
            ],
          ),
        ),
        ProgressHero(
          wash: wash,
          frac: wordsFrac,
          left: miles.next != null ? _fmt(prevMile) : null,
          right: miles.next != null ? _fmt(miles.next!) : null,
          number: _fmt(inMemory),
          say: say,
          line: guide,
          button: review > 0 ? 'Review $review soon' : out > 0 ? 'Bring $out back' : null,
          onButton: review > 0 || out > 0
              ? () => context.push('/lesson?mode=keep&items=${[for (final h in review > 0 ? keep!.review : keep!.out) h.item.id].join(',')}')
              : null,
        ),
        if (history.length > 2)
          Semantics(
            container: true,
            label: 'Words over time',
            child: KCard.column(
              gap: 10,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    const KLabel('Growing'),
                    Text('since ${_monthNames[DateTime.fromMillisecondsSinceEpoch(firstWords!.at).month - 1]}', style: sans(13, color: k.muted)),
                  ],
                ),
                StepChart(pts: history),
              ],
            ),
          ),
        Fold(
          title: 'How a word gets into your memory',
          children: [
            Text(
              'A word is in your memory once you’ve recalled it with no hints on a later day than you first recited it, and stays there as long as you recall it again in time.'
              '${words.recited > words.inMemory ? ' ${_fmt(words.recited - words.inMemory)} more are recited, not yet recalled on a later day.' : ''}',
              style: sans(14, color: k.muted, height: 1.5),
            ),
          ],
        ),
        if (keep != null && (keep.tryAgain.isNotEmpty || keep.review.isNotEmpty || keep.out.isNotEmpty))
          Semantics(
            container: true,
            label: 'Keeping your words',
            child: KCard.column(
              gap: 0,
              children: [
                if (keep.tryAgain.isNotEmpty)
                  _KeepRow('Try again today', '${keep.tryAgain.length} ${keep.tryAgain.length == 1 ? 'verse or answer' : 'verses and answers'}', k.ink),
                if (keep.review.isNotEmpty) _KeepRow('Review soon', '${_fmt(keep.review.fold(0, (n, h) => n + h.words))} words', k.ink),
                if (keep.out.isNotEmpty) _KeepRow('Out of memory · one recall brings back', '${keep.out.length}', k.muted),
              ],
            ),
          ),
        _WeekCard(days: mine.days, today: today, now: now, kept: kept, best: best),
        Fold(
          title: '${_monthNames[now.toLocal().month - 1]}, day by day${best > 0 ? ' · best $best' : ''}',
          children: [_MonthGrid(days: mine.days, today: today, now: now)],
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
            InkWell(
              onTap: () => context.push('/how'),
              child: Text('How to earn each stone', style: sans(14, weight: FontWeight.w600, color: k.ink).copyWith(decoration: TextDecoration.underline)),
            ),
          ],
        ),
        // Your windows: each lights up when seen; tap one to see it up close.
        KCard.column(
          gap: 14,
          children: [
            const KLabel('Your windows'),
            if (yours.isEmpty) Text('Finish your first lesson and its window starts to light here.', style: sans(15, color: k.muted)),
            LayoutBuilder(
              builder: (context, c) => Wrap(
                spacing: 12,
                runSpacing: 18,
                children: [for (final course in yours) SizedBox(width: (c.maxWidth - 12) / 2, child: _WallItem(course: course, track: track, mine: mine, now: now))],
              ),
            ),
          ],
        ),
        const CommunityPreview(),
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

class _WallItem extends StatelessWidget {
  const _WallItem({required this.course, required this.track, required this.mine, required this.now});
  final Course course;
  final Track track;
  final MemberProgress mine;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final s = courseStats(courseItems(course), track, mine);
    final w = partWindow(course, track, mine, now);
    return Semantics(
      button: true,
      label: 'See the ${course.title} window up close',
      child: InkWell(
        onTap: () => context.push('/window/${course.id}'),
        child: Column(
          children: [
            AppearWindow(mini: true, base: w.base, lit: w.lit, dusty: w.dusty, share: w.share, size: 128, started: true, label: '${course.title} window'),
            const SizedBox(height: 8),
            Text(course.title, textAlign: TextAlign.center, style: serif(16, weight: FontWeight.w600, color: k.ink, height: 1.2)),
            const SizedBox(height: 2),
            Text(s.learned >= s.total ? 'Finished' : '${s.learned} of ${s.total} learned', style: sans(13, color: k.muted)),
          ],
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
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.end,
            runSpacing: 4,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text('$kept', style: serif(34, weight: FontWeight.w600, color: k.ink, height: 1)),
                  const SizedBox(width: 8),
                  Flexible(child: Text(kept == 1 ? 'day kept' : 'days kept', style: sans(16, weight: FontWeight.w600, color: k.ink))),
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

/// This month, Monday first, and what keeps a day (inside the "Month, day by day" fold).
class _MonthGrid extends StatelessWidget {
  const _MonthGrid({required this.days, required this.today, required this.now});
  final List<String> days;
  final String today;
  final DateTime now;

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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
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
        const SizedBox(height: 12),
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
