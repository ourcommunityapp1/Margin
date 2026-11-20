// Westminster Larger Catechism (1647), questions 1–10. Public domain.
// Text and proof texts from the Creeds.json project (github.com/NonlinearFruit/Creeds.json), which
// transcribes the 1647 printing; spelling of "Man’s" uses a curly apostrophe to match the Shorter Catechism.
// Meaning questions and child pieces are drafts: `reviewed` stays false until the owner approves each item.

import type { Collection } from '../types.ts';

export const westminsterLarger: Collection = {
  id: 'westminster-larger',
  title: 'Westminster Larger Catechism',
  kind: 'catechism',
  unit: 'Question',
  source: 'Westminster Larger Catechism (1647), public domain',
  items: [
    {
      id: 'wlc-1', collection: 'westminster-larger', number: 1, reviewed: false,
      prompt: 'What is the chief and highest end of man?',
      text: 'Man’s chief and highest end is to glorify God, and fully to enjoy him forever.',
      chunks: {
        adult: ['Man’s chief and highest end is to glorify God,', 'and fully to enjoy him forever.'],
        child: ['Man’s chief and highest end', 'is to glorify God,', 'and fully to enjoy him', 'forever.'],
      },
      meaning: [
        { phrase: 'highest end', question: 'What does “chief and highest end” mean?', answer: 'The greatest purpose we were made for',
          distractors: ['The final place we reach after death', 'The most important rule we must keep', 'The best reward God gives his people'],
          explain: 'An “end” here is a purpose. Of all the reasons God made us, this is the first and greatest.' },
        { phrase: 'fully to enjoy him', question: 'What does “fully to enjoy him” add?', answer: 'We are made to delight in God completely, not just a little',
          distractors: ['We will enjoy God only after this life', 'Enjoying God is earned by serving him well', 'We should enjoy his gifts as much as him'],
          explain: 'God is not only to be served but loved and delighted in: truly now, and perfectly forever.' },
      ],
      connected: ['Romans 11:36', '1 Corinthians 10:31', 'Psalm 73:24–28'],
    },
    {
      id: 'wlc-2', collection: 'westminster-larger', number: 2, reviewed: false,
      prompt: 'How doth it appear that there is a God?',
      text: 'The very light of nature in man, and the works of God, declare plainly that there is a God; but his word and Spirit only do sufficiently and effectually reveal him unto men for their salvation.',
      chunks: {
        adult: ['The very light of nature in man,', 'and the works of God,', 'declare plainly that there is a God;', 'but his word and Spirit only', 'do sufficiently and effectually reveal him', 'unto men for their salvation.'],
        child: ['The very light of nature', 'in man,', 'and the works of God,', 'declare plainly', 'that there is a God;', 'but his word and Spirit only', 'do sufficiently and effectually', 'reveal him unto men', 'for their salvation.'],
      },
      meaning: [
        { phrase: 'light of nature', question: 'What is “the light of nature in man”?', answer: 'The sense of God and of right and wrong that every person has',
          distractors: ['The sunlight and seasons God gives to all', 'A special insight given only to believers', 'What people discover by studying science'],
          explain: 'Every person has a conscience and a sense that God is there, even without a Bible (Romans 1:19–20).' },
        { phrase: 'sufficiently and effectually', question: 'Why are God’s word and Spirit needed, if nature already shows there is a God?', answer: 'Nature shows that God exists, but only his word and Spirit show us how to be saved',
          distractors: ['Nature shows God only to those who already believe', 'Nature can mislead us, so it should be ignored', 'Nature shows how to be saved, but only dimly'],
          explain: 'Creation shows God’s power. Only Scripture, opened to us by the Spirit, tells of Christ and how to be saved.' },
      ],
      connected: ['Romans 1:19–20', 'Psalm 19:1–3', 'Acts 17:28', '1 Corinthians 2:9–10', '2 Timothy 3:15–17', 'Isaiah 59:21'],
    },
    {
      id: 'wlc-3', collection: 'westminster-larger', number: 3, reviewed: false,
      prompt: 'What is the word of God?',
      text: 'The holy scriptures of the Old and New Testaments are the word of God, the only rule of faith and obedience.',
      chunks: {
        adult: ['The holy scriptures of the Old and New Testaments', 'are the word of God,', 'the only rule of faith and obedience.'],
        child: ['The holy scriptures', 'of the Old and New Testaments', 'are the word of God,', 'the only rule', 'of faith and obedience.'],
      },
      meaning: [
        { phrase: 'rule of faith and obedience', question: 'What is “the only rule of faith and obedience”?', answer: 'The one standard for what we believe and how we live',
          distractors: ['The main standard, alongside the church’s traditions', 'The standard for what we believe, not how we live', 'The standard for how we live, not what we believe'],
          explain: 'Faith is what we believe; obedience is how we live. Scripture alone has the final word on both.' },
      ],
      connected: ['2 Timothy 3:16', '2 Peter 1:19–21', 'Ephesians 2:20', 'Revelation 22:18–19', 'Isaiah 8:20', 'Luke 16:29, 31', 'Galatians 1:8–9'],
    },
    {
      id: 'wlc-4', collection: 'westminster-larger', number: 4, reviewed: false,
      prompt: 'How doth it appear that the scriptures are the word of God?',
      text: 'The scriptures manifest themselves to be the word of God, by their majesty and purity; by the consent of all the parts, and the scope of the whole, which is to give all glory to God; by their light and power to convince and convert sinners, to comfort and build up believers unto salvation: but the Spirit of God bearing witness by and with the scriptures in the heart of man, is alone able fully to persuade it that they are the very word of God.',
      chunks: {
        adult: [
          'The scriptures manifest themselves to be the word of God,', 'by their majesty and purity;', 'by the consent of all the parts,',
          'and the scope of the whole, which is to give all glory to God;', 'by their light and power to convince and convert sinners,',
          'to comfort and build up believers unto salvation:', 'but the Spirit of God bearing witness by and with the scriptures in the heart of man,',
          'is alone able fully to persuade it that they are the very word of God.',
        ],
        child: [
          'The scriptures manifest themselves', 'to be the word of God,', 'by their majesty and purity;', 'by the consent of all the parts,',
          'and the scope of the whole,', 'which is to give all glory to God;', 'by their light and power', 'to convince and convert sinners,',
          'to comfort and build up believers', 'unto salvation:', 'but the Spirit of God bearing witness', 'by and with the scriptures',
          'in the heart of man,', 'is alone able fully to persuade it', 'that they are the very word of God.',
        ],
      },
      meaning: [
        { phrase: 'consent of all the parts', question: 'What does “the consent of all the parts” mean?', answer: 'Every part of the Bible agrees with the rest',
          distractors: ['Every writer agreed before writing it', 'The church agreed on which books belong', 'Every reader agrees on what it means'],
          explain: 'Written by many people over many centuries, the Bible still tells one story with one message.' },
        { phrase: 'bearing witness', question: 'Who finally convinces a person that the Bible is God’s word?', answer: 'The Spirit of God, working by and with the Scriptures',
          distractors: ['Its majesty and purity, if we study them', 'The agreement of the church through history', 'Our own reason, weighing the evidence'],
          explain: 'The evidence is real, but only the Holy Spirit fully persuades the heart (1 John 2:20, 27).' },
      ],
      connected: ['Hosea 8:12', '1 Corinthians 2:6–7, 13', 'Psalm 119:18, 129', 'Psalm 12:6', 'Acts 10:43', 'Hebrews 4:12', 'James 1:18', 'Psalm 19:7–9', 'Romans 15:4', 'Acts 20:32', 'John 16:13–14', '1 John 2:20, 27'],
    },
    {
      id: 'wlc-5', collection: 'westminster-larger', number: 5, reviewed: false,
      prompt: 'What do the scriptures principally teach?',
      text: 'The scriptures principally teach, what man is to believe concerning God, and what duty God requires of man.',
      chunks: {
        adult: ['The scriptures principally teach,', 'what man is to believe concerning God,', 'and what duty God requires of man.'],
        child: ['The scriptures', 'principally teach,', 'what man is to believe', 'concerning God,', 'and what duty', 'God requires of man.'],
      },
      meaning: [
        { phrase: 'principally', question: 'What does “principally” mean?', answer: 'Mainly, above everything else',
          distractors: ['Only, and nothing more', 'Firstly, in the opening books', 'Plainly, in simple words'],
          explain: 'The Bible teaches many things, but its main business is these two: what to believe about God, and what God asks of us.' },
      ],
      connected: ['2 Timothy 1:13'],
    },
    {
      id: 'wlc-6', collection: 'westminster-larger', number: 6, reviewed: false,
      prompt: 'What do the scriptures make known of God?',
      text: 'The scriptures make known what God is, the persons in the Godhead, his decrees, and the execution of his decrees.',
      chunks: {
        adult: ['The scriptures make known what God is,', 'the persons in the Godhead,', 'his decrees, and the execution of his decrees.'],
        child: ['The scriptures make known', 'what God is,', 'the persons in the Godhead,', 'his decrees,', 'and the execution', 'of his decrees.'],
      },
      meaning: [
        { phrase: 'decrees', question: 'What are God’s “decrees”?', answer: 'His eternal plan for everything that happens',
          distractors: ['His commands for how we should live', 'His promises to those who believe', 'His responses to what people choose'],
          explain: 'God’s decrees are his wise and holy plan, made before the world began.' },
        { phrase: 'execution of his decrees', question: 'What is “the execution of his decrees”?', answer: 'God carrying out his plan, in creation and providence',
          distractors: ['God judging sinners at the last day', 'God revealing his plan in Scripture', 'God changing his plan when we pray'],
          explain: 'To execute a plan is to carry it out. God does this in making the world and in ruling over it.' },
      ],
      connected: ['Hebrews 11:6', '1 John 5:7', 'Acts 15:14–15, 18', 'Acts 4:27–28'],
    },
    {
      id: 'wlc-7', collection: 'westminster-larger', number: 7, reviewed: false,
      prompt: 'What is God?',
      text: 'God is a Spirit, in and of himself infinite in being, glory, blessedness, and perfection; all-sufficient, eternal, unchangeable, incomprehensible, everywhere present, almighty, knowing all things, most wise, most holy, most just, most merciful and gracious, long-suffering, and abundant in goodness and truth.',
      chunks: {
        adult: [
          'God is a Spirit,', 'in and of himself infinite in being, glory, blessedness, and perfection;', 'all-sufficient, eternal, unchangeable, incomprehensible,',
          'everywhere present, almighty, knowing all things,', 'most wise, most holy, most just,', 'most merciful and gracious, long-suffering,', 'and abundant in goodness and truth.',
        ],
        child: [
          'God is a Spirit,', 'in and of himself', 'infinite in being,', 'glory, blessedness, and perfection;', 'all-sufficient, eternal,', 'unchangeable, incomprehensible,',
          'everywhere present, almighty,', 'knowing all things,', 'most wise, most holy,', 'most just,', 'most merciful and gracious,', 'long-suffering,', 'and abundant in goodness and truth.',
        ],
      },
      meaning: [
        { phrase: 'incomprehensible', question: 'What does “incomprehensible” mean here?', answer: 'Too great for us to understand completely',
          distractors: ['Impossible for us to know at all', 'Hidden from us until we reach heaven', 'Understood only by scholars'],
          explain: 'We can truly know God, because he has shown himself, but we can never understand him fully.' },
        { phrase: 'long-suffering', question: 'What does “long-suffering” mean?', answer: 'Patient for a long time with those who sin against him',
          distractors: ['Suffering alongside his people in their trials', 'Slow to notice when people do wrong', 'Willing to overlook sin forever'],
          explain: 'God is slow to anger and patient with sinners (Exodus 34:6).' },
      ],
      connected: ['John 4:24', 'Exodus 3:14', 'Job 11:7–9', 'Matthew 5:48', 'Genesis 17:1', 'Psalm 90:2', 'Malachi 3:6', 'James 1:17', '1 Kings 8:27', 'Psalm 139:1–13', 'Revelation 4:8', 'Hebrews 4:13', 'Psalm 147:5', 'Romans 16:27', 'Isaiah 6:3', 'Deuteronomy 32:4', 'Exodus 34:6'],
    },
    {
      id: 'wlc-8', collection: 'westminster-larger', number: 8, reviewed: false,
      prompt: 'Are there more Gods than one?',
      text: 'There is but one only, the living and true God.',
      chunks: {
        adult: ['There is but one only,', 'the living and true God.'],
        child: ['There is but one only,', 'the living', 'and true God.'],
      },
      meaning: [
        { phrase: 'living and true', question: 'Why call him “the living and true God”?', answer: 'Unlike idols, he is real, alive, and acts',
          distractors: ['He is the greatest of the gods', 'He once lived on earth among us', 'He always tells the truth'],
          explain: '“True” here means real, not only truthful. Idols are made by hands and cannot see or act; the Lord is the real God, who lives and rules (Jeremiah 10:10).' },
      ],
      connected: ['Deuteronomy 6:4', '1 Corinthians 8:4, 6', 'Jeremiah 10:10'],
    },
    {
      id: 'wlc-9', collection: 'westminster-larger', number: 9, reviewed: false,
      prompt: 'How many persons are there in the Godhead?',
      text: 'There be three persons in the Godhead, the Father, the Son, and the Holy Ghost; and these three are one true, eternal God, the same in substance, equal in power and glory; although distinguished by their personal properties.',
      chunks: {
        adult: ['There be three persons in the Godhead,', 'the Father, the Son, and the Holy Ghost;', 'and these three are one true, eternal God,', 'the same in substance, equal in power and glory;', 'although distinguished by their personal properties.'],
        child: ['There be three persons', 'in the Godhead,', 'the Father, the Son,', 'and the Holy Ghost;', 'and these three are one', 'true, eternal God,', 'the same in substance,', 'equal in power and glory;', 'although distinguished', 'by their personal properties.'],
      },
      meaning: [
        { phrase: 'Holy Ghost', question: 'Who is “the Holy Ghost”?', answer: 'The Holy Spirit',
          distractors: ['The spirit of a believer in heaven', 'God’s power, but not a person', 'An angel sent by God'],
          explain: '“Ghost” is an older English word for spirit. The Holy Ghost is the Holy Spirit, fully God.' },
        { phrase: 'same in substance', question: 'What does “the same in substance” mean?', answer: 'All three are fully the one God, not three gods',
          distractors: ['All three share one will and purpose', 'Each is one third of God', 'One God appearing in three ways'],
          explain: 'The Father, the Son and the Spirit are each fully God, and there is only one God.' },
      ],
      connected: ['1 John 5:7', 'Matthew 3:16–17', 'Matthew 28:19', '2 Corinthians 13:14', 'John 10:30'],
    },
    {
      id: 'wlc-10', collection: 'westminster-larger', number: 10, reviewed: false,
      prompt: 'What are the personal properties of the three persons in the Godhead?',
      text: 'It is proper to the Father to beget the Son, and to the Son to be begotten of the Father, and to the Holy Ghost to proceed from the Father and the Son from all eternity.',
      chunks: {
        adult: ['It is proper to the Father to beget the Son,', 'and to the Son to be begotten of the Father,', 'and to the Holy Ghost to proceed from the Father and the Son', 'from all eternity.'],
        child: ['It is proper to the Father', 'to beget the Son,', 'and to the Son', 'to be begotten of the Father,', 'and to the Holy Ghost', 'to proceed from the Father and the Son', 'from all eternity.'],
      },
      meaning: [
        { phrase: 'proper to', question: 'What does “proper to” mean here?', answer: 'Belonging to that person in particular',
          distractors: ['Fitting and polite for', 'Shared equally by all three', 'Commanded of'],
          explain: 'Each person has what belongs to him alone: the Father begets, the Son is begotten, the Spirit proceeds.' },
        { phrase: 'from all eternity', question: 'When did the Father beget the Son?', answer: 'From all eternity, with no beginning',
          distractors: ['At his birth in Bethlehem', 'Just before the creation of the world', 'At his resurrection'],
          explain: 'The Son did not begin to exist. He has always been the Son of the Father.' },
      ],
      connected: ['Hebrews 1:5–6, 8', 'John 1:14, 18', 'John 15:26', 'Galatians 4:6'],
    },
  ],
};
