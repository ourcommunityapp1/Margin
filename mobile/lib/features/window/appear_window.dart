// A window on Today that lights up when it comes into view (src/app/heir/ui/today.tsx CardWindow, glass/mini.tsx `reveal`).
//
// It starts dark (and the big window's gold arc at nothing). Once it is at least 60% on screen and its glass has loaded, it
// waits 350 ms and lights pane by pane (sweep.dart: question by question in `sweepOrder`, each pane fading up over 400 ms,
// about two and a half seconds in all) up to where the person really is, never beyond, while the gold arc grows with it.
// Dust (needs a refresh) is shown once it has settled, so the final picture is exactly the still window. It plays each time
// the screen is opened. A course with nothing learned, and anyone who has "reduce motion" on, sees the final state at once.

import 'dart:async';

import 'package:material_ui/material_ui.dart';

import 'glass_render.dart';
import '../../platform/haptics.dart';
import 'glass_window.dart';
import 'sweep.dart';

class AppearWindow extends StatefulWidget {
  const AppearWindow({
    super.key,
    required this.base,
    required this.lit,
    this.dusty,
    required this.share,
    this.started = true,
    this.size = 240,
    this.label,
    this.beam,
    this.mini = false,
    this.feel = false,
  });

  final String base;
  final List<double> lit;
  final List<bool>? dusty;

  /// The share of the window lit, 0 to 1 (the big window's gold arc).
  final double share;
  final double size;
  final bool started;
  final String? label;
  final GlassMotion? beam;

  /// The small window of a row (a stone ring, no arc) rather than the big round one.
  final bool mini;

  /// Tick the phone for every pane as it comes on, and settle when it stops (the big windows; small row windows stay quiet,
  /// so several lighting at once don't buzz together).
  final bool feel;

  @override
  State<AppearWindow> createState() => _AppearWindowState();
}

class _AppearWindowState extends State<AppearWindow> with TickerProviderStateMixin {

  late List<double> _lit = _dark;
  List<bool>? _dusty;
  double _share = 0;
  GlassSweep? _sweep;
  int _arcMs = 500;
  ScrollPosition? _scroll;
  bool _seen = false, _ran = false, _reduce = false;
  int _run = 0; // bumped to cancel a sweep still waiting for its glass

  List<double> get _dark => List.filled(widget.lit.length, 0.0);
  bool get _hasLight => widget.share > 0 && widget.lit.any((f) => f > 0);

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _reduce = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    if (_reduce || !_hasLight) {
      _lit = widget.lit;
      _dusty = widget.dusty;
      _share = widget.share;
      _ran = true;
    }
    final scroll = Scrollable.maybeOf(context)?.position;
    if (scroll != _scroll) {
      _scroll?.removeListener(_check);
      _scroll = scroll?..addListener(_check);
    }
    WidgetsBinding.instance.addPostFrameCallback((_) => _check());
  }

  @override
  void didUpdateWidget(AppearWindow old) {
    super.didUpdateWidget(old);
    final changed = old.base != widget.base || old.share != widget.share || !_same(old.lit, widget.lit) || !_sameB(old.dusty, widget.dusty);
    if (!changed) return;
    if (_reduce || !_hasLight || _ran) {
      // New progress after it has played (a lesson finished elsewhere): show it as it is.
      _cancel();
      _lit = widget.lit;
      _dusty = widget.dusty;
      _share = widget.share;
      _ran = true;
    }
  }

  static bool _same(List<double> a, List<double> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  static bool _sameB(List<bool>? a, List<bool>? b) {
    if (a == null || b == null) return a == b;
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  /// At least 60% of the window is on screen.
  void _check() {
    if (!mounted || _seen || _ran) return;
    final box = context.findRenderObject();
    if (box is! RenderBox || !box.attached || !box.hasSize || box.size.isEmpty) return;
    final rect = box.localToGlobal(Offset.zero) & box.size;
    final screen = Offset.zero & MediaQuery.sizeOf(context);
    final over = rect.intersect(screen);
    if (over.width <= 0 || over.height <= 0) return;
    if (over.width * over.height >= 0.6 * rect.width * rect.height) {
      _seen = true;
      _play();
    }
  }

  void _cancel() {
    _run++;
    _sweep?.dispose();
    _sweep = null;
  }

  void _settle() {
    if (!mounted) return;
    setState(() {
      _lit = widget.lit;
      _dusty = widget.dusty;
      _share = widget.share;
    });
  }

  Future<void> _play() async {
    if (_ran) return;
    _ran = true;
    _cancel();
    final run = _run;
    final tier = widget.size >= 140 ? GlassTier.full : GlassTier.small;
    final GlassSweep? prepared;
    try {
      prepared = await GlassSweep.prepare(widget.base, widget.lit, rest: restStarted, tier: tier);
    } catch (_) {
      if (run == _run) _settle();
      return;
    }
    if (!mounted || run != _run) {
      prepared?.dispose();
      return;
    }
    if (prepared == null) return _settle();
    final sweep = prepared;
    await Future<void>.delayed(const Duration(milliseconds: 350));
    if (!mounted || run != _run) {
      sweep.dispose();
      return;
    }
    setState(() {
      _sweep = sweep;
      _arcMs = sweep.length < 600 ? 600 : sweep.length;
      _share = widget.share;
    });
    if (widget.feel) sweep.onPane = (_) => Haptics.pane();
    sweep.start(this);
    await sweep.done;
    if (widget.feel && mounted && run == _run) Haptics.settled();
    if (!mounted || run != _run) return;
    // Settle: the still window takes over once its picture is ready, so nothing flickers back to dark.
    setState(() {
      _lit = widget.lit;
      _dusty = widget.dusty;
    });
    try {
      await windowImage(widget.base, widget.lit, widget.dusty, rest: restStarted, tier: tier);
    } catch (_) {}
    await Future<void>.delayed(const Duration(milliseconds: 50));
    if (!mounted || run != _run) return;
    setState(() => _sweep = null);
    sweep.dispose();
  }

  @override
  void dispose() {
    _cancel();
    _scroll?.removeListener(_check);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final sweep = _sweep?.image;
    if (widget.mini) {
      return MiniWindow(base: widget.base, lit: _lit, dusty: _dusty, size: widget.size, started: widget.started, label: widget.label, motion: widget.beam, sweep: sweep);
    }
    return TweenAnimationBuilder<double>(
      tween: Tween(end: _share),
      duration: Duration(milliseconds: _arcMs),
      curve: Curves.easeOut,
      builder: (context, share, _) => RoundWindow(
        base: widget.base,
        lit: _lit,
        dusty: _dusty,
        share: share,
        started: widget.started,
        size: widget.size,
        label: widget.label,
        beam: widget.beam,
        sweep: sweep,
      ),
    );
  }
}
