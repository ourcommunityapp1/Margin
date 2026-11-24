# ADR-0004: One progress format, shared by the website and the app

- **Status:** Accepted

## Context

Progress is one JSON object per family member: `MemberProgress` in `src/heir/progress.ts`. It is saved in
`heir_progress.data` and merged by `mergeProgress()`.

It holds:
- units learned and checkpoints;
- FSRS cards per item;
- the answer log (the newest 1,500);
- stones, awards, days kept;
- the night recall;
- related verses and explanations;
- the keep record;
- today's plan;
- the part-memory snapshot.

Each answer is also sent as its own row to `heir_answers`; each Today card event goes to `heir_events`.

## Decision

- **The app uses exactly this format,** field for field, including the optional fields. `parseProgress` and
  `mergeProgress` are ported and covered by fixtures (ADR-0003).
- **Same answer ids and rules for `heir_answers`.** The app sends answers the same way: same columns, ignore duplicates,
  and a "last sent" mark per person.
- **Same card events** go to `heir_events`.
- **On the phone,** the household and progress are kept as JSON files (the same shape as the website's
  `heir-household-v1` and `heir-progress-v1`). The sign-in session goes in secure storage.

## Consequences

- **Nothing to migrate.** Anyone can switch between the website and the app at any time; merging is the same code.
- **New fields need care.** A new field must be optional, and added to both parsers in the same change.
