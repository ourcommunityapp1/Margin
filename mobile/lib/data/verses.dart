// The NASB text of a verse (the website's /api/heir/verse). The NASB is licensed by the Lockman Foundation through the
// YouVersion Platform: it is fetched one verse at a time from katekize.com (the app key stays on the server), shown after the
// lesson starts, and never stored in the app. When it can't be fetched the verse shows in the KJV that ships with the app.
// Behind an interface so tests use a fake.

import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

import 'social.dart' show siteOrigin;

class NasbVerse {
  const NasbVerse(this.text, this.version);
  final String text, version;
}

abstract interface class VerseApi {
  /// The NASB text for this item's verse, or null when it can't be had (offline, no key, no verse for it).
  Future<NasbVerse?> nasb(String itemId);
}

class SiteVerseApi implements VerseApi {
  const SiteVerseApi();

  @override
  Future<NasbVerse?> nasb(String itemId) async {
    try {
      final res = await http.get(Uri.parse('$siteOrigin/api/heir/verse?id=${Uri.encodeQueryComponent(itemId)}')).timeout(const Duration(seconds: 8));
      if (res.statusCode != 200) return null;
      final j = jsonDecode(res.body) as Map;
      final text = j['text'] as String?, version = j['version'] as String?;
      return text == null || text.isEmpty || version == null ? null : NasbVerse(text, version);
    } catch (_) {
      return null;
    }
  }
}

final verseApiProvider = Provider<VerseApi>((ref) => const SiteVerseApi());
