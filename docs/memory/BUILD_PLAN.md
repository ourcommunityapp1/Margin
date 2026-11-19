# Heir: build plan

Heir helps a family memorize Scripture, catechisms and creeds, using what memory research shows works: recall instead of rereading, spaced reviews, speaking aloud, small pieces, and a short review before sleep.

- Strategy and decisions: `STRATEGY.md`
- Look: the **Round 2 · simpler** screens at https://claude.ai/artifact/9Ho4AkuXtCYFCu8btL4QkU (files in `screens/R2*.dc.html`)

## What the first version does

A family can sign up, add each member, pick a goal (start: Westminster Shorter Q1–10), and each person does a short daily lesson plus an optional bedtime review. The app decides what comes back when, mixes the exercise types, and shows each item's level honestly.

**In:** Today, Memorize, lessons (5 exercise types), lesson done, one item's page with its level, bedtime review, family profiles, the first plan.
**Later:** Learn (videos and articles), more catechisms and creeds, Scripture beyond a starter set, notifications, offline, native apps.

## Stack

| Part | Choice | Why |
|---|---|---|
| App | Next.js in this repo, its own route area (`/heir`), installable to the home screen as a web app | Fastest path to a phone, reuses the existing deploy and speech code |
| Hosting | The existing Netlify site | Already set up with the keys |
| Accounts and data | Supabase (Postgres, sign-in with emailed code, row-level security per household) | Already used by the family's other apps |
| Scheduling | FSRS via the `ts-fsrs` library (open source) | The current best spaced-repetition model; predicts recall probability per item |
| Speech to text | The phone's built-in dictation first; ElevenLabs once the key allows speech to text | Already built for Deep Think, with the fallback |
| Scripture text | ESV through Crossway's ESV API, if its terms fit (see decisions) | The translation the family uses |
| Design | Tokens from the Round 2 screens: Source Serif 4 + Inter, solid cards, softened photo backgrounds that follow the time of day | Already reviewed |

## How it works

### Content

Each memorizable **item** (a catechism question, a creed article, a passage) is a checked-in JSON file, so it can be reviewed like any other change:

```json
{
  "id": "wsc-1",
  "collection": "westminster-shorter",
  "prompt": "What is the chief end of man?",
  "text": "Man's chief end is to glorify God, and to enjoy him forever.",
  "chunks": { "adult": ["Man's chief end is to glorify God,", "and to enjoy him forever."],
              "child": ["Man's chief end", "is to glorify God,", "and to enjoy him", "forever."] },
  "meaning": [{ "phrase": "chief end", "question": "What does \"chief end\" mean here?",
                "answer": "The main reason we were made",
                "distractors": ["The last thing that happens to us", "The most important person", "A rule we must keep"] }],
  "connected": ["1 Cor 10:31", "Rom 11:36", "Ps 73:25-28"],
  "source": "Westminster Shorter Catechism (1647), public domain"
}
```

- Catechisms and creeds are public domain and live in the repo.
- Scripture is fetched by reference and cached as the license allows. Only references are stored in content files.
- Meaning questions, distractors and child chunks are drafted with Claude, then **reviewed by a person before they ship**. Each file records who reviewed it.

### Exercises

Five types, picked by the lesson engine, never by the learner:

1. **Words in order:** a word bank with 1–2 decoys.
2. **What it means:** one question, four answers.
3. **Fill the blanks:** type or say the missing words.
4. **First letters:** type the first letter of each word.
5. **Say it:** the whole piece from its cue (the reference or the question), checked word by word.

Grading is forgiving about punctuation, capitals and small speech mistakes ("forever" and "for ever" both count). It is strict about the words themselves.

### Lessons

- **Length:** 10–15 exercises, about 3–5 minutes.
- **Order:** due reviews first, then at most the plan's number of new pieces.
- **Mix:** several items interleaved, never one item drilled.
- **Speaking:** at least one exercise said aloud.
- **Difficulty:** within an item, it rises as the words fade: order, then blanks, then first letters, then say it.
- **Bedtime review:** only what was new today, 2 minutes, offered from 7 pm on.

### Scheduling

