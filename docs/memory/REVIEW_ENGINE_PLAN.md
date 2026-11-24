# The review engine: plan

**Goal:** you tell Katekize what you want to know by heart and do the day's lesson. The app decides everything else
(what comes back, when, in what form, and how much) so that the most words stay in memory for the fewest minutes.

## The idea in one sentence

For every part of everything you've learned, the app keeps one live number, **the chance you'd recall it right now**.
Every decision (what's in today's lesson, what's optional extra practice, what counts as "in memory") is read from
that number.

## 1. The memory model (the "brain")

- **Core: FSRS.** This is the open-source memory model behind Anki. It tracks three things per memory:
  - **difficulty:** how hard this item is for you;
  - **stability:** how many days until your recall chance falls to 90%;
  - **retrievability:** the chance right now.
  It's small, explainable and runs on the phone. We use FSRS today (ts-fsrs v6, default settings, one card per item).
  On public benchmarks neural sequence models (RWKV, LSTM/GRU) predict recall better, and FSRS-7 narrows the gap. They
  need a lot of data, so we start with FSRS and graduate when our own data shows a gain (phase 4).
- **Track parts, not just items.** Long answers fail at one line or at the join between two lines. Each part gets its
  own memory, and so does the whole item, so practice can target the weak line instead of re-running the whole passage.
- **Grade by how well, not just right or wrong.** Today a recall is graded Forgot / Shaky / Solid / Effortless from
  misses and hints. Add two more signals:
  - share of words right;
  - speed: a fluent recall is stronger evidence than a slow, effortful one.
  These are the signals the research says predict forgetting.
- **Know new material before you've seen it (content-aware priors).** A 6-word verse and a 90-word catechism answer
  aren't equally hard. Predict a new item's starting difficulty from:
  - its length and kind (verse, catechism, creed);
  - uncommon words;
  - how similar it is to things you already know (similar verses interfere);
  - how everyone else did on it (the server already holds every answer).
  This follows Duolingo's half-life regression and the KAR³L work, which add content to the model.
- **Learn each person.** Start everyone on settings fitted to Katekize's own data: memorizing word-for-word text isn't
  like flashcards. Once someone has enough history (a few hundred recalls), the nightly server job fits their own
  settings.
- **Check it's right.** Log the predicted chance next to every real answer. A model is only smart if, of the recalls it
  gives a 90% chance, about 90% come back right. That calibration is the number we watch.

## 2. What "optimized" means

- **A target:** keep each item at about a 90% chance of recall. Lower means fewer reviews but more forgetting. FSRS's
  simulator can find each person's best trade-off (workload vs. what's kept), and we'd cap it between 85% and 92%.
- **A budget:** about 6 minutes a day (5–8). When more is waiting than fits, choose by **memory saved per second**:
  the items about to slip that are worth the most words, done in the form that takes least time. Late isn't failure. A
  right recall after a longer gap strengthens memory more (a "desirable difficulty").
- **A brake on new material:** only bring in something new when the projected review load for the coming weeks still
  fits the budget. This prevents the review pile-up that makes people quit.

## 3. The daily lesson (the "coach"): you just tap Start

In order, until the time is used:

1. **Fix-ups:** anything missed yesterday, first and short.
2. **Due reviews:**
   - Strong items come back as a whole recall: the whole verse or answer, unaided.
   - Items with one weak part come back as that part and its neighbours.
   - The form adapts to the live number. When recall is likely, ask for the whole thing with no help. When it's shaky,
     start with a light cue (first letters) and fade it.
3. **New material,** if the brake allows: learn it, then its first real recall after a night's sleep (as now).

**Inside the lesson:**
- Anything missed comes back a few steps later until it's right once (successive relearning). That counts as fixed,
  but doesn't grow its strength.
- Items are mixed across courses (interleaving).
- Look-alike verses are kept apart, except when telling them apart is the point.

## 4. Extra practice (optional, recommended, skippable)

After the lesson: **"Extra: 3 minutes on the 4 most likely to slip this week."**
- Never required, and never affects the streak.
- It picks low-chance items that aren't due yet. It never picks ones you just did: reviewing something you already know
  well barely helps (the spacing effect).
- Later, a **"before Sunday"** mode can lift chosen items for a recitation date.

## 5. What people see (simple on top)

- **Stones stay milestones:** proof over months that it's in long-term memory. They never go down.
- **Strength is live:** each item shows "strong until about March". That's the date its chance falls below the target.
- **"In memory" comes from the model, not fixed windows.** An item counts while your last whole recall was right and its
  chance hasn't dropped below a floor (for example 70%). A miss gives you until the end of the next day to fix it (as
  now). Strong items naturally get long windows and new ones short. This one rule replaces 90 / 240 / 425 days.

## 6. Phases

| Phase | What | Why first |
|---|---|---|
| 1. Foundation | Part-level memory, accuracy and speed grading, a time-budgeted 5–8 minute lesson, optional extra practice, calibration logging | Biggest effect on daily experience; builds the data everything else needs |
| 2. Smarter start | Settings fitted to Katekize's own answers; content-aware difficulty for new items; the new-material brake | Fixes cold start and review pile-ups |
| 3. Personal | Per-person settings and retention target; "in memory" read from the model | Needs a few hundred recalls per person |
| 4. Research | Try a sequence model (FSRS-7 or neural) against FSRS on our data; A/B test what's still recalled at 30 / 90 / 365 days | Only worth it once data volume shows a gain |

**The one number we optimize:** words still recalled right after 30, 90 and 365 days, per minute spent.

## Research behind it

- Spacing effect and optimal gaps: Cepeda et al. 2006, 2008.
- Retrieval practice (testing effect): Roediger & Karpicke 2006.
- Successive relearning: Rawson & Dunlosky 2011, 2022.
- Desirable difficulties: Bjork 1994.
- Sleep consolidation: Diekelmann & Born 2010.
- Permastore: Bahrick 1984.
- FSRS and the open spaced-repetition benchmark: open-spaced-repetition/srs-benchmark.
- Optimal retention: fsrs4anki wiki, "The optimal retention".
- Half-life regression: Settles & Meeder 2016 (Duolingo).
- Content-aware scheduling: Shu et al. 2024, KAR³L (arXiv 2402.12291).
