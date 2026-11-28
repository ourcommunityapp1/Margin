# ADR-001: The review engine

- **Status:** Proposed
- **Date:** 2026-11-24
- **Plan it builds:** [REVIEW_ENGINE_PLAN.md](./REVIEW_ENGINE_PLAN.md)

---

## Part 1. Evaluating the plan

### What holds up

- **One live number per memory** (the chance of recall now) driving every decision is the right core. It is what FSRS
  models, it is what the research measures, and it lets "what next", extra practice and "in memory" share one source
  of truth.
- **A daily time budget with a brake on new material** is what keeps people from drowning in reviews, the most
  common reason spaced-repetition users quit.
- **Making extra practice optional** keeps the core promise: do the lesson and you're optimized.

### What the plan got wrong or left out (found in the code)

1. **Reviews only come from the current course.** `planNext` builds its at-risk list from the current course's items
   only, and a household has one plan (`household.plan.course`). Switch from Psalm 23 to the Shorter Catechism and Psalm
   23 never comes back in a lesson again (only through the keep picker). The plan's promise, "tell it what you want to
   memorize", needs **one schedule across everything you've learned**, with the course only deciding what's *new*.
2. **Two different forgetting curves.**
   - The installed ts-fsrs 6.0 schedules with FSRS-6 (21 settings, curve decay 0.1542).
   - The planner's `recallChance` uses the older FSRS-4.5 curve (decay 0.5).
   - Both agree at the scheduled day, but for overdue items the planner says the chance is lower than the scheduler
     does. Ten "stabilities" late, it says 55% where FSRS-6 says 69%.
   - Fix: one function for the chance, owned by the model.
3. **Schedules can be lost between two phones.**
   - Cards live in the progress JSON and merge by "latest review wins".
   - Two phones reviewing the same item offline: one review's effect on the schedule is dropped.
   - The phone's log is trimmed to 1,500 answers, so it can't rebuild the schedule either.
   - The server's `heir_answers` (every answer, append-only) is the only complete record.
4. **Stored due dates go stale.** If the target chance or a person's settings change, every stored `due` is wrong.
   Store the memory (difficulty, stability, last review) and work the due date out when it's needed.
5. **Whole items and their parts.** A separate memory for "the whole verse" *and* one per part double-counts: one
   recall would grow both. Simpler and truer: **memories per part only**. A whole recall is just every part recalled in
   one go; the chance of the whole is the lowest chance among its parts. A failure at the join between two lines shows up
   as a miss at the start of the next part, so joins need no memory of their own.
6. **Speed is noisy as evidence.**
   - Typing speed varies by person and device, and children type slowly.
   - Spoken answers include the time spent speaking.
   - Speed only helps if measured against *the person's own* typical seconds per word for that kind of answer, and only
     to split Solid from Effortless, never to fail an answer.
7. **Spoken answers carry recognition errors.** A misheard word isn't a memory failure. A spoken answer counts, but a
   lone spoken miss on an otherwise right answer grades Shaky, not Forgot.

### Edge cases the build must handle

| Case | What should happen |
|---|---|
| Back after 3 weeks with 120 items overdue | Today's lesson still fits the budget. Most valuable first: chance falling fastest × words. Tell them "catching up over about 5 days". Late right recalls grow memory *more*, so nothing is punished. |
| Two lessons in one day | Only the **first** graded recall of an item each day moves its memory. Later answers that day are relearning: logged and used for "fixed", not for growth. (Same-day reviews are where FSRS is least accurate.) |
| Missed, then right later in the same lesson | Graded as the miss (first try). Comes back next day as a fix-up (as now). |
| Recalled with first-letter cues | Counts as cued recall: at most Shaky. Never Solid or Effortless. |
| Word bank, matching, spotting a word | Teaches, never moves the schedule (as now). |
| Extra practice on something already strong | Allowed, but FSRS gives almost no growth when the chance is near 100%. Extra practice should only *offer* items below about 85%. |
| Heavy review load forever | The brake must never freeze new material. Bring in at least one new part every 3 lessons unless the person picks "review only". Say so on Today. |
| A new part takes the whole 6 minutes | A long new part may run to 8 minutes. Never cut a learning sequence in half. Next lesson: reviews first. |
| Content edited (a part split or re-chunked) | Part ids must be stable. If a part disappears, carry its memory to the part(s) now covering its words. Failing that, start the new part from the item's memory. |
| Family on one phone, child and adult tracks | Memories are per member and per track part. Population settings are fitted per track (child and adult answers differ). |
| A person's settings are refitted overnight | Items must not flip "out of memory" overnight. "In memory" uses hysteresis, and refits are bounded (see Decision 6). |
| Very few users at first | Population settings only replace FSRS defaults if they predict held-out answers better. Per-person settings only after a few hundred graded recalls *and* only if they beat population settings on that person's newest answers. |
| Children's data | Children's answers may train the shared settings in aggregate only; no child is ever modelled for anyone else to see. Add one line to the privacy page. |
| Leaderboard fairness | "In memory" is computed on the server with the same code and settings version as the phone, stamped in the stats. |

