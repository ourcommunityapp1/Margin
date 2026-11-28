// The dim light that moves behind dark glass (a port of src/app/heir/ui/glass/light-motion.ts), so a window you have not
// started shows there is a picture there without showing it:
//   - on its own (a course's page, a card): the light circles the window, clockwise and then back;
//   - in a list: one light travels down through every window in turn, top to bottom, then back up.

import 'dart:math' as math;

/// The light's look. Tuned on the website in the "Glints in dark glass" mockup.
abstract final class LightLook {
  /// The light's size, as a share of the window's width.
  static const r = 0.27;

  /// 0 crisp to 1 very soft.
  static const soft = 0.85;

  /// One pass, and the pause before the next (ms).
  static const pass = 2300;
  static const gap = 1100;
}

/// How quickly the light fades with distance (in units of its radius, squared).
const falloff = 1.6 / (0.35 + 1.6 * LightLook.soft);

sealed class GlassMotion {
  const GlassMotion();
}

/// The light circles the window. [delay] (in passes) keeps neighbours out of step.
class CircleMotion extends GlassMotion {
  const CircleMotion({this.delay = 0});
  final double delay;
}

/// One light travels down a list of [count] windows; [offset] (ms) keeps separate lists out of step.
class ListMotion extends GlassMotion {
  const ListMotion({required this.index, required this.count, this.offset = 0});
  final int index, count;
  final int offset;
}

/// Where the light is behind one window now (window coordinates 0 to 1) and how strong it is; null while it is away.
/// [nowMs] is one shared clock, so in a list the light passes from one window into the next.
({double x, double y, double k})? lightAt(GlassMotion motion, num nowMs) {
  const pass = LightLook.pass, gap = LightLook.gap;
  switch (motion) {
    case CircleMotion():
      // Clockwise once round, a pause, then anticlockwise back, and so on, fading in and out of each turn.
      const cycle = pass + gap;
      final t0 = nowMs + motion.delay * pass;
      final n = (t0 / cycle).floor();
      final t = (t0 - n * cycle) / pass;
      if (t > 1) return null;
      final tt = n.isOdd ? 1 - t : t;
      final a = -math.pi / 2 + tt * math.pi * 2;
      return (x: 0.5 + 0.3 * math.cos(a), y: 0.5 + 0.3 * math.sin(a), k: math.sin(math.pi * t));
    case ListMotion():
      // Down through every window in the list, one after another at the same pace, a pause, then back up.
      final leg = motion.count * pass;
      final cycle = 2 * (leg + gap);
      final t0 = (nowMs + motion.offset) % cycle;
      final down = t0 < leg + gap;
      final u = down ? t0 : t0 - (leg + gap);
      if (u > leg) return null;
      final pos = down ? u / pass : motion.count - u / pass; // in windows, from the top of the first
      final t = pos - motion.index;
      if (t < -0.2 || t > 1.2) return null;
      return (x: 0.5 + 0.05 * math.sin(t * math.pi * 2), y: -LightLook.r + (1 + 2 * LightLook.r) * t, k: 1.0);
  }
}

/// How much of the light reaches a point at distance [d] (in window widths) from its middle: 0 to 1.
double lightReach(double d) {
  final x = d / LightLook.r;
  return x < 2.2 ? math.exp(-x * x * falloff) : 0;
}
