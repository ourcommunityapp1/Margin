import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:katekize/data/content_assets.dart';
import 'package:katekize/data/household.dart';
import 'package:katekize/data/store.dart';
import 'package:katekize/engine/types.dart';
import 'package:katekize/state/household.dart';
import 'package:flutter/widgets.dart';

import 'fakes.dart';

// The biggest text setting on a small phone: nothing may overflow or throw on the main screens.
void main() {
  testWidgets('main screens survive 2x text on a small phone', (tester) async {
    await tester.runAsync(loadBundledContent);
    final h = setPlan(addMember(emptyHousehold(), 'Ann', Track.adult, 'ann', DateTime(2026, 11, 1)), const Plan(course: 'first-verses', minutes: 15));
    await pumpApp(tester, store: MemoryStore({householdKey: householdToJson(h), progressKey: jsonEncode({})}), auth: FakeAuth(email: 'ann@example.com'), social: FakeSocial(autoProfile: true));
    tester.view.physicalSize = const Size(1125, 2001); // 375 x 667 points
    tester.platformDispatcher.textScaleFactorTestValue = 2.0;
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    await tester.pumpAndSettle();
    final router = GoRouter.of(tester.element(find.byType(Navigator).first));
    final bad = <String>[];
    for (final path in ['/today', '/courses', '/progress', '/friends', '/you', '/plan', '/family', '/how', '/about', '/reminders', '/profile', '/linked', '/delete-account', '/community', '/lesson', '/discover', '/courses/westminster-shorter', '/item/wsc-1', '/item/fv-3']) {
      router.go(path);
      await tester.pumpAndSettle();
      final e = tester.takeException();
      if (e != null) bad.add('$path: $e');
    }
    expect(bad, isEmpty);
  });
}
