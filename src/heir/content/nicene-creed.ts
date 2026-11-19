// The Nicene Creed (381), traditional English wording. Public domain.
// Text from the Creeds.json project (github.com/NonlinearFruit/Creeds.json). Split into six sections for
// learning; a section may end mid-sentence where the creed itself runs on. Connected verses are suggestions.
// Meaning questions and child pieces are drafts: `reviewed` stays false until the owner approves each item.

import type { Collection } from '../types.ts';

export const niceneCreed: Collection = {
  id: 'nicene-creed',
  title: 'Nicene Creed',
  kind: 'creed',
  unit: 'Section',
  source: 'The Nicene Creed (381), traditional English wording, public domain',
  items: [
    {
      id: 'nic-1', collection: 'nicene-creed', number: 1, reviewed: false,
      prompt: 'What do we believe about God the Father?',
      text: 'We believe in one God, the Father Almighty, Maker of heaven and earth, and of all things visible and invisible.',
      chunks: {
        adult: ['We believe in one God, the Father Almighty,', 'Maker of heaven and earth,', 'and of all things visible and invisible.'],
        child: ['We believe in one God,', 'the Father Almighty,', 'Maker of heaven and earth,', 'and of all things', 'visible and invisible.'],
      },
      meaning: [
        { phrase: 'visible and invisible', question: 'What are “things visible and invisible”?', answer: 'Everything we can see, and things we can’t, like angels',
          distractors: ['Things that are real and things that are pretend', 'Things in daylight and things at night', 'Things God made and things he didn’t'],
          explain: 'God made all things, seen and unseen, including the angels (Colossians 1:16).' },
      ],
      connected: ['Genesis 1:1', 'Colossians 1:16'],
    },
    {
      id: 'nic-2', collection: 'nicene-creed', number: 2, reviewed: false,
      prompt: 'Who is the Lord Jesus Christ?',
      text: 'And in one Lord Jesus Christ, the only-begotten Son of God, begotten of the Father before all worlds; God of God, Light of Light, very God of very God; begotten, not made, being of one substance with the Father, by whom all things were made.',
      chunks: {
        adult: ['And in one Lord Jesus Christ, the only-begotten Son of God,', 'begotten of the Father before all worlds;', 'God of God, Light of Light, very God of very God;', 'begotten, not made,', 'being of one substance with the Father,', 'by whom all things were made.'],
        child: ['And in one Lord Jesus Christ,', 'the only-begotten Son of God,', 'begotten of the Father', 'before all worlds;', 'God of God,', 'Light of Light,', 'very God of very God;', 'begotten, not made,', 'being of one substance', 'with the Father,', 'by whom all things were made.'],
      },
      meaning: [
        { phrase: 'begotten, not made', question: 'What does “begotten, not made” mean?', answer: 'The Son shares the Father’s own nature; he was never created',
          distractors: ['The Son was the first thing God made', 'The Son first began at Christmas', 'The Son is less than the Father'],
          explain: 'A father begets a son of his own kind. The Son is God from God, not a creature God made.' },
        { phrase: 'very God of very God', question: 'What does “very God of very God” mean?', answer: 'Truly God from truly God',
          distractors: ['Very much like God', 'A very great angel', 'God’s helper'],
          explain: '“Very” is an old word for true. The Son is true God, just as the Father is.' },
      ],
      connected: ['John 1:1–3', 'John 1:14', 'Hebrews 1:3'],
    },
    {
      id: 'nic-3', collection: 'nicene-creed', number: 3, reviewed: false,
      prompt: 'Why did the Son come down from heaven?',
      text: 'Who, for us men and for our salvation, came down from heaven, and was incarnate by the Holy Spirit of the virgin Mary, and was made man;',
      chunks: {
        adult: ['Who, for us men and for our salvation,', 'came down from heaven,', 'and was incarnate by the Holy Spirit of the virgin Mary,', 'and was made man;'],
        child: ['Who, for us men', 'and for our salvation,', 'came down from heaven,', 'and was incarnate', 'by the Holy Spirit', 'of the virgin Mary,', 'and was made man;'],
      },
      meaning: [
        { phrase: 'incarnate', question: 'What does “incarnate” mean?', answer: 'Taking on a real human body and soul',
          distractors: ['Appearing as a ghost', 'Becoming an angel', 'Being born again'],
          explain: 'The eternal Son became truly human, without ceasing to be God (John 1:14).' },
      ],
      connected: ['John 1:14', 'Luke 1:35', 'Philippians 2:6–7'],
    },
    {
      id: 'nic-4', collection: 'nicene-creed', number: 4, reviewed: false,
      prompt: 'What did Christ suffer, and what will he do?',
      text: 'and was crucified also for us under Pontius Pilate; He suffered and was buried; and the third day He rose again, according to the Scriptures; and ascended into heaven, and sits on the right hand of the Father; and He shall come again, with glory, to judge the quick and the dead; whose kingdom shall have no end.',
      chunks: {
        adult: ['and was crucified also for us under Pontius Pilate;', 'He suffered and was buried;', 'and the third day He rose again, according to the Scriptures;', 'and ascended into heaven,', 'and sits on the right hand of the Father;', 'and He shall come again, with glory,', 'to judge the quick and the dead;', 'whose kingdom shall have no end.'],
        child: ['and was crucified also for us', 'under Pontius Pilate;', 'He suffered and was buried;', 'and the third day He rose again,', 'according to the Scriptures;', 'and ascended into heaven,', 'and sits on the right hand', 'of the Father;', 'and He shall come again,', 'with glory,', 'to judge the quick and the dead;', 'whose kingdom shall have no end.'],
      },
      meaning: [
        { phrase: 'the quick and the dead', question: 'Who are “the quick and the dead”?', answer: 'Those still living, and those who have died',
          distractors: ['The fast and the slow', 'Good people and bad people', 'Believers and unbelievers'],
          explain: '“Quick” is an old word for alive. Christ will judge everyone, living and dead.' },
        { phrase: 'according to the Scriptures', question: 'What does “according to the Scriptures” mean?', answer: 'Just as the Bible foretold',
          distractors: ['As some people believe', 'As church tradition says, apart from the Bible', 'As the disciples imagined'],
          explain: 'Christ’s death and rising fulfilled what God had promised in Scripture (1 Corinthians 15:3–4).' },
      ],
      connected: ['1 Corinthians 15:3–4', 'Acts 1:9–11', 'Acts 10:42'],
    },
    {
      id: 'nic-5', collection: 'nicene-creed', number: 5, reviewed: false,
      prompt: 'What do we believe about the Holy Spirit?',
      text: 'And we believe in the Holy Ghost, the Lord and Giver of Life; who proceeds from the Father and the Son; who with the Father and the Son together is worshipped and glorified; who spoke by the prophets.',
      chunks: {
        adult: ['And we believe in the Holy Ghost, the Lord and Giver of Life;', 'who proceeds from the Father and the Son;', 'who with the Father and the Son together is worshipped and glorified;', 'who spoke by the prophets.'],
        child: ['And we believe in the Holy Ghost,', 'the Lord and Giver of Life;', 'who proceeds from the Father', 'and the Son;', 'who with the Father and the Son together', 'is worshipped and glorified;', 'who spoke by the prophets.'],
      },
      meaning: [
        { phrase: 'Giver of Life', question: 'Why is the Spirit called “the Lord and Giver of Life”?', answer: 'He is God, and he gives life, including new life in Christ',
          distractors: ['He was the first living thing', 'He is a gift from the church', 'He only helps us feel alive'],
          explain: 'The Spirit is fully Lord. He gave life at creation and gives new birth (John 3:5–8).' },
        { phrase: 'spoke by the prophets', question: 'What does “spoke by the prophets” mean?', answer: 'He gave the words the prophets spoke and wrote',
          distractors: ['He listened to the prophets', 'He was one of the prophets', 'He spoke only to Moses'],
          explain: 'The prophets spoke from God as they were carried along by the Holy Spirit (2 Peter 1:21).' },
      ],
      connected: ['John 15:26', 'John 3:5–8', '2 Peter 1:21'],
    },
    {
      id: 'nic-6', collection: 'nicene-creed', number: 6, reviewed: false,
      prompt: 'What do we believe about the Church and the life to come?',
      text: 'And we believe in one holy catholic and apostolic Church. We acknowledge one baptism for the remission of sins; and we look for the resurrection of the dead, and the life of the world to come. Amen.',
      chunks: {
        adult: ['And we believe in one holy catholic and apostolic Church.', 'We acknowledge one baptism for the remission of sins;', 'and we look for the resurrection of the dead,', 'and the life of the world to come. Amen.'],
        child: ['And we believe in one holy', 'catholic and apostolic Church.', 'We acknowledge one baptism', 'for the remission of sins;', 'and we look for', 'the resurrection of the dead,', 'and the life of the world to come.', 'Amen.'],
      },
      meaning: [
        { phrase: 'catholic', question: 'What does “catholic” mean here?', answer: 'Universal: the whole church, in every place and time',
          distractors: ['The Roman Catholic Church only', 'Very old', 'Strict about rules'],
          explain: '“Catholic” means universal. It names all of Christ’s people everywhere, in every age.' },
        { phrase: 'apostolic', question: 'What does “apostolic” mean?', answer: 'Built on the teaching of the apostles',
          distractors: ['Led by twelve people', 'Started in Rome', 'Very strict'],
          explain: 'The church stands on the foundation of the apostles and prophets, with Christ as the cornerstone (Ephesians 2:20).' },
      ],
      connected: ['Ephesians 2:20', 'Ephesians 4:4–5', '1 Corinthians 15:52'],
    },
  ],
};
