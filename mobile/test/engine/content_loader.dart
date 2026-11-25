import 'dart:convert';
import 'dart:io';

import 'package:katekize/engine/content.dart';

/// Loads the exported content once for the engine tests.
void loadTestContent() {
  if (collections.isNotEmpty) return;
  loadContent(jsonDecode(File('assets/content/content.json').readAsStringSync()) as Map<String, dynamic>);
}
