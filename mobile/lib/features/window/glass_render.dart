// Draws a window pane by pane (a port of src/app/heir/ui/glass/mini.tsx and the scene pass of engine.ts): a photo of the
// glass, an "ids" image saying which pane each pixel belongs to, and a state per pane (dark, lit or dusty). Lit panes show
// the glass as it is; dusty ones are dimmer and greyer; dark ones rest almost black. The lead between panes stays dark.
//
// Two sizes: the 256-pixel copies (fast, for lists and as a first look) and the full 1024-pixel glass (sharp, for cards).
// The full-size shading runs off the main thread. Each finished picture is kept, one per look.
//
// Glow and the moving light behind unstarted windows are drawn over these pictures (see glass_window.dart).

import 'dart:async';
import 'dart:convert';
import 'dart:isolate';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/services.dart' show rootBundle;

import 'light.dart';

/// How bright dark glass is at rest, as the website sets it: very dark where a light will move behind it, a little
/// brighter in a list (so no window reads as pitch black) and once a course has begun.
const restMoving = 0.045;
const restList = 0.1;
const restStarted = 0.13;
const restUnstarted = 0.1;

/// The brightness at the middle of the moving light (the website's LIGHT.peak).
const peakBrightness = 0.58;

/// Learned, but due for a refresh.
const _dusty = 0.5;

enum GlassTier { small, full }

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

String _glassAsset(String base, GlassTier t) => t == GlassTier.small ? 'assets/glass/$base/glass-mini.webp' : 'assets/glass_full/$base/glass.webp';
String _idsAsset(String base, GlassTier t) => t == GlassTier.small ? 'assets/glass/$base/ids-mini.png' : 'assets/glass_full/$base/ids.png';

Future<Glass> loadGlass(String base, [GlassTier tier = GlassTier.small]) {
  final key = '$base|${tier.name}';
  // The full-size glass is about 8 MB in memory: keep only the few most recent.
  if (tier == GlassTier.full && _loaded.keys.where((k) => k.endsWith('|full')).length >= 3 && !_loaded.containsKey(key)) {
    _loaded.remove(_loaded.keys.firstWhere((k) => k.endsWith('|full')));
  }
  return _loaded.putIfAbsent(key, () {
    final f = _load(base, tier);
    f.catchError((Object _) {
      _loaded.remove(key);
      return Future<Glass>.error(StateError('Could not load the window $base'));
    });
    return f;
  });
}

Future<(int, int, Uint8List)> _pixels(String asset) async {
  final data = await rootBundle.load(asset);
  final codec = await ui.instantiateImageCodec(data.buffer.asUint8List());
  final frame = await codec.getNextFrame();
  final bytes = await frame.image.toByteData(format: ui.ImageByteFormat.rawStraightRgba);
  final w = frame.image.width, h = frame.image.height;
  frame.image.dispose();
  return (w, h, bytes!.buffer.asUint8List());
}

/// Each pane's pixels, from the "ids" image.
Map<int, Int32List> _group(Uint8List ids, int size) {
  final acc = <int, List<int>>{};
  for (var p = 0; p < size * size; p++) {
    final q = p * 4;
    if (ids[q + 3] == 0) continue;
    final id = ids[q] + ids[q + 1] * 256;
    if (id == 0) continue;
    (acc[id] ??= []).add(p);
  }
  return {for (final e in acc.entries) e.key: Int32List.fromList(e.value)};
}

Future<Glass> _load(String base, GlassTier tier) async {
  final meta = jsonDecode(await rootBundle.loadString('assets/glass/$base/pieces.json')) as Map<String, dynamic>;
  final glass = await _pixels(_glassAsset(base, tier));
  final ids = await _pixels(_idsAsset(base, tier));
  final size = glass.$1;
  final idBytes = ids.$3;
  // The full-size image has a million pixels to sort into panes: do that off the main thread.
  final panes = tier == GlassTier.full ? await Isolate.run(() => _group(idBytes, size)) : _group(idBytes, size);
  return Glass(
    size,
    glass.$3,
    idBytes,
    [for (final q in (meta['questions'] as List)) ...(q as List).cast<int>()],
    (meta['count'] as num).toInt(),
    panes,
  );
}

void _shade(Uint8List o, Uint8List g, Uint8List ids, Int32List px, double b, double mix) {
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

/// The finished picture for a window with these panes lit, as straight RGBA bytes. [restMix] is how grey dark glass is.
Uint8List renderPixels(Glass d, List<int> state, {required double rest, double restMix = 0.45}) =>
    _renderPixels(d.size, d.glass, d.ids, d.panes, state, rest, restMix);

Uint8List _renderPixels(int size, Uint8List glass, Uint8List ids, Map<int, Int32List> panes, List<int> state, double rest, double restMix) {
  final out = Uint8List(size * size * 4);
  for (final e in panes.entries) {
    final s = state[e.key];
    _shade(out, glass, ids, e.value, s == 1 ? 1.05 : s == 2 ? _dusty : rest, s == 1 ? 0 : s == 2 ? 0.4 : restMix);
  }
  return out;
}

final _images = <String, Future<ui.Image>>{};

/// The picture for a window lit as [lit] (and [dusty]) say. Cached by look. Dark glass rests at [rest]
/// (greyer by [restMix]); the moving light draws a second picture at [peakBrightness] over the first.
Future<ui.Image> windowImage(
  String base,
  List<double> lit,
  List<bool>? dusty, {
  required double rest,
  double restMix = 0.45,
  GlassTier tier = GlassTier.small,
}) {
  final key = '$base|${tier.name}|${lit.map((f) => f.toStringAsFixed(3)).join(',')}|${dusty?.map((x) => x ? 1 : 0).join() ?? ''}|$rest|$restMix';
  // Each small picture is a quarter of a megabyte, a full-size one four: keep the recent ones.
  if (_images.length > 40) _images.remove(_images.keys.first);
  return _images.putIfAbsent(key, () async {
    final d = await loadGlass(base, tier);
    final state = paneStates(count: d.count, flat: d.flat, lit: lit, dusty: dusty);
    final Uint8List bytes = tier == GlassTier.full
        ? await Isolate.run(() => _renderPixels(d.size, d.glass, d.ids, d.panes, state, rest, restMix))
        : renderPixels(d, state, rest: rest, restMix: restMix);
    final c = Completer<ui.Image>();
    ui.decodeImageFromPixels(bytes, d.size, d.size, ui.PixelFormat.rgba8888, c.complete);
    return c.future;
  });
}
