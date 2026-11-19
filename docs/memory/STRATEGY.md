# Christian memory app: strategy notes

An app for memorizing Scripture, catechisms and creeds, built on what memory research shows actually works: speaking the words from memory, on a schedule that lets you almost forget.

## Decisions so far

- **For a family first:** parents and children, each with their own profile and queue, plus a shared family goal (for example, a catechism section this month).
- **ESV first** for Scripture. Its license terms for apps need checking before launch (see Content and licensing).
- **Lessons decide the format, not the learner.** Each lesson mixes exercises (word bank, meaning questions, first letters, typing, saying it aloud) and gets harder as the words fade. Nobody picks a mode.
- **Mockups:** https://claude.ai/artifact/Cnq9NYGMSYbtWmaT8UTBFj

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
