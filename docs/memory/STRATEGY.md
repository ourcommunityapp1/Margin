# Christian memory app: strategy notes

An app for memorizing Scripture, catechisms and creeds, built on what memory research shows actually works: speaking the words from memory, on a schedule that lets you almost forget.

## Decisions so far

- **For a family first:** parents and children, each with their own profile and queue, plus a shared family goal (for example, a catechism section this month).
- **ESV first** for Scripture. Its license terms for apps need checking before launch (see Content and licensing).
- **Lessons decide the format, not the learner.** Each lesson mixes exercises (word bank, meaning questions, first letters, typing, saying it aloud) and gets harder as the words fade. Nobody picks a mode.
- **Mockups:** https://claude.ai/artifact/Cnq9NYGMSYbtWmaT8UTBFj

## Profiles and lessons

- **One profile per family member.** Parents can see each child's progress.
- **Kids get their own track:** smaller pieces, more word bank and saying it aloud, less typing, and children's answers where a catechism has them (New City does).
- **Lesson length:** short, about 3–5 minutes and 10–15 exercises, so one lesson always fits.

## Mastery levels: clear feedback, not confetti

Each item (a verse, a catechism question, a creed) climbs a ladder. A level counts only when you pass it **in several separate reviews on different days**, so it measures memory, not a good afternoon. Points are small and reward the same thing: a correct recall after a longer gap earns more than one right after practice.

The names come from the foundation stones of the New Jerusalem (Revelation 21:19–20), with **Jasper** at the top: the city "had the glory of God, its radiance like a most rare jewel, like a jasper, clear as crystal" (Revelation 21:11).

| Level | Name | You can… | To earn it |
|---|---|---|---|
| 1 | **Carnelian** | Put the words in order from a word bank | Pass in 3 reviews on different days |
| 2 | **Topaz** | Type or say the missing words (blanks) | Pass in 3 reviews, at least a day apart |
| 3 | **Sapphire** | Type or say the whole text from its cue (the reference or the catechism question) | Pass in 3 reviews spread over a week or more |
| 4 | **Emerald** | Go both ways: reference → text and text → reference, even from a vague cue ("the verse about storing up God's word") | Pass in 3 reviews spread over 2 weeks or more |
| 5 | **Amethyst** | Do all of level 4 perfectly, kept over months | Every review perfect for 3 months, including one after a gap of a month or more |
| 6 | **Jasper** | Amethyst, plus know what it means: word meanings, and the connected texts (a catechism's proof texts, a verse's cross-references) | Pass the meaning and connection questions in reviews spread over a month |

**Clear feedback, every time:**
- Word by word: which words you got, which needed a hint, which you missed.
- Memory strength: how likely you are to remember it today ("92% today, 80% in two weeks"), from the scheduler's model.
- What's next: "1 more review at Sapphire, on Saturday, to reach Emerald."
- Fading is shown honestly: an item that slips shows "Needs a refresh". It keeps its level, but the badge dims until a successful review.

## The planner: how much, how fast, what

When you add something, or set a family goal, the app helps you choose:
- **What:** suggestions by age and goal (a first catechism section, a psalm, a creed), or anything you pick.
- **How much at once:** the app proposes the piece size: short phrases for young children, a full clause or verse for adults.
- **How fast:** you pick minutes per day or a finish date. The app shows what that means: "5 minutes a day: 2 new pieces a day, Q1–10 done in about 3 weeks. Reviews will take most of your time by week 3." If a pace would bury you in reviews later, it says so.

## What the research decides (the scheduler's rules)

- **Recall before review.** Every exercise asks you to produce the words; reading them comes after, as feedback.
- **Spacing by forgetting.** A model of each item's memory (FSRS) schedules the next review for when recall is likely to drop to about 90%, so each review takes a little effort.
- **Difficulty rises as the words fade.** Within a lesson: word bank → blanks → first letters → whole text from the cue. Across days, an item's exercises follow its level.
- **Mix items.** A lesson interleaves several items instead of drilling one, which is harder in the moment but holds better.
- **New material early, review before bed.** New pieces are offered earlier in the day; a short bedtime review of today's new pieces uses sleep consolidation.
- **Protect tomorrow.** When reviews pile up, the app slows new pieces automatically instead of letting the daily load grow.
- **Say it aloud often.** Every lesson includes at least one spoken recall, for the production effect.

## Library

- **Bible:** passages grouped by category (prayers, promises, the gospel, comfort, character of God, and so on), plus any passage you pick.
- **Catechisms:** Westminster Shorter, Westminster Larger, New City Catechism, Heidelberg, and others later. A catechism's question-and-answer shape is a built-in memory prompt: the question cues the answer.
- **Creeds:** Apostles', Nicene, Athanasian, Chalcedonian Definition.
- **Later:** confessions, hymns, the Lord's Prayer in other languages, your own texts.

## Research → features

| Principle | What the app does |
|---|---|
| **Retrieval practice** | Every session is recall, not rereading. The text fades in steps: full text → first letters only (`G s l t w…`) → blank. You say or type it from memory, and the app checks you. Catechisms: the question shows and you answer. |
| **Spaced repetition** | A modern scheduler (FSRS, open source) decides when each item comes back: 1 day, 3 days, a week, a month… It aims to catch you just before you forget. Daily queue: "6 items due, about 4 minutes." No cramming mode. |
| **Elaborative encoding** | Before you start an item, one optional screen: the context (who wrote it, where it sits), cross-references (the Westminster proof texts, for example), and one question: "Why do you think it says *chief* end?" You can add your own note or image. |
| **Chunking** | Long texts split at natural phrases. You learn chunk 1, then 1–2, then 1–3 (cumulative build-up), so you always recite from the start. Catechism answers are already chunks. |
| **Dual coding and the production effect** | **Say it out loud** is the default way to recite: the phone listens and marks each word. Optional rhythm view (one line per breath), listen-along audio, and a simple image or symbol per chunk. |
| **Sleep consolidation** | An optional evening "before bed" review of what you learned today (2–3 minutes), and a gentle morning check the next day. Learning new items is suggested earlier in the day. |

## A session

1. **Due reviews first:** the scheduler's queue. Each item: recite from blank → see what you missed → rate how it went (or let the app rate it from the word check).
2. **One new chunk, if you have time:** read it once, think about it once (the elaboration screen), then fade it out in 3 steps until you can say it from blank.
3. **Done:** a calm summary: what's secure, what's coming back tomorrow.

## Content and licensing

This needs settling before building:

- **Public domain (free to use):** KJV, World English Bible, Berean Standard Bible (released to the public domain in 2023), Westminster Shorter and Larger Catechisms, the classic creeds in traditional translations, the Heidelberg Catechism in older translations.
- **Needs permission:** ESV, NIV, CSB, NASB (each has app licensing terms; the ESV has an API with its own rules), New City Catechism text (Crossway / The Gospel Coalition), modern Heidelberg translations.
- A reasonable start: BSB or KJV for Scripture, Westminster catechisms, the classic creeds. Then add licensed texts once there's permission.

## What carries over from this repo

- **Speech to text** from Deep Think (ElevenLabs plus the phone's built-in dictation), here used to check recitation word by word.
- **The design language:** warm paper, serif text, one accent color.
- **The Margin site and Netlify deployment.**
- **Supabase** for syncing progress (or on-device only at first).
