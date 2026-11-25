// How a group of items is named in words (ui/course.ts groupLabel): "Questions 1–5", "Psalm 23", "Genesis 1:1 to John 3:16".

import '../../engine/content.dart';
import '../../engine/lesson.dart' show Group;

String groupLabel(Group g) {
  final c = getCollection(g.collection);
  final a = g.items.first.number, b = g.items.last.number;
  if (c?.unit == 'Question') return a == b ? 'Question $a' : 'Questions $a–$b';
  if (c?.unit == 'Commandment') {
    return g.items.length == c!.items.length ? c.title : a == b ? 'Commandment $a' : 'Commandments $a–$b';
  }
  if (c?.kind == 'scripture') {
    return g.items.length == c!.items.length ? c.title : a == b ? g.items.first.prompt : '${g.items.first.prompt} to ${g.items.last.prompt}';
  }
  return g.items.length == c?.items.length ? (c?.title ?? '') : '${c?.title ?? ''}, parts $a–$b';
}
