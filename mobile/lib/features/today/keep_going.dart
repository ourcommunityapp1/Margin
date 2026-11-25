// Keep going (today.tsx KeepGoing): one slim row per started course; tap one to open it to Next lesson above Review.
// "Add a course" is not here (it is on Courses).

import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../engine/content.dart';
import '../../engine/dayplan.dart';
import '../../engine/progress.dart';
import '../../engine/types.dart';
import '../../ui/theme.dart';
import '../../ui/widgets.dart';
import 'today_cards.dart';
import '../window/glass_window.dart';
import '../window/light.dart';

class KeepGoing extends StatefulWidget {
  const KeepGoing({super.key, required this.started, required this.track, required this.mine, required this.now});
  final List<Course> started;
  final Track track;
  final MemberProgress mine;
  final DateTime now;

  @override
  State<KeepGoing> createState() => _KeepGoingState();
}

class _KeepGoingState extends State<KeepGoing> {
  String? _open;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(6, 6, 6, 10),
          child: Semantics(header: true, child: Text('Keep going', style: sans(14, weight: FontWeight.w600, color: const Color(0xFFA9A196), spacing: 2.2))),
        ),
        for (final c in widget.started) ...[
          Padding(padding: const EdgeInsets.only(bottom: 10), child: _open == c.id ? _openCard(c) : _row(c)),
        ],
      ],
    );
  }

  Widget _mini(Course c) {
    final w = partWindow(c, widget.track, widget.mine, widget.now);
    return MiniWindow(base: w.base, lit: w.lit, dusty: w.dusty, size: 56, started: true, label: '${c.title} window');
  }

  Widget _round(Course c) {
    final w = partWindow(c, widget.track, widget.mine, widget.now);
    return RoundWindow(base: w.base, lit: w.lit, dusty: w.dusty, share: w.share, size: 220, label: '${c.title} window');
  }

  Widget _row(Course c) {
    final line = nextLine(widget.mine, widget.track, c, widget.now);
    return Semantics(
      button: true,
      expanded: false,
      child: Material(
        color: const Color(0xFF15181B),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24), side: const BorderSide(color: Color(0x12FFFFFF))),
        child: InkWell(
          borderRadius: BorderRadius.circular(24),
          onTap: () => setState(() => _open = c.id),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 16, 12),
            child: Row(
              children: [
                _mini(c),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(c.title, style: sans(16, weight: FontWeight.w700, color: roseInk)),
                      const SizedBox(height: 2),
                      Text(line.text, style: sans(14, color: roseMuted)),
                    ],
                  ),
                ),
                KIcon('<path d="M9 6l6 6-6 6"/>', size: 16, color: roseMuted, strokeWidth: 2.2),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _openCard(Course c) {
    final line = nextLine(widget.mine, widget.track, c, widget.now);
    return Stack(
      children: [
        RoseCard(
          children: [
            const SizedBox(height: 14),
            Semantics(header: true, child: Text(c.title, textAlign: TextAlign.center, style: serif(26, weight: FontWeight.w500, color: roseInk, height: 1.12))),
            _round(c),
            if (!line.allLearned)
              GlassButton(line.text == 'Lock-in next' ? 'Lock it in' : 'Next lesson', onPressed: () => context.push('/lesson?mode=lesson&course=${c.id}')),
            GlassButton('Review', quiet: !line.allLearned, arrow: line.allLearned, onPressed: () => context.push('/lesson?mode=review&course=${c.id}')),
          ],
        ),
        Positioned(
          top: 14,
          right: 14,
          child: Semantics(
            button: true,
            label: 'Close ${c.title}',
            child: InkWell(
              customBorder: const CircleBorder(),
              onTap: () => setState(() => _open = null),
              child: Container(
                width: 32,
                height: 32,
                decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0x59000000)),
                child: Center(child: KIcon('<path d="M6 6l12 12M18 6L6 18"/>', size: 14, color: roseInk, strokeWidth: 2.4)),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
