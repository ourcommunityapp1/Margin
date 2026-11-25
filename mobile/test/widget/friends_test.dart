import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:katekize/ui/widgets.dart' show KPage;
import 'package:katekize/data/household.dart';
import 'package:katekize/data/social.dart';
import 'package:katekize/data/store.dart';
import 'package:katekize/engine/types.dart';
import 'package:katekize/state/household.dart';
import 'package:material_ui/material_ui.dart' show SizedBox, TextField;

import 'fakes.dart';

MemoryStore _phone() => MemoryStore({
      householdKey: householdToJson(setPlan(addMember(emptyHousehold(), 'Ann', Track.adult, 'ann', DateTime(2026, 11, 1)), const Plan(course: 'first-verses', minutes: 15))),
    });

const _me = MyProfile(username: 'ann_s', firstName: 'Ann', lastName: 'Smith');

const _bea = Person(username: 'bea', name: 'Bea Jones', city: 'Franklin', region: 'TN', friendsCount: 4, mutual: 1);
const _cal = Person(
  username: 'cal',
  name: 'Cal Wright',
  friendsCount: 2,
  relation: Relation.friend,
  friendsSince: '2026-03-10T12:00:00Z',
  wordsInMemory: 1234,
  streak: 5,
  stones: [3, 2, 1, 0, 0, 0],
  courses: [(course: 'first-verses', learned: 4, total: 10)],
  friends: [(username: 'bea', name: 'Bea Jones')],
);

Future<void> _openFriends(WidgetTester tester) async {
  await tester.tap(find.bySemanticsLabel(RegExp('^Friends')));
  await tester.pumpAndSettle();
}

Future<void> _tap(WidgetTester tester, String text) async {
  await tester.ensureVisible(find.text(text).first);
  await tester.pumpAndSettle();
  await tester.tap(find.text(text).first);
  await tester.pumpAndSettle();
}

Future<void> _pump(WidgetTester tester, FakeSocial social) => pumpApp(tester, store: _phone(), auth: FakeAuth(email: 'ann@example.com'), social: social);

