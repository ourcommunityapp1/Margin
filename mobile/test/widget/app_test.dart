import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/data/store.dart';
import 'package:material_ui/material_ui.dart';

import 'fakes.dart';

Future<void> _tapVisible(WidgetTester tester, String text) async {
  await tester.ensureVisible(find.text(text));
  await tester.pumpAndSettle();
  await tester.tap(find.text(text));
  await tester.pumpAndSettle();
}

/// Welcome → name → course → daily goal → Today.
Future<void> setUpAccount(WidgetTester tester, {String name = 'Ann', String course = 'First Verses'}) async {
  await tester.tap(find.text('Get started'));
  await tester.pumpAndSettle();
  await tester.enterText(find.byType(TextField), name);
  await tester.pump();
  await tester.tap(find.text('Continue'));
  await tester.pumpAndSettle();
  await _tapVisible(tester, course);
  await _tapVisible(tester, 'Continue');
  await _tapVisible(tester, 'Start');
}

void main() {
  testWidgets('a new person starts at Welcome, says their name, and lands on Today', (tester) async {
    await pumpApp(tester);
    expect(find.text('Get started'), findsOneWidget);
    expect(find.textContaining('Scripture, catechisms and creeds'), findsOneWidget);
    expect(find.text('Already set up? Sign in'), findsOneWidget);

    await tester.tap(find.text('Get started'));
    await tester.pumpAndSettle();
    expect(find.text('What’s your name?'), findsWidgets);

    await tester.enterText(find.byType(TextField), 'Landon Whitlock');
    await tester.pump();
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();

    // What to memorize, then how long each day.
    expect(find.text('What would you like to memorize?'), findsOneWidget);
    expect(find.text('Continue'), findsOneWidget);
    await _tapVisible(tester, 'First Verses');
    await _tapVisible(tester, 'Continue');
    expect(find.text('How long each day?'), findsOneWidget);
    expect(find.text('5 minutes a day'), findsOneWidget);
    expect(find.text('15 minutes a day'), findsOneWidget);
    expect(find.text('25 minutes a day'), findsOneWidget);
    expect(find.textContaining('In long-term memory by'), findsWidgets);
    await _tapVisible(tester, '25 minutes a day');
    await _tapVisible(tester, 'Start');

    // Today: the day's card for the course, ready to begin.
    expect(find.text('Good afternoon, Landon'), findsOneWidget);
    expect(find.text('First Verses'), findsWidgets);
    expect(find.text('Recommended'.toUpperCase()), findsOneWidget);
    expect(find.text('Begin'), findsOneWidget);
    expect(find.textContaining('0 of 1 done'), findsOneWidget);
    expect(find.text('Today'), findsOneWidget);
    expect(find.text('Courses'), findsOneWidget);
    expect(find.text('Progress'), findsOneWidget);
    expect(find.text('Friends'), findsNothing, reason: 'Friends shows only once signed in');
  });

  testWidgets('Continue waits for a name', (tester) async {
    await pumpApp(tester);
    await tester.tap(find.text('Get started'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();
    expect(find.text('What’s your name?'), findsWidgets);
  });

  testWidgets('the tabs switch screens', (tester) async {
    await pumpApp(tester);
    await setUpAccount(tester);

    await tester.tap(find.text('Courses'));
    await tester.pumpAndSettle();
    expect(find.text('First Verses'), findsOneWidget);
    expect(find.text('Westminster Shorter Catechism'), findsOneWidget);

    await tester.tap(find.text('Progress'));
    await tester.pumpAndSettle();
    expect(find.textContaining('Your week'), findsOneWidget);
  });

  testWidgets('sign in by emailed code, then the Friends tab appears', (tester) async {
    final auth = FakeAuth();
    await pumpApp(tester, auth: auth);
    await setUpAccount(tester);

    await tester.tap(find.bySemanticsLabel(RegExp('^You: Ann')));
    await tester.pumpAndSettle();
    expect(find.text('Adult track · not signed in'), findsOneWidget);
    await tester.tap(find.text('Sign in'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Your progress on this phone will be saved'), findsOneWidget);
    await tester.enterText(find.byType(TextField), 'ann@example.com');
    await tester.pump();
    await tester.tap(find.text('Email me a code'));
    await tester.pumpAndSettle();
    expect(auth.sent, ['ann@example.com']);
    expect(find.text('The code we sent to ann@example.com'), findsOneWidget);

    await tester.enterText(find.byType(TextField), '000000');
    await tester.pump();
    await tester.tap(find.text('Sign in'));
    await tester.pumpAndSettle();
    expect(find.text('That code didn’t work. Check it, or send a new one.'), findsOneWidget);

    await tester.enterText(find.byType(TextField), '123456');
    await tester.pump();
    await tester.tap(find.text('Sign in'));
    await tester.pumpAndSettle();

    expect(find.text('Signed in as ann@example.com'), findsOneWidget);
    await tester.tap(find.text('Sign out'));
    await tester.pumpAndSettle();
    expect(find.text('Adult track · not signed in'), findsOneWidget);
  });

  testWidgets('a failed send says so', (tester) async {
    await pumpApp(tester, auth: FakeAuth(failSend: true));
    await tester.tap(find.text('Already set up? Sign in'));
    await tester.pumpAndSettle();
    expect(find.textContaining('One account for the family'), findsOneWidget);
    await tester.enterText(find.byType(TextField), 'ann@example.com');
    await tester.pump();
    await tester.tap(find.text('Email me a code'));
    await tester.pumpAndSettle();
    expect(find.text('We couldn’t send a code. Check the address and try again.'), findsOneWidget);
  });

  testWidgets('without accounts there is no sign-in', (tester) async {
    await pumpApp(tester, auth: FakeAuth(accounts: false));
    expect(find.text('Already set up? Sign in'), findsNothing);
  });

  testWidgets('a course and an item show the text exactly as exported', (tester) async {
    await pumpApp(tester);
    await setUpAccount(tester);

    await tester.tap(find.text('Courses'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Westminster Shorter Catechism'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Westminster Shorter Catechism'));
    await tester.pumpAndSettle();
    expect(find.text('Q1'), findsOneWidget);
    expect(find.text('Courses'), findsWidgets, reason: 'the tab bar stays up on a course');

    await tester.ensureVisible(find.text('Q1'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Q1'));
    await tester.pumpAndSettle();
    expect(find.text('What is the chief end of man?'), findsOneWidget);
    expect(find.text('Man’s chief end is to glorify God, and to enjoy him forever.'), findsOneWidget);
    expect(find.text('What it means'), findsOneWidget);
    expect(find.text('1 Corinthians 10:31'), findsOneWidget);
  });

  testWidgets('reopening the app remembers who you are and what you chose', (tester) async {
    final store = MemoryStore();
    await pumpApp(tester, store: store);
    await setUpAccount(tester, name: 'Ann Lee', course: 'Psalm 23');
    expect(find.text('Good afternoon, Ann'), findsOneWidget);

    // A fresh start of the app, with the same storage: straight to Today, no Welcome.
    await tester.pumpWidget(const SizedBox());
    await pumpApp(tester, store: store);
    expect(find.text('Get started'), findsNothing);
    expect(find.text('Good afternoon, Ann'), findsOneWidget);
    expect(find.text('Psalm 23'), findsWidgets);
    expect(find.text('Begin'), findsOneWidget);
  });

  testWidgets('beginning a card opens its lesson', (tester) async {
    await pumpApp(tester);
    await setUpAccount(tester);
    await tester.tap(find.text('Begin'));
    await tester.pumpAndSettle();
    expect(find.text('Welcome'), findsWidgets);
    expect(find.text('Why learn verses by heart?'), findsOneWidget);
  });
}
