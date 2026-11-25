// The lesson-done window (src/app/heir/ui/lesson.tsx DoneWindow): the window as it was, then the new light arriving a few
// panes at a time, and the gold arc on the frame moving on to the new share.

import 'dart:async';

import 'package:material_ui/material_ui.dart';

import 'glass_render.dart';
import 'glass_window.dart';

class RevealWindow extends StatefulWidget {
  const RevealWindow({super.key, required this.base, required this.before, required this.after, required this.dustyBefore, required this.dustyAfter, this.size = 280, this.label});
  final String base;
  final List<double> before, after;
  final List<bool> dustyBefore, dustyAfter;
  final double size;
  final String? label;

  @override
  State<RevealWindow> createState() => _RevealWindowState();
}

class _RevealWindowState extends State<RevealWindow> {
  static const _stageMs = 280;

  late List<double> _lit = widget.before;
  late List<bool> _dusty = widget.dustyBefore;
  Timer? _start, _timer;
  int _stage = 0;

  double _share(List<double> l) => l.isEmpty ? 0 : l.fold<double>(0, (a, b) => a + b) / l.length;

  List<double> _at(int stage, int stages) => [for (var i = 0; i < widget.after.length; i++) widget.before[i] + (widget.after[i] - widget.before[i]) * stage / stages];

  int _stages = 0;
  bool _begun = false;

  @override
  void initState() {
    super.initState();
    final changed = [for (var i = 0; i < widget.after.length; i++) if (widget.after[i] > widget.before[i] + 1e-6) i];
    if (changed.isEmpty) {
      _dusty = widget.dustyAfter;
      return;
    }
    // A few stages of new light, each drawn ahead of time so it appears the moment its turn comes.
    _stages = (_share(widget.after) - _share(widget.before)) * 100 > 12 ? 8 : 4;
    final tier = widget.size >= 140 ? GlassTier.full : GlassTier.small;
    for (var s = 1; s <= _stages; s++) {
      final lit = _at(s, _stages);
      windowImage(widget.base, lit, widget.dustyAfter, rest: restStarted, tier: GlassTier.small).ignore();
      if (tier == GlassTier.full) windowImage(widget.base, lit, widget.dustyAfter, rest: restStarted, tier: tier).ignore();
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Start the reveal once (the "reduce motion" setting can only be read here, not in initState).
    if (_begun || _stages == 0) return;
    _begun = true;
    if (MediaQuery.maybeDisableAnimationsOf(context) ?? false) {
      _lit = widget.after;
      _dusty = widget.dustyAfter;
      return;
    }
    _start = Timer(const Duration(milliseconds: 700), () {
      if (!mounted) return;
      _timer = Timer.periodic(const Duration(milliseconds: _stageMs), (t) {
        if (!mounted) return t.cancel();
        _stage++;
        setState(() {
          _lit = _at(_stage, _stages);
          _dusty = widget.dustyAfter;
        });
        if (_stage >= _stages) t.cancel();
      });
    });
  }

  @override
  void dispose() {
    _start?.cancel();
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => TweenAnimationBuilder<double>(
        tween: Tween(end: _share(_lit)),
        duration: const Duration(milliseconds: 900),
        curve: const Cubic(.3, .6, .25, 1),
        builder: (context, share, _) => RoundWindow(base: widget.base, lit: _lit, dusty: _dusty, share: share, size: widget.size, label: widget.label),
      );
}
