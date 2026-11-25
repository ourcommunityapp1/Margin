import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'data/cloud.dart';
import 'data/content_assets.dart';
import 'data/store.dart';
import 'state/household.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await loadBundledContent();
  await connectCloud();
  final store = await openStore();
  runApp(ProviderScope(overrides: [storeProvider.overrideWithValue(store)], child: const KatekizeApp()));
}