- Each item (and each chunk while it's being learned) keeps an FSRS card: stability, difficulty, last review and due date. The app targets about 90% recall.
- Every exercise result becomes a rating (again, hard, good or easy) from correctness, hints and time.
- **Protecting tomorrow:** when the forecast review load passes the plan's minutes, new pieces pause automatically.

### Levels

Each level needs passes **on separate days**, so it measures memory rather than one good session:

| Level | Passes needed | Spread |
|---|---|---|
| Carnelian (order) | 3 | on different days |
| Topaz (blanks) | 3 | at least a day apart |
| Sapphire (whole from its cue) | 3 | over 7+ days |
| Emerald (both ways, vague cue) | 3 | over 14+ days |
| Amethyst | every review perfect | for 3 months, one after a gap of 30+ days |
| Jasper | Amethyst, plus meaning and connected texts | passes over a month |

- These are pure functions over the review log, so they're easy to test and to tune.
- A lapse doesn't remove a level. The item shows "needs a refresh" until its next good review.

### Data (Supabase)

- `heir_households`
- `heir_members`: name, role, track (child or adult), owner account
- `heir_plans`: collection, range, piece size, minutes a day
- `heir_cards`: member × item or chunk, with the FSRS state
- `heir_reviews`: the log of every exercise result, with timestamp, type, correct and hints
- `heir_levels`: member × item, current level, evidence

Row-level security: a signed-in parent sees and edits only their own household. Children use the parent's device and profile switcher, with no accounts of their own in version 1.

## Build order

Each phase ends with something usable on a phone.

1. **Foundation**
   - The app shell at `/heir`, the Round 2 tokens, softened backgrounds that follow the time of day, and the tab bar
   - Sign-in, household and members
   - Content loader, with Westminster Shorter Q1–10 and the Apostles' Creed fully written and reviewed
2. **The core loop**
   - Lesson engine and the five exercises
   - FSRS scheduling and the review log
   - Today (day and night), lesson done, bedtime review
   - *Done means:* a family member can use it daily for a week and the reviews come back at sensible times.
3. **Levels and library**
   - Level rules and the verse page
   - Memorize library and the first plan
   - The child track: shorter pieces, more order and speaking, larger text
4. **More content**
   - All 107 Westminster Shorter questions
   - Nicene Creed
   - A starter set of about 50 passages by category, once the ESV question is settled
5. **Later:** Learn tab, reminders, offline, more catechisms (Larger, Heidelberg, New City if licensed), and native apps if the web app holds up.

## Testing

- **Unit tests:** grading, chunking, the lesson picker, FSRS rating mapping, and every level rule, using fixed review logs that cover each edge case.
- **One Playwright flow per phase,** at phone size.
- **A content check:** every item has chunks for both tracks, meaning questions with exactly one answer, and a reviewer.

## Decisions

1. **Scripture:** catechisms and creeds first. Check the ESV API terms in parallel, then add verses.
2. **Database:** a new Supabase project for Heir.
3. **Content review:** the owner reviews each item in a checklist before it goes live. Drafts are marked unreviewed.
4. **Start:** phase 1 now, on this branch, with Westminster Shorter Q1–10 drafted for review.

## Accounts and sync (built, switched off until configured)

- Heir uses its own two settings, so it can't touch Sermon Notes' sign-in by accident:
  `NEXT_PUBLIC_HEIR_SUPABASE_URL` and `NEXT_PUBLIC_HEIR_SUPABASE_PUBLISHABLE_KEY`. Without them, Heir keeps
  the household on the device only, exactly as in phase 1.
- Database: `supabase/migrations/20261119000000_heir.sql` (households, members, reviews; each row readable
  only by the parent who owns the household).
- Sign-in: a 6-digit code sent by email (works inside the home-screen app). The Supabase "Magic Link"
  email template must include `{{ .Token }}`; keep the existing link for Sermon Notes and add a line such as
  `Or enter this code: {{ .Token }}`.
- First sign-in: if the account has no family yet, the one already on the phone is carried up; if it has one,
  that family is used. Changes save to the phone at once and to the account about half a second later.
- Pages other than welcome, sign-in and about ask for sign-in when accounts are on.
