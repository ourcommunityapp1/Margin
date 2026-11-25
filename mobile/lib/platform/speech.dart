// Saying a verse or answer aloud (ADR-0008): the phone's own speech recognizer through the speech_to_text plugin (Apple's on
// iPhone, Google's on Android). What is heard is turned into words and graded like typed words, with the same forgiveness for
// how voice typing writes things. The recording is not kept. Behind an interface so tests use a fake.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:speech_to_text/speech_to_text.dart';

abstract interface class SpeechService {
  /// Starts listening. [onWords] gets everything heard so far (it grows as the person speaks); [onEnded] fires once when
  /// listening stops, whether the person tapped stop, paused for long, or an error ended it. Returns false when this phone
  /// can't listen (permission refused, or no recognizer).
  Future<bool> start({required void Function(String words) onWords, required void Function() onEnded});

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
  Future<bool> start({required void Function(String words) onWords, required void Function() onEnded}) async {
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

final speechProvider = Provider<SpeechService>((ref) => DeviceSpeech());
