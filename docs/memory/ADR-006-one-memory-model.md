# ADR-006: one memory model, and levels built on it (plan and assessment)

Status: **proposed, 2026-11-27.** Replaces the rules-ladder plan in ADR-005 §2 if accepted. ADR-005's decisions still stand: five levels (Familiar, Recalled, Memorized, Proficient, Expert), awards removed for now with stored dates kept, Familiar a very low bar, Proficient and Expert leaning on whole (typed or spoken) answers.

---

## 1. Where the code actually is (what I found)

`src/heir/memory.ts` already says "everything that asks *how well is this remembered?* asks here" (ADR-001). That intent was half carried out:

| Question | Answered by | Reads |
|---|---|---|
| When does it come back on Today? | per-item FSRS card (`p.cards`), `finishSession` | `type`, `say`, `letters` answers |
| How strong is it? Is it still "in memory"? | per-line FSRS replay (`partMemories`), calibrated | `type`, `say`, `letters` answers |
| What stone is it? | rules replaying the log (`levelFromLog`) | every answer, with light-step weights |
| Which words are weak? | miss counts (`wordCards`) | `missed` positions |

So there are already two FSRS models (per item, per line), a rules engine and a counter, each reading the log its own way.

**A real bug this causes, confirmed by running it.** Since ADR-003, reviews of a well-known item (85% or more) are light: spot the wrong word, then fill in the blanks. Neither FSRS model counts those kinds. So a light review **does not strengthen anything**: stability and last-review stay the same. Under the newer grading the item's due date is pushed 12 hours, otherwise not at all, so the item comes back the next day and the next, light each time, until its chance sinks under 85%, when it gets a first-letters step and finally moves. Meanwhile the stone rules *do* count those light reviews. The model and the stones disagree about the same answers. Practical effect: strong verses get reviewed several days in a row instead of being spaced out, and their strength % keeps falling while you review them.

This is the clearest argument for this ADR: one place must decide what an answer means.

---

## 2. The architecture

Four layers. Each layer only reads the one below it.

```
  Screens (Today, Progress, course, question page, friends)
        │  read only the view
  ┌─────▼──────────────────────────────────────────────┐
  │ 3. Policies (pure)                                  │
  │    strength · level (latched) · in memory / review  │
  │    soon · word cards · (later) review due date      │
  └─────▲──────────────────────────────────────────────┘
  ┌─────┴──────────────────────────────────────────────┐
  │ 2. Memory state (pure, versioned)                   │
  │    per line: FSRS {s, d, last, reps, lapses}        │
  │    per line: proof ledger (monotone)                │
  │    (later) per word: accuracy                       │
  └─────▲──────────────────────────────────────────────┘
  ┌─────┴──────────────────────────────────────────────┐
  │ 1. Observations: what each answer means (pure)      │
  │    kind → cue level, outcome, words tested/missed   │
  └─────▲──────────────────────────────────────────────┘
  ┌─────┴──────────────────────────────────────────────┐
  │ 0. Answer log (append-only) + snapshot of trimmed   │
  └────────────────────────────────────────────────────┘
```

### Layer 0: the answer log (exists)

The permanent record. Kept as is: up to 1,500 answers on the phone, older ones folded into a snapshot. Two small additions:
- every answer that can know it records **which word positions were tested** (blanks, letters, typed) and **which were missed** (`missed` exists; `tested` is new), so the word model later has real data;
- every answer is stamped with the model version that judged it (`mv` exists for predictions; extend to all).

### Layer 1: observations (new, small)

One pure function, `observe(entry)`, is the only code that interprets an answer. Every other part of the app reads observations, never raw answers.

```
Observation = { part, at, day, kind,
                cue: 'none' | 'letters' | 'blanks' | 'next' | 'order' | 'spot' | 'match',
                outcome: 'miss' | 'slip' | 'right',   // first try, per the strict grading
                weight: 0..1,                         // how much it shows (the ADR-003 weights)
                tested?: number[], missed?: number[] }
```

The weights move here from `levels.ts`: whole answer 1.0, letters 0.9, blanks 0.75, next 0.6, order 0.5, spot 0.5, match 0.4. Easy kinds must be right first time. This removes the duplicate interpretations in `progress.ts` (`RECALL_KINDS`), `memory.ts` (`RECALL`), `levels.ts` (`LIGHT_WEIGHT`, `lightPass`) and `item-stats.ts`.

### Layer 2: memory state (one model)

