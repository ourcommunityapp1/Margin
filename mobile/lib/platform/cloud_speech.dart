// "Say it from memory" through ElevenLabs Scribe. The answer is recorded on the phone (AAC, mono, 16 kHz: small, and all
// speech needs) and, when the person taps stop, sent to katekize.com (/api/heir/transcribe) with their sign-in token and the
// answer's rare words as hints; the server passes it to ElevenLabs and sends back the words. The ElevenLabs key never
// leaves the server, and the recording is deleted from the phone as soon as it is sent.
//
// HybridSpeech picks ElevenLabs when it may be used (a signed-in adult) and falls back to the phone's own recognizer for the
// rest of the session once ElevenLabs can't be reached (no connection, the server off or out of credit).

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';

import '../data/social.dart' show siteOrigin;
import 'speech.dart';

/// A speech service on a server: it can find it can't be reached, and then the phone's recognizer is used instead.
abstract interface class CloudSpeech implements SpeechService {
  bool get unreachable;
  set unreachable(bool value);
}

class ElevenLabsSpeech implements CloudSpeech {
  ElevenLabsSpeech({required this.token, http.Client? client, AudioRecorder? recorder}) : _client = client ?? http.Client(), _rec = recorder ?? AudioRecorder();

  /// The person's Katekize sign-in token (null when signed out).
  final Future<String?> Function() token;
  final http.Client _client;
  final AudioRecorder _rec;

  void Function(String)? _onWords;
  void Function()? _onEnded;
  List<String> _hints = const [];
  String? _path, _problem;
  Timer? _limit;

  /// Set when ElevenLabs can't be used at all right now (no connection, server off): use the phone's recognizer instead.
  @override
  bool unreachable = false;

  @override
  bool get live => false;

  @override
  String? get problem => _problem;

  @override
  Future<bool> start({required void Function(String words) onWords, required void Function() onEnded, List<String> hints = const []}) async {
    _problem = null;
    try {
      // The first time, this is when the phone asks for the microphone.
      if (!await _rec.hasPermission()) return false;
      final dir = await getTemporaryDirectory();
      final path = '${dir.path}/answer-${DateTime.now().microsecondsSinceEpoch}.m4a';
      await _rec.start(const RecordConfig(encoder: AudioEncoder.aacLc, sampleRate: 16000, numChannels: 1, bitRate: 48000), path: path);
      _path = path;
      _onWords = onWords;
      _onEnded = onEnded;
      _hints = hints;
      // Two minutes is far longer than any answer: stop and check then.
      _limit = Timer(const Duration(minutes: 2), stop);
      return true;
    } catch (_) {
      return false;
    }
  }

  @override
  Future<void> stop() async {
    _limit?.cancel();
    final onWords = _onWords, onEnded = _onEnded;
    _onWords = null;
    _onEnded = null;
    if (onEnded == null) return;
    String? path;
    try {
      path = await _rec.stop() ?? _path;
    } catch (_) {
      path = _path;
    }
    final text = path == null ? null : await _transcribe(path);
    onWords?.call(text ?? '');
    onEnded();
  }

  Future<String?> _transcribe(String path) async {
    final file = File(path);
    try {
      final bytes = await file.readAsBytes();
      final tok = await token();
      if (tok == null) {
        unreachable = true;
        _problem = 'Couldn’t check that. Tap and say it again.';
        return null;
      }
      final uri = Uri.parse('$siteOrigin/api/heir/transcribe').replace(queryParameters: {'k': _hints});
      final res = await _client
          .post(uri, headers: {'Authorization': 'Bearer $tok', 'Content-Type': 'audio/mp4'}, body: bytes)
          .timeout(const Duration(seconds: 25));
      if (res.statusCode == 200) {
        final body = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
        return (body['text'] as String? ?? '').trim();
      }
      // Switched off, out of credit, not deployed, signed out: the phone's recognizer from now on.
      if (res.statusCode == 503 || res.statusCode == 404 || res.statusCode == 401 || res.statusCode == 501) unreachable = true;
      _problem = 'Couldn’t check that. Tap and say it again.';
      return null;
    } catch (_) {
      unreachable = true;
      _problem = 'Couldn’t reach Katekize to check that. Tap and say it again.';
      return null;
    } finally {
      try {
        await file.delete();
      } catch (_) {/* already gone */}
    }
  }

  @override
  Future<void> cancel() async {
    _limit?.cancel();
    _onWords = null;
    _onEnded = null;
    try {
      await _rec.cancel();
    } catch (_) {/* nothing recording */}
    final p = _path;
    if (p != null) {
      try {
        await File(p).delete();
      } catch (_) {/* already gone */}
    }
  }
}

/// ElevenLabs when [useCloud] says it may be used and it has not failed to reach the server; the phone's recognizer otherwise.
class HybridSpeech implements SpeechService {
  HybridSpeech({required this.device, required this.cloud, required this.useCloud});
  final SpeechService device;
  final CloudSpeech cloud;
  final bool Function() useCloud;
  SpeechService? _current;

  SpeechService get _pick => !cloud.unreachable && useCloud() ? cloud : device;

  /// Whether the next try goes to ElevenLabs.
  bool get usingCloud => identical(_pick, cloud);

  @override
  bool get live => (_current ?? _pick).live;

  @override
  String? get problem => _current?.problem;

  @override
  Future<bool> start({required void Function(String words) onWords, required void Function() onEnded, List<String> hints = const []}) async {
    final s = _current = _pick;
    final ok = await s.start(onWords: onWords, onEnded: onEnded, hints: hints);
    if (ok || identical(s, device)) return ok;
    // Recording failed to start: the phone's recognizer for the rest of this run.
    cloud.unreachable = true;
    final d = _current = device;
    return d.start(onWords: onWords, onEnded: onEnded, hints: hints);
  }

  @override
  Future<void> stop() async => _current?.stop();

  @override
  Future<void> cancel() async => _current?.cancel();
}
