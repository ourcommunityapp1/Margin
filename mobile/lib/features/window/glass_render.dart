// Draws a window pane by pane (a port of the small windows in src/app/heir/ui/glass/mini.tsx): a photo of the glass, an
// "ids" image saying which pane each pixel belongs to, and a state per pane (dark, lit or dusty). Lit panes show the glass
// as it is; dusty ones are dimmer and greyer; dark ones rest almost black. The lead between panes stays dark.
//
// Works on the 256-pixel copies bundled with the app, once per look, then keeps the finished picture.
// (The website's moving light behind unstarted windows, and the full 1024-pixel glass with glow and rays, are not
// ported yet: ADR-0007 steps 2 and 3.)

import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/services.dart' show rootBundle;

import 'light.dart';

/// How bright dark glass is at rest: a little brighter than the website's moving-light rest, since nothing moves yet.
const restStarted = 0.13;
const restUnstarted = 0.1;

/// Learned, but due for a refresh.
const _dusty = 0.5;

class Glass {
  Glass(this.size, this.glass, this.ids, this.flat, this.count, this.panes);
  final int size;
  final Uint8List glass, ids; // straight RGBA
  final List<int> flat;
  final int count;

  /// Each pane's pixels, by pane id.
  final Map<int, Int32List> panes;
}

final _loaded = <String, Future<Glass>>{};

Future<Glass> loadGlass(String base) => _loaded.putIfAbsent(base, () => _load(base)..catchError((Object _) {
      _loaded.remove(base);
      throw StateError('Could not load the window $base');
    }));

Future<(int, int, Uint8List)> _pixels(String asset) async {
  final data = await rootBundle.load(asset);
  final codec = await ui.instantiateImageCodec(data.buffer.asUint8List());
  final frame = await codec.getNextFrame();
  final bytes = await frame.image.toByteData(format: ui.ImageByteFormat.rawStraightRgba);
  final w = frame.image.width, h = frame.image.height;
  frame.image.dispose();
  return (w, h, bytes!.buffer.asUint8List());
}

Future<Glass> _load(String base) async {
  final meta = jsonDecode(await rootBundle.loadString('assets/glass/$base/pieces.json')) as Map<String, dynamic>;
  final glass = await _pixels('assets/glass/$base/glass-mini.webp');
  final ids = await _pixels('assets/glass/$base/ids-mini.png');
  final size = glass.$1;
  final acc = <int, List<int>>{};
  final idBytes = ids.$3;
  for (var p = 0; p < size * size; p++) {
    final q = p * 4;
    if (idBytes[q + 3] == 0) continue;
    final id = idBytes[q] + idBytes[q + 1] * 256;
    if (id == 0) continue;
    (acc[id] ??= []).add(p);
  }
  return Glass(
    size,
    glass.$3,
    idBytes,
    [for (final q in (meta['questions'] as List)) ...(q as List).cast<int>()],
    (meta['count'] as num).toInt(),
    {for (final e in acc.entries) e.key: Int32List.fromList(e.value)},
  );
}

void _shade(Uint8List o, Glass d, Int32List px, double b, double mix) {
  final g = d.glass, ids = d.ids;
  for (final p in px) {
    final q = p * 4;
    final lead = 1 - 0.75 * (ids[q + 2] / 255);
    final r = g[q], gr = g[q + 1], bl = g[q + 2];
    final grey = 0.3 * r + 0.59 * gr + 0.11 * bl;
    o[q] = ((r + (grey - r) * mix) * b * lead).clamp(0, 255).toInt();
    o[q + 1] = ((gr + (grey - gr) * mix) * b * lead).clamp(0, 255).toInt();
    o[q + 2] = ((bl + (grey - bl) * mix) * b * lead).clamp(0, 255).toInt();
    o[q + 3] = 255;
  }
}

/// The finished picture for a window with these panes lit, as straight RGBA bytes.
Uint8List renderPixels(Glass d, List<int> state, {required double rest}) {
  final out = Uint8List(d.size * d.size * 4);
  for (final e in d.panes.entries) {
    final s = state[e.key];
    _shade(out, d, e.value, s == 1 ? 1.05 : s == 2 ? _dusty : rest, s == 1 ? 0 : s == 2 ? 0.4 : 0.45);
  }
  return out;
}

final _images = <String, Future<ui.Image>>{};

/// The picture for a window lit as [lit] (and [dusty]) say. Cached by look.
Future<ui.Image> windowImage(String base, List<double> lit, List<bool>? dusty, {required bool started}) {
  final key = '$base|${lit.map((f) => f.toStringAsFixed(3)).join(',')}|${dusty?.map((x) => x ? 1 : 0).join() ?? ''}|$started';
  // Each picture is about a quarter of a megabyte: keep the recent ones.
  if (_images.length > 60) _images.remove(_images.keys.first);
  return _images.putIfAbsent(key, () async {
    final d = await loadGlass(base);
    final state = paneStates(count: d.count, flat: d.flat, lit: lit, dusty: dusty);
    final bytes = renderPixels(d, state, rest: started ? restStarted : restUnstarted);
    final c = Completer<ui.Image>();
    ui.decodeImageFromPixels(bytes, d.size, d.size, ui.PixelFormat.rgba8888, c.complete);
    return c.future;
  });
}
