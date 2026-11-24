# Katekize Friends: review, product rules and architecture

Status: plan for review, Nov 24 2026. Nothing here is built yet. Mockups: the "Katekize Friends" page.

Version 1 is profiles, friends, one community leaderboard ranked by words in memory, and words that can leave
memory (with grace). Challenges, groups and category boards come later and are not designed for here beyond
leaving room for them.

---

## 1. What's wrong in the current plan

Found by reading the mockups against each other and against the code and database as they are today.
"Blocker" means building v1 as drawn would produce wrong numbers or lose data.

### Data and code (the foundation the plan sits on)

| # | Finding | Severity |
|---|---|---|
| D1 | **The answer log on the phone is cut to the last 1,500 answers** (`recordLesson`, `log.slice(-1500)`). Your account shows 145 answers in 5 days (~29 a day), so a daily user loses everything older than about 50 days on the phone. Stones from Long-term up need 6 months to 3 years of history, and the 90-day rule needs each verse's last recall, which may be older than the kept window. The server copy is merged without the cap, so the phone and the account disagree. | Blocker |
| D2 | **All progress is one JSON blob per person, rewritten on every save.** The log in it grows without limit on the server (about 2–3 MB a year for a daily user) and the whole thing is downloaded and uploaded after every lesson. It also means a server can only compute stats by re-reading the whole blob. | Blocker for server stats |
| D3 | **Everything a leaderboard would rank is written by the phone.** Even if the server computes the numbers, it computes them from a log the phone wrote. Anyone with their own sign-in token can write a fake log. Server computation stops people typing in a number; it doesn't stop a fabricated history. | High |
| D4 | **The `heir_reviews` table exists but is never written**, and its allowed exercise names (`order, meaning, blanks, letters, say, both-ways`) don't include `type` or `intro`, which the app logs. It can't be used as is. | Medium |
| D5 | **Days are worked out in the phone's time zone** (`localDay`). A server computing stones or "end of tomorrow" in UTC will disagree with the phone. | High |
| D6 | **The scheduler can set a review further away than 90 days** (ts-fsrs default maximum is 100 years). With the 90-day rule, the app's own schedule would let a verse leave memory before it ever asks for it. | Blocker for rule 1 |
| D7 | **Removing a person deletes their progress immediately** (foreign keys cascade). With social, it would also wipe their profile's numbers and board place. You hit this once already. | High |
| D8 | **Migrations were applied by hand** in the SQL editor, so the database's migration history doesn't match `supabase/migrations`. Social adds many tables and functions; drift will cause failed or partial deploys. | Medium |
| D9 | **pg_cron, pg_net, pg_trgm and citext aren't installed** (all available). Scheduled recomputes, search and case-insensitive usernames need them. | Setup |
| D10 | **Unknown Supabase plan and backups.** On the free plan there are no daily backups and the project can pause. Social data (friendships, usernames) can't be rebuilt from the phone the way progress can. | High before launch |
| D11 | **Storage.** Moving answers to their own rows (the fix for D1–D3) is ~11,000 rows per active user per year. At 1,000 daily users that's roughly 2 GB a year, over the free plan's 500 MB. | Plan before launch |

### Product rules (the mockups disagree with each other or can't work)

