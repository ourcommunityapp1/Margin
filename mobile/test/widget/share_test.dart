import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:katekize/data/household.dart';
import 'package:katekize/data/social.dart';
import 'package:katekize/data/store.dart';
import 'package:katekize/engine/types.dart';
import 'package:katekize/platform/share.dart';
import 'package:katekize/state/household.dart';
import 'package:katekize/ui/widgets.dart' show KPage;

import 'fakes.dart';

class _Sharer implements Sharer {
  _Sharer({this.works = true});
  final bool works;
  final shared = <String>[];

  @override
  Future<bool> share({required String title, required String text, required String url}) async {
    shared.add('$title|$text|$url');
    return works;
  }
}

MemoryStore _phone() => MemoryStore({
      householdKey: householdToJson(setPlan(addMember(emptyHousehold(), 'Ann', Track.adult, 'ann', DateTime(2026, 11, 1)), const Plan(course: 'first-verses', minutes: 15))),
    });

Future<void> _tap(WidgetTester tester, String text) async {
  await tester.ensureVisible(find.text(text).first);
  await tester.pumpAndSettle();
  await tester.tap(find.text(text).first);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('a friend invite opens the share sheet (and copies nothing)', (tester) async {
    final copied = <String>[];
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, (call) async {
      if (call.method == 'Clipboard.setData') copied.add((call.arguments as Map)['text'] as String);
      return null;
    });
    addTearDown(() => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, null));
    final sharer = _Sharer();
    final social = FakeSocial(profile: const MyProfile(username: 'ann_s', firstName: 'Ann', lastName: 'Smith'));
    await pumpApp(tester, store: _phone(), auth: FakeAuth(email: 'ann@example.com'), social: social, sharer: sharer);
    await tester.tap(find.bySemanticsLabel(RegExp('^Friends')));
    await tester.pumpAndSettle();
    await tester.tap(find.bySemanticsLabel('Invite someone to Katekize'));
    await tester.pumpAndSettle();
    await _tap(tester, 'Send an invite');
    expect(sharer.shared, ['Memorize with me on Katekize|Memorize with me on Katekize:|https://katekize.com/heir/invite?code=f00dfeedf00dfeedf00dfeedf00dfeed']);
    expect(copied, isEmpty);
    expect(find.text('Link copied. Paste it in a message.'), findsNothing);
    expect(find.text('Send it again'), findsOneWidget);
  });

  testWidgets('a course can be shared; with no share sheet the link is copied and a tick shows', (tester) async {
    final copied = <String>[];
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, (call) async {
      if (call.method == 'Clipboard.setData') copied.add((call.arguments as Map)['text'] as String);
      return null;
    });
    addTearDown(() => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, null));
    final sharer = _Sharer(works: false);
    await pumpApp(tester, store: _phone(), sharer: sharer);
    GoRouter.of(tester.element(find.byType(KPage).first)).go('/courses/first-verses');
    await tester.pumpAndSettle();
    await tester.tap(find.bySemanticsLabel(RegExp('^Share ')));
    await tester.pumpAndSettle();
    expect(sharer.shared.single, startsWith('First Verses|Learn First Verses with me on Katekize:|https://katekize.com/heir/courses/first-verses'));
    expect(copied.single, 'Learn First Verses with me on Katekize: https://katekize.com/heir/courses/first-verses');
    expect(find.bySemanticsLabel('Link copied'), findsOneWidget);
  });
}
