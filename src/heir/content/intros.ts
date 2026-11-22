// The welcome lesson for each course: a few short cards and an easy question after each.
// Drafts for the owner's review, like the rest of the content.

import type { Intro } from '../lesson.ts';

const how = { title: 'How Heir helps you remember', body: 'Short lessons. You’ll see each answer, build it, then say or type it from memory. Questions come back just as you’re about to forget them, which is when recalling them helps most.' };

const howVerses = { title: 'How Heir helps you remember', body: 'Short lessons. You’ll see each verse, build it, then say or type it from memory. Verses come back just as you’re about to forget them, which is when recalling them helps most.' };

export const INTROS: Record<string, Intro> = {
  'first-verses': {
    cards: [
      { title: 'Why learn verses by heart?', body: 'A verse you know by heart goes with you everywhere: when you’re afraid, when you’re tempted, and when someone asks what you believe.' },
      { title: 'First Verses', body: 'Six short verses every Christian should know, from the Bible’s first sentence to the promise of eternal life. Each verse you learn lights a sixth of the window.' },
      howVerses,
    ],
    quiz: [
      { phrase: '', question: 'What is the best reason to learn verses by heart?', answer: 'So God’s word is with you wherever you go', distractors: ['To win prizes', 'So you never need to read the Bible', 'Because it earns God’s love'], explain: 'God’s love is a gift. Knowing His word by heart keeps it close every day.' },
      { phrase: '', question: 'How many verses are in First Verses?', answer: 'Six', distractors: ['Twelve', 'Thirty', 'One hundred'], explain: 'Six short verses, learned one at a time.' },
    ],
  },
  christmas: {
    cards: [
      { title: 'The Christmas story in six verses', body: 'From the prophets’ promise to the angels’ news: six verses that tell who Jesus is and why He was born. Begin in Advent and you can say them all by Christmas.' },
      { title: 'Promised long before', body: 'Isaiah wrote of the Child about seven hundred years before He was born in Bethlehem. Matthew and Luke tell how the promise came true.' },
      howVerses,
    ],
    quiz: [
      { phrase: '', question: 'About how long before Jesus was born did Isaiah promise the Child?', answer: 'About 700 years', distractors: ['About 7 years', 'About 70 years', 'About 2,000 years'], explain: 'Isaiah prophesied in the 700s BC.' },
      { phrase: '', question: 'Which Gospels tell the story of Jesus’ birth?', answer: 'Matthew and Luke', distractors: ['Mark and John', 'John and Acts', 'Only Mark'], explain: 'Matthew tells it from Joseph’s side, Luke from Mary’s and the shepherds’.' },
    ],
  },
  'westminster-shorter': {
    cards: [
      { title: 'What is a catechism?', body: 'A catechism teaches the faith by questions and answers. Learned by heart, the answers keep the whole of Christian teaching close at hand: in hard times, in conversation, and in teaching your children.' },
      { title: 'The Westminster Shorter Catechism', body: 'Written in 1647 by the Westminster Assembly, its 107 questions walk through what we are to believe about God, and what duty God requires of us. Families and churches have learned it for more than 375 years.' },
      how,
    ],
    quiz: [
      { phrase: '', question: 'How does a catechism teach?', answer: 'By questions and answers', distractors: ['By stories and pictures', 'By songs alone', 'By long sermons'], explain: 'Each question has a short answer you can learn by heart.' },
      { phrase: '', question: 'When was the Shorter Catechism written?', answer: '1647', distractors: ['1517', '1776', '1906'], explain: 'The Westminster Assembly finished it in 1647.' },
    ],
  },
  'westminster-larger': {
    cards: [
      { title: 'What is a catechism?', body: 'A catechism teaches the faith by questions and answers. Learned by heart, the answers keep the whole of Christian teaching close at hand.' },
      { title: 'The Westminster Larger Catechism', body: 'Written in 1647 alongside the Shorter Catechism, its 196 questions give fuller answers, meant for teaching from the pulpit. Heir has the first ten for now.' },
      how,
    ],
    quiz: [
      { phrase: '', question: 'How does a catechism teach?', answer: 'By questions and answers', distractors: ['By stories and pictures', 'By songs alone', 'By long sermons'], explain: 'Each question has an answer you can learn by heart.' },
      { phrase: '', question: 'How is the Larger Catechism different from the Shorter?', answer: 'Its answers are fuller', distractors: ['It was written much later', 'It has no questions', 'It is only for children'], explain: 'Both come from 1647; the Larger gives fuller answers to many of the same questions.' },
    ],
  },
  creeds: {
    cards: [
      { title: 'What is a creed?', body: 'A creed is a short summary of the faith that Christians confess together. The word comes from the Latin credo: “I believe.”' },
      { title: 'The Apostles’ and Nicene Creeds', body: 'The Apostles’ Creed grew from early confessions made at baptism. The Nicene Creed (325, enlarged in 381) answered errors about who Christ is. Churches around the world still say both.' },
      how,
    ],
    quiz: [
      { phrase: '', question: 'Where does the word “creed” come from?', answer: 'The Latin for “I believe”', distractors: ['The Greek for “church”', 'The Hebrew for “truth”', 'The Latin for “law”'], explain: 'Credo means “I believe”, the first word of the Apostles’ Creed in Latin.' },
      { phrase: '', question: 'Which creed was written to answer errors about who Christ is?', answer: 'The Nicene Creed', distractors: ['The Apostles’ Creed', 'The Westminster Confession', 'The Heidelberg Catechism'], explain: 'The Council of Nicaea (325) confessed that the Son is true God, of one substance with the Father.' },
    ],
  },
  'psalm-23': {
    cards: [
      { title: 'The Shepherd’s psalm', body: 'David, who had been a shepherd himself, wrote of the LORD as his Shepherd: leading, feeding, guarding, and bringing him home. It may be the best-loved psalm of all.' },
      { title: 'Psalm 23', body: 'Six verses, learned one at a time. Each one you learn lights a sixth of the window.' },
      howVerses,
    ],
    quiz: [
      { phrase: '', question: 'Who wrote Psalm 23?', answer: 'David', distractors: ['Moses', 'Solomon', 'Paul'], explain: 'The psalm is titled “A Psalm of David.” He looked after his father’s sheep as a boy.' },
      { phrase: '', question: 'Who is the Shepherd in Psalm 23?', answer: 'The LORD', distractors: ['King David', 'An angel', 'The priest'], explain: '“The LORD is my shepherd.” Jesus later called Himself the Good Shepherd (John 10:11).' },
    ],
  },
  'lords-prayer': {
    cards: [
      { title: 'The prayer Jesus taught', body: 'When His disciples asked Him how to pray, Jesus gave them these words. Christians have prayed them every day for two thousand years, and they shape every other prayer.' },
      { title: 'The Lord’s Prayer', body: 'Five verses from Matthew 6. Each one you learn lights a fifth of the window.' },
      howVerses,
    ],
    quiz: [
      { phrase: '', question: 'Who taught the Lord’s Prayer?', answer: 'Jesus', distractors: ['Paul', 'Peter', 'Moses'], explain: 'Jesus taught it in the Sermon on the Mount (Matthew 6:9–13).' },
      { phrase: '', question: 'How does the prayer begin?', answer: '“Our Father”', distractors: ['“Dear God”', '“Holy Lord”', '“Almighty King”'], explain: 'Jesus teaches us to come to God as children to their Father.' },
    ],
  },
  shema: {
    cards: [
      { title: 'Hear, Israel!', body: '“Shema” is Hebrew for “Hear!”, the first word of Deuteronomy 6:4. For three thousand years God’s people have said these words morning and evening, and Jesus called them the greatest commandment.' },
      { title: 'The Blessing', body: 'The course ends with the blessing God gave the priests to speak over His people: “The LORD bless you, and keep you.”' },
      howVerses,
    ],
    quiz: [
      { phrase: '', question: 'What does the Hebrew word “Shema” mean?', answer: 'Hear', distractors: ['Peace', 'Holy', 'Remember'], explain: 'The Shema is named for its first word: “Hear, Israel!”' },
      { phrase: '', question: 'Which did Jesus call the greatest commandment?', answer: 'To love the LORD your God with all your heart', distractors: ['To keep the Sabbath', 'To give a tenth of everything', 'To honor your father and mother'], explain: 'Jesus quoted Deuteronomy 6:5 (Matthew 22:37–38).' },
    ],
  },
  'ten-commandments': {
    cards: [
      { title: 'God’s law', body: 'God spoke the Ten Commandments from Mount Sinai, and wrote them on two tablets of stone. The first four are about loving God; the last six, about loving our neighbor.' },
      { title: 'In short form', body: 'One short line for each commandment, from Exodus 20. Your cue is its number: “The first commandment.”' },
      howVerses,
    ],
    quiz: [
      { phrase: '', question: 'Where did God give the Ten Commandments?', answer: 'Mount Sinai', distractors: ['Mount Zion', 'The Jordan River', 'Bethlehem'], explain: 'Moses received them on Mount Sinai (Exodus 19–20).' },
      { phrase: '', question: 'What were the commandments first written on?', answer: 'Two tablets of stone', distractors: ['A scroll', 'The temple walls', 'A golden plate'], explain: 'God wrote them on two tablets of stone (Exodus 31:18).' },
    ],
  },
  'fear-peace': {
    cards: [
      { title: 'For anxious days', body: 'Six promises to carry with you: for when you’re afraid, when you’re worried, and when you can’t sleep. They work best learned before you need them.' },
      { title: 'Fear, Worry and Peace', body: 'The shortest verses come first. Each one you learn lights a sixth of the window.' },
      howVerses,
    ],
    quiz: [
      { phrase: '', question: 'According to 1 Peter 5:7, why can we give our worries to God?', answer: 'Because He cares about us', distractors: ['Because worries are not real', 'Because we have earned it', 'Because God is too busy to notice them'], explain: '“Having cast all your anxiety on Him, because He cares about you.”' },
      { phrase: '', question: 'When is the best time to learn verses about fear?', answer: 'Before you need them', distractors: ['Only when you are afraid', 'Only as a grown-up', 'Never: just read them'], explain: 'A verse you already know comes back to you when fear does.' },
    ],
  },
  gospel: {
    cards: [
      { title: 'The good news', body: '“Gospel” means good news: that Christ died for our sins and rose again, and that God saves us by grace through faith.' },
      { title: 'The Gospel', body: 'Six verses that tell it in order: our sin, God’s love, Christ in our place, grace, faith, and new life as God’s children.' },
      howVerses,
    ],
    quiz: [
      { phrase: '', question: 'What does the word “gospel” mean?', answer: 'Good news', distractors: ['Holy book', 'A long prayer', 'The rules of the church'], explain: 'It comes from an Old English word for “good news”.' },
      { phrase: '', question: 'How are we saved, according to Ephesians 2:8?', answer: 'By grace, through faith', distractors: ['By good works', 'By going to church', 'By being born in a Christian family'], explain: '“For by grace you have been saved through faith.”' },
    ],
  },
  'who-god-is': {
    cards: [
      { title: 'Knowing God', body: 'Everything else rests on who God is. These six verses say it in the Bible’s own words: He is eternal, unchanging, holy, love, gracious and faithful.' },
      { title: 'Who God Is', body: 'It pairs well with the Shorter Catechism’s fourth question, “What is God?”. Each verse you learn lights a sixth of the window.' },
      howVerses,
    ],
    quiz: [
      { phrase: '', question: 'Which of these is true of God?', answer: 'He has no beginning and no end', distractors: ['He began when the world began', 'He changes His mind about His promises', 'He is holy only some of the time'], explain: '“From everlasting to everlasting, You are God” (Psalm 90:2).' },
      { phrase: '', question: 'Who says “Holy, Holy, Holy” in Isaiah 6?', answer: 'Angels around God’s throne', distractors: ['The priests in the temple', 'King David', 'The people of Israel'], explain: 'Isaiah saw the seraphim calling to one another before the LORD.' },
    ],
  },
  easter: {
    cards: [
      { title: 'Easter in six verses', body: 'From Isaiah’s Servant, pierced for us, to the angel at the empty tomb and the living hope we have because Jesus rose. Begin in Lent and you can say them all by Easter.' },
      { title: 'He is risen', body: 'Easter is the oldest Christian feast. Christians have greeted each other on Easter morning for centuries: “He is risen!” “He is risen indeed!”' },
      howVerses,
    ],
    quiz: [
      { phrase: '', question: 'On which day was Jesus raised?', answer: 'The third day', distractors: ['The first day', 'The seventh day', 'The fortieth day'], explain: '“He was raised on the third day according to the Scriptures” (1 Corinthians 15:4).' },
      { phrase: '', question: 'Who told the women that Jesus had risen?', answer: 'An angel', distractors: ['Peter', 'A Roman soldier', 'Pilate'], explain: 'The angel at the tomb said, “He is not here, for He has risen, just as He said.”' },
    ],
  },
};
