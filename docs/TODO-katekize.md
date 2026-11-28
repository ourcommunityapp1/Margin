# Katekize TODO

Owner's list, added 2026-11-27. Each item says how big it is and what can be done next: **Fix** (small, can just be built), **Mockup** (a visual to react to first), **Plan** (a written plan first).

## Bugs and small fixes

1. **DONE 2026-11-28.** **Back goes to where you were.** Practising a verse from its page and pressing back (or finishing) lands on Today instead of the verse page. Cause: the lesson screen hard-codes `/heir` for its back arrow and its "Back to Today" button (`src/app/heir/ui/lesson.tsx`). Fix: every way into a lesson passes where it came from (`from=` in the link), and the lesson returns there, falling back to Today. *Fix, about an hour.*
2. **DONE 2026-11-28 (row says "opens 7 pm").** **Evening is locked until 7 pm: say so.** Today shows the "When you lie down" recall only from 7 pm (`EVENING_FROM`); before that the person gets no hint it exists. Show it as a row "This evening · opens at 7 pm". *Fix, small.* (Text decided with the owner; Today layout unchanged.)

## Progress tab

3. **Tall glass of communion wine.** The words arc becomes a tall glass that fills as words enter memory; remove the handles (the milestone arcs/ticks). *Mockup first.*
4. **DONE 2026-11-28.** **Remove the "This week" slice** (the four-box row). *Fix, tiny.*
5. **Rings that mean something.** "Min this week": ring full when the week's goal is hit. "Day streak" has no "complete", and Verses/Catechism rings do not either, so they should stop being rings (plain numbers, or a different shape). Decide with a mockup of the top row. *Mockup, then small build.*

## Courses tab becomes Learn

6. **Rename** Courses to Learn (or similar) and make it the main place for self-directed learning: learn any verse, any time. *Plan + Mockup (the biggest item in this list).*
7. **Shelves of specific verses** (by theme, season, need), plus recommended plans and "new" tags on courses. *Plan, needs a content decision.*
8. **Search bar leading to a Discover page**; later search verses by topic. *Plan (search needs a topic index) + Mockup for the page.*
9. **Practice means about 2 minutes**, not one question. From Learn, Practice builds a short session (several steps, or several verses). *Plan; touches the lesson builder.*
10. **DONE 2026-11-28.** **Plan button.** Replace "Remove from plan" with "Added to plan ⌄"; tapping opens the choice to remove, so removal takes two taps. *Fix, small.*

## Community (the Friends tab)

11. **DONE 2026-11-28.** **Friends becomes Community**; the leaderboard button looks like the app's other buttons. *Fix, small; part of the layout in 12.*
12. **DONE 2026-11-28.** **Top-right Invite becomes a share icon.** *Fix, tiny.*
13. **Friend requests and friends** become small boxes right under the search bar, out of the way. *Mockup.*
14. **Later: show contacts who are on the app.** *Plan (needs contacts permission and privacy design).*
15. **Feed:** when community members memorise or master verses or catechisms, or finish one of their plans. *Plan (data model, privacy: friends only, never answers, never children; what counts as an event).*

## Steps and learning

16. **More variety of steps**, chosen dynamically per verse: matching a verse to its reference, and others, depending on the verse's shape. *Plan (builds on `lesson.ts` and the weights in `observe.ts`).*
17. **Images tied to words.** Icons or real images directly relevant to words, phrases or clauses of a verse. *Plan + Mockup; needs rules for sourcing and licensing.*
18. **Learning, applying and connecting the meaning while memorising.** Short, meaningful stories, definitions, summaries and linked verses, which both deepen the memory and teach. Examples: a short relevant quote; a verse directly relevant to a catechism answer; short reputable commentary or paraphrase; a layman's definition of a hard term; a little context. One or two are learned at the lesson; others appear periodically beside or after the steps. **Needs clear rules so nothing erroneous gets in** (see the guideline draft below). *Plan first; content rules before any content.*

### Draft rules for meaning content (for the owner to edit)

- Every note is short (one to three sentences), plain, and about *this* verse or answer; if it would fit any verse, cut it.
- Every note has a stated source or is marked as our own plain paraphrase of the text itself; no unsourced quotes, no invented stories or attributions.
- Quotes and commentary only from named, reputable, public-domain or licensed sources, kept to the tradition the app teaches; each quote checked against its source.
- Definitions come from the verse's own context first, then a standard reference.
- Nothing is added without a review step (a second reading against the source), and every note records who reviewed it and when; a "not yet reviewed" note is never shown to people.
- A note that teaches something the verse does not say is rejected. Disputed doctrinal points are left out or marked as such.
- Notes never replace the recall steps; they come after the answer is shown.

## Already planned (not new)

- Five levels in the engine (ADR-005) and the one memory model (ADR-006, phases 1 onward).
- Mac session: port the engine changes, run the Dart tests, then the new screens.
- Reminders (email and push), "everything you know" page, focus courses, Larger Catechism, AI-taught understanding, Android and widget, TestFlight.
