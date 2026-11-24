-- Heir: two things to keep so the model and the app can keep improving. Safe to run more than once.
--
-- 1. Which words were missed in an answer: their positions (0-based) in the part's text, never what was typed. With the
--    part and the count already kept, this shows which words and joins trip people up.
-- 2. What happened to each card Today recommended: shown, opened, finished (with its seconds). "Skipped" is a card that
--    was shown but never finished. Append-only, one row per card per event.

alter table public.heir_answers add column if not exists missed smallint[]
  check (missed is null or (cardinality(missed) <= 60 and 0 <= all (missed) and 400 > all (missed)));

create table if not exists public.heir_events (
  member_id    uuid not null references public.heir_members (id) on delete cascade,
  card_id      text not null check (length(card_id) <= 60),
  event        text not null check (event in ('shown', 'started', 'finished')),
  household_id uuid not null references public.heir_households (id) on delete cascade,
  day          date not null,
  course       text not null check (length(course) <= 40),
  kind         text not null check (kind in ('lesson', 'review', 'fix')),
  secs         integer check (secs is null or (secs >= 0 and secs <= 86400)),
  received_at  timestamptz not null default now(),
  primary key (member_id, card_id, event)
);
create index if not exists heir_events_household_day on public.heir_events (household_id, day);

alter table public.heir_events enable row level security;

drop policy if exists heir_events_read on public.heir_events;
create policy heir_events_read on public.heir_events for select to authenticated
  using (exists (select 1 from public.heir_households h where h.id = household_id and h.owner_id = (select auth.uid())));

drop policy if exists heir_events_add on public.heir_events;
create policy heir_events_add on public.heir_events for insert to authenticated
  with check (
    exists (select 1 from public.heir_households h where h.id = household_id and h.owner_id = (select auth.uid()))
    and exists (select 1 from public.heir_members m where m.id = member_id and m.household_id = heir_events.household_id)
  );

revoke all on public.heir_events from anon, authenticated;
grant select, insert on public.heir_events to authenticated;
