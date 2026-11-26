// One course (src/app/heir/courses/[id]/page.tsx, ui/course-list.tsx CourseScreen): its window, name and what it is, three
// numbers (learned of total, in memory, average strength), and its questions or verses by part, each learned one with its
// strength (or "Today" if practised today) and its stone. Opening one shows its page (the item screen).

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../data/social.dart' show siteOrigin;
import '../../engine/content.dart';
import '../../engine/keep.dart' show DueForReview, KeepOptions, Kept, heldItems, keepLaunch;
import '../../engine/levels.dart' show levelInfo, needsRefresh, recited;
import '../../engine/memory.dart' show partMemories;
import '../../engine/progress.dart' show MemberProgress;
import '../../platform/share.dart';
import '../../engine/lesson.dart' show unitsFor;
import '../../engine/path.dart';
import '../../engine/types.dart';
import '../../state/clock.dart';
import '../../state/household.dart';
import '../../state/item_stats.dart';
import '../../ui/stone.dart';
import '../window/appear_window.dart';
import '../window/glass_window.dart';
import '../window/light.dart';
import '../../ui/screen_parts.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';

class CourseScreen extends ConsumerWidget {
  const CourseScreen({super.key, required this.id});
  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
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
    final track = ref.watch(meProvider)?.track ?? Track.adult;
    final mine = ref.watch(myProgressProvider);
    final now = ref.watch(clockProvider)();
    final w = partWindow(course, track, mine, now);
    final stats = courseStats(items, track, mine);
    final started = items.any((i) => unitsFor(i, track).any((u) => mine.units.contains(u.key)));
    // Strength of each learned question or verse ("Today" if practised today), and the course's three numbers.
    final learnedUnits = mine.units.toSet();
    final mems = partMemories(mine.log, mine.partSnap);
    final learnedItems = [for (final i in items) if (unitsFor(i, track).every((u) => learnedUnits.contains(u.key))) i];
    final strengthOf = <String, Object?>{
      for (final i in learnedItems) i.id: practisedToday(mine, i.id, now) ? 'today' : itemStrength(mine, i.id, now, mems),
    };
    final nums = strengthOf.values.whereType<double>().toList();
    final average = nums.isEmpty ? null : (nums.reduce((a, b) => a + b) / nums.length * 100).round();
    final inMemory = heldItems(items, mine, track, now, KeepOptions(launch: keepLaunch, tz: null)).where((h) => h.state is Kept || h.state is DueForReview).length;

    return KPage(
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Row(
            children: [
              KBack(label: 'Courses', onPressed: () => context.canPop() ? context.pop() : context.go('/courses')),
              const Spacer(),
              _ShareCourse(course),
            ],
          ),
        ),
        KCard.column(
          gap: 8,
          children: [
            if (parts.length <= 1) ...[
              // Opening a course you have begun: its window lights up pane by pane to where you are.
              Center(
                child: AppearWindow(
                  base: w.base,
                  lit: w.lit,
                  dusty: w.dusty,
                  share: w.share,
                  size: 168,
                  started: started,
                  beam: const CircleMotion(),
                  label: '${course.title} window, ${stats.learned} of ${stats.total} learned',
                ),
              ),
              const SizedBox(height: 8),
            ],
            Semantics(
              header: true,
              child: Text(course.title, textAlign: TextAlign.center, style: serif(30, weight: FontWeight.w500, color: k.ink, height: 1.15)),
            ),
            Text(course.blurb, textAlign: TextAlign.center, style: sans(16, color: k.muted, height: 1.45)),
            Text(
              '${items.length} ${itemNoun(items.isEmpty ? null : items.first, items.length)}${stats.learned > 0 ? ' · ${stats.learned} learned' : ''}',
              textAlign: TextAlign.center,
              style: sans(13, color: k.muted),
            ),
          ],
        ),
        if (learnedItems.isNotEmpty)
          Semantics(
            container: true,
            label: 'Where you are',
            child: Row(
              children: [
                _Stat('${learnedItems.length}', 'learned of ${items.length}'),
                const SizedBox(width: 8),
                _Stat('$inMemory', 'in memory'),
                const SizedBox(width: 8),
                _Stat(average == null ? '–' : '$average%', 'average strength'),
              ],
            ),
          ),
        if (parts.length > 1)
          KCard(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final (i, p) in parts.indexed)
                  Expanded(
                    child: Builder(builder: (context) {
                      final pw = partWindow(course, track, mine, now, i);
                      final done = pw.lit.where((f) => f >= 1).length;
                      return Column(
                        children: [
                          AppearWindow(mini: true, base: pw.base, lit: pw.lit, dusty: pw.dusty, share: pw.share, size: 78, started: started, beam: CircleMotion(delay: i * 0.35), label: '${p.title} window, $done of ${pw.items.length} learned'),
                          const SizedBox(height: 8),
                          Text(p.title, textAlign: TextAlign.center, style: sans(14, weight: FontWeight.w600, color: k.ink, height: 1.25)),
                          Text('$done of ${pw.items.length}', style: sans(12, color: k.muted)),
                        ],
                      );
                    }),
                  ),
              ],
            ),
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
                for (final (n, item) in p.items.indexed)
                  _ItemRow(item: item, first: n == 0 && parts.length <= 1, mine: mine, track: track, now: now, strength: strengthOf[item.id], learned: strengthOf.containsKey(item.id)),
              ],
            ),
          ),
      ],
    );
  }
}

