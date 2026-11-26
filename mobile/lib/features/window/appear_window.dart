// A window on Today that lights up when it comes into view (src/app/heir/ui/today.tsx CardWindow, glass/mini.tsx `reveal`).
//
// It starts dark (and the big window's gold arc at nothing). Once it is at least 60% on screen and its glass has loaded, it
// waits 350 ms and lights, one connected patch at a time (the same `sweepOrder` as everywhere), up to where the person
// really is, never beyond. The sweep lasts about min(2400, lit panes x 130) + 600 ms. Dust (needs a refresh) is shown once it
// has settled, so the final picture is exactly the still window. It plays once each time Today is opened. A course with nothing
// learned, and anyone who has "reduce motion" on, sees the final state at once.

import 'dart:async';
import 'dart:math' as math;

import 'package:material_ui/material_ui.dart';

import 'glass_render.dart';
import 'glass_window.dart';

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

  @override
  State<AppearWindow> createState() => _AppearWindowState();
}

class _AppearWindowState extends State<AppearWindow> {
  static const _stages = 10;

  late List<double> _lit = _dark;
  List<bool>? _dusty;
  double _share = 0;
  Timer? _timer;
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
    _timer?.cancel();
  }

  void _settle() {
    if (!mounted) return;
    setState(() {
      _lit = widget.lit;
      _dusty = widget.dusty;
      _share = widget.share;
    });
  }

  List<double> _at(int stage) => [for (final f in widget.lit) f * stage / _stages];

  Future<void> _play() async {
    if (_ran) return;
    _ran = true;
    _cancel();
    final run = _run;
    final Glass glass;
    try {
      glass = await loadGlass(widget.base);
    } catch (_) {
      if (run == _run) _settle();
      return;
    }
    if (!mounted || run != _run) return;
    final panes = (widget.share * glass.count).round();
    final total = math.min(2400, panes * 130) + 600;
    // Draw each step ahead of time so it appears the moment its turn comes.
    final sharp = widget.size >= 140;
    for (var s = 1; s < _stages; s++) {
      windowImage(widget.base, _at(s), null, rest: restStarted).ignore();
      if (sharp) windowImage(widget.base, _at(s), null, rest: restStarted, tier: GlassTier.full).ignore();
    }
    await Future<void>.delayed(const Duration(milliseconds: 350));
    if (!mounted || run != _run) return;
    var stage = 0;
    _timer = Timer.periodic(Duration(milliseconds: total ~/ _stages), (t) {
      if (!mounted || run != _run) return t.cancel();
      stage++;
      if (stage >= _stages) {
        t.cancel();
        _settle();
      } else {
        setState(() {
          _lit = _at(stage);
          _share = widget.share * stage / _stages;
        });
      }
    });
  }

  @override
  void dispose() {
    _cancel();
    _scroll?.removeListener(_check);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.mini) {
      return MiniWindow(base: widget.base, lit: _lit, dusty: _dusty, size: widget.size, started: widget.started, label: widget.label, motion: widget.beam);
    }
    return TweenAnimationBuilder<double>(
      tween: Tween(end: _share),
      duration: const Duration(milliseconds: 500),
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
      ),
    );
  }
}
