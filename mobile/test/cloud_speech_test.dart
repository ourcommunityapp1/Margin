import 'dart:convert';
import 'dart:io';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:katekize/features/lesson/speech_hints.dart';
import 'package:katekize/platform/speech.dart';
import 'package:record/record.dart';

/// A recorder that writes a few bytes where it is told, instead of using the microphone.
class _FakeRecorder implements AudioRecorder {
  String? path;
  @override
  Future<bool> hasPermission({bool request = true}) async => true;
  @override
  Future<void> start(RecordConfig config, {required String path}) async {
    this.path = path;
    await File(path).writeAsBytes([1, 2, 3, 4]);
  }

  @override
  Future<String?> stop() async => path;
  @override
  Future<void> cancel() async {}
  @override
  dynamic noSuchMethod(Invocation i) => super.noSuchMethod(i);
}

/// The phone's recognizer, standing in.
class _Device implements SpeechService {
  var starts = 0;
  @override
  bool get live => true;
  @override
  String? get problem => null;
  @override
  Future<bool> start({required void Function(String) onWords, required void Function() onEnded, List<String> hints = const []}) async {
    starts++;
    return true;
  }

  @override
  Future<void> stop() async {}
  @override
  Future<void> cancel() async {}
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late Directory tmp;
  setUp(() {
    tmp = Directory.systemTemp.createTempSync('speech');
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(const MethodChannel('plugins.flutter.io/path_provider'), (call) async => tmp.path);
  });

  test('hints are the rare words of an answer: names, old words, long words; never the whole answer', () {
    final h = speechHints('The Lord is my shepherd; I shall not want. He maketh me to lie down in green pastures: he leadeth me beside the still waters.');
    expect(h, containsAll(['Lord', 'maketh', 'leadeth']));
    expect(h, isNot(contains('The')), reason: 'a capital at the start of a sentence is not a name');
    expect(h, isNot(contains('He')));
    expect(h, isNot(contains('I')));
    expect(h, isNot(contains('green')));
    expect(speechHints('Melchizedek, king of Salem, blessed Abraham.'), ['Melchizedek', 'Salem', 'Abraham']);
  });

  test('an answer is recorded, sent with the sign-in token and the hints, the words come back, and the recording is deleted', () async {
    late http.Request sent;
    final client = MockClient((r) async {
      sent = r;
      return http.Response.bytes(utf8.encode(jsonEncode({'text': ' Man’s chief end is to glorify God ', 'words': []})), 200, headers: {'content-type': 'application/json'});
    });
    final rec = _FakeRecorder();
    final s = ElevenLabsSpeech(token: () async => 'tok', client: client, recorder: rec);
    var heard = '', ended = false;
    expect(await s.start(onWords: (w) => heard = w, onEnded: () => ended = true, hints: ['Melchizedek', 'hath']), isTrue);
    await s.stop();
    expect(sent.url.path, '/api/heir/transcribe');
    expect(sent.url.queryParametersAll['k'], ['Melchizedek', 'hath']);
    expect(sent.headers['Authorization'], 'Bearer tok');
    expect(sent.bodyBytes, [1, 2, 3, 4]);
    expect(heard, 'Man’s chief end is to glorify God');
    expect(ended, isTrue);
    expect(File(rec.path!).existsSync(), isFalse, reason: 'the recording is not kept');
    expect(s.unreachable, isFalse);
  });

  test('when ElevenLabs can’t be reached, the try asks to say it again and the phone’s recognizer takes over', () async {
    final cloud = ElevenLabsSpeech(token: () async => 'tok', client: MockClient((_) async => http.Response('{"unavailable":true}', 503)), recorder: _FakeRecorder());
    final device = _Device();
    final hybrid = HybridSpeech(device: device, cloud: cloud, useCloud: () => true);
    expect(hybrid.usingCloud, isTrue);
    var heard = 'x';
    await hybrid.start(onWords: (w) => heard = w, onEnded: () {});
    expect(hybrid.live, isFalse);
    await hybrid.stop();
    expect(heard, '');
    expect(hybrid.problem, contains('say it again'));
    expect(hybrid.usingCloud, isFalse);
    await hybrid.start(onWords: (_) {}, onEnded: () {});
    expect(device.starts, 1);
    expect(hybrid.live, isTrue);
  });

  test('children, and anyone signed out, use the phone’s recognizer', () async {
    final device = _Device();
    final hybrid = HybridSpeech(device: device, cloud: ElevenLabsSpeech(token: () async => null, client: MockClient((_) async => http.Response('', 500)), recorder: _FakeRecorder()), useCloud: () => false);
    await hybrid.start(onWords: (_) {}, onEnded: () {});
    expect(device.starts, 1);
  });
}
