// What a person sees after an answer (src/heir/feedback.ts, ADR-003 Decision 7). Grace is in the words and colours only:
// whether the answer counts as right (the logged `correct`, levels, the memory grade) is decided strictly elsewhere.
//   perfect:  a strict pass with no slips ("Perfect!"; a whole answer from memory is celebrated)
//   pass:     a strict pass with a slip ("Correct!")
//   good:     not a strict pass, but 75% or more of the main words
//   growing:  50 to 75% of the main words
//   learning: under 50%

enum FeedbackBand { perfect, pass, good, growing, learning }

// Small words carry little of the meaning; missing one barely counts.
const _small = {
  'a', 'an', 'the', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'as', 'is', 'are', 'be', //
  'it', 'that', 'this', 'which', 'who', 'whom', 'his', 'her', 'their', 'our', 'my', 'we', 'us', 'he', 'him', 'she', 'they',
  'them', 'i', 'me', 'so', 'not', 'all', 'unto', 'thy', 'thee', 'thou', 'ye',
};
const _smallWeight = 0.25;
final _edges = RegExp(r'^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$', unicode: true);

String _bare(String w) => w.toLowerCase().replaceAll(_edges, '');

/// The share of the answer's meaning recalled: main words count fully, small words a quarter.
double mainWordShare(List<String> tokens, List<bool> heard) {
  var got = 0.0, all = 0.0;
  for (var i = 0; i < tokens.length; i++) {
    final w = _small.contains(_bare(tokens[i])) ? _smallWeight : 1.0;
    all += w;
    if (i < heard.length && heard[i]) got += w;
  }
  return all > 0 ? got / all : 0;
}

FeedbackBand bandFor({required bool ok, bool slip = false, int? misses, double? share, bool close = false}) {
  if (ok) return slip || (misses ?? 0) > 0 ? FeedbackBand.pass : FeedbackBand.perfect;
  final s = share ?? (close ? 0.6 : 0.0);
  return s >= 0.75 ? FeedbackBand.good : s >= 0.5 ? FeedbackBand.growing : FeedbackBand.learning;
}

const bandWords = {
  FeedbackBand.perfect: 'Perfect!',
  FeedbackBand.pass: 'Correct!',
  FeedbackBand.good: 'Good. We’ll strengthen this.',
  FeedbackBand.growing: 'Good job. We’ll strengthen this.',
  FeedbackBand.learning: 'No problem, you’re still learning.',
};