---

## Part 2. Decisions

### 1. Event-sourced memory: the answers are the truth

**Decision:**
- A person's memory state is the result of replaying their graded answers through the model.
- On the server, `heir_answers` (complete) is the source.
- On the phone, a **snapshot** (memory per part, as of a point in time) plus the answers since then.
- Merging two phones becomes a union of answers followed by a replay: deterministic, nothing lost.

**Why:**
- It fixes the lost-schedule problem (finding 3).
- It lets new settings or a new model be re-run over history.
- It makes calibration measurable.

**Cost:**
- Replay must be deterministic, so FSRS fuzz is seeded from the part id and the review time.
- The snapshot is versioned with the settings that made it.

### 2. Memory per part; the whole is derived

**Decision:**
- Store `memory[partKey] = { d, s, last, reps, lapses }`.
- Item-level views (stones, "in memory", picker) take the minimum chance across the item's parts.
- Stones stay computed from the log as now (milestones, never go down).

### 3. One model module, one curve

**Decision:**
- A new `src/heir/memory/` module owns everything about the chance of recall:
  - `recallChance(mem, now, params)`;
  - `grade(results, personBaseline)` to give Again / Hard / Good / Easy;
  - `update(mem, grade, at, params)`;
  - `daysUntil(mem, target, params)`.
- It wraps ts-fsrs FSRS-6.
- The planner, keep rules, stats job and server all call it. The planner's own curve is deleted.

### 4. Grading from accuracy, cues and speed

**Decision:** the first graded recall of a part each day is graded as follows.

| | Rule |
|---|---|
| **Again** | Words missed above the allowance, or recalled with the answer shown. |
| **Hard** | Within the allowance with slips, any cue (first letters, a hint), or a lone spoken miss. |
| **Good** | Every word right, unaided. |
| **Easy** | Every word right, unaided, already reviewed at least twice, **and** faster than the person's own median seconds per word for that kind of answer (needs at least 20 earlier answers of that kind). |

The allowance is today's `allowedMisses`: a slip or two in a long text.

### 5. A global, time-budgeted composer

**Decision:** replace `planNext`'s course-scoped choice with `composeLesson({ people, everything learned, course, budget })`.

1. **Fix-ups:** parts missed since the last lesson.
2. **Due:** parts whose chance is below the target (0.90), from **every** course.
   - Ordered by value per second: (1 − chance) × words ÷ the person's expected seconds for that step.
   - Parts of the same item are grouped into one whole recall when every part is due or nearly due (the chance of the
     whole is below 0.93).
   - Otherwise only the weak part and the line before it are asked.
3. **New:** from the current course, if the brake allows.
4. **Stop** when the budget is used.

Supporting rules:
- **Budget:**
  - The person's minutes per lesson (default 6, range 5–8).
  - Seconds per step come from the person's own `ms` history for that step kind, with defaults until there are
    enough answers.
- **The brake:** a 30-day simulation of reviews using the model. If adding today's new part would push the average daily
  review time above 70% of the budget, hold it (with the at-least-every-3-lessons floor).
- **Cue fading:**
  - Chance below 0.75: start with first letters, then full recall.
  - Above: full recall only.
- **Interleaving:**
  - Never two steps of the same item back to back.
  - Look-alike parts (word overlap above a threshold, worked out when content is built) are kept 3 or more steps apart.
- **Checkpoints, welcome and welcome-back** become special cases of the composer, not separate plans.

### 6. "In memory" from the model, with hysteresis

**Decision:** an item counts as in memory unless:
- its last graded whole recall was wrong and not fixed by the end of the next day (as now), **or**
- the chance of the whole has been below **0.70** on the population settings for 7 days running.

It comes back with one right whole recall. This replaces the 90 / 240 / 425-day windows.

**Why population settings:** the board compares people. A personal refit must never move someone's count by itself.

