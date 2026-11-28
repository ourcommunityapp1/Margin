import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/data/household.dart';
import 'package:katekize/data/social.dart';
import 'package:katekize/data/store.dart';
import 'package:katekize/engine/progress.dart';
import 'package:katekize/engine/types.dart';
import 'package:katekize/state/household.dart';
import 'package:material_ui/material_ui.dart' show TextField;

import 'fakes.dart';

MemoryStore _phone() => MemoryStore({
      householdKey: householdToJson(setPlan(addMember(emptyHousehold(), 'Ann', Track.adult, 'ann', DateTime(2026, 11, 1)), const Plan(course: 'first-verses', minutes: 15))),
    });

Future<void> _openYou(WidgetTester tester) async {
  await tester.tap(find.bySemanticsLabel(RegExp('^You: Ann')));
  await tester.pumpAndSettle();
}

Future<void> _tap(WidgetTester tester, String text) async {
  await tester.ensureVisible(find.text(text).first);
  await tester.pumpAndSettle();
  await tester.tap(find.text(text).first);
  await tester.pumpAndSettle();
}

Future<void> _type(WidgetTester tester, int field, String text) async {
  final f = find.byType(TextField).at(field);
  await tester.ensureVisible(f);
  await tester.enterText(f, text);
  await tester.pump(const Duration(milliseconds: 500));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('Profile and Linked accounts show only when signed in', (tester) async {
    await pumpApp(tester, store: _phone(), auth: FakeAuth());
    await _openYou(tester);
    expect(find.text('Your profile'), findsNothing);
    expect(find.text('Linked accounts'), findsNothing);
  });

  testWidgets('making a profile: checks the username, needs 13 or older, then saves', (tester) async {
    final social = FakeSocial();
    await pumpApp(tester, store: _phone(), auth: FakeAuth(email: 'ann@example.com'), social: social);
    await _openYou(tester);
    await _tap(tester, 'Your profile');
    // The first name starts as the adult's first name.
    expect(find.text('Ann'), findsOneWidget);
    await _type(tester, 1, 'Smith');
    await _type(tester, 2, 'katie');
    expect(find.text('@katie is taken. Try @katie_2'), findsOneWidget);
    await _type(tester, 2, 'ann_s');
    expect(find.text('Available'), findsOneWidget);
    // Not yet: age not confirmed.
    await tester.ensureVisible(find.text('Make my profile'));
    await tester.tap(find.text('Make my profile'));
    await tester.pumpAndSettle();
    expect(social.saved, isEmpty);
    await _tap(tester, 'I’m 13 or older');
    await _tap(tester, 'Make my profile');
    expect(social.saved, hasLength(1));
    expect(social.saved.single.username, 'ann_s');
    expect(social.saved.single.first, 'Ann');
    expect(social.saved.single.last, 'Smith');
    expect(social.saved.single.ageOk, isTrue);
    expect(find.text('Saved.'), findsOneWidget);
    // Made: the button now says Save and the age box is gone.
    expect(find.text('Save'), findsOneWidget);
    expect(find.text('I’m 13 or older'), findsNothing);
  });

  testWidgets('an existing profile fills the form, saves changes and can be deleted', (tester) async {
    final social = FakeSocial(profile: const MyProfile(username: 'ann_s', firstName: 'Ann', lastName: 'Smith', city: 'Franklin', region: 'TN', discoverable: true, fofVisible: false));
    await pumpApp(tester, store: _phone(), auth: FakeAuth(email: 'ann@example.com'), social: social);
    await _openYou(tester);
    await _tap(tester, 'Your profile');
    expect(find.text('Franklin'), findsOneWidget);
    expect(find.text('Friends see Ann Smith. Everyone else sees Ann S.'), findsOneWidget);
    await _type(tester, 3, 'Nashville');
    await _tap(tester, 'Let people find me');
    await _tap(tester, 'Save');
    expect(social.saved.single.city, 'Nashville');
    expect(social.saved.single.discoverable, isFalse);
    expect(social.saved.single.fof, isFalse);
    // Delete asks first.
    await _tap(tester, 'Delete my profile');
    expect(social.deleted, isFalse);
    await _tap(tester, 'Delete');
    expect(social.deleted, isTrue);
    expect(find.text('Linked accounts'), findsOneWidget); // back on You
  });

  testWidgets('a username the rules refuse shows why and blocks saving', (tester) async {
    final social = FakeSocial(profile: const MyProfile(username: 'ann_s', firstName: 'Ann', lastName: 'Smith'));
    await pumpApp(tester, store: _phone(), auth: FakeAuth(email: 'ann@example.com'), social: social);
    await _openYou(tester);
    await _tap(tester, 'Your profile');
    await _type(tester, 2, 'a!');
    expect(find.text('Use 3 to 20 letters, numbers or underscores, starting with a letter.'), findsOneWidget);
    await tester.ensureVisible(find.text('Save'));
    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();
    expect(social.saved, isEmpty);
  });

  testWidgets('Linked accounts shows a linked family, view only, and unlinks after asking', (tester) async {
    await tester.runAsync(() async {});
    final social = FakeSocial(linked: [
      LinkedAccount(
        ownerId: 'owner-2',
        plan: const Plan(course: 'first-verses', minutes: 15),
        members: [(id: 'bea', name: 'Bea', track: Track.adult), (id: 'cal', name: 'Cal', track: Track.child)],
        progress: {'bea': emptyProgress()},
      ),
    ]);
    await pumpApp(tester, store: _phone(), auth: FakeAuth(email: 'ann@example.com'), social: social);
    await _openYou(tester);
    await _tap(tester, 'Linked accounts');
    expect(find.text('Linked account · view only'), findsOneWidget);
    expect(find.text('Bea'), findsOneWidget);
    expect(find.text('Cal'), findsOneWidget);
    expect(find.text('No lessons yet.'), findsOneWidget); // Cal has none
    await _tap(tester, 'Unlink');
    expect(social.unlinked, isEmpty);
    expect(find.textContaining('Unlinking only stops you seeing each other'), findsOneWidget);
    await _tap(tester, 'Keep the link');
    expect(social.unlinked, isEmpty);
    await _tap(tester, 'Unlink');
    await tester.tap(find.text('Unlink').last);
    await tester.pumpAndSettle();
    expect(social.unlinked, ['owner-2']);
    expect(find.text('Linked account · view only'), findsNothing);
  });

  testWidgets('making an invite link shows it and copies it', (tester) async {
    final copied = <String>[];
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, (call) async {
      if (call.method == 'Clipboard.setData') copied.add((call.arguments as Map)['text'] as String);
      return null;
    });
    addTearDown(() => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, null));
    final social = FakeSocial();
    await pumpApp(tester, store: _phone(), auth: FakeAuth(email: 'ann@example.com'), social: social);
    await _openYou(tester);
    await _tap(tester, 'Linked accounts');
    await _tap(tester, 'Make an invite link');
    expect(social.invites, 1);
    expect(find.text('https://katekize.com/heir/join?code=abcdef0123456789abcdef0123456789'), findsOneWidget);
    await _tap(tester, 'Send the link');
    expect(copied, ['Link our Katekize accounts: https://katekize.com/heir/join?code=abcdef0123456789abcdef0123456789']);
    expect(find.text('Link copied. Paste it in a message.'), findsOneWidget);
  });
}
