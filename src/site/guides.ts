// The public guides. Each answers one question people ask, answer first. The research claims are limited to what
// the cited papers show; the steps are plain guidance and say so. The time estimates are computed from Katekize's own
// planner, so they stay in step with the app.

import { courseItems, getCourse, getItem } from '../heir/content/index.ts';
import { GOALS, project } from '../heir/planner.ts';
import { emptyProgress } from '../heir/progress.ts';

// The date the public content last changed. Update it when a guide or page is edited; it feeds the visible
// "Updated" line, the page markup and the sitemap.
export const PUBLISHED = '2026-11-23';
export const PUBLISHED_LABEL = new Date(`${PUBLISHED}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export interface Section {
  h: string;
  p?: string[];
  list?: string[];
  ordered?: boolean;
  /** Scripture shown under the section, from the public-domain text (e.g. "Psalm 119:11"). */
  verse?: string;
  table?: { head: string[]; rows: string[][] };
}
export interface Guide {
  slug: string;
  /** The page's main question, worded the way it is searched. */
  title: string;
  /** Short label for lists. */
  label: string;
  description: string;
  /** The direct answer, shown first. */
  answer: string;
  sections: Section[];
  related: string[];
  sources?: string[];
}

export const SOURCES = {
  roediger: 'Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning: Taking memory tests improves long-term retention. Psychological Science, 17(3), 249–255.',
  cepeda: 'Cepeda, N. J., Vul, E., Rohrer, D., Wixted, J. T., & Pashler, H. (2008). Spacing effects in learning: A temporal ridgeline of optimal retention. Psychological Science, 19(11), 1095–1102.',
  rawson: 'Rawson, K. A., & Dunlosky, J. (2011). Optimizing schedules of retrieval practice for durable and efficient learning: How much is enough? Journal of Experimental Psychology: General, 140(3), 283–302.',
  bahrick: 'Bahrick, H. P. (1984). Semantic memory content in permastore: Fifty years of memory for Spanish learned in school. Journal of Experimental Psychology: General, 113(1), 1–29.',
};

const months = (days: number) => {
  const m = Math.max(1, Math.round(days / 30.4));
  return m === 1 ? 'about 1 month' : `about ${m} months`;
};

/** Katekize's own estimate for the whole Shorter Catechism at each daily goal. */
export function shorterEstimates() {
  const items = courseItems(getCourse('westminster-shorter')!);
  const now = new Date('2026-11-23T12:00:00Z');
  return GOALS.map((minutes) => {
    const r = project({ items, track: 'adult', p: emptyProgress(), minutes, now });
    return { minutes, learn: months(r.learnDays), longTerm: months(r.learnDays + 182), learnDays: r.learnDays };
  });
}

export function allGuides(): Guide[] {
  const est = shorterEstimates();
  const at15 = est.find((e) => e.minutes === 15)!;
  const at5 = est.find((e) => e.minutes === 5)!;
  const at25 = est.find((e) => e.minutes === 25)!;
  const q1 = getItem('wsc-1')!;

  return [
    {
      slug: 'how-to-memorize-bible-verses',
      title: 'How do you memorize Bible verses and actually keep them?',
      label: 'How to memorize Bible verses',
      description: 'A step-by-step method for memorizing Bible verses and keeping them: learn in short phrases, recall instead of rereading, then review at widening gaps.',
      answer: 'Learn the verse in short phrases, then recall it from memory instead of rereading it. Recall it again after a night’s sleep, and keep recalling it at widening gaps over weeks and months. Recalling builds the memory, and spacing keeps it.',
      sections: [
        { h: 'The method in six steps', ordered: true, list: [
          'Pick a small piece. One verse, or one short passage, is enough for a first session.',
          'Understand it first. Say in your own words what it means and who is speaking. Words you understand are easier to hold.',
          'Learn it in phrases. Split the verse at its natural pauses. Learn the first phrase, then add the next, until you can say the whole verse.',
          'Recall, don’t reread. Close the Bible and say or write the verse from memory. If you are stuck, check one word, not the whole verse.',
          'Sleep on it, then recall it again. The next day, try to say it before you look at it. That first recall after a night is the real test of whether it has started to stick.',
          'Review at widening gaps. Recall it again after a few days, a week, a month, and so on. When a recall is easy, wait longer. When you miss, review sooner.',
        ] },
        { h: 'Why recalling beats rereading', p: ['In a well-known set of experiments, students who practiced retrieving what they had read remembered it better a week later than students who spent the same time rereading it (Roediger & Karpicke, 2006). Reading a verse again feels like learning because it feels familiar. Recalling it is harder, and the effort is what strengthens the memory.'] },
        { h: 'Why spacing keeps it', p: ['Practice spread over days is remembered longer than the same practice crammed into one sitting, and the best gap depends on how long you want to remember (Cepeda et al., 2008). Recalling something correctly in several sessions spaced apart can make the memory durable (Rawson & Dunlosky, 2011). This is why the schedule matters as much as the first session.'] },
        { h: 'How Katekize does this for you', p: ['Katekize splits each verse or catechism answer into short phrases, has you rebuild it, fill in missing words, and then type or say it with the words hidden. Reviews come back when you are close to forgetting. A verse counts as remembered only after you recall it with no hints on a later day than you first learned it, and the later stones ask for recall after weeks, months and years away.'] },
        { h: 'Common mistakes', list: [
          'Rereading the verse many times and calling it studying.',
          'Learning a whole chapter in one evening and never going back to it.',
          'Skipping the night’s sleep: trying to finish everything in one sitting.',
          'Counting a review when you read the verse instead of recalling it.',
        ] },
        { h: 'A verse to start with', verse: 'Psalm 119:11' },
      ],
      related: ['how-to-review-memorized-verses', 'why-you-forget-memorized-verses', 'how-many-bible-verses-to-memorize-per-week'],
      sources: [SOURCES.roediger, SOURCES.cepeda, SOURCES.rawson],
    },
    {
      slug: 'how-to-review-memorized-verses',
      title: 'How do you review old Bible verses without forgetting them?',
      label: 'How to review memorized verses',
      description: 'Review memorized Bible verses by recalling them from memory at widening gaps. A simple schedule, what counts as a review, and what to do when you miss.',
      answer: 'Review by recalling the verse from memory, not by reading it, and spread the reviews out: soon after you learn it, then after a few days, a week, a month, and so on. Each time you recall it correctly, wait longer before the next review. If you miss it, review it sooner.',
      sections: [
        { h: 'One workable schedule', p: ['Teachers use different schedules, so treat these gaps as a starting point and adjust to how easily the verse comes back.'], table: { head: ['Review', 'When'], rows: [['1', 'The next day, after a night’s sleep'], ['2', 'About three days later'], ['3', 'About a week later'], ['4', 'About two weeks later'], ['5', 'About a month later'], ['6', 'About two months later, then every few months']] } },
        { h: 'What counts as a review', list: [
          'Saying or writing the verse from memory with nothing in front of you.',
          'Checking a single word you could not recall still counts, but note it as shaky and review it sooner.',
          'Reading the verse does not count. It feels like review but it does not test the memory.',
        ] },
        { h: 'When you miss', p: ['A miss is useful information. Look at the verse, relearn it a phrase at a time, and plan the next review for the next day or two. Then stretch the gaps out again.'] },
        { h: 'Keeping many verses going', list: [
          'Keep one list and note the date of each review.',
          'Review the shakiest verses first.',
          'A few minutes every day works better than one long session a week.',
          'If reviews start to crowd out new learning, pause new verses until the reviews are back under control.',
        ] },
        { h: 'How Katekize schedules reviews', p: ['Katekize uses a spaced-repetition scheduler called FSRS to decide when each verse or answer comes back, so a review arrives when you are close to forgetting it. A question you find hard returns soon, and one you know well waits longer each time. There is also a short “When you lie down” recall in the evening and a “When you rise” recall in the morning, so sleep does some of the work.'] },
      ],
      related: ['why-you-forget-memorized-verses', 'how-to-memorize-bible-verses', 'how-many-bible-verses-to-memorize-per-week'],
      sources: [SOURCES.cepeda, SOURCES.rawson],
    },
    {
      slug: 'why-you-forget-memorized-verses',
      title: 'Why can’t I remember Bible verses after a week?',
      label: 'Why you forget memorized verses',
      description: 'Why memorized Bible verses fade after a week, the four most common causes, and what to do so they last.',
      answer: 'Usually because the verse was read more than it was recalled, learned in one sitting, and never reviewed. Memory fades unless it is recalled again, and recalling it after a night’s sleep and again after a few days away is what makes it last.',
      sections: [
        { h: 'Four common causes', ordered: true, list: [
          'Rereading instead of recalling. The verse feels familiar, so it seems learned, but familiarity is not recall (Roediger & Karpicke, 2006).',
          'One sitting. Practice crammed into one session fades faster than the same practice spread over days (Cepeda et al., 2008).',
          'No review. Without a second and third recall, there is nothing to hold the memory.',
          'Reviewing too late. If a verse has faded completely, it has to be relearned rather than refreshed.',
        ] },
        { h: 'What to do instead', list: [
          'Learn the verse in phrases and say it from memory before you leave it.',
          'Try to say it the next morning before you look at it.',
          'Review it after about three days and about a week, then at longer gaps.',
          'When you miss, relearn it and review sooner. Forgetting is normal, not a sign you cannot memorize.',
        ] },
        { h: 'A quick test', p: ['Close this page and try to say your verse from memory now. If you can, plan the next review for a few days away. If you cannot, relearn it a phrase at a time and try again tomorrow.'] },
        { h: 'Memory that lasts for decades', p: ['In a long-running study of people who had learned Spanish at school, much of what they could still recall after the first few years remained for decades afterward (Bahrick, 1984). Verses reviewed over months and years are the ones that last, which is why Katekize’s highest stones ask for recall after a year away.'] },
      ],
      related: ['how-to-review-memorized-verses', 'how-to-memorize-bible-verses', 'how-many-bible-verses-to-memorize-per-week'],
      sources: [SOURCES.roediger, SOURCES.cepeda, SOURCES.bahrick],
    },
    {
      slug: 'how-long-to-memorize-the-westminster-shorter-catechism',
      title: 'How long does it take to memorize the Westminster Shorter Catechism?',
      label: 'How long the Shorter Catechism takes',
      description: `At 15 minutes a day, Katekize estimates ${at15.learn} to learn all 107 questions of the Westminster Shorter Catechism. Estimates for 5 and 25 minutes a day.`,
      answer: `At 15 minutes a day, Katekize’s planner estimates ${at15.learn} to learn all 107 questions, and ${at15.longTerm} in total before they reach long-term memory. At 5 minutes a day it is ${at5.learn}, and at 25 minutes a day ${at25.learn}. These are estimates, not promises.`,
      sections: [
        { h: 'The estimate at each daily goal', table: { head: ['Minutes a day', 'All 107 learned in', 'In long-term memory in'], rows: est.map((e) => [`${e.minutes} minutes`, e.learn, e.longTerm]) } },
        { h: 'How the estimate is made', list: [
          'A lesson on a typical 20-word answer takes about 6 minutes. Shorter answers take less, but no lesson is counted under 2½ minutes.',
          'Locking in each group of five questions takes about 4 minutes.',
          'Two lessons in three bring something new. The third is practice.',
          'Reviews grow as more is learned, so a fifth more time is allowed for them.',
          'Long-term memory means three right whole answers (typed or said) over six months, one of them after two months away.',
        ] },
        { h: 'Learned is not the same as remembered', p: ['The first number is how long it takes to learn each answer once. The second adds the time it takes for the answers to settle into long-term memory, because an answer is only counted as remembered once you can recall it with no hints after time away.'] },
        { h: 'A slower pace is fine', p: ['The Shorter Catechism has 107 questions, and some of the later answers are long. Taking a year or more, a few questions a week, is fine. What matters is that earlier answers keep being reviewed while you add new ones.'] },
        { h: 'Where to start', p: [`Begin with Question 1, “${q1.prompt}”, and learn it in phrases.`] },
      ],
      related: ['how-to-review-memorized-verses', 'how-many-bible-verses-to-memorize-per-week', 'what-age-to-start-learning-the-catechism'],
    },
    {
      slug: 'what-age-to-start-learning-the-catechism',
      title: 'What age can children start learning the catechism?',
      label: 'What age to start the catechism',
      description: 'There is no set age for starting a catechism. A child who can repeat a short sentence can begin with short pieces. How to start, and how to keep it short.',
      answer: 'There is no age set by the catechism itself. A child who can repeat a short sentence from memory can begin with short pieces, with a parent saying each phrase first. Start with a few questions, keep sessions to a few minutes, and talk about what the words mean.',
      sections: [
        { h: 'Signs a child may be ready', list: [
          'They repeat short phrases back to you.',
          'They enjoy rhymes, songs and repeating favorite lines.',
          'They can sit with you for a few minutes.',
        ] },
        { h: 'Where to start', p: [`Start with the first question and break the answer into pieces. In Katekize, Question 1 for younger children is learned as: ${q1.chunks.child.map((c) => `“${c}”`).join(', ')}. A child says each piece back after you, and the pieces are joined as they become easy.`] },
        { h: 'Keep it short and regular', list: [
          'Three to five minutes at the same time each day, such as breakfast or bedtime.',
          'One new question at a time, with the earlier ones recalled first.',
          'Praise the effort, and let a missed answer pass without fuss.',
        ] },
        { h: 'Memorizing and understanding go together', p: ['A child may know the words before they understand them. That is normal. Talk about one phrase at a time in simple words, and come back to its meaning as the child grows. This is guidance from experience, not a research finding.'] },
        { h: 'Using Katekize with children', p: ['Katekize has a child track that uses shorter pieces, and each person in a family has their own pace and progress. A parent’s account can be linked to see a child’s progress, view only.'] },
        { h: 'A passage for parents', verse: 'Deuteronomy 6:6–7' },
      ],
      related: ['how-many-bible-verses-to-memorize-per-week', 'how-long-to-memorize-the-westminster-shorter-catechism', 'how-to-review-memorized-verses'],
    },
    {
      slug: 'how-many-bible-verses-to-memorize-per-week',
      title: 'How many Bible verses should you memorize per week?',
      label: 'How many verses a week',
      description: 'How many Bible verses to memorize each week: one new verse a week to start, a few once you have a routine, and how to know when to slow down.',
      answer: 'One new verse a week is a good pace to start. A few new verses a week is realistic once you have a daily routine, as long as you keep reviewing the old ones. The right number is the number you can still recall a month later.',
      sections: [
        { h: 'A realistic range', table: { head: ['Where you are', 'New verses a week'], rows: [['Just starting', 'One'], ['Five to ten minutes a day, steady habit', 'Two'], ['Fifteen minutes a day, reviews under control', 'Three or four']] } },
        { h: 'Why the review load decides', p: ['Every verse you add brings reviews with it. A pace that feels easy in week one can crowd out everything else by week ten. If your reviews take longer than your new learning, pause new verses until they are back under control.'] },
        { h: 'Short and long verses', p: ['Count by words, not verses. A short verse takes a few minutes. A long verse, or a passage like a psalm, is better learned a few lines at a time.'] },
        { h: 'How Katekize paces it', p: ['At one lesson a day, Katekize brings one new verse or question in most lessons and sets every third lesson aside for practice only. Over a six-day week that is roughly four new items, with reviews included in the same time. Lessons slow down by themselves when reviews pile up or accuracy dips.'] },
        { h: 'Signs to slow down', list: ['You miss several reviews in a row.', 'Older verses are fading faster than you add new ones.', 'Sessions are getting longer or you are skipping them.'] },
      ],
      related: ['how-to-review-memorized-verses', 'why-you-forget-memorized-verses', 'how-long-to-memorize-the-westminster-shorter-catechism'],
    },
  ];
}

export const guideBySlug = (slug: string) => allGuides().find((g) => g.slug === slug);
