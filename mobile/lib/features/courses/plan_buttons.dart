// One way to put a course in your plan or take it out, the same everywhere a course is shown (src/app/heir/ui/plan-button.tsx).
// "Add to plan" makes it your daily course (where new lessons come from); the others in your plan keep their reviews.
// "Remove from plan" takes it out of Today; nothing is lost, and adding it again picks up where you left off.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_ui/material_ui.dart';

import '../../data/household.dart';
import '../../engine/content.dart';
import '../../engine/dayplan.dart' show startedCourses;
import '../../engine/types.dart';
import '../../state/household.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';

const _cream = Color(0xFFF3D8B6), _creamInk = Color(0xFF15181B), _paleInk = Color(0xFFF3E9D8);

class PlanState {
  const PlanState({required this.isIn, required this.isDaily, required this.dailyTitle, required this.add, required this.remove});
  final bool isIn, isDaily;
  final String? dailyTitle;
  final VoidCallback add, remove;
}

PlanState planStateOf(WidgetRef ref, Course course) {
  final household = ref.watch(householdProvider);
  final mine = ref.watch(myProgressProvider);
  final track = ref.watch(meProvider)?.track ?? Track.adult;
  final plan = household.plan;
  final daily = dailyCourse(plan);
  // The courses in the plan right now (the daily course, then every course begun and not removed).
  final inYourPlan = startedCourses(mine, track, daily, plan?.removed ?? const [], plan?.verses ?? const []);
  final started = startedCourses(mine, track, null, const [], plan?.verses ?? const []).any((c) => c.id == course.id);
  final notifier = ref.read(householdProvider.notifier);
  return PlanState(
    isIn: inPlan(plan, course.id, started),
    isDaily: daily == course.id,
    dailyTitle: courseFor(daily)?.title,
    add: () => notifier.update((h) => setPlan(h, Plan(course: course.id))),
    remove: () => notifier.update((h) => removeFromPlan(h, course.id, inYourPlan.where((c) => c.id != course.id).firstOrNull?.id)),
  );
}

/// A pill on a dark card (`.hr-hero-btn`): cream for the main choice, outlined for the quieter one.
class HeroPill extends StatelessWidget {
  const HeroPill(this.label, {super.key, required this.onPressed, this.quiet = false, this.open});
  final String label;
  final VoidCallback onPressed;
  final bool quiet;

  /// When set, a small arrow that turns as the choice under it opens.
  final bool? open;

  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        expanded: open,
        child: Material(
          color: quiet ? Colors.transparent : _cream,
          shape: StadiumBorder(side: BorderSide(color: quiet ? const Color(0x8CF3D8B6) : Colors.transparent)),
          child: InkWell(
            customBorder: const StadiumBorder(),
            onTap: onPressed,
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 48),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 12),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Flexible(
                      child: Text(label, textAlign: TextAlign.center, style: sans(15, weight: quiet ? FontWeight.w600 : FontWeight.w700, color: quiet ? _paleInk : _creamInk, height: 1.1)),
                    ),
                    if (open != null) ...[
                      const SizedBox(width: 8),
                      AnimatedRotation(
                        turns: open! ? 0.5 : 0,
                        duration: const Duration(milliseconds: 150),
                        child: KIcon('<path d="M6 9l6 6 6-6"/>', size: 16, color: quiet ? _paleInk : _creamInk, strokeWidth: 2.4),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      );
}

/// Add to plan; or "Added to plan" with a down arrow, and Remove from plan one tap further (no accidental removals).
class PlanButtons extends ConsumerStatefulWidget {
  const PlanButtons({super.key, required this.course});
  final Course course;

  @override
  ConsumerState<PlanButtons> createState() => _PlanButtonsState();
}

class _PlanButtonsState extends ConsumerState<PlanButtons> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final s = planStateOf(ref, widget.course);
    if (!s.isIn) return HeroPill('Add to plan', onPressed: s.add);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        HeroPill('Added to plan', quiet: true, open: _open, onPressed: () => setState(() => _open = !_open)),
        if (_open) ...[
          const SizedBox(height: 8),
          HeroPill('Remove from plan', quiet: true, onPressed: () {
            setState(() => _open = false);
            s.remove();
          }),
        ],
      ],
    );
  }
}

/// One quiet line under the buttons: where this course stands in the plan.
class PlanNote extends ConsumerWidget {
  const PlanNote({super.key, required this.course});
  final Course course;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = planStateOf(ref, course);
    final text = s.isDaily
        ? 'In your plan: today’s new lessons come from here.'
        : s.isIn
        ? 'In your plan: reviews here, new lessons from ${s.dailyTitle ?? 'your newest course'}.'
        : s.dailyTitle != null
        ? 'Adds ${course.title} to your daily courses. New lessons will come from it, and ${s.dailyTitle} stays for reviews.'
        : 'Adds ${course.title} to your daily courses.';
    return Text(text, textAlign: TextAlign.center, style: sans(13, color: const Color(0xFFC9C1B3), height: 1.45));
  }
}

