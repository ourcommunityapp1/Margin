// Loads the course text bundled with the app (assets/content/content.json, exported from the website, ADR-0005)
// into the engine. Call once at start-up, before any screen reads a course.

import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;

import '../engine/content.dart' as engine;

Future<void> loadBundledContent() async {
  if (engine.collections.isNotEmpty) return;
  final raw = await rootBundle.loadString('assets/content/content.json');
  engine.loadContent(jsonDecode(raw) as Map<String, dynamic>);
}
