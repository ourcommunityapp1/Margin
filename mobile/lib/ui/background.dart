// The background: a softened photo for the time of day, drifting slowly, under a dark wash
// (heir.css: .hr-bg, .hr-bg::after, .hr-bg::before, @keyframes hr-drift).

import 'dart:async';

import 'package:material_ui/material_ui.dart';

import '../engine/season.dart' show timeOfDay;
import 'theme.dart';

/// The photo for the time of day, behind everything. Checks the clock once a minute.
class KBackground extends StatefulWidget {
  const KBackground({super.key, this.now});

  /// A fixed time, for tests and screenshots. Null uses the clock.
  final DateTime? now;

  @override
  State<KBackground> createState() => _KBackgroundState();
}

class _KBackgroundState extends State<KBackground> {
  /// The drift's position, moved about 12 times a second: the photo travels a few percent of the screen in 40 seconds under a
  /// dark wash, so each step is a fraction of a pixel. Redrawing the whole blurred photo on every frame (60 to 120 a second)
  /// kept the phone busy on every screen.
  /// A plain timer, not a frame ticker, so the app isn't woken on every frame just to move the photo a fraction of a pixel.
  final _pos = ValueNotifier<double>(0);
  final _since = Stopwatch();
  Timer? _drift;

  void _step() {
    // 0 → 1 over 40 s, then back (as `repeat(reverse: true)` did).
    final phase = (_since.elapsedMilliseconds % 80000) / 40000;
    _pos.value = phase <= 1 ? phase : 2 - phase;
  }

  Timer? _clock;
  late String _time = timeOfDay(widget.now ?? DateTime.now());

  @override
  void initState() {
    super.initState();
    if (widget.now == null) {
      _clock = Timer.periodic(const Duration(minutes: 1), (_) {
        final t = timeOfDay(DateTime.now());
        if (t != _time) setState(() => _time = t);
      });
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Drift only when the person hasn't asked for less motion (prefers-reduced-motion).
    final still = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    if (still || widget.now != null) {
      _drift?.cancel();
      _drift = null;
      _since.stop();
    } else if (_drift == null) {
      _since.start();
      _drift = Timer.periodic(const Duration(milliseconds: 83), (_) => _step());
    }
  }

  @override
  void dispose() {
    _clock?.cancel();
    _drift?.cancel();
    _pos.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Dark all day: the photo stays, under a deeper wash except at night (which is dark already).
    final wash = _time == 'night' ? context.k.wash : const Color.fromRGBO(12, 16, 22, 0.72);
    return ExcludeSemantics(
      child: Stack(
        fit: StackFit.expand,
        children: [
          ColoredBox(color: context.k.ground),
          RepaintBoundary(
            child: ClipRect(
              child: AnimatedBuilder(
                animation: _pos,
                builder: (context, child) {
                  final t = Curves.easeInOut.transform(_pos.value);
                  // translate3d(-4%, 1%) scale(1.02) → translate3d(4%, -2%) scale(1.09), on an image 116% of the screen.
                  final size = MediaQuery.sizeOf(context);
                  final dx = (-0.04 + 0.08 * t) * size.width * 1.16;
                  final dy = (0.01 - 0.03 * t) * size.height * 1.16;
                  final scale = 1.02 + 0.07 * t;
                  return Transform(
                    alignment: Alignment.center,
                    transform: Matrix4.identity()
                      ..translateByDouble(dx, dy, 0, 1)
                      ..scaleByDouble(scale * 1.16, scale * 1.16, 1, 1),
                    child: child,
                  );
                },
                child: ColorFiltered(
                  colorFilter: const ColorFilter.matrix(_saturate60),
                  child: Image.asset('assets/images/bg-$_time.jpg', fit: BoxFit.cover, gaplessPlayback: true),
                ),
              ),
            ),
          ),
          ColoredBox(color: wash),
          // The page fades into its own ink at the top and bottom, so nothing shows a seam.
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [KColors.frame, Color(0x0011161C), Color(0x0011161C), KColors.frame],
                stops: [0, 0.2, 0.75, 1],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// CSS filter: saturate(0.6), as a colour matrix.
const _saturate60 = <double>[
  0.6852, 0.2860, 0.0288, 0, 0, //
  0.0852, 0.8860, 0.0288, 0, 0, //
  0.0852, 0.2860, 0.6288, 0, 0, //
  0, 0, 0, 1, 0,
];
