# ADR-0003: The engine is rewritten in Dart and proved identical with shared test files

- **Status:** Accepted

## Context

The "brain" is about 3,000 lines of pure TypeScript in `src/heir/`. It has no screens and no network:

| File | What it does |
|---|---|
| `memory.ts` | Chance of recall, grading, memory per line, calibration, look-alikes |
| `grade.ts` | Word matching, voice-typing forgiveness |
| `progress.ts` | Finishing a session, the schedule, merging two copies |
| `planner.ts` | What the next lesson in a course holds |
| `dayplan.ts` | Today's cards |
| `lesson.ts` | Building the steps of a lesson or review |
| `keep.ts` | "In memory", try again, review deadlines |
| `levels.ts` | Stones and awards |
| `stats.ts`, `measures.ts`, `path.ts`, `social.ts`, `board.ts`, `related.ts`, `season.ts` | Smaller pieces |

It uses `ts-fsrs` 6.0.0: FSRS-6, fuzz on, short-term off. The website's tests (146) pin its behaviour.

## Decision

1. **Port each file to Dart** in `app/lib/engine/`.
   - Same names, same rules, same comments.
   - No Flutter imports, so it stays pure and testable on any machine.
2. **Shared test files.**
   - A script (`scripts/export-fixtures.ts`) runs the TypeScript engine on a fixed set of inputs and writes the inputs
     and expected outputs as JSON to `fixtures/engine/`.
   - Dart tests read the same files and must match.
   - The script runs in CI. A change to either engine is only done when both pass.
3. **Randomness is reproducible.**
   - Lessons shuffle with a seeded generator (`seeded()` in `lesson.ts`, a mulberry32-style function). Port it
     bit-for-bit.
   - FSRS fuzz must match `ts-fsrs` exactly for the same review.
4. **FSRS itself.**
   - First try the open-spaced-repetition Dart package if it implements FSRS-6 with the same fuzz.
   - Otherwise port the parts of `ts-fsrs` that Katekize uses: the next state for each grade, the fuzz, and the
     forgetting curve.
   - The fixtures decide which: whichever passes.

## Consequences

- **Both engines can be trusted equally.** A bug fixed in one gets a fixture, so it can't return in the other.
- **Two codebases to keep in step.** The fixtures make drift loud instead of silent.
- **Later option:** run the TypeScript engine inside the app instead of porting it. Rejected for now: it would mean an
  embedded JavaScript runtime, a bridge, and debugging across two languages on a phone.
