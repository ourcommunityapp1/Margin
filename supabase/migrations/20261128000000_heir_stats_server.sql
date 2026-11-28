-- Heir: a history of each person's words in memory, written only by the server's stats job. A point is added when the
-- number changes. The leaderboard's "this month" view needs to know what a number was on the 1st. No one but the server
-- can read or write this table (no policies, no grants). Safe to run more than once.
create table if not exists public.heir_words_history (
  user_id uuid not null references public.heir_profiles (user_id) on delete cascade,
  at      timestamptz not null default now(),
  words   integer not null check (words >= 0),
  primary key (user_id, at)
);
alter table public.heir_words_history enable row level security;
revoke all on public.heir_words_history from anon, authenticated;
