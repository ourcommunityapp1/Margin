import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/app.dart';
import 'package:katekize/state/auth.dart';
import 'package:katekize/data/store.dart';
import 'package:katekize/state/clock.dart';
import 'package:katekize/state/household.dart';
import 'package:katekize/state/sync.dart';
import 'package:katekize/data/content_assets.dart';
import 'package:material_ui/material_ui.dart';

/// A sign-in service that never touches the network. The right code is always 123456.
class FakeAuth implements Auth {
  FakeAuth({this.accounts = true, String? email, this.failSend = false}) : _email = email;

  @override
  final bool accounts;
  final bool failSend;
  String? _email;
  final _changes = StreamController<String?>.broadcast();
  final sent = <String>[];

  @override
  String? get email => _email;

  @override
  Stream<String?> get changes => _changes.stream;

  @override
  Future<void> sendCode(String email) async {
    if (failSend) throw const AuthFailure('no');
    sent.add(email.trim());
  }

  @override
  Future<void> verifyCode(String email, String code) async {
    if (code.trim() != '123456') throw const AuthFailure('bad code');
    _email = email.trim();
    _changes.add(_email);
  }

  @override
  Future<void> signOut() async {
    _email = null;
    _changes.add(null);
  }
}

/// The whole app at a fixed time (a Tuesday afternoon), on an iPhone-sized screen, with a fake sign-in.
Future<void> pumpApp(WidgetTester tester, {FakeAuth? auth, Store? store}) async {
  await tester.runAsync(loadBundledContent);
  tester.view.physicalSize = const Size(1206, 2622);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  // As if "reduce motion" is on: the light moving behind unstarted windows stands still, so the screen can settle.
  tester.platformDispatcher.accessibilityFeaturesTestValue = const FakeAccessibilityFeatures(disableAnimations: true);
  addTearDown(tester.platformDispatcher.clearAccessibilityFeaturesTestValue);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        authProvider.overrideWithValue(auth ?? FakeAuth()),
        storeProvider.overrideWithValue(store ?? MemoryStore()),
        // No real account database in these tests.
        accountApiProvider.overrideWithValue(null),
        clockProvider.overrideWithValue(() => DateTime(2026, 11, 24, 14)),
      ],
      child: KatekizeApp(now: DateTime(2026, 11, 24, 14)),
    ),
  );
  await tester.pumpAndSettle();
}
