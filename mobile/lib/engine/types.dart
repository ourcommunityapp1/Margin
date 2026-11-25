// Katekize's content and progress shapes. Port of src/heir/types.ts.

enum Track { adult, child }

Track trackFrom(String s) => s == 'child' ? Track.child : Track.adult;
String trackName(Track t) => t == Track.child ? 'child' : 'adult';

class MeaningQuestion {
  final String phrase, question, answer, explain;
  final List<String> distractors;
  const MeaningQuestion({required this.phrase, required this.question, required this.answer, required this.distractors, required this.explain});

  factory MeaningQuestion.fromJson(Map<String, dynamic> j) => MeaningQuestion(
        phrase: j['phrase'] as String,
        question: j['question'] as String,
        answer: j['answer'] as String,
        distractors: (j['distractors'] as List).cast<String>(),
        explain: j['explain'] as String,
      );
}

class Item {
  final String id, collection, prompt, text;
  final int number;
  final Map<Track, List<String>> chunks;
  final List<MeaningQuestion> meaning;
  final List<String> connected;
  final bool reviewed;
  const Item({
    required this.id,
    required this.collection,
    required this.number,
    required this.prompt,
    required this.text,
    required this.chunks,
    required this.meaning,
    required this.connected,
    required this.reviewed,
  });

  factory Item.fromJson(Map<String, dynamic> j) {
    final c = j['chunks'] as Map<String, dynamic>;
    return Item(
      id: j['id'] as String,
      collection: j['collection'] as String,
      number: (j['number'] as num).toInt(),
      prompt: j['prompt'] as String,
      text: j['text'] as String,
      chunks: {Track.adult: (c['adult'] as List).cast<String>(), Track.child: (c['child'] as List).cast<String>()},
      meaning: ((j['meaning'] as List?) ?? const []).map((m) => MeaningQuestion.fromJson(m as Map<String, dynamic>)).toList(),
      connected: ((j['connected'] as List?) ?? const []).cast<String>(),
      reviewed: j['reviewed'] == true,
    );
  }
}

class Collection {
  final String id, title, kind, unit, source;
  final List<Item> items;
  const Collection({required this.id, required this.title, required this.kind, required this.unit, required this.source, required this.items});

  factory Collection.fromJson(Map<String, dynamic> j) => Collection(
        id: j['id'] as String,
        title: j['title'] as String,
        kind: j['kind'] as String,
        unit: j['unit'] as String,
        source: (j['source'] as String?) ?? '',
        items: (j['items'] as List).map((i) => Item.fromJson(i as Map<String, dynamic>)).toList(),
      );
}
