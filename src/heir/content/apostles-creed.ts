// The Apostles' Creed, traditional English wording. Public domain.
// Split into four sections for learning. Connected verses are suggestions, not part of the creed.
// Meaning questions and child pieces are drafts: `reviewed` stays false until the owner approves each item.

import type { Collection } from '../types.ts';

export const apostlesCreed: Collection = {
  id: 'apostles-creed',
  title: 'Apostles’ Creed',
  kind: 'creed',
  unit: 'Section',
  source: 'The Apostles’ Creed, traditional English wording, public domain',
  items: [
    {
      id: 'apc-1', collection: 'apostles-creed', number: 1, reviewed: false,
      prompt: 'What do we believe about God the Father?',
      text: 'I believe in God the Father Almighty, Maker of heaven and earth.',
      chunks: {
        adult: ['I believe in God the Father Almighty,', 'Maker of heaven and earth.'],
        child: ['I believe in God', 'the Father Almighty,', 'Maker of heaven', 'and earth.'],
      },
      meaning: [
        { phrase: 'Almighty', question: 'What does “Almighty” mean?', answer: 'Having all power',
          distractors: ['Knowing all things', 'Being everywhere', 'Ruling over the angels'],
          explain: 'Nothing is too hard for God. He can do all that he wills.' },
      ],
      connected: ['Genesis 1:1', 'Psalm 121:2'],
    },
    {
      id: 'apc-2', collection: 'apostles-creed', number: 2, reviewed: false,
      prompt: 'What do we believe about Jesus Christ?',
      text: 'And in Jesus Christ his only Son our Lord; who was conceived by the Holy Ghost, born of the Virgin Mary, suffered under Pontius Pilate, was crucified, dead, and buried;',
      chunks: {
        adult: ['And in Jesus Christ his only Son our Lord;', 'who was conceived by the Holy Ghost,', 'born of the Virgin Mary,', 'suffered under Pontius Pilate,', 'was crucified, dead, and buried;'],
        child: ['And in Jesus Christ', 'his only Son', 'our Lord;', 'who was conceived', 'by the Holy Ghost,', 'born of the Virgin Mary,', 'suffered under', 'Pontius Pilate,', 'was crucified,', 'dead, and buried;'],
      },
      meaning: [
        { phrase: 'suffered under Pontius Pilate', question: 'Why does the creed name Pontius Pilate?', answer: 'It marks a real time and place in history',
          distractors: ['Pilate was the most to blame for Jesus’ death', 'Pilate later became a believer', 'Pilate was a leader in the early church'],
          explain: 'Pilate was the Roman governor of Judea. Naming him ties Jesus’ death to real history, not a legend.' },
      ],
      connected: ['John 3:16', 'Luke 1:35', '1 Corinthians 15:3–4'],
    },
    {
      id: 'apc-3', collection: 'apostles-creed', number: 3, reviewed: false,
      prompt: 'What happened after Jesus was buried?',
      text: 'he descended into hell; the third day he rose again from the dead; he ascended into heaven, and sitteth on the right hand of God the Father Almighty; from thence he shall come to judge the quick and the dead.',
      chunks: {
        adult: ['he descended into hell;', 'the third day he rose again from the dead;', 'he ascended into heaven,', 'and sitteth on the right hand of God the Father Almighty;', 'from thence he shall come to judge the quick and the dead.'],
        child: ['he descended into hell;', 'the third day', 'he rose again from the dead;', 'he ascended into heaven,', 'and sitteth on the right hand', 'of God the Father Almighty;', 'from thence he shall come', 'to judge the quick', 'and the dead.'],
      },
      meaning: [
        { phrase: 'the quick and the dead', question: 'What does “the quick and the dead” mean?', answer: 'Those who are alive and those who have died',
          distractors: ['Those who believe and those who don’t', 'The righteous and the wicked', 'Those who are ready and those who aren’t'],
          explain: '“Quick” is an old word for “living.” Jesus will judge everyone, living and dead (Acts 10:42).' },
        { phrase: 'from thence', question: 'What does “from thence” mean?', answer: 'From there',
          distractors: ['After that', 'From then on', 'Because of that'],
          explain: 'From heaven, where he sits at the Father’s right hand, Jesus will come again.' },
      ],
      connected: ['1 Corinthians 15:4', 'Acts 1:9–11', 'Acts 10:42'],
    },
    {
      id: 'apc-4', collection: 'apostles-creed', number: 4, reviewed: false,
      prompt: 'What do we believe about the Holy Spirit and the church?',
      text: 'I believe in the Holy Ghost; the holy catholic church; the communion of saints; the forgiveness of sins; the resurrection of the body; and the life everlasting. Amen.',
      chunks: {
        adult: ['I believe in the Holy Ghost;', 'the holy catholic church;', 'the communion of saints;', 'the forgiveness of sins;', 'the resurrection of the body;', 'and the life everlasting. Amen.'],
        child: ['I believe', 'in the Holy Ghost;', 'the holy catholic church;', 'the communion of saints;', 'the forgiveness of sins;', 'the resurrection of the body;', 'and the life everlasting.', 'Amen.'],
      },
      meaning: [
        { phrase: 'catholic', question: 'What does “catholic” mean in the creed?', answer: 'Universal: the whole church, in every place and time',
          distractors: ['The Roman Catholic Church', 'The church’s oldest traditions', 'The church in one city or region'],
          explain: '“Catholic” means universal. It names all of Christ’s people everywhere, across every century.' },
        { phrase: 'communion of saints', question: 'What is “the communion of saints”?', answer: 'The fellowship all believers share in Christ',
          distractors: ['Praying to believers who have died', 'Sharing the Lord’s Supper together', 'The fellowship of especially holy people'],
          explain: 'Everyone who belongs to Christ shares in him and in one another, as one family (1 John 1:3).' },
      ],
      connected: ['Ephesians 1:7', '1 John 1:3', '1 Corinthians 15:42–44', 'John 10:28'],
    },
  ],
};
