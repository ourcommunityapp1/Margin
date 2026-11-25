import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'data/cloud.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await connectCloud();
  runApp(const ProviderScope(child: KatekizeApp()));
}
