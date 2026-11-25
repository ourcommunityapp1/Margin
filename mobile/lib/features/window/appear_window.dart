// A Today card's window that lights up when its card comes into view (src/app/heir/ui/today.tsx, CardWindow).
//
// It starts dark with the gold arc at nothing. When the card is the front one (at least 60% on screen) and the glass has
// loaded, it waits 350 ms and then lights, one connected patch at a time, up to where the person really is (never beyond it).
// The sweep lasts about min(2400, lit panes x 130) + 600 ms and the gold arc grows with it. Dust (needs a refresh) is shown once
// it has settled. Leaving the card and coming back plays it again. A course with nothing learned, and anyone who has "reduce
// motion" on, sees the final state at once.

import 'dart:async';
import 'dart:math' as math;

import 'package:material_ui/material_ui.dart';

import 'glass_render.dart';
import 'glass_window.dart';

class AppearWindow extends StatefulWidget {
  const AppearWindow({super.key, required this.active, required this.base, required this.lit, this.dusty, required this.share, this.started = true, this.size = 240, this.label, this.beam});

  /// Whether this card is the one in view.
  final bool active;
  final String base;
  final List<double> lit;
  final List<bool>? dusty;
  final double share, size;
  final bool started;
  final String? label;
  final GlassMotion? beam;

  @override
  State<AppearWindow> createState() => _AppearWindowState();
}

class _AppearWindowState extends State<AppearWindow> {
  static const _stages = 10;

  late List<double> _lit = _dark;
  List<bool>? _dusty;
  double _share = 0;
  Timer? _timer;
  int _run = 0; // bumped to cancel a sweep that is still waiting for the glass
  bool _reduce = false, _ready = false;

  List<double> get _dark => List.filled(widget.lit.length, 0.0);
  bool get _hasLight => widget.share > 0 && widget.lit.any((f) => f > 0);

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _reduce = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    if (!_ready) {
      _ready = true;
      if (_reduce || !_hasLight) {
        _settle();
      } else if (widget.active) {
        _play();
      }
    }
  }

  @override
  void didUpdateWidget(AppearWindow old) {
    super.didUpdateWidget(old);
    final changed = old.base != widget.base || old.share != widget.share || old.lit.length != widget.lit.length || !_same(old.lit, widget.lit);
    if (_reduce || !_hasLight) {
      _cancel();
      _settle();
    } else if (widget.active && (!old.active || changed)) {
      _play();
    } else if (!widget.active && old.active) {
      _cancel();
      setState(() {
        _lit = _dark;
        _dusty = null;
        _share = 0;
      });
    }
  }

  static bool _same(List<double> a, List<double> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  void _cancel() {
    _run++;
    _timer?.cancel();
  }

  void _settle() => setState(() {
        _lit = widget.lit;
        _dusty = widget.dusty;
        _share = widget.share;
      });

  List<double> _at(int stage) => [for (final f in widget.lit) f * stage / _stages];

  Future<void> _play() async {
    _cancel();
    final run = _run;
    setState(() {
      _lit = _dark;
      _dusty = null;
      _share = 0;
    });
    final Glass glass;
    try {
      glass = await loadGlass(widget.base);
    } catch (_) {
      if (mounted && run == _run) _settle();
      return;
    }
    if (!mounted || run != _run) return;
    final panes = (widget.share * glass.count).round();
    final total = math.min(2400, panes * 130) + 600;
    // Draw each step ahead of time so it appears the moment its turn comes.
    final sharp = widget.size >= 140;
    for (var s = 1; s <= _stages; s++) {
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
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => TweenAnimationBuilder<double>(
        tween: Tween(end: _share),
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeOut,
        builder: (context, share, _) => RoundWindow(base: widget.base, lit: _lit, dusty: _dusty, share: share, started: widget.started, size: widget.size, label: widget.label, beam: widget.beam),
      );
}
