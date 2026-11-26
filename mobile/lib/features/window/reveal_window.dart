// The lesson-done window (src/app/heir/ui/lesson.tsx DoneWindow): the window as it was, then the new light arriving pane
// by pane (sweep.dart, about two and a half seconds), and the gold arc on the frame moving on to the new share. The phone
// ticks for every new pane, taps more firmly when a whole question's glass is lit, and settles when the light stops.

import 'dart:async';

import 'package:material_ui/material_ui.dart';

import '../../platform/haptics.dart';
import 'glass_render.dart';
import 'glass_window.dart';
import 'sweep.dart';

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

class _RevealWindowState extends State<RevealWindow> with TickerProviderStateMixin {
  late List<double> _lit = widget.before;
  late List<bool> _dusty = widget.dustyBefore;
  late double _share = _shareOf(widget.before);
  int _arcMs = 900;
  GlassSweep? _sweep;
  bool _begun = false, _disposed = false;

  static double _shareOf(List<double> l) => l.isEmpty ? 0 : l.fold<double>(0, (a, b) => a + b) / l.length;

  bool get _anyNew {
    for (var i = 0; i < widget.after.length; i++) {
      if (widget.after[i] > (i < widget.before.length ? widget.before[i] : 0) + 1e-6) return true;
    }
    return false;
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Start the reveal once (the "reduce motion" setting can only be read here, not in initState).
    if (_begun) return;
    _begun = true;
    if (!_anyNew || (MediaQuery.maybeDisableAnimationsOf(context) ?? false)) {
      _lit = widget.after;
      _dusty = widget.dustyAfter;
      _share = _shareOf(widget.after);
      return;
    }
    _run();
  }

  Future<void> _run() async {
    final tier = widget.size >= 140 ? GlassTier.full : GlassTier.small;
    GlassSweep? sweep;
    try {
      sweep = await GlassSweep.prepare(widget.base, widget.after, rest: restStarted, tier: tier, from: widget.before, fromDusty: widget.dustyBefore);
    } catch (_) {}
    // The window as it was, for a moment, before the new light comes.
    await Future<void>.delayed(const Duration(milliseconds: 700));
    if (_disposed || !mounted) {
      sweep?.dispose();
      return;
    }
    if (sweep == null) return _settle();
    final s = sweep;
    s.onPane = (last) => last ? Haptics.questionLit() : Haptics.pane();
    setState(() {
      _sweep = s;
      _arcMs = s.length < 600 ? 600 : s.length;
      _share = _shareOf(widget.after);
    });
    s.start(this);
    await s.done;
    if (_disposed || !mounted) return;
    Haptics.settled();
    _settle();
    try {
      await windowImage(widget.base, widget.after, widget.dustyAfter, rest: restStarted, tier: tier);
    } catch (_) {}
    await Future<void>.delayed(const Duration(milliseconds: 50));
    if (_disposed || !mounted) return;
    setState(() => _sweep = null);
    s.dispose();
  }

  void _settle() {
    if (!mounted) return;
    setState(() {
      _lit = widget.after;
      _dusty = widget.dustyAfter;
      _share = _shareOf(widget.after);
    });
  }

  @override
  void dispose() {
    _disposed = true;
    _sweep?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => TweenAnimationBuilder<double>(
        tween: Tween(end: _share),
        duration: Duration(milliseconds: _arcMs),
        curve: const Cubic(.3, .6, .25, 1),
        builder: (context, share, _) => RoundWindow(base: widget.base, lit: _lit, dusty: _dusty, share: share, size: widget.size, label: widget.label, sweep: _sweep?.image),
      );
}
