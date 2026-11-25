import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';

import 'fakes.dart';

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

    expect(find.text('Good afternoon, Landon'), findsOneWidget);
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
    await tester.tap(find.text('Get started'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Ann');
    await tester.pump();
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();

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
    await tester.tap(find.text('Get started'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Ann');
    await tester.pump();
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();

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
    await tester.tap(find.text('Get started'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Ann');
    await tester.pump();
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();

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
}
