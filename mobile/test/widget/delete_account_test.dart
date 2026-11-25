import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/data/household.dart';
import 'package:katekize/data/store.dart';
import 'package:katekize/engine/progress.dart';
import 'package:katekize/engine/types.dart';
import 'package:katekize/state/household.dart';
import 'package:material_ui/material_ui.dart' show TextField;

import 'fakes.dart';

MemoryStore _phone() => MemoryStore({
      householdKey: householdToJson(setPlan(addMember(emptyHousehold(), 'Ann', Track.adult, 'ann', DateTime(2026, 11, 1)), const Plan(course: 'first-verses', minutes: 15))),
      progressKey: jsonEncode({'ann': emptyProgress().toJson()}),
    });

Future<void> _open(WidgetTester tester) async {
  await tester.tap(find.bySemanticsLabel(RegExp('^You: Ann')));
  await tester.pumpAndSettle();
  await tester.ensureVisible(find.text('Delete my account').first);
  await tester.pumpAndSettle();
  await tester.tap(find.text('Delete my account').first);
  await tester.pumpAndSettle();
}

Future<void> _tapButton(WidgetTester tester) async {
  final b = find.text('Delete my account').last;
  await tester.ensureVisible(b);
  await tester.pumpAndSettle();
  await tester.tap(b);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('the option is only there when signed in', (tester) async {
    await pumpApp(tester, store: _phone(), auth: FakeAuth());
    await tester.tap(find.bySemanticsLabel(RegExp('^You: Ann')));
    await tester.pumpAndSettle();
    expect(find.text('Delete my account'), findsNothing);
  });

  testWidgets('it says what goes, and does nothing until DELETE is typed', (tester) async {
    final social = FakeSocial();
    await pumpApp(tester, store: _phone(), auth: FakeAuth(email: 'ann@example.com'), social: social);
    await _open(tester);
    expect(find.textContaining('permanently deletes the account for ann@example.com'), findsOneWidget);
    expect(find.text('Your profile, friends, friend requests and blocks'), findsOneWidget);
    await _tapButton(tester);
    expect(social.deletes, 0);
    await tester.enterText(find.byType(TextField), 'delete');
    await tester.pump();
    await _tapButton(tester);
    expect(social.deletes, 0, reason: 'the word must be DELETE');
  });

  testWidgets('typing DELETE deletes the account and clears the phone', (tester) async {
    final social = FakeSocial();
    final store = _phone();
    await pumpApp(tester, store: store, auth: FakeAuth(email: 'ann@example.com'), social: social);
    await _open(tester);
    await tester.enterText(find.byType(TextField), 'DELETE');
    await tester.pump();
    await _tapButton(tester);
    expect(social.deletes, 1);
    expect(find.text('Get started'), findsOneWidget, reason: 'back at the welcome screen');
    expect(parseHousehold(store.read(householdKey)).members, isEmpty);
    expect(jsonDecode(store.read(progressKey)!), isEmpty);
  });

  testWidgets('when the server can’t, it says so and keeps everything', (tester) async {
    final social = FakeSocial()..deleteFails = 'Couldn’t reach Katekize. Check your connection and try again.';
    final store = _phone();
    await pumpApp(tester, store: store, auth: FakeAuth(email: 'ann@example.com'), social: social);
    await _open(tester);
    await tester.enterText(find.byType(TextField), 'DELETE');
    await tester.pump();
    await _tapButton(tester);
    expect(find.text('Couldn’t reach Katekize. Check your connection and try again.'), findsOneWidget);
    expect(parseHousehold(store.read(householdKey)).members, hasLength(1));
    expect(find.text('Delete my account'), findsWidgets);
  });
}
