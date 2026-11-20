# Heir: strategy notes

*Working name: Heir, as in heirs to the kingdom (Romans 8:17, James 2:5).*

An app for memorizing Scripture, catechisms and creeds, built on what memory research shows actually works: speaking the words from memory, on a schedule that lets you almost forget.

## Decisions so far

- **For a family first:** parents and children, each with their own profile and queue, plus a shared family goal (for example, a catechism section this month).
- **ESV first** for Scripture. Its license terms for apps need checking before launch (see Content and licensing).
- **Lessons decide the format, not the learner.** Each lesson mixes exercises (word bank, meaning questions, first letters, typing, saying it aloud) and gets harder as the words fade. Nobody picks a mode.
- **Mockups:** https://claude.ai/artifact/Cnq9NYGMSYbtWmaT8UTBFj

## Look and feel

- **Photography, not painting,** behind clean cards. Calm nature: water, mist, stone, clay, light through glass.
- **Backgrounds move slowly** (a drift over about a minute) and **follow the time of day**: dawn, day, dusk, and a properly dark night for the bedtime review.
- **Three registers** from the mood boards: Still Water for practice, Potter's Clay for family and kids, Living Stones for levels and reward.
- Mood boards: https://claude.ai/artifact/GacGSbXcZR8JbuXjU89GGt

## Profiles and lessons

- **One profile per family member.** Parents can see each child's progress.
- **Kids get their own track:** smaller pieces, more word bank and saying it aloud, less typing, and children's answers where a catechism has them (New City does).
- **Lesson length:** short, about 3–5 minutes and 10–15 exercises, so one lesson always fits.

## Mastery levels: clear feedback, not confetti

Each item (a verse, a catechism question, a creed) climbs a ladder. A level counts only when you pass it **in several separate reviews on different days**, so it measures memory, not a good afternoon. Points are small and reward the same thing: a correct recall after a longer gap earns more than one right after practice.

The names come from the foundation stones of the New Jerusalem (Revelation 21:19–20), climbed **from the twelfth foundation to the first**, so the ladder itself walks up the city's foundations and ends at Jasper: the city "had the glory of God, its radiance like a most rare jewel, like a jasper, clear as crystal" (Revelation 21:11). *Decided 2026-11-20.*

| Level | Stone | Foundation | Earned when | Counts as |
|---|---|---|---|---|
| 1 | **Amethyst** | 12th | Typed in full, correctly, the first time | Know |
| 2 | **Topaz** | 9th | Said or typed right on 3 different days | Memorized |
| 3 | **Carnelian** | 6th | Recalled after a gap of 2+ weeks, both ways (question → answer, answer → question) | Mastered |
| 4 | **Emerald** | 4th | Every review right for 3 months, including one after a month's gap | Long-term memory |
| 5 | **Sapphire** | 2nd | Emerald, plus its meaning questions and connected Scripture | Long-term, and understood |
| 6 | **Jasper** | 1st | Left open for now | |

- Each level is shown as a rounded square holding a close-up photo of the real stone (red jasper for Jasper). Photos and credits: `docs/memory/awards/stones/`.
- An overdue item keeps its level; its stone fades until the next good review ("Needs a refresh").
- Counts shown on Today and Progress: Know, Memorized, Mastered, Long-term memory, split by kind (catechism questions, creed sections, verses later).
- No points for now (decided). Proposed, not yet confirmed: a "days kept" streak where Sunday is a rest day that never breaks it, and a Progress tab with the counts, stone shelf, month calendar and about a dozen dated awards.
- Mockups: https://claude.ai/artifact/VVUkYfBtARYJovpiUFKNLh

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
