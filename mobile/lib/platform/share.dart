// The phone's share sheet (ADR-0008) for friend invites, account links and course links. Where there is no share sheet
// (or it fails) the text is copied instead and the screen says so. Behind a provider so tests can swap it.

import 'package:flutter/services.dart' show Clipboard, ClipboardData;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

/// Opens the share sheet. Returns true when it was shown (whether or not anything was sent), false when it can't be.
abstract interface class Sharer {
  Future<bool> share({required String title, required String text, required String url});
}

class SharePlusSharer implements Sharer {
  const SharePlusSharer();

  @override
  Future<bool> share({required String title, required String text, required String url}) async {
    try {
      final r = await SharePlus.instance.share(ShareParams(title: title, text: '$text $url'));
      return r.status != ShareResultStatus.unavailable;
    } catch (_) {
      return false;
    }
  }
}

final sharerProvider = Provider<Sharer>((ref) => const SharePlusSharer());

/// Shares [text] and [url] with the share sheet, or copies them. Returns a short note when the link was copied instead
/// ("Link copied. Paste it in a message."), or null when the share sheet was shown.
Future<String?> shareOrCopy(WidgetRef ref, {required String title, required String text, required String url, String copiedNote = 'Link copied. Paste it in a message.'}) async {
  if (await ref.read(sharerProvider).share(title: title, text: text, url: url)) return null;
  await Clipboard.setData(ClipboardData(text: '$text $url'));
  return copiedNote;
}
