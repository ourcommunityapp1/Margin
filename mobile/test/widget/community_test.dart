import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:katekize/data/board.dart';
import 'package:katekize/data/household.dart';
import 'package:katekize/data/social.dart';
import 'package:katekize/data/store.dart';
import 'package:katekize/engine/types.dart';
import 'package:katekize/state/household.dart';
import 'package:katekize/ui/widgets.dart' show KPage;

import 'fakes.dart';

MemoryStore _phone() => MemoryStore({
      householdKey: householdToJson(setPlan(addMember(emptyHousehold(), 'Ann', Track.adult, 'ann', DateTime(2026, 11, 1)), const Plan(course: 'first-verses', minutes: 15))),
    });

const _me = MyProfile(username: 'ann_s', firstName: 'Ann', lastName: 'Smith');

BoardRow _r(int idx, String u, {int? prev, String relation = 'friend', bool me = false, int words = 100, String? via}) =>
    BoardRow(place: idx, prevPlace: prev, idx: idx, username: u, relation: me ? 'me' : relation, words: words, name: u[0].toUpperCase() + u.substring(1), isMe: me, via: via);

FakeSocial _social() => FakeSocial(profile: _me)
  ..board = Board(period: Period.all, total: 6, myPlace: 5, rows: [
    _r(1, 'bea', words: 5000),
    _r(2, 'cal', words: 4000, relation: 'fof', via: 'Bea'),
    _r(3, 'dan', words: 3000),
    _r(5, 'ann', words: 900, me: true, prev: 7),
  ])
  ..boardStatus = const BoardStatus(moved: 2, place: 5, total: 6);

Future<void> _pump(WidgetTester tester, FakeSocial social) => pumpApp(tester, store: _phone(), auth: FakeAuth(email: 'ann@example.com'), social: social);

Future<void> _openFriends(WidgetTester tester) async {
  await tester.tap(find.bySemanticsLabel(RegExp('^Community')));
  await tester.pumpAndSettle();
}

Future<void> _tap(WidgetTester tester, String text) async {
  await tester.ensureVisible(find.text(text).first);
  await tester.pumpAndSettle();
  await tester.tap(find.text(text).first);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('the Friends tab shows a dot when your place moved', (tester) async {
    await _pump(tester, _social());
    expect(find.bySemanticsLabel('Community. Your place on the leaderboard changed'), findsOneWidget);
  });

  testWidgets('no dot when nothing moved', (tester) async {
    final s = _social()..boardStatus = const BoardStatus(place: 5, total: 6);
    await _pump(tester, s);
    expect(find.bySemanticsLabel('Community. Your place on the leaderboard changed'), findsNothing);
  });

  testWidgets('the preview on Friends: top three, a gap, then you, with your move', (tester) async {
    await _pump(tester, _social());
    await _openFriends(tester);
    expect(find.text('Community'), findsWidgets, reason: 'the page title and its tab');
    expect(find.text('Bea'), findsOneWidget);
    expect(find.text('Cal'), findsOneWidget);
    expect(find.text('Dan'), findsOneWidget);
    expect(find.text('You'), findsOneWidget);
    expect(find.textContaining('5th of 6'), findsOneWidget);
    expect(find.text('▲ 2'), findsOneWidget); // the pill
    expect(find.text('···'), findsOneWidget);
    expect(find.text('5,000'), findsOneWidget);
    expect(find.text('Bea’s friend'), findsOneWidget);
  });

  testWidgets('just you so far: the preview asks to find friends', (tester) async {
    final s = FakeSocial(profile: _me)..board = Board(period: Period.all, total: 1, rows: [_r(1, 'ann', me: true)]);
    await _pump(tester, s);
    await _openFriends(tester);
    expect(find.text('Just you so far'), findsOneWidget);
    await _tap(tester, 'Find friends');
    expect(find.bySemanticsLabel(RegExp('^Friend requests')), findsOneWidget);
  });

  testWidgets('with no profile, Friends and the board ask to make one', (tester) async {
    await _pump(tester, FakeSocial());
    await _openFriends(tester);
    // Friends asks for a profile itself, so the preview stays away (as on the website).
    expect(find.text('Make my profile'), findsOneWidget);
    expect(find.text('Memorize alongside friends. Make a profile to see how you compare.'), findsNothing);
    GoRouter.of(tester.element(find.byType(KPage).first)).go('/community');
    await tester.pumpAndSettle();
    expect(find.text('Make a profile to join your community’s board.'), findsOneWidget);
  });

  testWidgets('the full board: rows, marks it seen, switches to this month, explains', (tester) async {
    final s = _social();
    await _pump(tester, s);
    await _openFriends(tester);
    await _tap(tester, 'View leaderboard');
    expect(find.text('Community'), findsWidgets);
    expect(find.text('Words in memory · 6 people in your community · '), findsOneWidget);
    expect(s.seenPeriods, ['all']);
    // Seen: the dot is gone.
    expect(find.bySemanticsLabel('Community. Your place on the leaderboard changed'), findsNothing);
    await _tap(tester, 'This month');
    expect(s.lastBoardPeriod, Period.month);
    expect(s.seenPeriods, ['all', 'month']);
    await _tap(tester, 'How it’s counted');
    expect(find.textContaining('A word counts once you’ve typed or said'), findsOneWidget);
    await _tap(tester, 'Got it');
    expect(find.textContaining('A word counts once you’ve typed or said'), findsNothing);
  });

  testWidgets('tapping a friend on the board opens their page', (tester) async {
    final s = _social()..people = [const Person(username: 'bea', name: 'Bea Jones')];
    await _pump(tester, s);
    await _openFriends(tester);
    await _tap(tester, 'View leaderboard');
    await tester.tap(find.text('Bea').first);
    await tester.pumpAndSettle();
    expect(find.text('Bea Jones'), findsOneWidget);
  });
}
