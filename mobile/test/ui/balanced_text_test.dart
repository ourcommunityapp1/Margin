import 'package:flutter_test/flutter_test.dart';
import 'package:katekize/ui/widgets.dart';
import 'package:material_ui/material_ui.dart';

void main() {
  testWidgets('balanced text settles, and wraps evenly', (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Center(
        child: SizedBox(
          width: 200,
          child: Row(children: [Expanded(child: KBalancedText('Westminster Shorter Catechism', style: TextStyle(fontSize: 20)))]),
        ),
      ),
    ));
    await tester.pumpAndSettle(const Duration(milliseconds: 100), EnginePhase.sendSemanticsUpdate, const Duration(seconds: 5));
    expect(find.text('Westminster Shorter Catechism'), findsOneWidget);
  });
}