/// One of the three numbers under the course card (heir.css .hr-cstats).
class _Stat extends StatelessWidget {
  const _Stat(this.value, this.label);
  final String value, label;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 12),
        decoration: BoxDecoration(
          color: const Color(0x0DFFFFFF),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0x14FFFFFF)),
        ),
        child: Column(
          children: [
            Text(value, style: serif(24, weight: FontWeight.w500, color: k.ink, height: 1.1)),
            const SizedBox(height: 2),
            Text(label, textAlign: TextAlign.center, style: sans(12, color: k.muted)),
          ],
        ),
      ),
    );
  }
}

class _ItemRow extends StatelessWidget {
  const _ItemRow({required this.item, required this.first, required this.mine, required this.track, required this.now, required this.strength, required this.learned});
  final Item item;
  final bool first, learned;
  final MemberProgress mine;
  final Track track;
  final DateTime now;

  /// The strength (0 to 1), 'today' if practised today, or null if it can't be told yet.
  final Object? strength;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final level = mine.levels[item.id] ?? 0;
    final dim = needsRefresh(mine, item.id, now);
    final status = dim
        ? 'Needs a refresh'
        : level > 0
            ? levelInfo(level)!.name
            : recited(item, track, mine.log)
                ? 'Recited'
                : learned
                    ? 'Practiced'
                    : null;
    final st = strength;
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
              if (learned || level > 0) ...[KStone(level: level, size: 30, dim: dim), const SizedBox(width: 12)],
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
              if (learned)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    if (st == 'today')
                      Text('Today', style: sans(13.5, weight: FontWeight.w700, color: k.muted))
                    else if (st is double)
                      Text('${(st * 100).round()}%', style: sans(13.5, weight: FontWeight.w700, color: bandColor(strengthBand(st)))),
                    if (status != null) ...[
                      const SizedBox(height: 2),
                      Text(status, style: sans(11.5, weight: FontWeight.w600, color: dim ? k.miss : k.muted)),
                    ],
                  ],
                )
              else if (status != null)
                Text(status, style: sans(12, weight: FontWeight.w600, color: k.muted))
              else
                KIcon('<path d="M9 6l6 6-6 6"/>', size: 16, color: k.muted, strokeWidth: 2.2),
            ],
          ),
        ),
      ),
    );
  }
}

/// A round share button beside Back (ui/share-course.tsx ShareCourseIcon): the share sheet with a link to the course, or the
/// link copied (shown by a tick) where there is no share sheet.
class _ShareCourse extends ConsumerStatefulWidget {
  const _ShareCourse(this.course);
  final Course course;

  @override
  ConsumerState<_ShareCourse> createState() => _ShareCourseState();
}

class _ShareCourseState extends ConsumerState<_ShareCourse> {
  bool _copied = false;

  Future<void> _share() async {
    final c = widget.course;
    final note = await shareOrCopy(ref, title: c.title, text: 'Learn ${c.title} with me on Katekize:', url: '$siteOrigin/heir/courses/${c.id}', copiedNote: 'Link copied');
    if (mounted && note != null) setState(() => _copied = true);
  }

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    return Semantics(
      button: true,
      label: _copied ? 'Link copied' : 'Share ${widget.course.title}',
      excludeSemantics: true,
      child: Material(
        color: k.card,
        shape: const CircleBorder(),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: _share,
          child: SizedBox(
            width: 44,
            height: 44,
            child: Center(
              child: KIcon(
                _copied ? '<path d="M5 12.5l4.5 4.5L19 7.5"/>' : '<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
                size: 18,
                color: k.ink,
                strokeWidth: 2,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
