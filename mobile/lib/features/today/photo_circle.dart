// A round photograph (a sunrise, or the night sky) for "When you rise" and "When you lie down" (photo-circle.tsx, heir.css
// .hr-pc): a dark 5 px gap, a 6 px stone ring (#7C7364) and a soft halo. The photo drifts very slowly (30 s each way) and its
// light breathes (12 s); both hold still for people who ask for less motion.

import 'package:material_ui/material_ui.dart';

import '../../data/photos.dart';

const stoneRing = Color(0xFF7C7364);

class PhotoCircle extends StatefulWidget {
  const PhotoCircle({super.key, required this.photo, required this.night, this.size = 180});
  final Photo photo;
  final bool night;
  final double size;

  @override
  State<PhotoCircle> createState() => _PhotoCircleState();
}

class _PhotoCircleState extends State<PhotoCircle> with TickerProviderStateMixin {
  late final _drift = AnimationController(vsync: this, duration: const Duration(seconds: 30));
  late final _glow = AnimationController(vsync: this, duration: const Duration(seconds: 12));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final still = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    if (still) {
      _drift.stop();
      _glow.stop();
    } else if (!_drift.isAnimating) {
      _drift.repeat(reverse: true);
      _glow.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _drift.dispose();
    _glow.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.size;
    final halo = widget.night ? const Color(0x479FB8E8) : const Color(0x4DFFBE78);
    final glow = widget.night
        ? const RadialGradient(center: Alignment(0, -0.5), radius: 0.7, colors: [Color(0x806E8CE6), Color(0x000A0E1E)])
        : const RadialGradient(center: Alignment(0.2, -0.1), radius: 0.6, colors: [Color(0xCCFFC878), Color(0x00FFA05A)]);
    final ease = CurvedAnimation(parent: _drift, curve: Curves.easeInOut);
    final breathe = CurvedAnimation(parent: _glow, curve: Curves.easeInOut);
    return Semantics(
      image: true,
      label: widget.photo.alt,
      child: Padding(
        padding: const EdgeInsets.only(top: 12, bottom: 6),
        // The photo is [s] across; outside it a dark 5 px gap, the 6 px stone ring, a 1 px shadow line and the halo.
        child: Container(
          width: s + 24,
          height: s + 24,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: const Color(0x73000000),
            boxShadow: [BoxShadow(color: halo, blurRadius: 60)],
          ),
          padding: const EdgeInsets.all(1),
          child: Container(
            decoration: const BoxDecoration(shape: BoxShape.circle, color: stoneRing),
            padding: const EdgeInsets.all(6),
            child: Container(
              decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0xFF0B0D0F)),
              padding: const EdgeInsets.all(5),
              child: ClipOval(
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    AnimatedBuilder(
                      animation: ease,
                      builder: (context, child) {
                        final t = ease.value;
                        // scale(1.02) → scale(1.14) translate(-2.5%, -1.5%)
                        final inner = s;
                        return Transform.translate(
                          offset: Offset(-0.025 * inner * t, -0.015 * inner * t),
                          child: Transform.scale(scale: 1.02 + 0.12 * t, child: child),
                        );
                      },
                      child: Image.asset(widget.photo.file, fit: BoxFit.cover, gaplessPlayback: true),
                    ),
                    FadeTransition(
                      opacity: Tween(begin: 0.15, end: 0.6).animate(breathe),
                      child: DecoratedBox(
                        decoration: BoxDecoration(gradient: glow, backgroundBlendMode: BlendMode.softLight),
                      ),
                    ),
                    const DecoratedBox(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: RadialGradient(colors: [Color(0x00000000), Color(0x00000000), Color(0x66000000)], stops: [0, 0.78, 1]),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// The small photo at the start of a row (40 px, or 30 px in Done), in a thin stone ring.
class PhotoThumb extends StatelessWidget {
  const PhotoThumb({super.key, required this.photo, this.small = false});
  final Photo photo;
  final bool small;

  @override
  Widget build(BuildContext context) {
    final s = small ? 30.0 : 40.0;
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: small ? 3 : 4),
      child: Container(
        width: s,
        height: s,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: stoneRing, width: 2),
          image: DecorationImage(image: AssetImage(photo.file), fit: BoxFit.cover),
        ),
      ),
    );
  }
}
