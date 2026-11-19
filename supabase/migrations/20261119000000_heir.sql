-- Heir: a family memorizing Scripture, catechisms and creeds.
--
-- Three tables, all prefixed heir_ so they sit beside other apps' tables in the same project without
-- touching them. A household belongs to one signed-in account (the parent); members are the people
-- memorizing on that account's devices; reviews are every exercise result, for scheduling and levels.
-- Row-level security: an account sees and changes only its own household. Safe to run more than once.

create table if not exists public.heir_households (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  -- { collection, through, minutes } or null before a goal is chosen.
  plan             jsonb,
  active_member_id uuid,
  updated_at       timestamptz not null default now()
);

create table if not exists public.heir_members (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.heir_households (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 40),
  track        text not null default 'adult' check (track in ('adult', 'child')),
  created_at   timestamptz not null default now()
);

create index if not exists heir_members_household on public.heir_members (household_id);

-- One row per exercise answered. Scheduling (FSRS) and levels are worked out from this log.
create table if not exists public.heir_reviews (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.heir_households (id) on delete cascade,
  member_id    uuid not null references public.heir_members (id) on delete cascade,
  item_id      text not null,
  chunk        integer,
  exercise     text not null check (exercise in ('order', 'meaning', 'blanks', 'letters', 'say', 'both-ways')),
  correct      boolean not null,
  hints        integer not null default 0 check (hints >= 0),
  ms           integer check (ms >= 0),
  created_at   timestamptz not null default now()
);

create index if not exists heir_reviews_member_item on public.heir_reviews (member_id, item_id, created_at desc);
create index if not exists heir_reviews_household on public.heir_reviews (household_id);

alter table public.heir_households enable row level security;
alter table public.heir_members    enable row level security;
alter table public.heir_reviews    enable row level security;

drop policy if exists heir_households_own on public.heir_households;
create policy heir_households_own on public.heir_households for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

drop policy if exists heir_members_own on public.heir_members;
create policy heir_members_own on public.heir_members for all to authenticated
  using (exists (select 1 from public.heir_households h where h.id = household_id and h.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.heir_households h where h.id = household_id and h.owner_id = (select auth.uid())));

-- A review must name a member of the same household.
drop policy if exists heir_reviews_own on public.heir_reviews;
create policy heir_reviews_own on public.heir_reviews for all to authenticated
  using (exists (select 1 from public.heir_households h where h.id = household_id and h.owner_id = (select auth.uid())))
  with check (
    exists (select 1 from public.heir_households h where h.id = household_id and h.owner_id = (select auth.uid()))
    and exists (select 1 from public.heir_members m where m.id = member_id and m.household_id = heir_reviews.household_id)
  );

revoke all on public.heir_households, public.heir_members, public.heir_reviews from anon;
grant select, insert, update, delete on public.heir_households, public.heir_members, public.heir_reviews to authenticated;