| # | Finding | Fix in this plan |
|---|---|---|
| P1 | "What to rank" still says words in memory "never goes down"; the keeping rules say it can. | §2.6: it can go down; stones can't. |
| P2 | "This month" is defined two ways: words that *started counting* since the 1st (How it's counted) and *net change* since the 1st (keeping section). | Net change. It can be negative. |
| P3 | Recommended windows for the top stones (6 months after Emerald, 1 year after Sapphire) equal the gaps those stones require (182 and 365 days). A verse would have to sit untouched right up to the day it drops, so Enduring and Lifelong become nearly impossible. | Windows of 240 and 425 days (§2.6). |
| P4 | "▲ 3" is described as "since yesterday" in places and "since you last looked" in others. Also, ranks are per person (your community isn't mine), so accepting a friend with 50 friends would show you "▼ 20" though you did nothing. | Movement = since you last opened the board, counting only people who passed you or you passed by words, among your current community (§2.5). |
| P5 | Ties aren't defined, and neither is the board when your community has fewer than 10 people. | §2.5. |
| P6 | Search that matches last names lets a stranger confirm someone's last name, though strangers are only shown a last initial. | Decision D-3 (§3). |
| P7 | The "Review" picker would live at `/heir/review`, which is already the content-review page. | New route `/heir/keep`. |
| P8 | Today's gold "Community" label makes no sense for someone with no friends, yet keeping words applies to everyone. | Label is "Community" when you have a community, "Your memory" otherwise. |
| P9 | A profile belongs to an account, but progress belongs to a *person* in a household, and a household can have several adults (a spouse added as a person, not an account). Nothing says which person the board ranks. | A profile points at one adult person in your household (§4.2). |
| P10 | An earlier mockup had "Show Ireland to my friends". Children are out of v1. | Removed. Children never appear in social anything. |
| P11 | Pending friend requests last forever; "Sent" would show for months. | Requests expire after 30 days. |
| P12 | "Nearly" (up to 2 wrong words) is shown counting for keeping, but stones today require every word right. Not decided whether "nearly" earns stones. | Decision D-2: keeping yes, stones no. |
| P13 | Streak grace (one rest day a week) is still open, and friends will see streaks. | Decision D-5. |
| P14 | Content isn't final (0 of 140 items approved). Approving or editing an item changes its word count, which changes everyone's number and order. | Content version stamp; recompute on change (§5.6). |
| P15 | No account deletion and no privacy policy covering public names, usernames and search. | Required before public launch (§9). |
| P16 | The animation needs to know where the other rows were before, not just your old rank. | The board function returns each row's previous place (§4.6). |

---

## 2. Product rules for v1 (final, pending the decisions in §3)

### 2.1 Profiles
- One profile per account, opt-in from You › Your profile. It points at one **adult** person in your household
  (normally you; picked once, changeable). Children never have profiles.
- Fields: first name, last name (both required, 1–40 characters), username, city and state (optional), and two
  switches: **Let people find me** (search) and **Friends of friends see my rank** (community board). Both default on
  when you create a profile.
- **Names:** friends see first and last name. Everyone else, including friends of friends on the board, sees first name
  and last initial ("Sarah K."). Enforced by the database, not the app (§4.4).
- **Usernames:** unique regardless of capitals; 3–20 characters `a–z 0–9 _`; must start with a letter; a reserved
  list (admin, katekize, support, …) and a small blocked-words list; changeable once every 30 days. Checked as you type.
- Creating a profile asks you to confirm you're 13 or older.

### 2.2 Search
- Searches discoverable profiles by username, first name, and first + last name (see D-3), ranked: friends of friends
  first, then exact username, then name. Max 20 results. Never returns blocked people (either direction) or yourself.
- Limited to 30 searches a minute per account (stops scraping).

### 2.3 Friend requests and friends
- Send from search, a profile, or the community board. Accept or "Not now" (silent decline). If you've both sent one,
  it becomes a friendship at once.
- After "Not now", the sender can't ask again for 30 days. Pending requests expire after 30 days. Max 30 requests sent
  a day, max 500 friends.
- Remove friend: silent, from the friend's profile menu. Block: also removes friendship and requests both ways, hides
  each from the other everywhere (search, board, profiles). Report: name, username or abuse; goes to you to review.
- Invite link (for people not on Katekize): single use, 7 days, makes a friendship when accepted. Reuses the existing
  invite mechanism with a new kind.
- Your existing linked account (spouse) is offered as a friend once; the link itself is unchanged.

### 2.4 What friends see
Friend profile: full name, username, city, friends since (month year), words in memory, streak, the six stone counts,
courses with progress, and their friends list. Never answers, mistakes, timings or children.

### 2.5 The community board
- **Community** = you, your friends, and their friends who allow it ("Friends of friends see my rank"), minus anyone
  blocked either way. It's different for every person, so ranks are always "in your community".
- **Two views:** *All time* = words in memory now. *This month* = net change in words in memory since the 1st (your
  own time zone), which can be negative.
- **Ties:** same number = same place (1, 2, 2, 4). Within a tie, whoever reached the number first is listed first.
- **Which rows show (the full board, "View leaderboard"):**
  - community of 10 or fewer: everyone;
  - you're 7th or higher: the top 10;
  - otherwise: the top 3, a gap, then the 3 above you, you, and the 3 below (fewer at the bottom of the board).
- **Second line on each row:** friend → "Friend since Mar 2026"; friend of a friend → "Sarah's friend" (one mutual
  friend, picked consistently: the friend you've been friends with longest); you → your movement ("▲ 3") or nothing.
- **Movement:** compared with the last time you opened the board. Counted only from words changing: how many people
  in your *current* community you passed, minus how many passed you. Joining or leaving friendships never shows as
  movement. Shown as ▲ n (green) or ▼ n (coral).
- **Alerts:** if your place changed (either way) or you moved into or out of the top 10 since you last opened the
  board, Progress gets a gold dot and the preview shows the arrow. Both clear when you open the board.
- **Progress preview (top of Progress):** the top 3, then your row if you're below 3rd; just the top 3 if you're in
  it. Then "View leaderboard" (rounded-square button, same style as Start lesson). With nobody else in your community:
  the empty state with Find friends and Invite someone.
- **Animation:** on opening the board, rows start at their previous places and move to the current ones in one
  ~1-second ease; then your arrow fades in. Rows that came from outside the window slide in from the edge. Off with
  "reduce motion".

### 2.6 Keeping words in memory (words can go down)
- **What counts:** a verse, catechism answer or creed line counts once it has its first stone (recalled unaided on a
  later day). That doesn't change.
- **Rule 1, recall it in time:** each needs a correct full recall (typing or saying it all) within its window:
  - 90 days, until it reaches Emerald (Long-term);
  - 240 days at Emerald (Enduring needs a 182-day gap, plus 8 weeks of margin);
  - 425 days at Sapphire and Diamond (Lifelong needs a 365-day gap, plus 8 weeks).
  Today shows it 14 days before the window ends. When the window ends, its words leave your count.
- **Rule 2, wrong? try again tomorrow:** a recall with a hint, or more than the allowed mistakes, keeps the words in
  your count until the end of the next day (your time zone). Right by then: nothing changes. Not: the words leave.
- **Allowed mistakes ("Nearly"):** up to 2 wrong or missing words (1 for items under 12 words), on top of the slips
  grading already forgives. Counts for keeping; does not earn stones (D-2).
- **Coming back:** one correct recall puts the words back; the window starts again.
- **Stones never go down.** A stone whose verse is out of memory shows dimmed.
- **Launch grace:** nothing leaves anyone's count during the first 30 days after this ships.
- **The scheduler respects the rules:** a review is never scheduled later than 14 days before the window ends, and
  after a wrong answer it's due the next day.
- **Milestones and awards** already reached stay reached even if the number drops.

### 2.7 Today and the review picker
- Today, below your course card, at most two cards, in this order: **Try again** (yesterday's misses) and **Review**
  (everything whose window ends within 14 days, across all courses). Label "Community" if you have a community,
  "Your memory" if not.
- Review opens `/heir/keep`: everything due, soonest first, the three soonest ticked, "Review 3". Untouched items stay
  on the card until their date.

---

## 3. Decisions for you

| | Decision | Recommendation |
|---|---|---|
| D-1 | Top-stone windows | 90 / 240 / 425 days as above (or a flat 90 and redefine Enduring and Lifelong) |
| D-2 | Does "Nearly" earn stones? | No. Keeping, yes. Stones keep meaning "word for word". |
| D-3 | Search by last name? | Yes for discoverable profiles (people expect to find "Sarah Kessler"), accepting that a match confirms the last name. Alternative: username and first name only. |
| D-4 | Friends of friends on the board by default | On, with the switch to turn it off. |
| D-5 | Streak rest day | One rest day a week, decided before friends can see streaks. |
| D-6 | Supabase plan | Pro before launch: daily backups, no pausing, 8 GB. |
| D-7 | Minimum age for a profile | 13, confirmed at profile creation. |

---

## 4. Architecture

### 4.1 Overview

```
Phone (Next.js PWA, local-first)
  │  writes: answers (insert-only rows), household, progress blob (transition)
  │  reads: own progress, own stats, board/profile/search through RPC functions
  ▼
Supabase Postgres ─── Row-level security on every table
  │  social tables, answers, stats (stats writable only by the service role)
  │  RPC functions (security definer) shape what each viewer may see
  │  pg_cron every 5 min ──pg_net──▶ POST /api/heir/stats/sweep (shared secret)
  ▼
Next.js route handlers on Netlify (Node, same repo)
  /api/heir/stats/refresh  (caller's JWT)  recompute me, right after a sync
  /api/heir/stats/sweep    (secret)        recompute anyone whose numbers change with time
  Both import the same pure functions the phone uses (src/heir/*.ts): one definition of every number.
```

Why route handlers and not Supabase Edge Functions: the stats need `src/heir` (levels, keeping, word counts) and the
course content. Next route handlers run that TypeScript as is; Edge Functions would need a Deno port and a second
deploy. The service-role key lives only in Netlify's environment (`HEIR_SUPABASE_SERVICE_KEY`, never `NEXT_PUBLIC`).
Netlify functions time out after ~10–26 s, so the sweep works in batches of 50.

### 4.2 Data model

All tables in `public`, RLS on, `anon` revoked. "Fn only" means no insert/update/delete policy: changes happen only
through the security-definer functions in §4.4.

**heir_answers** (new; replaces the unused `heir_reviews`) — one row per answer, append-only.
| column | type | notes |
|---|---|---|
| id | uuid pk | generated on the phone; makes uploads idempotent |
| household_id, member_id | uuid | FK; member must be in household (policy check) |
| item_id | text | |
| kind | text | one of `StepKind`: `intro, order, meaning, blanks, letters, say, type, next, match, spot, info, quiz, verse` |
| correct | bool | right first time |
| misses | smallint null | wrong or missing words in a full recall; null for older answers |
| hints | smallint | |
| ms | int | |
| review | bool | |
| session_at | timestamptz | the lesson's time (the log's `at`) |
| local_day | date | the phone's local day at the time; avoids time-zone guessing later |
| received_at | timestamptz | `default now()`; server clock, for plausibility |
Indexes: `(member_id, item_id, session_at)`, `(member_id, received_at)`. Policies: owner may select and insert; no
update or delete (account deletion cascades). Unique `id`; insert uses `on conflict do nothing`.

**heir_profiles**
| column | type | notes |
|---|---|---|
| user_id | uuid pk → auth.users on delete cascade | |
| member_id | uuid null → heir_members on delete set null | must be an adult in the user's own household (trigger) |
| username | citext unique | check `^[a-z][a-z0-9_]{2,19}$` |
| first_name, last_name | text | 1–40, trimmed |
| city, region | text null | region = state |
| discoverable | bool default true | |
| fof_visible | bool default true | |
| tz | text | IANA zone, updated from the phone on each sync |
| friends_count | int default 0 | kept by the friend functions |
| username_changed_at, created_at, age_confirmed_at | timestamptz | |
Select: own row only. Everyone else reads profiles only through functions.

**heir_friends** — both directions stored, like `heir_links`. `(user_id, friend_id)` pk, `created_at`; check
`user_id <> friend_id`; index `(friend_id)`. Select own rows. Fn only.

**heir_friend_requests** — `id, from_user, to_user, status (pending|accepted|declined|cancelled|expired),
created_at, decided_at`. Unique pending per unordered pair (partial index on `least(), greatest()` where pending).
Select where you're either side. Fn only.

**heir_blocks** — `(blocker, blocked)` pk, `created_at`. Select own. Fn only.

**heir_reports** — `id, reporter, reported, reason (name|username|abuse|other), note, status, created_at`. Insert
own; select none (you review in the dashboard).

**heir_stats** — one row per profile; written only by the service role.
`user_id pk, member_id, words_kept, words_peak, stones int[6], streak, best_streak, last_day date, courses jsonb
([{course, learned, total}]), try_again int, review_due_words int, review_due_by date, out_count int,
next_change_at timestamptz, content_version text, suspicious bool, computed_at`.

**heir_words_history** — `(user_id, at)` pk, `words int`. A row only when words_kept changes. Gives "words at any
time" for month baselines and movement. Index `(user_id, at desc)`.

**heir_board_seen** — `(user_id, period)` pk, `seen_at`, `rank`. Written when you open the board.

**heir_stats_queue** — `user_id pk, reason, queued_at`. Filled by a trigger on `heir_answers` insert and on
friendship changes; drained by the sweep.

**heir_invites** (existing) — add `kind text default 'link'` (`link` = spouse link, `friend`) and `uses_left`.

**heir_members** (existing) — add `deleted_at timestamptz`; removing a person sets it instead of deleting. A daily job
hard-deletes after 30 days. Fixes D7 and makes "Bring back a removed person" work across devices.

### 4.3 Who can read what (enforced in the database)

| Data | Anyone signed in | Friend of friend | Friend | You |
|---|---|---|---|---|
| Username, first name, last initial, city, friend count | if discoverable | yes | yes | yes |
| Last name | no | no | yes | yes |
| Words in memory, rank on board | no | if fof_visible | yes | yes |
| Streak, stones, courses, friends list | no | no | yes | yes |
| Answers, progress, family | no | no | no | yes |

Blocked people get nothing in any column.

### 4.4 Database functions (security definer, `set search_path = public`, execute granted to `authenticated` only)

- `heir_profile_save(first, last, username, city, region, discoverable, fof_visible, member_id)` → validates,
  enforces the username rules and the 30-day change limit.
- `heir_username_free(name)` → bool, for the as-you-type check (rate-limited).
- `heir_search(q)` → `username, first_name, last_initial, city, region, friends_count, mutual_count, relation`.
  Uses `pg_trgm` indexes on username and names.
- `heir_profile_view(username)` → shape depends on relationship (§4.3).
- `heir_request_send(to)`, `heir_request_answer(id, accept)`, `heir_request_cancel(id)`, `heir_unfriend(user)`,
  `heir_block(user)`, `heir_unblock(user)`, `heir_report(user, reason, note)`.
- `heir_board(period)` → `{ total, my_rank, my_prev_rank, top10_changed, rows: [{ place, prev_place, name, sub,
  words, is_me, relation, username }] }`, already cut to the window in §2.5.
- `heir_board_status()` → `{ moved, top10_changed }` for the dot, cheap enough for every app open.
- `heir_board_seen_mark(period)`.

Board computation (inside `heir_board`):
1. `community` = me ∪ my friends ∪ (their friends where `fof_visible`) minus blocks, capped at 5,000.
2. `now_words` from `heir_stats`; `then_words` = each member's words at my `seen_at` (from history; for "this month"
   both are net changes from that member's month start).
3. Rank both with `rank() over (order by words desc, reached_at asc)`, using then-values for `prev_place` but
   always the *current* community, so membership changes never look like movement.
4. Pick the window rows; join names according to §4.3.

### 4.5 Computing the numbers

New pure modules, used by both the phone (instant feedback) and the server (the numbers others see):
- `src/heir/keep.ts` — `keepState(item, entries, stone, now, tz)` → `kept | tryAgain(deadline) | reviewSoon(deadline)
  | out`, plus `keptWords(...)`, `nextChange(...)` (the earliest time any item changes state).
- `src/heir/community.ts` — window selection, tie ordering, movement, top-10 crossing. No database.
- `src/heir/stats.ts` — `statsFor(member, answers, content, now, tz)` → the `heir_stats` row.

Server flow:
1. The phone syncs answers, then calls `/api/heir/stats/refresh` (at most once a minute).
2. The route reads the caller's profile member's answers from `heir_answers` (full history), computes stats, writes
   `heir_stats`, appends to `heir_words_history` if words changed, sets `next_change_at`.
3. Every 5 minutes pg_cron calls `/sweep`: drains `heir_stats_queue` and recomputes everyone whose `next_change_at`
   has passed (a window ending, a try-again deadline, midnight for streaks), 50 per call.
4. When the content version changes (any word count changes), a one-off sweep recomputes every profile.

Plausibility (D3): answers with `session_at` more than 10 minutes in the future are rejected; a full recall faster
than ~120 ms a word, or more than 1,000 full recalls in a day, marks `suspicious`. Suspicious profiles keep their
own numbers but drop off other people's boards until you clear them. Server computation plus append-only answers
with server receive times makes faking hard and visible, not impossible; the app grades on the phone.

### 4.6 Phone changes

- **Answers:** `recordLesson` gives each answer an id and `misses`; answers are queued locally and inserted into
  `heir_answers` on sync. The blob keeps a recent window of the log only for offline use.
- **Per-item keep record:** progress gains `keep: { [itemId]: { good?: ISO, miss?: ISO } }`, merged by latest. It
  survives log trimming, so the phone and server agree on rule 1 and 2 even with a short local log (fixes D1 for
  keeping).
- **Stones:** server-computed stones (full history) are merged into `levels` with `max`, so higher stones work
  again for long-time users (fixes D1 for stones).
- **Scheduler clamp:** after scheduling, `due = min(due, lastGood + window − 14 days)`; after a wrong recall, due by
  the end of the next day (D6).
- **Time zone:** sent with each sync; `localDay` stays on the phone.
- **Grading:** typed answers are checked word by word (`wordMatches`) and spoken ones word by word (`gradeSpoken`); record how many words were wrong or missing as `misses`.
- **UI:**
  - Tabs: add Friends (`/heir/friends`) with request count badge; Progress dot from `heir_board_status`.
  - Routes: `/heir/friends`, `/heir/friends/search`, `/heir/friends/requests`, `/heir/u/[username]`,
    `/heir/community`, `/heir/profile`, `/heir/keep`.
  - Progress: board preview on top, words card below (with try-again, review and out counts).
  - Today: the two cards under the course card.
  - You: name and username under the avatar; Your profile row first.
  - Board animation: FLIP from `prev_place` to `place`; reduced motion respected; arrows have spoken labels ("up 3
    places").
- **Offline:** last board, friends and profile responses cached (`heir-social-v1`), shown with "Updated 3 h ago";
  actions that need the network say so plainly.
- **Feature flag:** everything social behind `labs` (owner only) first, then everyone.

---

## 5. Risks and how each is handled

| Risk | What would go wrong | Handling |
|---|---|---|
| Log trimming | Stones and keeping computed differently on phone and server | `heir_answers` full history on the server; per-item keep record on the phone |
| Blob size | Slow syncs, mobile data, large rows | Answers as rows; blob trimmed |
| Double upload / two phones | Duplicate answers inflate counts | Answer ids generated on the phone, `on conflict do nothing` |
| Offline lessons synced days later | Words jump late; movement appears late | Accepted; counted at their real time; month baseline uses history at the 1st |
| Time zones and travel | "End of tomorrow" wrong by hours | Phone stores `local_day` on each answer; server uses profile tz |
| Scheduler beyond window | Words drop while app says nothing is due | Clamp (§4.6) |
| Content edits | Everyone's numbers shift | Content version; full recompute; tell people in What's new |
| Faked logs | Fake leaders | Append-only answers, server receive times, plausibility flags, report |
| Community changes | Fake ▲/▼ after accepting a friend | Movement computed within the current community only |
| Large communities | Slow board | Cap 5,000; indexes on friends; measure at 5k synthetic users; materialize later if needed |
| Names exposed | Strangers learn full names | Last name only via functions to friends; tested |
| Username squatting or abuse | Impersonation, slurs | Reserved and blocked lists, 30-day change limit, report |
| Removing a person | Social numbers vanish; old data loss bug | Soft delete with 30-day window; profile member set to null with a prompt |
| Request spam | Harassment | Daily cap, 30-day cooldown, block |
| Supabase free plan | Pausing, no backups, storage limit | Pro plan (D-6) |
| Migration drift | Failed deploys | Reconcile history with the Supabase CLI before the first social migration |
| Free-text names | Offensive names | Blocked-word check on save; report |
| Account deletion | Orphans or privacy complaints | All social tables cascade from `auth.users`; add Delete account |

---

## 6. Build order

**Phase 0, foundations (no visible change):**
1. Reconcile migration history; install pg_trgm, citext, pg_cron, pg_net; Pro plan.
2. `heir_answers`; backfill from every `heir_progress` log (ids derived from member, time, item, kind and position);
   the phone writes answers alongside the blob.
3. Per-item keep record, `misses` from grading, `local_day`, time zone in sync.
4. Soft delete for people.
5. Stats route, `heir_stats`, history, queue, cron sweep; run them quietly and compare with the phone's own numbers
   for a week.

**Phase 1, profiles and friends (labs):** profiles, usernames, search, requests, friends, block, report, invite
links, Friends tab, friend profile, You page changes.

**Phase 2, the board (labs):** `heir_board`, Progress preview, full board, alerts, animation, Friends tab rank card.

**Phase 3, keeping words (labs, then everyone with the 30-day grace):** keep rules on, scheduler clamp, Today cards,
`/heir/keep`, Progress breakdown, dimmed stones, How it's counted text.

**Phase 4, everyone:** privacy policy, Delete account, What's new, remove the labs gate.

---

## 7. Tests

- **Unit (node test, alongside the 73 existing):** keep rules at each boundary (day 75/76/90, window by stone, try
  again across midnight and time zones, nearly counts, launch grace); window selection for every community size and
  rank; ties; movement with and without community changes; name display; username rules; scheduler clamp.
- **Same numbers both sides:** fixtures run through the phone's functions and the stats route must match exactly.
- **Database (run against a Supabase branch):** a stranger can't read a last name; a friend of a friend can't read
  streak or stones; blocked users vanish from search, board and profiles both ways; nobody can write `heir_stats`;
  answers can't be updated or deleted; request limits and cooldowns.
- **End to end (Playwright, two seeded accounts on a branch):** search, request, accept, both boards update, block.
- **Load:** board function with 5,000 synthetic profiles under 300 ms.

---

## 8. What stays the same

Lessons, courses, stones and their rules, the spouse link, local-first use with sync, and children's tracks. Nothing
social is visible to anyone but the owner until Phase 4.

## 9. Before public launch

Privacy policy (names, usernames, search, boards), Delete account, report review routine, Pro plan with backups,
and a message to existing users about words in memory now going up and down.