**Launch grace:** 30 days, as now.

### 7. Settings: default, then population, then person

**Decision:**
- **Phase 1:** FSRS-6 defaults.
- **Phase 2:** population settings per track, fitted weekly on the server from `heir_answers`.
- **Phase 3:** a person's own settings once they have at least 400 graded recalls.
- Each tier is adopted only if it beats the tier below on held-out recent answers (log loss).

**How:**
- Fitting uses the FSRS optimizer (`@open-spaced-repetition/binding`, the Rust optimizer for Node).
- It runs in a Netlify background function, triggered weekly by the existing daily job.
- Settings are stored in a new `heir_model_params` table (scope, version, w[], fitted_at, log loss, n).
- The phone fetches its settings with its progress.

**Fallback:** if the binding won't run on Netlify, run the same fit in a scheduled GitHub Action.

### 8. Measure everything

**Decision:**
- Every graded answer also stores `p_recall` (the chance the model gave just before it) and `model_version` (new
  nullable columns on `heir_answers`).
- A weekly report (server):
  - calibration by bucket;
  - log loss;
  - average lesson minutes;
  - lessons finished;
  - words still recalled right after 30, 90 and 365 days, per minute spent.

### Alternatives considered

- **A neural model (LSTM / GRU / RWKV) now.**
  - These top the open benchmark on prediction.
  - They need far more data than Katekize has, are hard to explain, and are heavy to run on a phone.
  - Revisit in phase 4 with our own data, using the same replay pipeline (Decision 1 makes that a drop-in comparison).
- **Fixed ladders per stone.** Simple, but ignores how hard each verse is for each person. Rejected, per the product
  goal.
- **Keep per-item cards.** Can't target the weak line of a long answer. Rejected.
- **Per-person desired retention now.** Deferred to phase 3. A fixed 0.90 target is a sound default until the
  workload simulator has real data to work with.

---

## Part 3. Technical build plan

| Step | Work | Files | Ship behind |
|---|---|---|---|
| **1. Model module** | `memory/` with the chance, grade, update and days-until functions. Seeded fuzz. Tests against ts-fsrs and the replay. | `src/heir/memory/*.ts`, tests | nothing (pure code) |
| **2. Replay and snapshot** | Build part memories from answers. Phone: snapshot plus tail. Migration: build part memories from today's item cards (each part inherits its item's card) plus the log. Merge becomes union then replay. | `progress.ts`, `sync.ts`, `recover.ts` | owner accounts (labs) |
| **3. Composer** | `composeLesson` replaces `planNext` and `buildLesson`'s due slot. Budget from `ms` history. Brake. Cue fading. Interleaving. Optional extra practice card after the lesson. | `planner.ts` → `composer.ts`, `lesson.ts`, `ui/lesson.tsx`, Today | labs, then everyone |
| **4. Look-alike index** | Word-shingle overlap between parts, computed when content is built, shipped with the content. | `scripts/build-web.mjs`, `content` | – |
| **5. Calibration columns** | Add `p_recall` and `model_version` to `heir_answers`; the phone sends them. Weekly report query. | migration, `answers.ts`, statsjob | – |
| **6. "In memory" from the model** | Rewrite `keep.ts` on the chance of the whole, with hysteresis. Server stats use the same module. | `keep.ts`, `stats.ts`, `statsjob.ts` | labs, then everyone after the 30-day grace |
| **7. Population fit** | `heir_model_params` table. Weekly fit in a background function. Adopt-if-better check. The phone loads its settings. | migration, `netlify/functions`, `cloud.ts` | – |
| **8. Personal fit and retention target** | Per-person fit at 400 or more recalls. Workload simulator to suggest a target between 0.85 and 0.92. | same | phase 3 |
| **9. Research** | Replay `heir_answers` through FSRS-7 or a small GRU offline, and compare log loss. | offline notebook/script | phase 4 |

**Phase 1 = steps 1–5.** Phase 2 = 6–7. Phase 3 = 8. Phase 4 = 9.

### Testing

- **Unit tests** for the grading table, the curve, and the order and budget of the composer.
- **Deterministic replay:**
  - Same answers in any order of arrival give the same memory.
  - Two-phone merge loses nothing.
- **Simulation test:** a synthetic learner with a known forgetting curve runs 180 days through the composer.
  - Assert the lessons stay within budget.
  - Assert the learner's retention stays near the target.
  - Assert new material never freezes.
