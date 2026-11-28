# ADR-005: make the five levels the real levels (BUILT 2026-11-28; see the end)

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

## 2. How every level is earned (revised after the owner's note)

Owner's direction: **Familiar is a very low bar; Proficient and Expert lean on typed-out (whole) answers and demand more accuracy.**

Stored `levels[itemId]`: 0 none, **1 Familiar, 2 Recalled, 3 Memorized, 4 Proficient, 5 Expert.** Levels never go down.

Terms: a **whole answer** is typing it or saying it, right, with no hints (the grading is already strict: one wrong word and it is not "right"). A **light step** is blanks, first letters, ordering, spotting, matching.

**How light steps count (the ".5" and ".7")**: a whole answer is worth 1.0 of "proof you know it". A light step is worth a share of that, by how much it makes you produce: first letters 0.9, blanks 0.75, next word 0.6, putting phrases in order 0.5, spotting the wrong word 0.5, matching 0.4. A review's steps add up (never above 1.0). "0.5 or more" means a quick review earns Recalled/Memorized credit if its steps add to at least half a whole answer: first letters alone (0.9) does, blanks alone (0.75) does, ordering alone (0.5) just does, matching alone (0.4) does not. The easy kinds (matching, spotting, ordering, next word) must be right the *first* time; the harder ones (letters, blanks) allow a slip or two. A light day also only counts if no light step has been missed since.

| Level | Gem | You get it when | Light steps count? |
|---|---|---|---|
| **1 Familiar** | Stone | You've been through its lesson (it counts as learned). No typing needed. | n/a, the lowest bar |
| **2 Recalled** | Bronze | On a **later day** you recall it (and you typed it in full at its lesson, as today) | Yes, at 0.5 or more |
| **3 Memorized** | Silver | You recall it on **3 different days** with variety (a later whole answer, or two or more kinds of light step) | Yes, at 0.5 or more |
| **4 Proficient** | Gold | After **3 weeks or more away** you **type or say the whole thing, right, no hints** | **No. Whole answer only** (changed: was 0.7 light) |
| **5 Expert** | Diamond | Known **6 months**; **every whole answer in those six months right** (at least **three** now, was two), including one after **2 months away** | **No. Whole answers only** |

What changed from the first draft:
- **Familiar** drops from "typed it in full" to "finished the lesson". Words *in memory*, Growing, and the keeping rules still start at Recalled, so those totals do not move.
- **Proficient** no longer accepts light recall: a typed or spoken answer after three weeks is the test of fluent and reliable.
- **Expert** asks for three whole answers in six months (was two) and still one after two months away. Sapphire and Diamond are retired; anyone there is simply Expert.
- **Recalled and Memorized** stay as they are today (light allowed), so the Today review engine and the 7-minute day still produce them in the normal rhythm.

Effect on pace: Proficient and Expert are earned by the *whole-answer* check-ins the plan already schedules (the lesson's "Lock it in", and the typed recall inside a review when a verse is under 75%). Reviews at 75% and above are light by design (ADR-003), so a well-known verse reaches Proficient at the next scheduled whole-answer check after 3 weeks. If you want those check-ins to come up for items near Proficient, that is a Today-engine change and is **not** part of this plan; I would raise it separately.

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


---

## Built (2026-11-28)

The engine now has five levels, stored `levels[itemId]` 0 to 5 (Familiar 1, Recalled 2, Memorized 3, Proficient 4, Expert 5), with `levelScale: 2` on every progress record.

- **Rules** (`levels.ts`): as the "How every level is earned" table above, with these exact choices: Familiar is "learned" (all parts through their lesson, so it needs no typing); Recalled and Memorized are the old Amethyst and Topaz rules (light steps count); **Proficient** needs a whole answer (typed or said, right, no hints) after a gap of three weeks or more (light steps no longer count, which the old Carnelian allowed); **Expert** needs three or more right whole answers in the six months, one after two months away (the old Emerald asked for two). Sapphire and Diamond are gone; anything that reached them is Expert.
- **Migration** (`level-scale.ts`): a record without `levelScale` is on the old scale and is moved when read (old 1 to 2, 2 to 3, 3 to 4, 4 to 6 to 5), in `parseProgress`, `mergeProgress` (both sides first, so order never matters) and the stats job. Words in memory are identical before and after (test). A learned item with no level is shown as Familiar at once (`levelShown`) and gets it stored on the next lesson.
- **Keep rules**: windows are 90 days, and 240 at Expert (the 425-day window went with Sapphire; nobody had reached it); "held" and the review clamp start at Recalled, so Familiar items are not "in memory".
- **Awards**: the ids are kept, renamed (First Recalled, First Memorized, First Proficient, First Expert) and mapped to the new levels. They are not shown anywhere for now; stored dates are untouched.
- **Friends' counts**: `heir_stats.stones` takes five (or, from older rows, six) numbers; migration `20261205000000_heir_five_levels.sql` (applied). `foldStones` reads either.
- **Today engine**: `dayplan`, `planner`, `lesson` and the FSRS fixtures (`fsrs`, `grade`, `lesson`, `memory`, `words`) are unchanged by this work; only `journeys.json` and `small.json` changed (they carry levels).
- **Not done**: the proof ledger and "model plus proof" levels of ADR-006 (Phase 2 there), and the Dart port.

**Order of release matters.** The web app moves saved progress to the new scale when it reads it and writes it back with `levelScale: 2`. An app build that still has the six-stone engine would read those levels as the old stones (every level one too high). The Mac session must ship the matching engine (`level-scale`, `levels`, `keep`, `measures`, `stats`) before that build reads synced progress.
