// The two starter Bible courses: First Verses, and Christmas. Six short verses each, chosen so a first window
// can be lit within a few weeks at five minutes a day.
//
// Scripture quotations are from the NASB 2020: NEW AMERICAN STANDARD BIBLE®, Copyright © 1960, 1971, 1977, 1995,
// 2020 by The Lockman Foundation. Used by permission. All rights reserved. lockman.org
// Every text is exactly as the NASB 2020 has it: whole verses, word for word, with their own capitals and
// punctuation, including quotation marks that open or close in a neighbouring verse. Only markup is left out
// (verse numbers, paragraph marks, italics and small capitals; the divine name is written LORD, and Old Testament
// words quoted in the New keep their ordinary letters). A test checks each text against the publisher's HTML.
//
// For a verse, the cue (`prompt`) is its reference.

import type { Collection } from '../types.ts';

const SOURCE = 'New American Standard Bible (NASB 2020), © The Lockman Foundation. Used by permission.';

export const firstVerses: Collection = {
  id: 'first-verses', title: 'First Verses', kind: 'scripture', unit: 'Verse', source: SOURCE,
  items: [
    {
      id: 'fv-1', collection: 'first-verses', number: 1, reviewed: false,
      prompt: 'Genesis 1:1',
      text: 'In the beginning God created the heavens and the earth.',
      chunks: {
        adult: ['In the beginning', 'God created the heavens and the earth.'],
        child: ['In the beginning', 'God created', 'the heavens', 'and the earth.'],
      },
      meaning: [
        { phrase: 'God created', question: 'What does it mean that God “created” the heavens and the earth?', answer: 'He made everything, out of nothing',
          distractors: ['He tidied up a world that was already there', 'He gave names to the stars and the sea', 'He found the earth and chose to live there'],
          explain: 'Before the beginning there was only God. Everything else exists because He made it.' },
      ],
      connected: [],
    },
    {
      id: 'fv-2', collection: 'first-verses', number: 2, reviewed: false,
      prompt: 'Psalm 23:1',
      text: 'The LORD is my shepherd, I will not be in need.',
      chunks: {
        adult: ['The LORD is my shepherd,', 'I will not be in need.'],
        child: ['The LORD', 'is my shepherd,', 'I will not', 'be in need.'],
      },
      meaning: [
        { phrase: 'my shepherd', question: 'Why does David call the LORD “my shepherd”?', answer: 'The LORD leads, feeds and protects him',
          distractors: ['David had been a shepherd before he was king', 'The LORD watches from far away', 'The LORD looks after only the strongest sheep'],
          explain: 'A shepherd guides his sheep, finds them food and water, and guards them. The LORD does all of that for His people.' },
      ],
      connected: [],
    },
    {
      id: 'fv-3', collection: 'first-verses', number: 3, reviewed: false,
      prompt: 'John 3:16',
      text: '“For God so loved the world, that He gave His only Son, so that everyone who believes in Him will not perish, but have eternal life.',
      chunks: {
        adult: ['“For God so loved the world,', 'that He gave His only Son,', 'so that everyone who believes in Him will not perish,', 'but have eternal life.'],
        child: ['“For God so loved the world,', 'that He gave His only Son,', 'so that everyone', 'who believes in Him', 'will not perish,', 'but have eternal life.'],
      },
      meaning: [
        { phrase: 'eternal life', question: 'What is “eternal life”?', answer: 'Life with God that never ends, beginning now',
          distractors: ['Living a very long time on earth', 'Being remembered after you die', 'Coming back to life as someone else'],
          explain: 'Eternal life is knowing God through Jesus (John 17:3). It starts when we believe, and it never ends.' },
      ],
      connected: [],
    },
    {
      id: 'fv-4', collection: 'first-verses', number: 4, reviewed: false,
      prompt: 'Romans 6:23',
      text: 'For the wages of sin is death, but the gracious gift of God is eternal life in Christ Jesus our Lord.',
      chunks: {
        adult: ['For the wages of sin is death,', 'but the gracious gift of God', 'is eternal life', 'in Christ Jesus our Lord.'],
        child: ['For the wages of sin', 'is death,', 'but the gracious gift of God', 'is eternal life', 'in Christ Jesus our Lord.'],
      },
      meaning: [
        { phrase: 'the wages of sin', question: 'What are “the wages of sin”?', answer: 'What sin earns: death',
          distractors: ['The money people spend on wrong things', 'The fun that sin seems to give', 'A small punishment that soon passes'],
          explain: 'Wages are what you have earned. Sin earns death, but eternal life is a gift. No one can earn it.' },
      ],
      connected: [],
    },
    {
      id: 'fv-5', collection: 'first-verses', number: 5, reviewed: false,
      prompt: 'Proverbs 3:5–6',
      text: 'Trust in the LORD with all your heart And do not lean on your own understanding. In all your ways acknowledge Him, And He will make your paths straight.',
      chunks: {
        adult: ['Trust in the LORD with all your heart', 'And do not lean on your own understanding.', 'In all your ways acknowledge Him,', 'And He will make your paths straight.'],
        child: ['Trust in the LORD', 'with all your heart', 'And do not lean', 'on your own understanding.', 'In all your ways', 'acknowledge Him,', 'And He will make', 'your paths straight.'],
      },
      meaning: [
        { phrase: 'do not lean on your own understanding', question: 'What does it mean not to “lean on your own understanding”?', answer: 'Not to trust your own judgment above God',
          distractors: ['Not to try to understand anything', 'Not to read or study', 'Not to ask other people for advice'],
          explain: 'Thinking carefully is good. But when our ideas and God’s word disagree, we rest our weight on God.' },
      ],
      connected: [],
    },
    {
      id: 'fv-6', collection: 'first-verses', number: 6, reviewed: false,
      prompt: 'Psalm 119:11',
      text: 'I have treasured Your word in my heart, So that I may not sin against You.',
      chunks: {
        adult: ['I have treasured Your word in my heart,', 'So that I may not sin against You.'],
        child: ['I have treasured', 'Your word in my heart,', 'So that I may not', 'sin against You.'],
      },
      meaning: [
        { phrase: 'treasured Your word in my heart', question: 'What does it mean to treasure God’s word in your heart?', answer: 'To know it by heart and hold it dear',
          distractors: ['To keep a Bible somewhere safe', 'To feel happy when you hear it read', 'To keep it secret from others'],
          explain: 'Words we know by heart are with us everywhere, ready when we need them most.' },
      ],
      connected: [],
    },
  ],
};

