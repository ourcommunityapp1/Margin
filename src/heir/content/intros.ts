// The welcome lesson for each course: a few short cards and an easy question after each.
// Drafts for the owner's review, like the rest of the content.

import type { Intro } from '../lesson.ts';

const how = { title: 'How Heir helps you remember', body: 'Short lessons. You’ll see each answer, build it, then say or type it from memory. Questions come back just as you’re about to forget them, which is when recalling them helps most.' };

export const INTROS: Record<string, Intro> = {
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
};
