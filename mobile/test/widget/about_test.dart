import 'dart:convert';
import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/data/household.dart';
import 'package:katekize/data/store.dart';
import 'package:katekize/engine/types.dart';
import 'package:katekize/features/about/about_screen.dart' as about;
import 'package:katekize/features/window/window_view_screen.dart';
import 'package:katekize/state/household.dart';
import 'package:katekize/state/sync.dart';
import 'package:katekize/ui/theme.dart';
import 'package:material_ui/material_ui.dart';

import 'fakes.dart';

String _norm(String url) => Uri.decodeFull(url).toLowerCase();

void main() {
  test('every window the app carries is credited on the About screen', () {
    final credited = about.windows.map((c) => _norm(c.page)).toSet();
    for (final dir in Directory('assets/glass').listSync().whereType<Directory>()) {
      final meta = jsonDecode(File('${dir.path}/pieces.json').readAsStringSync()) as Map<String, dynamic>;
      final c = meta['credit'] as Map<String, dynamic>;
      expect(credited, contains(_norm(c['page'] as String)), reason: '${dir.path.split('/').last} (${c['license']}) is not on the About screen');
    }
  });

  test('the background photos and the stones are credited, with their licences', () {
    expect(about.photos.map((p) => p.title), ['Dawn', 'Day', 'Dusk', 'Night']);
    for (final f in Directory('assets/images/stones').listSync().whereType<File>().map((f) => f.uri.pathSegments.last.replaceAll('.jpg', ''))) {
      expect(about.stones.map((s) => s.title.toLowerCase()), contains(f), reason: 'the $f stone');
    }
    for (final c in [...about.windows, ...about.photos, ...about.stones, ...about.fonts]) {
      expect(c.license, isNotEmpty);
      expect(c.page, startsWith('https://'));
    }
  });

  testWidgets('the About screen shows what Katekize is and lists the credits', (tester) async {
    await pumpApp(tester);
    await tester.pumpWidget(const SizedBox());
    await tester.pumpWidget(
      ProviderScope(
        overrides: [storeProvider.overrideWithValue(MemoryStore()), accountApiProvider.overrideWithValue(null)],
        child: MaterialApp(theme: katekizeTheme(), home: const about.AboutScreen()),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('About Katekize'), findsOneWidget);
    expect(find.textContaining('public domain'), findsWidgets);
    await tester.ensureVisible(find.text('Stained-glass windows, from Wikimedia Commons'));
    expect(find.text('Stained-glass windows, from Wikimedia Commons'), findsOneWidget);
    await tester.ensureVisible(find.textContaining('The Nativity'));
    expect(find.textContaining('The Nativity'), findsOneWidget);
  });

  testWidgets('a window up close shows the course and a way into it', (tester) async {
    await pumpApp(tester); // loads the content
    final h = setPlan(addMember(emptyHousehold(), 'Ann', Track.adult, 'me', DateTime(2026, 11, 20)), const Plan(course: 'gospel', minutes: 15));
    tester.view.physicalSize = const Size(1206, 2622);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(const SizedBox());
    await tester.pumpWidget(
      ProviderScope(
        overrides: [storeProvider.overrideWithValue(MemoryStore({householdKey: householdToJson(h)})), accountApiProvider.overrideWithValue(null)],
        child: MaterialApp(theme: katekizeTheme(), home: const WindowViewScreen(courseId: 'gospel')),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('The Gospel'), findsOneWidget);
    expect(find.text('Go to course'), findsOneWidget);
    expect(find.textContaining('learned'), findsOneWidget);
  });
}
