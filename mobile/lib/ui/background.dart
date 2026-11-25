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

class _KBackgroundState extends State<KBackground> with SingleTickerProviderStateMixin {
  late final AnimationController _drift =
      AnimationController(vsync: this, duration: const Duration(seconds: 40));
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
      _drift.stop();
    } else if (!_drift.isAnimating) {
      _drift.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _clock?.cancel();
    _drift.dispose();
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
          ClipRect(
            child: AnimatedBuilder(
              animation: _drift,
              builder: (context, child) {
                final t = Curves.easeInOut.transform(_drift.value);
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
                child: Image.asset(
                  'assets/images/bg-$_time.jpg',
                  fit: BoxFit.cover,
                  gaplessPlayback: true,
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