void main() {
  testWidgets('with no profile, Friends asks to make one', (tester) async {
    final social = FakeSocial();
    await _pump(tester, social);
    await _openFriends(tester);
    expect(find.text('Memorize with friends. Make a profile to find people and be found.'), findsOneWidget);
    await _tap(tester, 'Make my profile');
    expect(find.text('Your profile'), findsOneWidget);
  });

  testWidgets('a new account has its profile made for it, so Friends opens ready to search', (tester) async {
    final social = FakeSocial(autoProfile: true);
    await _pump(tester, social);
    await _openFriends(tester);
    expect(social.autoCalls, greaterThan(0));
    expect(find.text('Make my profile'), findsNothing);
    expect(find.text('Search by name or username'), findsWidgets);
    expect(social.profile?.discoverable, true);
    expect(social.profile?.fofVisible, true);
  });

  testWidgets('lists friends with streaks and words, and the request count', (tester) async {
    final social = FakeSocial(profile: _me)
      ..friends = [const FriendRow(username: 'cal', name: 'Cal Wright', wordsInMemory: 1234, streak: 5)]
      ..incoming = [const RequestRow(id: 'r1', username: 'bea', name: 'Bea Jones')];
    await _pump(tester, social);
    await _openFriends(tester);
    expect(find.text('1 friend'), findsOneWidget);
    expect(find.text('Cal Wright'), findsOneWidget);
    expect(find.text('5-day streak'), findsOneWidget);
    expect(find.text('1,234'), findsOneWidget);
    expect(find.text('1'), findsOneWidget); // one request waiting
  });

  testWidgets('search finds someone and Add sends a request', (tester) async {
    final social = FakeSocial(profile: _me)..people = [_bea];
    await _pump(tester, social);
    await _openFriends(tester);
    await tester.enterText(find.byType(TextField).first, 'bea');
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pumpAndSettle();
    expect(find.text('Bea Jones'), findsOneWidget);
    expect(find.text('@bea · Franklin, TN'), findsOneWidget);
    expect(find.text('4 friends · 1 in common'), findsOneWidget);
    await _tap(tester, 'Add');
    expect(social.sent, ['bea']);
    expect(find.text('Sent'), findsOneWidget);
  });

  testWidgets('a search with no match says why', (tester) async {
    final social = FakeSocial(profile: _me);
    await _pump(tester, social);
    await _openFriends(tester);
    await tester.enterText(find.byType(TextField).first, 'zzz');
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pumpAndSettle();
    expect(find.text('No one found. They may not have turned on “Let people find me”.'), findsOneWidget);
  });

  testWidgets('requests: accept one, say not now to another, cancel one you sent', (tester) async {
    final social = FakeSocial(profile: _me)
      ..incoming = [const RequestRow(id: 'r1', username: 'bea', name: 'Bea Jones'), const RequestRow(id: 'r2', username: 'dan', name: 'Dan Fox', friendsCount: 1)]
      ..outgoing = [const RequestRow(id: 'r3', username: 'eve', name: 'Eve Hall')];
    await _pump(tester, social);
    await _openFriends(tester);
    await _tap(tester, 'Friend requests');
    expect(find.text('For you · 2'), findsOneWidget);
    expect(find.text('You sent · 1'), findsOneWidget);
    await _tap(tester, 'Accept');
    expect(social.answered, ['r1:true']);
    await _tap(tester, 'Not now');
    expect(social.answered, ['r1:true', 'r2:false']);
    await _tap(tester, 'Cancel');
    expect(social.answered.last, 'cancel:r3');
    expect(find.text('No requests right now.'), findsOneWidget);
  });

  testWidgets('a friend: summary, stones, courses, their friends; remove asks first', (tester) async {
    final social = FakeSocial(profile: _me)
      ..people = [_cal, _bea]
      ..friends = [const FriendRow(username: 'cal', name: 'Cal Wright', wordsInMemory: 1234, streak: 5)];
    await _pump(tester, social);
    await _openFriends(tester);
    await _tap(tester, 'Cal Wright');
    expect(find.text('Friends since Mar 2026'), findsOneWidget);
    expect(find.text('1,234'), findsOneWidget);
    expect(find.text('day streak'), findsOneWidget);
    expect(find.text('Stones'), findsOneWidget);
    expect(find.text('4 of 10'), findsOneWidget);
    expect(find.text('Bea'), findsOneWidget);
    await _tap(tester, 'Remove friend');
    expect(find.text('Remove Cal Wright as a friend? They won’t be told.'), findsOneWidget);
    expect(social.removed, isEmpty);
    await _tap(tester, 'Keep');
    expect(social.removed, isEmpty);
    await _tap(tester, 'Remove friend');
    await _tap(tester, 'Remove');
    expect(social.removed, ['cal']);
    expect(find.text('Friend requests'), findsOneWidget); // back on Friends
  });

  testWidgets('a stranger shows no numbers; block asks first; report sends a note', (tester) async {
    final social = FakeSocial(profile: _me)..people = [_bea];
    await _pump(tester, social);
    await _openFriends(tester);
    await tester.enterText(find.byType(TextField).first, 'bea');
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pumpAndSettle();
    await _tap(tester, 'Bea Jones');
    expect(find.text('Their streak, words in memory, stones and courses show here once you’re friends.'), findsOneWidget);
    expect(find.text('Stones'), findsNothing);
    expect(find.text('Remove friend'), findsNothing);
    await _tap(tester, 'Report');
    await tester.enterText(find.byType(TextField).first, 'rude name');
    await _tap(tester, 'Send report');
    expect(social.reports, ['bea:rude name']);
    await _tap(tester, 'Block');
    expect(find.textContaining('You’ll be hidden from each other everywhere'), findsOneWidget);
    expect(social.blocked, isEmpty);
    await _tap(tester, 'Block');
    expect(social.blocked, ['bea']);
  });

  testWidgets('making a friend invite copies the link', (tester) async {
    final copied = <String>[];
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, (call) async {
      if (call.method == 'Clipboard.setData') copied.add((call.arguments as Map)['text'] as String);
      return null;
    });
    addTearDown(() => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, null));
    final social = FakeSocial(profile: _me);
    await _pump(tester, social);
    await _openFriends(tester);
    await tester.tap(find.bySemanticsLabel('Invite someone to Katekize'));
    await tester.pumpAndSettle();
    await _tap(tester, 'Send an invite');
    expect(social.friendInvites, 1);
    expect(copied, ['Memorize with me on Katekize: https://katekize.com/heir/invite?code=f00dfeedf00dfeedf00dfeedf00dfeed']);
    expect(find.text('Link copied. Paste it in a message.'), findsOneWidget);
  });

  Future<void> openInvite(WidgetTester tester) async {
    GoRouter.of(tester.element(find.byType(KPage).first)).go('/invite?code=abc123');
    await tester.pumpAndSettle();
  }

  testWidgets('opening a friend invite: shows who it is from, then becomes friends', (tester) async {
    final social = FakeSocial(profile: _me);
    await _pump(tester, social);
    await openInvite(tester);
    expect(find.text('Dan invited you to be friends on Katekize.'), findsOneWidget);
    await _tap(tester, 'Be friends with Dan');
    expect(social.accepted, ['abc123']);
    expect(find.text('You and Dan are friends.'), findsOneWidget);
  });

  testWidgets('a friend invite without a profile asks for one first; used and own invites say so', (tester) async {
    final social = FakeSocial();
    await _pump(tester, social);
    await openInvite(tester);
    expect(find.text('Someone invited you to Katekize.'), findsOneWidget);
    social.profile = _me;
    social.peek = const InvitePeek('used');
    await tester.pumpWidget(const SizedBox());
    await _pump(tester, social);
    await openInvite(tester);
    expect(find.text('This invite was already used or has expired.'), findsOneWidget);
  });

  testWidgets('a website link to an invite opens the app’s invite screen', (tester) async {
    final social = FakeSocial(profile: _me);
    await _pump(tester, social);
    GoRouter.of(tester.element(find.byType(KPage).first)).go('/heir/invite?code=abc123');
    await tester.pumpAndSettle();
    expect(find.text('Dan invited you to be friends on Katekize.'), findsOneWidget);
  });

  testWidgets('a website link to a person opens their page', (tester) async {
    final social = FakeSocial(profile: _me)..people = [_bea];
    await _pump(tester, social);
    GoRouter.of(tester.element(find.byType(KPage).first)).go('/heir/u?name=bea');
    await tester.pumpAndSettle();
    expect(find.text('Bea Jones'), findsOneWidget);
  });

  testWidgets('a link to join accounts links them and says so; a refused one says why', (tester) async {
    final social = FakeSocial(profile: _me);
    await _pump(tester, social);
    GoRouter.of(tester.element(find.byType(KPage).first)).go('/heir/join?code=abc123');
    await tester.pumpAndSettle();
    expect(social.joined, ['abc123']);
    expect(find.textContaining('You’re linked.'), findsOneWidget);
    await _tap(tester, 'See Linked accounts');
    expect(find.text('Linked account · view only'), findsNothing);
    expect(find.text('Link a spouse’s account'), findsOneWidget);
  });
}