**Per line, FSRS, fed by every observation.** The fix for the bug in §1, done properly:
- whole answer: as now (good / hard / again by the strict grading);
- light step, right: a **damped success**. Compute FSRS's "hard" update, then move stability only `weight` of the way there: `s' = s + weight × (s_hard − s)`. A match (0.4) nudges; first letters (0.9) almost counts in full. The last-review date moves, so the next review is spaced from today;
- light step, missed (not put right in the session): `again`. Forgetting shown by an easy step is strong evidence;
- one update per line per day (as now), the strongest evidence of the day wins.

All deterministic, no randomness, so web and Mac agree to the last digit (both are IEEE doubles; fixtures check it).

**Per line, a proof ledger**: the facts levels need, kept as values that only ever grow, so two phones can merge them in any order and get the same answer:

```
Proof = { firstLearned, firstNextDay,           // earliest dates (merge: min)
          daysRight: count of distinct days with a counting success (merge: from log replay; snapshot holds the count to asOf)
          wholeRight: count of right whole answers
          longestWholeGap: biggest gap (days) before a right whole answer (merge: max)
          lastWholeMiss: date (merge: max)
          kindsRight: set of light kinds passed  (merge: union) }
```

Snapshots carry both the FSRS values and the ledger, so trimming old answers never forgets a proof.

**Item = its lines.** An item's chance is its weakest line (as now). Its proof is the weakest line's proof (every line must have earned it).

### Layer 3: policies (pure, small, each in one file)

- **Strength %**: calibrated chance of the weakest line (as now).
- **In memory / review soon**: from the same state (as now, `outAt`, `strongUntil`).
- **Level**: a milestone needs **both** a model condition (the memory really lasts that long) **and** proof (you actually showed it). Then it is **latched**: stored with the date and the answer that earned it, and never lowered. Slipping is shown by strength and "review soon", not by losing a level.

| Level | Model condition (every line) | Proof (every line) |
|---|---|---|
| 1 Familiar | none | the lesson was finished (very low bar) |
| 2 Recalled | stability ≥ 2 days | a success (any step, weight ≥ 0.5) on a later day than the lesson; typed in full at its lesson |
| 3 Memorized | stability ≥ 10 days | successes on 3 distinct days; at least 2 kinds of step, or a later whole answer |
| 4 Proficient | stability ≥ 45 days | a **right whole answer** after ≥ 21 days away, and no whole-answer miss since |
| 5 Expert | stability ≥ 180 days | **3 right whole answers** across ≥ 6 months, one after ≥ 60 days away, **no whole-answer miss in the last 6 months** |

Why both. A model alone can be fooled by an easy streak (several matches in a row inflate stability a little) and its numbers shift whenever it is tuned. Proof alone is the rules ladder, blind to how strong the memory is. Requiring both means a level is earned by a real performance *and* a memory that the model expects to last. The thresholds are in raw stability days and pinned to the model version, so calibration (which only changes the shown %) can never move a level.

- **Why this level / what's next**: because each latched level stores its proof answer, the question page can say "Gold since 4 March: typed it right after 5 weeks away" and "Diamond: needs 2 more months and one more right answer after a long gap".

### The view (one door for every screen)

`memoryView(p, items, track, now)` builds layer 2 once and returns everything a screen needs: `{strength, level, levelSince, levelProof, next, keep, words}` per item, plus totals. Screens import this and nothing below it. A lint rule (`no-restricted-imports`) makes it so: screens cannot import the log, FSRS or the rules directly; `dayplan.ts`, `planner.ts` and `lesson.ts` cannot import levels.

---

## 3. What stays exactly the same (the Today guarantee)

- The per-item review schedule (`p.cards`) and everything that reads it: Today's cards, minutes, "When you rise", "When you lie down", the weekly limit, the windows. **Phases 1 to 3 do not touch them.**
- Proof: snapshot the Today engine's output for a set of test accounts and the shared fixtures before the work; after each phase they must be byte-identical.

**One exception, and it's your call:** the bug in §1 lives in the review schedule. Fixing it (Phase 0) does change Today, deliberately: strong verses get spaced out after a light review instead of coming back the next day. I recommend doing it first and on its own, because it is a correctness fix to what ADR-003 meant. If you'd rather keep Today frozen, the model fix in Phase 1 still makes strength %, in-memory and levels correct, and the schedule fix waits.

---

## 4. Phases

| Phase | What | Changes Today? | Size (web) |
|---|---|---|---|
| 0 | Light reviews update the review schedule (damped success, misses as again) | **Yes, a fix** | 1 to 2 days |
| 1 | Observation layer; per-line model fed by all steps; the view; import boundaries | No | 2 to 3 days |
| 2 | Proof ledger in replay and snapshot; five levels from model + proof; latching with proof stored; migration of old stones; awards removed | No | 3 to 4 days |
| 3 | Every screen on the view; friends' five-entry stones (Supabase migration, accepts 6 for one release); delete stone photos | No | 2 days |
| 4 | Mac session: port observations, damped update, ledger, levels, view; Dart fixtures pass | No | their side, about a week |
| later | Review schedule read from the line model (one model in full) | Yes, own decision | separate ADR |
| later | Word-level model inside layer 2, once `tested`/`missed` data has built up | No | 1 to 2 weeks |

Rollout of each phase: shadow first. The new model and levels are computed next to the old for the owner's account and logged side by side; you see a page of "old said / new says" before anything switches. Then owner-only (the existing `keepRules` flag pattern), then everyone.

**Migration of levels.** Old stones map up or across (Amethyst → Recalled, Topaz → Memorized, Carnelian → Proficient, Emerald and above → Expert) and are latched with "earned before the new levels" as the proof, because trimmed answers can't be replayed. Nobody goes down. Then the new rules can only raise them. `levelScale: 2` on the record; merges normalise both sides first.

---

## 5. Architect's assessment

| Quality | Today | After this plan |
|---|---|---|
| Cohesion | "what does an answer mean" decided in 4 places, already disagreeing (the bug) | decided once, in `observe` |
| Coupling | screens read the log, FSRS and rules directly | screens read one view; boundaries enforced by lint |
| Correctness | light reviews don't strengthen memory | they do, in proportion to what they show |
| Durability | log plus snapshot (good); stones latched (good) | same, plus the proof ledger in the snapshot; monotone fields merge safely across phones in any order |
| Versioning | predictions stamped | model, observations and levels all stamped; thresholds pinned to the version |
| Scalability | replay of ≤1,500 answers per person, done in several places per screen | done once per screen; cost grows with a person's answers, not with users; server stats job uses the same code |
| Explainability | rules are explainable; strength % is not tied to them | each level shows the answer that earned it and what's next |
| Changeability | each tweak is a new rule and a migration | tune weights or thresholds in one table; swap line-level for word-level behind the view |
| Parity web/Mac | fixtures per engine file | one fixture set for observations → state → view |
| Testability | many unit tests | plus property tests: replay order doesn't matter; snapshot + tail = full replay; merge is order-free and repeatable; levels never fall |

### Risks, honestly

1. **FSRS defaults were fitted on flashcards, not reciting verses.** Stability numbers for long answers may run long or short. Mitigation: levels need proof as well, so a wrong stability can delay a level but never grant one on its own; calibration already exists for the shown %; the thresholds are a table we can re-fit once a few months of data exist.
2. **The damped light update is my design, not published FSRS.** It is principled (weaker evidence moves memory less) but untested on real people. Mitigation: shadow mode, and the predictions stamped on every answer let us measure it (log loss) against the current model before switching.
3. **Two AI sessions changing one core.** A deeper core is harder to keep in step across web and Mac. Mitigation: one fixture set at the view boundary; the Mac session ports only after the web fixtures are final; nothing ships to the App Store without them passing.
4. **"Why not Gold?" moments.** A person types it right after a month and the model still says stability 30 days, short of 45. Mitigation: the question page says exactly what's missing ("about 2 more weeks of holding"), and the thresholds are set so a right whole answer after 3 weeks usually crosses them.
5. **Scope.** This is a refactor of the core, roughly 8 to 11 days of web work plus the Mac port, against 3 to 4 for the rules ladder.

### Would I go?

**Yes. I would build it, in the phases above, and not all at once.**

- It finishes an architecture the app already chose (ADR-001: "everything asks here") rather than starting a new one; about half of layer 2 exists and is tested.
- The bug in §1 shows the cost of the current split is not theoretical: it is making strong verses come back daily today.
- The rules ladder would add a fifth interpretation of the same answers and lock levels to hand-picked numbers that can't learn.
- It is the only one of the three options that leads cleanly to the word-by-word model, which is where the product's best feedback comes from.

**Conditions I'd hold myself to**:
- Phase 0 first and alone, verified on your account for a few days.
- Shadow mode before every switch. If the new levels disagree with the old stones for more than about 1 item in 10 without a reason I can explain, or the new model predicts worse than the current one, I stop and report rather than ship.
- The Today engine snapshot stays identical through phases 1 to 3.
- Word-level stays out until the data for it exists.

**What would make me say no:** if you need the five levels shipped this week. Then the ADR-005 rules ladder is the right short-term move, built behind the same view so it can be swapped for this later. I'd still do Phase 0 regardless.
