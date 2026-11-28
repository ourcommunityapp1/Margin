// Saying a verse or answer aloud (ADR-0008). Two ways to turn it into words, behind one interface (tests use a fake):
// - ElevenLabs Scribe (cloud_speech.dart): the answer is recorded and, when the person taps stop, sent through katekize.com to
//   ElevenLabs with the answer's rare words as hints. Used for a signed-in adult with a connection. More accurate.
// - the phone's own recognizer (DeviceSpeech, speech_to_text: Apple's on iPhone, Google's on Android): words appear as they are
//   said. Used otherwise, and whenever ElevenLabs can't be reached.
// What is heard is graded like typed words, with the same forgiveness for how voice typing writes things. Nothing is kept.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'package:supabase_flutter/supabase_flutter.dart' show Session;

import '../data/cloud.dart' show cloud;
import '../engine/types.dart' show Track;
import '../state/household.dart' show meProvider;
import 'cloud_speech.dart';

export 'cloud_speech.dart' show CloudSpeech, ElevenLabsSpeech, HybridSpeech;

abstract interface class SpeechService {
  /// Starts listening. [onWords] gets everything heard so far (it grows as the person speaks); [onEnded] fires once when
  /// listening stops, whether the person tapped stop, paused for long, or an error ended it. Returns false when this phone
  /// can't listen (permission refused, or no recognizer).
  /// [hints] are words to listen out for (rare names and old words in the answer).
  Future<bool> start({required void Function(String words) onWords, required void Function() onEnded, List<String> hints = const []});

  /// Whether words come while the person speaks (the phone's recognizer) or only after they stop (ElevenLabs).
  bool get live;

  /// Why the last try heard nothing, when it was this service's fault (no connection, server off); null otherwise.
  String? get problem;

  /// Stops listening; the words heard so far are delivered and [onEnded] fires.
  Future<void> stop();

  /// Stops listening and drops what was heard, without calling anything back.
  Future<void> cancel();
}

class DeviceSpeech implements SpeechService {
  final _stt = SpeechToText();
  void Function()? _onEnded;
  var _ready = false;

  void _ended() {
    final f = _onEnded;
    _onEnded = null; // once per listening session
    f?.call();
  }

  @override
  bool get live => true;

  @override
  String? get problem => null;

  @override
  Future<bool> start({required void Function(String words) onWords, required void Function() onEnded, List<String> hints = const []}) async {
    try {
      // The first time, this is when the phone asks for the microphone and speech permissions.
      _ready = _ready || await _stt.initialize(
        onStatus: (s) {
          if (s == 'done' || s == 'notListening') _ended();
        },
        onError: (_) => _ended(),
      );
      if (!_ready) return false;
      _onEnded = onEnded;
      await _stt.listen(
        onResult: (r) => onWords(r.recognizedWords),
        listenOptions: SpeechListenOptions(
          partialResults: true,
          cancelOnError: true,
          listenMode: ListenMode.dictation,
          localeId: 'en_US',
          // Long pauses are fine while remembering; the person taps stop when finished.
          pauseFor: const Duration(seconds: 8),
          listenFor: const Duration(minutes: 2),
        ),
      );
      return true;
    } catch (_) {
      _onEnded = null;
      return false;
    }
  }

  @override
  Future<void> stop() async {
    try {
      await _stt.stop();
    } catch (_) {/* nothing to stop */}
  }

  @override
  Future<void> cancel() async {
    _onEnded = null;
    try {
      await _stt.cancel();
    } catch (_) {/* nothing to cancel */}
  }
}

/// ElevenLabs for a signed-in adult, the phone's recognizer otherwise (see cloud_speech.dart). Children's voices stay on the phone.
final speechProvider = Provider<SpeechService>((ref) {
  Session? session() => cloud()?.auth.currentSession;
  return HybridSpeech(
    device: DeviceSpeech(),
    cloud: ElevenLabsSpeech(token: () async => session()?.accessToken),
    useCloud: () => session() != null && ref.read(meProvider)?.track == Track.adult,
  );
});
