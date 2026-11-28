// Learn (src/app/heir/courses/page.tsx): a search bar (opens Discover), "In your plan" first (the course you're on, then
// every course you've begun), your single verses, the season's course while it's in season, then every other course on its
// shelf, taken in turn with the shelves of single verses. Each course is a card with its window (lit as far as you have
// come), its name, two lines on what it is, and how far you have got.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../data/household.dart' show dailyCourse;
import '../../data/verse_shelves.dart';
import '../../engine/content.dart';
import '../../engine/dayplan.dart' show startedCourses;
import '../../engine/lesson.dart' show unitsFor;
import '../../engine/path.dart';
import '../../engine/progress.dart';
import '../../engine/season.dart' show seasonLabel;
import '../../engine/types.dart';
import '../../state/clock.dart';
import '../../state/household.dart';
import '../window/glass_window.dart';
import '../window/light.dart';
import '../../ui/screen_parts.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';

class CoursesScreen extends ConsumerWidget {
  const CoursesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final k = context.k;
    final track = ref.watch(meProvider)?.track ?? Track.adult;
    final mine = ref.watch(myProgressProvider);
    final now = ref.watch(clockProvider)();
    final plan = ref.watch(householdProvider).plan;
    final mineCourses = startedCourses(mine, track, dailyCourse(plan), plan?.removed ?? const [], plan?.verses ?? const []);
    final mineIds = mineCourses.map((c) => c.id).toSet();
    // The season's course, if one is in season now.
    final seasonal = [
      for (final c in courses)
        if (c.season != null)
          if (seasonLabel(c.season!, now) case final label?) (c: c, label: label),
    ].firstOrNull;
    List<Course> onShelf(String id) => courses.where((c) => c.shelf == id && c.id != seasonal?.c.id && !mineIds.contains(c.id)).toList();
    final learnedUnits = mine.units.toSet();
    bool isLearned(Item i) => unitsFor(i, track).every((u) => learnedUnits.contains(u.key));
    final myVerses = [for (final id in plan?.verses ?? const <String>[]) ?getItem(id)];
    final courseShelves = [for (final (id, title) in shelves) if (onShelf(id).isNotEmpty) (id: id, title: title, list: onShelf(id))];
    final verseRows = [for (final sh in verseShelves) (id: sh.id, title: sh.title, items: [for (final id in sh.ids) ?getItem(id)])];
    Widget label(String t) => Padding(padding: const EdgeInsets.fromLTRB(6, 8, 6, 0), child: Semantics(header: true, child: KLabel(t)));
    // A row that scrolls sideways; the cards share one height, as tall as the tallest needs (large text included).
    Widget verseRow(List<Item> items) => SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          clipBehavior: Clip.none,
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (final (i, it) in items.indexed) ...[if (i > 0) const SizedBox(width: 10), _VerseCard(item: it, learned: isLearned(it))],
              ],
            ),
          ),
        );
    var offset = 0;
    return KPage(
      children: [
        const KTitle('Learn'),
        Semantics(
          button: true,
          label: 'Search verses, topics and courses',
          excludeSemantics: true,
          child: Material(
            color: k.card,
            shape: const StadiumBorder(),
            child: InkWell(
              customBorder: const StadiumBorder(),
              onTap: () => context.push('/discover'),
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 48),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(children: [
                    KIcon('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', size: 18, color: k.muted, strokeWidth: 2.2),
                    const SizedBox(width: 10),
                    Expanded(child: Text('Search verses, topics, courses', maxLines: 1, overflow: TextOverflow.ellipsis, style: sans(15, color: k.muted))),
                  ]),
                ),
              ),
            ),
          ),
        ),
        if (mineCourses.isNotEmpty) ...[
          label('In your plan'),
          for (final (i, c) in mineCourses.indexed) _CourseCard(c, k, track, mine, now, ListMotion(index: i, count: mineCourses.length, offset: 0)),
        ],
        if (myVerses.isNotEmpty) ...[label('Your verses'), verseRow(myVerses)],
        if (seasonal != null && !mineIds.contains(seasonal.c.id)) ...[
          label('In season · ${seasonal.label}'),
          _CourseCard(seasonal.c, k, track, mine, now, ListMotion(index: 0, count: 1, offset: 900)),
        ],
        // Course shelves and verse shelves taken in turn, so the page alternates between a list of courses and a row of verses.
        for (var n = 0; n < (courseShelves.length > verseRows.length ? courseShelves.length : verseRows.length); n++) ...[
          if (n < courseShelves.length) ...[
            label(courseShelves[n].title),
            for (final (i, c) in courseShelves[n].list.indexed) _CourseCard(c, k, track, mine, now, ListMotion(index: i, count: courseShelves[n].list.length, offset: (offset += 1700))),
          ],
          if (n < verseRows.length && verseRows[n].items.isNotEmpty) ...[label(verseRows[n].title), verseRow(verseRows[n].items)],
        ],
      ],
    );
  }
}

/// A verse on a shelf: its reference, its first words, and whether it's learned.
class _VerseCard extends StatelessWidget {
  const _VerseCard({required this.item, required this.learned});
  final Item item;
  final bool learned;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    return Semantics(
      button: true,
      child: Material(
        color: k.card,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () => context.push('/item/${Uri.encodeComponent(item.id)}'),
          child: SizedBox(
            width: 168,
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(itemLabel(item), style: serif(15, weight: FontWeight.w600, color: k.ink, height: 1.2)),
                  const SizedBox(height: 8),
                  Text(item.text, maxLines: 3, overflow: TextOverflow.ellipsis, style: sans(13, color: k.muted, height: 1.4)),
                  const SizedBox(height: 8),
                  const Spacer(),
                  Text(learned ? 'Learned' : 'Learn · 2 min', style: sans(12.5, weight: FontWeight.w600, color: learned ? k.good : k.ink)),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _CourseCard extends StatelessWidget {
  const _CourseCard(this.course, this.k, this.track, this.mine, this.now, this.motion);
  final Course course;
  final KColors k;
  final Track track;
  final MemberProgress mine;
  final DateTime now;
  final GlassMotion motion;

  @override
  Widget build(BuildContext context) {
    final w = partWindow(course, track, mine, now);
    final items = courseItems(course);
    final stats = courseStats(items, track, mine);
    final started = items.any((i) => unitsFor(i, track).any((u) => mine.units.contains(u.key)));
    final status = stats.learned >= stats.total ? 'Finished' : started ? '${stats.learned} of ${stats.total} learned' : '';
    return Semantics(
      button: true,
      child: Material(
        color: k.card,
        borderRadius: BorderRadius.circular(KSize.cardRadius),
        child: InkWell(
          borderRadius: BorderRadius.circular(KSize.cardRadius),
          onTap: () => context.push('/courses/${course.id}'),
          child: Padding(
            // Less padding than other cards, and no arrow (the whole card is tappable): the words get the room.
            padding: const EdgeInsets.fromLTRB(16, 18, 18, 18),
            child: Row(
              children: [
                MiniWindow(base: w.base, lit: w.lit, dusty: w.dusty, size: 92, started: started, motion: motion, inList: true, label: '${course.title} window'),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      KBalancedText(course.title, style: serif(20, weight: FontWeight.w500, color: k.ink, height: 1.15)),
                      const SizedBox(height: 5),
                      KBalancedText(course.short, style: sans(13.5, color: k.muted, height: 1.4)),
                      if (status.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Text(status, style: sans(13, weight: FontWeight.w600, color: k.ink)),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