- **The migration** from item cards to part memories keeps every due item due (no one's reviews vanish).

### Risks

- **Replay cost on the phone** with years of answers. Snapshots bound it; replay only the tail.
- **The native optimizer on Netlify.** Mitigation: the GitHub Action fallback.
- **Behaviour change for current users.** Labs first, then everyone. Keep the 30-day grace for anything that changes
  counts.

---

## Progress

### Built (owner accounts first, 2026-11-24)

**One memory module.** `src/heir/memory.ts` holds everything about how well something is remembered:
- the FSRS-6 curve, used by the planner and the scheduler alike;
- the chance before each answer;
- days until a target;
- each person's own speed;
- the grading table (Decision 4);
- weak parts;
- each person's step time.

**Grading (Decision 4).** `finishSession(..., { grading: 'v2' })`:
- First letters counts as cued recall: at best Shaky.
- A slip within the allowance, a hint, or one misheard spoken word is Shaky.
- Effortless needs a seasoned item *and* a faster pace than your own usual (after 20 answers).

**Calibration (Decision 8).**
- Every recall stores the chance the model gave just before it (`p`) and the model version (`mv`).
- These are sent to `heir_answers.p_recall` and `model_version`. The migration is
  `20261202010000_heir_answers_prediction.sql` (applied).
- The query is in `calibration.sql`.

**Weak parts and cue fading (Decision 5, in part).**
- Reviews ask the parts whose last recall went wrong first.
- A review starts with first letters when the chance is under 75%. Otherwise it asks for the whole thing with no help.

**Reviews fit their time.** A review card's minutes, divided by the person's own step time, sets how many items it
holds (3 to 8).

**Memory per part, rebuilt from the answers (Decisions 1 and 2).**
- `partMemories(log, partSnap)` replays the answers in time order through FSRS, with no fuzz. The same answers always
  give the same memory.
- Only the first graded recall of a part each day moves it.
- When the phone trims old answers (over 1,500), they're folded into `partSnap` first.
- An item is as strong as its weakest part. That sets which reviews come first, the cue a review starts with, and which
  parts are asked: the last wrong, or under 85%.
- The item cards still decide when something is due. The part memories rank and target.

**Lessons fit about six minutes** at the person's own step time (10 to 18 steps).

**Look-alikes are kept apart.** A review never puts two verses or answers that share half their distinctive words
next to each other.

### Built since (2026-11-24, on for everyone)

**Due dates from each line's memory.** An item comes back when its weakest line is due, not only when the whole item is.
A line you missed or haven't recalled for a while brings the item back sooner, but never within 12 hours of the session.

**"In memory" from the model (Decision 6).**
- An item leaves your count when its weakest line has been under 70% for a week: the date that line crosses 70%, plus 7
  days. A miss not put right by the end of the next day still takes it out, as before.
- The server and the phone use the same rule with the **population** correction only, so the board stays fair.
- Items with no line memories yet (older progress) keep the fixed 90 / 240 / 425-day windows until they are recalled.
- **Guard rail:** the model's date is never later than twice the stone's old window after the last recall. FSRS's defaults
  are generous (five recalls over seven weeks reads as a year or more); this stays until the fitted corrections show the
  long windows hold up. Then it can be loosened.
- "Strong until about March" on each item's page: the weakest line falling to 80%, never later than one stone-window after
  the last recall.

**Calibration and fitting (Decision 7).**
- `heir_model_params` holds corrections (two numbers, a and b) fitted by logistic regression with a pull toward "no
  correction". The daily job refits from every answer that carries a prediction.
- A fit is kept only if it predicts the newest 20% of answers better (by at least 0.002 log loss). The population needs
  300 answers; one person needs 400 of their own.
- The population correction decides what is in memory. A person's own only sharpens which reviews come first.
- The stored prediction stays the raw model's, so refitting never chases its own tail. Thresholds are converted back to the
  raw curve, so "70%" and "80%" mean calibrated chances.

**Two phones that trimmed differently.** Snapshots merge per line (each keeps its most recent memory) and each line skips
answers older than its own last review, so nothing is lost or double counted. The only thing not recovered is an answer
older than a line's last review that only the other phone held; the server's full history would recover it.

### Not yet

- **A retention target per person (Decision 8).** The correction above sharpens ranking only; a 0.85 to 0.92 target waits
  for data.
- **A stronger model (Decision 9).** Neural models predict better on the open benchmark but need far more answers than
  Katekize has. The same replay and prediction logging makes it a drop-in comparison once there are enough.
- **Dropping the guard rail**, once the population fit exists.
