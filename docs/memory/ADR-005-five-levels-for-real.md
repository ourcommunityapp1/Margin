# ADR-005: make the five levels the real levels (plan, not yet built)

Status: **plan, revised 2026-11-27 after the owner's answers.** ADR-004 shipped the five names as a display-only mapping over six internal stones. This makes five levels the only levels, everywhere.

Owner's answers: (2) **remove awards entirely for now**; they get an overhaul and come back later. (1) Expert rule: see "Expert" below; the recommendation stands unless the owner says otherwise.

## 1. The guarantee: the Today engine does not change

I checked what reads a level number. **`dayplan.ts`, `planner.ts` (including `morningPicks`), `lesson.ts` (every lesson, review, rise and night builder), the FSRS grades and `cards`/`due`, and `today.tsx` do not read levels at all.** What goes on Today, how long it takes, what is in "When you rise" and "When you lie down", the 7-minute default, the weekly new-lesson limit, and the windows lighting up are all computed from the answer log, FSRS cards and the plan, never from a stone.

What *does* read levels, and so what this change touches:

| Reads a level | What it does | Change |
|---|---|---|
| `levels.ts` (`levelFromLog`, `settle`, `nextStep`, `needsRefresh`) | decides the level | rewritten (below) |
| `keep.ts` (`heldItems`, `windowDays`) and `progress.ts` `clampDue` | "in memory" counting and the keeping-rule review dates | re-keyed so each item keeps the **same window and the same dates** it has now |
| `measures.ts`, `memory-history.ts`, `stats.ts`, `statsjob.ts`, `recover.ts` | words in memory, Growing chart, friends' numbers | thresholds shifted by one so the totals are identical |
| UI: Progress, item page, course rows, finish screen, friends, linked, how, plan, katekize | display | five levels |

**Proof that Today is untouched, built into the work:** before changing anything I snapshot the outputs of the Today engine (the existing `fixtures/engine/lesson.json`, `journeys.json`, `memory.json`, plus a new `today-before.json` of day plans for the test accounts). After the change they must be **byte-identical** and the 171 tests must pass unchanged; any difference blocks the deploy. A new test also fails if `dayplan.ts`, `planner.ts` or `lesson.ts` ever import `levels.ts`.

One honest edge: the keeping rules (a separate feature from Today) clamp a review's due date using the level. The re-keying keeps those identical, and the before/after test checks it on real data.

## 2. How every level is earned (the whole ladder)

Stored `levels[itemId]`: 0 none, **1 Familiar, 2 Recalled, 3 Memorized, 4 Proficient, 5 Expert.** Levels never go down. Nothing a person does today changes; the rules below are the current ones, renumbered.

"Unaided" means no hints and nothing to pick from. A **whole answer** is typing it or saying it. A **light step** is blanks, first letters, ordering, spotting, matching. Light steps count by weight: letters 0.9, blanks 0.75, next 0.6, order 0.5, spot 0.5, match 0.4; a whole answer is 1.0. The easy kinds (match, spot, order, next) must be right first time; a light day only counts if there was no light miss since (ADR-003 amendment). Grading and these weights are not changing.

| Level | Gem | You get it when | Evidence required |
|---|---|---|---|
| **1 Familiar** | Stone | Every part has been typed in full, right, no hints, at its lesson | Whole answer, once. (Today this is the "Recited" step with no stone.) |
| **2 Recalled** | Bronze | You recall it on a **later day** than the lesson | A whole answer, or light steps adding to at least 0.5, on a day after the first |
| **3 Memorized** | Silver | You recall it on **3 different days** (the lesson day counts), with variety | Each day counts as above. Variety = one later whole answer, or two or more kinds of light step across those days |
| **4 Proficient** | Gold | You recall it after **3 weeks or more away** | A whole answer, or light steps adding to at least 0.7, in a session 21+ days after its previous session |
| **5 Expert** | Diamond | Known six months with every full recall in that time right (at least two), one of them after **2 months away** | Whole answers only. Checked as of each session, so a later long gap never undoes it |

The old Sapphire (a year) and Diamond (three years) rules are retired. Anything that reached them is simply Expert, and nothing is lost.

Why this suits "Expert: recall it effortlessly and accurately, even after extended periods without practice": two months away and still right is the "extended period", six months of right recalls is the "effortlessly and accurately". Owner may choose the three-year rule instead, but nobody could reach it for years and the top gem would sit empty for everyone.

Fluency ("Proficient: fluently and reliably") is carried by the 3-week gap with 0.7 evidence, which a lucky easy match cannot reach alone.

## 3. Migration of saved data

- Add `levelScale: 2` to the progress record; a record without it is the old scale.
- `migrateLevels(p)`: old 1→2, 2→3, 3→4, 4/5/6→5; anything recited and at 0 becomes 1 (computed from the log). Idempotent.
- `mergeProgress` normalises both sides to the new scale **before** taking the max, so an old device syncing later cannot be misread.
- Applied on read (local, remote and the server stats job).

## 4. Awards: removed for now

- Remove the Awards section (already hidden on Progress), the award names on the finish screen, `AWARDS`, `awardsMet`, the `awards` calls in `settle`, and the "First Amethyst" and similar copy.
- **Keep the stored `awards` record untouched** (existing dates stay in the data and in merges), so when awards come back after their overhaul nobody has lost one. Nothing reads it in the meantime.
- Mac session: remove the Awards screen and finish-screen award rows. No stone rules depend on awards.

## 5. Server and apps

- Supabase: `heir_stats.stones` from 6 to 5 entries (collapse old 4 to 6), `heir_stats_put` accepts either for one release; migration ships before the web build.
- Regenerate the engine fixtures (TZ America/Chicago). Mac session ports `levels.dart`, `keep.dart` re-key, `stats.dart`, merge/migration, five drawn gems, runs `flutter test`. Nothing reaches the App Store until the Dart fixtures pass.
- Delete the six stone photos and their About credits, `STAGES`, and `tiers.ts` becomes the single five-entry table.

## 6. Tests required before deploy

1. Today-engine snapshots byte-identical (section 1); no import of `levels.ts` from `dayplan.ts`, `planner.ts`, `lesson.ts`.
2. Every old level 0 to 6 migrates as stated; twice is the same as once; merge of old and new scale equals merge of two new.
3. Owner's real record, dry run, no write: words in memory, Growing chart points, keeping states and due dates identical before and after.
4. One test per rule above using the existing light-recall fixtures (the Familiar, Recalled, Memorized, Proficient and Expert boundaries, including a light day with a missed easy step not counting).
5. Awards: finishing a lesson shows no award row; the stored awards record is unchanged after a save.

## 7. Order of work

1. Snapshot Today outputs. 2. Engine rules + keep/measures re-key + tests. 3. Migration + merge. 4. Remove awards. 5. UI to five levels, delete photos. 6. Dry run on the owner's record. 7. Supabase migration. 8. Web deploy. 9. Fixtures to the Mac session.