/// The same two choices as a compact row, for a list of courses (the plan screen).
class PlanRow extends ConsumerStatefulWidget {
  const PlanRow({super.key, required this.course, required this.learned, required this.total, this.first = false});
  final Course course;
  final int learned, total;
  final bool first;

  @override
  ConsumerState<PlanRow> createState() => _PlanRowState();
}

class _PlanRowState extends ConsumerState<PlanRow> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final s = planStateOf(ref, widget.course);
    Widget small(String label, VoidCallback on, {bool quiet = false, bool? open}) => Semantics(
          button: true,
          expanded: open,
          child: Material(
            color: quiet ? Colors.transparent : k.button,
            shape: StadiumBorder(side: BorderSide(color: quiet ? k.edge : k.button)),
            child: InkWell(
              customBorder: const StadiumBorder(),
              onTap: on,
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 40),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    Flexible(child: Text(label, style: sans(14, weight: FontWeight.w600, color: quiet ? k.ink : k.buttonInk, height: 1))),
                    if (open != null) ...[
                      const SizedBox(width: 6),
                      AnimatedRotation(turns: open ? 0.5 : 0, duration: const Duration(milliseconds: 150), child: KIcon('<path d="M6 9l6 6 6-6"/>', size: 14, color: k.ink, strokeWidth: 2.4)),
                    ],
                  ]),
                ),
              ),
            ),
          ),
        );
    return Container(
      decoration: BoxDecoration(border: widget.first ? null : Border(top: BorderSide(color: k.line))),
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Wrap(
        alignment: WrapAlignment.spaceBetween,
        crossAxisAlignment: WrapCrossAlignment.center,
        spacing: 10,
        runSpacing: 10,
        children: [
          ConstrainedBox(
            constraints: const BoxConstraints(minWidth: 170),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(widget.course.title, style: sans(16, weight: FontWeight.w600, color: k.ink, height: 1.25)),
                const SizedBox(height: 3),
                Text('${s.isIn ? 'In your plan · ' : ''}${widget.learned > 0 ? '${widget.learned} of ${widget.total} learned' : 'Not started'}', style: sans(13, color: k.muted)),
              ],
            ),
          ),
          Wrap(spacing: 8, runSpacing: 8, children: [
            if (s.isIn)
              small('Added to plan', () => setState(() => _open = !_open), quiet: true, open: _open)
            else
              small('Add to plan', s.add),
            if (s.isIn && _open)
              small('Remove from plan', () {
                setState(() => _open = false);
                s.remove();
              }, quiet: true),
          ]),
        ],
      ),
    );
  }
}

/// Add one verse or answer to the plan on its own. It knows when the verse is already in the plan: on its own, or through
/// its course.
class ItemPlanButton extends ConsumerStatefulWidget {
  const ItemPlanButton({super.key, required this.item, required this.course});
  final Item item;
  final Course course;

  @override
  ConsumerState<ItemPlanButton> createState() => _ItemPlanButtonState();
}

class _ItemPlanButtonState extends ConsumerState<ItemPlanButton> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final k = context.k;
    final c = planStateOf(ref, widget.course);
    final plan = ref.watch(householdProvider).plan;
    final own = plan?.verses.contains(widget.item.id) ?? false;
    final through = c.isIn;
    final note = own && through
        ? 'In your plan, and through ${widget.course.title}'
        : own
        ? 'In your plan on its own'
        : through
        ? 'In your plan through ${widget.course.title}'
        : 'Adds just this one to your plan';
    final notifier = ref.read(householdProvider.notifier);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (!own && !through)
          KButton('Add to plan', outline: true, onPressed: () => notifier.update((h) => addVerse(h, widget.item.id, widget.course.id)))
        else ...[
          KButton('Added to plan ${_open ? '▴' : '▾'}', outline: true, onPressed: () => setState(() => _open = !_open)),
          if (_open && own) ...[
            const SizedBox(height: 8),
            KButton('Remove this one from plan', outline: true, onPressed: () {
              setState(() => _open = false);
              notifier.update((h) => removeVerse(h, widget.item.id));
            }),
          ],
          if (_open && through) ...[
            const SizedBox(height: 8),
            KButton('Remove ${widget.course.title} from plan', outline: true, onPressed: () {
              setState(() => _open = false);
              c.remove();
            }),
          ],
        ],
        const SizedBox(height: 6),
        Text(note, textAlign: TextAlign.center, style: sans(13, color: k.muted)),
      ],
    );
  }
}
