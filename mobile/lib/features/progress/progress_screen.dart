// Progress, as one scroll (src/app/heir/progress/page.tsx): a row of rings (verses, catechism, minutes this week, day
// streak), the words in your memory (an arc over the blurred glass of your first course) and how they have grown, the five
// levels, and the window of every course you've begun (each lights up when seen). Hidden for now, as on the website
// (ADR-004): how a word gets into memory, keeping rows, days kept, the month calendar, understanding, awards.

import 'dart:math' as math;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../engine/content.dart';
import '../../engine/lesson.dart' show unitsFor;
import '../../engine/levels.dart';
import '../../engine/measures.dart';
import '../../engine/path.dart';
import '../../engine/planner.dart' show defaultGoal;
import '../../engine/progress.dart';
import '../../engine/tiers.dart';
import '../../engine/types.dart';
import '../../state/clock.dart';
import '../../state/household.dart';
import '../../state/keep.dart';
import '../../state/memory_history.dart';
import '../../ui/screen_parts.dart';
import '../../ui/stone.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';
import '../window/appear_window.dart';
import '../window/light.dart';
import 'progress_parts.dart';

// Recited (no stone yet) in warm glass, then each stone's own colour.
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
    // How many questions and verses sit at each of the five levels right now (their highest).
    final tierCounts = [for (final _ in tiers) 0];
    for (final i in items) {
      final n = levelShown(mine, i, track);
      if (n > 0) tierCounts[tierIndex(n)]++;
    }
    final startedCount = tierCounts.fold(0, (a, b) => a + b);
    // Every course with anything learned, the one in progress first.
    final yours = [
      for (final c in courses)
        if (courseItems(c).any((i) => unitsFor(i, track).any((u) => mine.units.contains(u.key)))) c,
    ]..sort((a, b) => (b.id == plan?.course ? 1 : 0) - (a.id == plan?.course ? 1 : 0));
    final history = wordsHistory(items, track, mine, now, inMemory);
    final wash = yours.isEmpty ? null : partWindow(yours.first, track, mine, now).base;

    final review = keep?.review.length ?? 0, out = keep?.out.length ?? 0;
    final wordsFrac = miles.next != null ? (inMemory - prevMile) / (miles.next! - prevMile) : 1.0;
    final firstWords = history.where((q) => q.words > 0).firstOrNull ?? history.firstOrNull;
    // The ring row: verses and catechism answers learned (of those in the courses you've begun), active minutes this week,
    // and the streak.
    final startedItems = [for (final c in yours) ...courseItems(c)];
    final learnedUnits = mine.units.toSet();
    bool isLearned(Item i) => unitsFor(i, track).every((u) => learnedUnits.contains(u.key));
    final verseItems = startedItems.where(isVerse).toList(), answerItems = startedItems.where((i) => !isVerse(i)).toList();
    final versesLearned = verseItems.where(isLearned).length, answersLearned = answerItems.where(isLearned).length;
    final sinceWeek = now.millisecondsSinceEpoch - 7 * 86400000;
    final weekMinutes = (mine.log.where((e) => DateTime.parse(e.at).millisecondsSinceEpoch > sinceWeek).fold(0, (n, e) => n + math.min(e.ms, 120000).toInt()) / 60000).round();
    final goalMinutes = (plan?.minutes ?? defaultGoal) * 6;

    return KPage(
      children: [
        const KTitle('Progress'),
        Semantics(
          container: true,
          label: 'At a glance',
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: RingChip(frac: verseItems.isEmpty ? 0 : versesLearned / verseItems.length, value: '$versesLearned', label: 'Verses', color: const Color(0xFFF3D8B6))),
              Expanded(child: RingChip(frac: answerItems.isEmpty ? 0 : answersLearned / answerItems.length, value: '$answersLearned', label: 'Catechism', color: const Color(0xFF9FB8E8))),
              Expanded(child: RingChip(frac: goalMinutes > 0 ? math.min(1, weekMinutes / goalMinutes) : 0, value: '$weekMinutes', label: 'Min this week', color: const Color(0xFFB9E3B0))),
              Expanded(child: RingChip(frac: best > 0 ? (kept / best).clamp(0, 1).toDouble() : 0, value: '$kept', label: 'Day streak', color: const Color(0xFFE5B66A))),
            ],
          ),
        ),
        ProgressHero(
          wash: wash,
          frac: wordsFrac,
          left: miles.next != null ? _fmt(prevMile) : null,
          right: miles.next != null ? _fmt(miles.next!) : null,
          number: _fmt(inMemory),
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
        // Levels
        KCard.column(
          gap: 14,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [const KLabel('Levels'), Flexible(child: Text('All courses · $startedCount started', textAlign: TextAlign.right, style: sans(13, color: k.muted)))],
            ),
            for (final (i, t) in tiers.indexed)
              _StoneRow(level: t.n, name: t.name, word: t.stone, count: tierCounts[i], total: startedCount, color: Color(t.color), dim: tierCounts[i] == 0),
            InkWell(
              onTap: () => context.push('/how'),
              child: Text('What the levels mean', style: sans(14, weight: FontWeight.w600, color: k.ink).copyWith(decoration: TextDecoration.underline)),
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