export const christmas: Collection = {
  id: 'christmas', title: 'Christmas', kind: 'scripture', unit: 'Verse', source: SOURCE,
  items: [
    {
      id: 'xm-1', collection: 'christmas', number: 1, reviewed: false,
      prompt: 'Isaiah 9:2',
      text: 'The people who walk in darkness Will see a great light; Those who live in a dark land, The light will shine on them.',
      chunks: {
        adult: ['The people who walk in darkness', 'Will see a great light;', 'Those who live in a dark land,', 'The light will shine on them.'],
        child: ['The people', 'who walk in darkness', 'Will see a great light;', 'Those who live', 'in a dark land,', 'The light will shine on them.'],
      },
      meaning: [
        { phrase: 'a great light', question: 'Who is the “great light” Isaiah promised?', answer: 'Jesus, the Light of the world',
          distractors: ['The star over Bethlehem', 'The sun rising after a long night', 'The lamps of the temple in Jerusalem'],
          explain: 'Jesus said, “I am the Light of the world” (John 8:12). He came into a world dark with sin.' },
      ],
      connected: [],
    },
    {
      id: 'xm-2', collection: 'christmas', number: 2, reviewed: false,
      prompt: 'Isaiah 9:6',
      text: 'For a Child will be born to us, a Son will be given to us; And the government will rest on His shoulders; And His name will be called Wonderful Counselor, Mighty God, Eternal Father, Prince of Peace.',
      chunks: {
        adult: ['For a Child will be born to us, a Son will be given to us;', 'And the government will rest on His shoulders;', 'And His name will be called', 'Wonderful Counselor, Mighty God,', 'Eternal Father, Prince of Peace.'],
        child: ['For a Child will be born to us,', 'a Son will be given to us;', 'And the government', 'will rest on His shoulders;', 'And His name will be called', 'Wonderful Counselor,', 'Mighty God,', 'Eternal Father,', 'Prince of Peace.'],
      },
      meaning: [
        { phrase: 'Mighty God', question: 'What does the name “Mighty God” tell us about the Child?', answer: 'The Child would be God Himself',
          distractors: ['He would grow up to be a strong king', 'He would win many battles', 'God would be on His side'],
          explain: 'Isaiah promised a baby who is also God. That is what happened at Christmas.' },
      ],
      connected: [],
    },
    {
      id: 'xm-3', collection: 'christmas', number: 3, reviewed: false,
      prompt: 'Luke 1:46–47',
      text: 'And Mary said: “My soul exalts the Lord, And my spirit has rejoiced in God my Savior.',
      chunks: {
        adult: ['And Mary said:', '“My soul exalts the Lord,', 'And my spirit has rejoiced in God my Savior.'],
        child: ['And Mary said:', '“My soul exalts the Lord,', 'And my spirit has rejoiced', 'in God my Savior.'],
      },
      meaning: [
        { phrase: 'exalts the Lord', question: 'What does Mary mean when she says her soul “exalts the Lord”?', answer: 'She praises the Lord as great, with all her heart',
          distractors: ['She asks the Lord to lift her up', 'She feels proud to have been chosen', 'She tells her family about the baby'],
          explain: 'To exalt is to lift high in praise. Mary’s first response to God’s promise was worship.' },
      ],
      connected: [],
    },
    {
      id: 'xm-4', collection: 'christmas', number: 4, reviewed: false,
      prompt: 'Matthew 1:21',
      text: 'She will give birth to a Son; and you shall name Him Jesus, for He will save His people from their sins.”',
      chunks: {
        adult: ['She will give birth to a Son;', 'and you shall name Him Jesus,', 'for He will save His people from their sins.”'],
        child: ['She will give birth', 'to a Son;', 'and you shall name Him Jesus,', 'for He will save His people', 'from their sins.”'],
      },
      meaning: [
        { phrase: 'name Him Jesus', question: 'Why was the baby to be named Jesus?', answer: 'Because He would save His people from their sins',
          distractors: ['Because it was a family name', 'Because it means “King of the Jews”', 'Because Mary and Joseph liked it'],
          explain: 'The name Jesus means “the LORD saves.” His name tells us why He came.' },
      ],
      connected: [],
    },
    {
      id: 'xm-5', collection: 'christmas', number: 5, reviewed: false,
      prompt: 'Matthew 1:23',
      text: '“Behold, the virgin will conceive and give birth to a Son, and they shall name Him Immanuel,” which translated means, “God with us.”',
      chunks: {
        adult: ['“Behold, the virgin will conceive', 'and give birth to a Son,', 'and they shall name Him Immanuel,”', 'which translated means, “God with us.”'],
        child: ['“Behold, the virgin', 'will conceive', 'and give birth to a Son,', 'and they shall name Him', 'Immanuel,”', 'which translated means,', '“God with us.”'],
      },
      meaning: [
        { phrase: 'Immanuel', question: 'What does “Immanuel” mean?', answer: 'God with us',
          distractors: ['God will save', 'Prince of Peace', 'Son of David'],
          explain: 'At Christmas God did not just send help. He came Himself, to be with us.' },
      ],
      connected: [],
    },
    {
      id: 'xm-6', collection: 'christmas', number: 6, reviewed: false,
      prompt: 'Luke 2:10–11',
      text: 'And so the angel said to them, “Do not be afraid; for behold, I bring you good news of great joy which will be for all the people; for today in the city of David there has been born for you a Savior, who is Christ the Lord.',
      chunks: {
        adult: ['And so the angel said to them,', '“Do not be afraid;', 'for behold, I bring you good news of great joy', 'which will be for all the people;', 'for today in the city of David there has been born for you a Savior,', 'who is Christ the Lord.'],
        child: ['And so the angel said to them,', '“Do not be afraid;', 'for behold,', 'I bring you good news', 'of great joy', 'which will be for all the people;', 'for today in the city of David', 'there has been born for you', 'a Savior,', 'who is Christ the Lord.'],
      },
      meaning: [
        { phrase: 'good news of great joy', question: 'What was the “good news of great joy”?', answer: 'A Savior, Christ the Lord, had been born',
          distractors: ['The shepherds would be rewarded', 'The Romans were leaving the land', 'A new king had built a palace in Bethlehem'],
          explain: 'The news was for “all the people”: the Savior the prophets promised had come.' },
      ],
      connected: [],
    },
  ],
};
