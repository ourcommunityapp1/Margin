// The words to listen out for when an answer is said aloud (sent to ElevenLabs as keyterms): names, the old words of the
// catechisms and the KJV, and long words a recognizer is likely to get wrong. Never the whole answer, so a word the person
// did not say is not "heard" for them.

const _old = {
  'hath', 'hast', 'doth', 'dost', 'thee', 'thou', 'thy', 'thine', 'ye', 'unto', 'art', 'shalt', 'wilt', 'saith', 'spake', 'shew',
  'begotten', 'wherefore', 'whereby', 'wherein', 'whereof', 'therein', 'thereof', 'thereby', 'lo', 'behold', 'yea', 'nay',
  'verily', 'hallowed', 'trespasses', 'amen', 'selah', 'cometh', 'goeth', 'giveth', 'maketh', 'leadeth', 'restoreth',
};

final _edges = RegExp(r"^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$", unicode: true);

List<String> speechHints(String text, {int max = 50}) {
  final out = <String>[];
  final raw = text.split(RegExp(r'\s+'));
  for (var i = 0; i < raw.length && out.length < max; i++) {
    final w = raw[i].replaceAll(_edges, '');
    if (w.isEmpty) continue;
    final lower = w.toLowerCase();
    final startsSentence = i == 0 || RegExp(r'[.!?;:]$').hasMatch(raw[i - 1]);
    final name = w[0] != w[0].toLowerCase() && !startsSentence && w != 'I';
    final keep = _old.contains(lower) || name || w.length >= 9;
    if (keep && !out.any((x) => x.toLowerCase() == lower)) out.add(w);
  }
  return out;
}
