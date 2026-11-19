// Westminster Shorter Catechism (1647), questions 1–10. Public domain.
// Proof texts follow the original Westminster Assembly's citations.
// Meaning questions and child pieces are drafts: `reviewed` stays false until the owner approves each item.

import type { Collection } from '../types.ts';

export const westminsterShorter: Collection = {
  id: 'westminster-shorter',
  title: 'Westminster Shorter Catechism',
  kind: 'catechism',
  unit: 'Question',
  source: 'Westminster Shorter Catechism (1647), public domain',
  items: [
    {
      id: 'wsc-1', collection: 'westminster-shorter', number: 1, reviewed: false,
      prompt: 'What is the chief end of man?',
      text: 'Man’s chief end is to glorify God, and to enjoy him forever.',
      chunks: {
        adult: ['Man’s chief end is to glorify God,', 'and to enjoy him forever.'],
        child: ['Man’s chief end', 'is to glorify God,', 'and to enjoy him', 'forever.'],
      },
      meaning: [
        { phrase: 'chief end', question: 'What does “chief end” mean here?', answer: 'The main reason we were made',
          distractors: ['The last thing that happens to us', 'The most important person', 'A rule we must keep'],
          explain: 'Your chief end is the main purpose you were made for. Paul says it this way: “whatever you do, do all to the glory of God.”' },
        { phrase: 'glorify', question: 'What does it mean to “glorify” God?', answer: 'To honor him and show how great and good he is',
          distractors: ['To make God greater than he was', 'To sing only on Sundays', 'To become famous for God'],
          explain: 'We cannot add to God’s greatness, but we can honor it and show it in what we say and do.' },
      ],
      connected: ['1 Corinthians 10:31', 'Romans 11:36', 'Psalm 73:25–28'],
    },
    {
      id: 'wsc-2', collection: 'westminster-shorter', number: 2, reviewed: false,
      prompt: 'What rule hath God given to direct us how we may glorify and enjoy him?',
      text: 'The Word of God, which is contained in the Scriptures of the Old and New Testaments, is the only rule to direct us how we may glorify and enjoy him.',
      chunks: {
        adult: ['The Word of God,', 'which is contained in the Scriptures of the Old and New Testaments,', 'is the only rule to direct us', 'how we may glorify and enjoy him.'],
        child: ['The Word of God,', 'which is contained in the Scriptures', 'of the Old and New Testaments,', 'is the only rule', 'to direct us', 'how we may glorify', 'and enjoy him.'],
      },
      meaning: [
        { phrase: 'the only rule', question: 'What does “the only rule” mean here?', answer: 'The one standard that shows us how to live for God',
          distractors: ['The first law God gave to Moses', 'A rule that is only for pastors', 'The shortest commandment in the Bible'],
          explain: 'A rule is a measuring line. Scripture is the one measure we use to know how to glorify and enjoy God.' },
      ],
      connected: ['2 Timothy 3:16', 'Ephesians 2:20', '1 John 1:3–4'],
    },
    {
      id: 'wsc-3', collection: 'westminster-shorter', number: 3, reviewed: false,
      prompt: 'What do the Scriptures principally teach?',
      text: 'The Scriptures principally teach what man is to believe concerning God, and what duty God requires of man.',
      chunks: {
        adult: ['The Scriptures principally teach', 'what man is to believe concerning God,', 'and what duty God requires of man.'],
        child: ['The Scriptures', 'principally teach', 'what man is to believe', 'concerning God,', 'and what duty', 'God requires of man.'],
      },
      meaning: [
        { phrase: 'principally', question: 'What does “principally” mean here?', answer: 'Mainly, above all',
          distractors: ['Only sometimes', 'In the first chapter', 'By using science'],
          explain: 'The Bible teaches many things, but these two above all: what to believe about God, and how God calls us to live.' },
      ],
      connected: ['2 Timothy 1:13', 'Ecclesiastes 12:13'],
    },
    {
      id: 'wsc-4', collection: 'westminster-shorter', number: 4, reviewed: false,
      prompt: 'What is God?',
      text: 'God is a Spirit, infinite, eternal, and unchangeable, in his being, wisdom, power, holiness, justice, goodness, and truth.',
      chunks: {
        adult: ['God is a Spirit,', 'infinite, eternal, and unchangeable,', 'in his being, wisdom, power,', 'holiness, justice, goodness, and truth.'],
        child: ['God is a Spirit,', 'infinite,', 'eternal,', 'and unchangeable,', 'in his being,', 'wisdom,', 'power,', 'holiness,', 'justice,', 'goodness,', 'and truth.'],
      },
      meaning: [
        { phrase: 'infinite', question: 'What does “infinite” mean here?', answer: 'Without any limit',
          distractors: ['Very, very large', 'Older than the stars', 'Able to be counted'],
          explain: 'God is not just bigger than everything else. He has no limits at all.' },
        { phrase: 'unchangeable', question: 'What does “unchangeable” mean here?', answer: 'He never changes who he is',
          distractors: ['He never makes anything new', 'He does not notice what happens', 'He stays in one place'],
          explain: 'God does not grow, fade or become different. That is why his promises can be trusted (James 1:17).' },
      ],
      connected: ['John 4:24', 'Job 11:7–9', 'Psalm 90:2', 'James 1:17', 'Exodus 3:14', 'Psalm 147:5', 'Revelation 4:8', 'Revelation 15:4', 'Exodus 34:6–7'],
    },
    {
      id: 'wsc-5', collection: 'westminster-shorter', number: 5, reviewed: false,
      prompt: 'Are there more Gods than one?',
      text: 'There is but one only, the living and true God.',
      chunks: {
        adult: ['There is but one only,', 'the living and true God.'],
        child: ['There is but one only,', 'the living', 'and true God.'],
      },
      meaning: [
        { phrase: 'the living and true God', question: 'What does “the living and true God” mean?', answer: 'The real God who is alive, unlike idols',
          distractors: ['A god who lives only in heaven', 'A god who is true most of the time', 'One god among many'],
          explain: 'Idols are made things that cannot see, speak or save. The one God is real, alive and at work (Jeremiah 10:10).' },
      ],
      connected: ['Deuteronomy 6:4', 'Jeremiah 10:10'],
    },
    {
      id: 'wsc-6', collection: 'westminster-shorter', number: 6, reviewed: false,
      prompt: 'How many persons are there in the Godhead?',
      text: 'There are three persons in the Godhead; the Father, the Son, and the Holy Ghost; and these three are one God, the same in substance, equal in power and glory.',
      chunks: {
        adult: ['There are three persons in the Godhead;', 'the Father, the Son, and the Holy Ghost;', 'and these three are one God,', 'the same in substance, equal in power and glory.'],
        child: ['There are three persons', 'in the Godhead;', 'the Father,', 'the Son,', 'and the Holy Ghost;', 'and these three', 'are one God,', 'the same in substance,', 'equal in power', 'and glory.'],
      },
      meaning: [
        { phrase: 'the same in substance', question: 'What does “the same in substance” mean?', answer: 'Each person is fully the one God',
          distractors: ['They are made of the same material as us', 'They are three gods who agree', 'One person wearing three masks'],
          explain: 'The Father, the Son and the Holy Spirit are not three gods, and not one person playing three parts. Each is fully God, and there is one God.' },
      ],
      connected: ['1 John 5:7', 'Matthew 28:19'],
    },
    {
      id: 'wsc-7', collection: 'westminster-shorter', number: 7, reviewed: false,
      prompt: 'What are the decrees of God?',
      text: 'The decrees of God are, his eternal purpose, according to the counsel of his will, whereby, for his own glory, he hath foreordained whatsoever comes to pass.',
      chunks: {
        adult: ['The decrees of God are, his eternal purpose,', 'according to the counsel of his will,', 'whereby, for his own glory,', 'he hath foreordained whatsoever comes to pass.'],
        child: ['The decrees of God are,', 'his eternal purpose,', 'according to the counsel', 'of his will,', 'whereby,', 'for his own glory,', 'he hath foreordained', 'whatsoever comes to pass.'],
      },
      meaning: [
        { phrase: 'foreordained', question: 'What does “foreordained” mean?', answer: 'Decided beforehand',
          distractors: ['Guessed in advance', 'Ordered by a king', 'Written down afterward'],
          explain: 'Before anything happens, God has already purposed it. Nothing takes him by surprise (Ephesians 1:11).' },
        { phrase: 'hath', question: 'In “he hath foreordained,” what does “hath” mean?', answer: 'Has',
          distractors: ['Had once', 'Will', 'Hates'],
          explain: '“Hath” is an older way of writing “has.”' },
      ],
      connected: ['Ephesians 1:4, 11', 'Romans 9:22–23'],
    },
    {
      id: 'wsc-8', collection: 'westminster-shorter', number: 8, reviewed: false,
      prompt: 'How doth God execute his decrees?',
      text: 'God executeth his decrees in the works of creation and providence.',
      chunks: {
        adult: ['God executeth his decrees', 'in the works of creation and providence.'],
        child: ['God executeth', 'his decrees', 'in the works of creation', 'and providence.'],
      },
      meaning: [
        { phrase: 'executeth', question: 'What does “executeth” mean here?', answer: 'Carries out',
          distractors: ['Puts to death', 'Cancels', 'Writes down'],
          explain: 'To execute a plan is to carry it out.' },
        { phrase: 'providence', question: 'What does “providence” mean?', answer: 'God’s care for and rule over everything he made',
          distractors: ['Luck that turns out well', 'Saving money for later', 'The first day of creation'],
          explain: 'Creation is God making all things. Providence is God keeping and governing them every moment.' },
      ],
      connected: ['Revelation 4:11', 'Daniel 4:35'],
    },
    {
      id: 'wsc-9', collection: 'westminster-shorter', number: 9, reviewed: false,
      prompt: 'What is the work of creation?',
      text: 'The work of creation is, God’s making all things of nothing, by the word of his power, in the space of six days, and all very good.',
      chunks: {
        adult: ['The work of creation is,', 'God’s making all things of nothing,', 'by the word of his power,', 'in the space of six days, and all very good.'],
        child: ['The work of creation is,', 'God’s making all things', 'of nothing,', 'by the word', 'of his power,', 'in the space of six days,', 'and all very good.'],
      },
      meaning: [
        { phrase: 'of nothing', question: 'What does “making all things of nothing” mean?', answer: 'Making them from nothing at all',
          distractors: ['Making them from things that already existed', 'Making them for no reason', 'Making them for no one'],
          explain: 'God did not shape something that was already there. He spoke, and things that did not exist came to be (Hebrews 11:3).' },
      ],
      connected: ['Genesis 1', 'Hebrews 11:3'],
    },
    {
      id: 'wsc-10', collection: 'westminster-shorter', number: 10, reviewed: false,
      prompt: 'How did God create man?',
      text: 'God created man male and female, after his own image, in knowledge, righteousness, and holiness, with dominion over the creatures.',
      chunks: {
        adult: ['God created man male and female,', 'after his own image,', 'in knowledge, righteousness, and holiness,', 'with dominion over the creatures.'],
        child: ['God created man', 'male and female,', 'after his own image,', 'in knowledge,', 'righteousness,', 'and holiness,', 'with dominion', 'over the creatures.'],
      },
      meaning: [
        { phrase: 'dominion', question: 'What does “dominion over the creatures” mean?', answer: 'Caring for and ruling creation on God’s behalf',
          distractors: ['Owning animals to use however we like', 'Living alone in a garden', 'Being afraid of wild animals'],
          explain: 'God gave people the work of caring for and ruling over creation as his stewards (Genesis 1:28).' },
      ],
      connected: ['Genesis 1:26–28', 'Colossians 3:10', 'Ephesians 4:24'],
    },
  ],
};
