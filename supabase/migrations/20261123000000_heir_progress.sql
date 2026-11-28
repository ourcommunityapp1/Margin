-- Heir: each person's progress, kept with the account so it survives a lost phone or a cleared browser.
--
-- One row per member: the whole progress record the app keeps on the phone (learned parts, schedules, stones,
-- days kept, awards, the answer log, related verses recalled), as JSON. The phone and the account are merged,
-- never overwritten (src/heir/progress.ts, mergeProgress). Only the account that owns the household can read or
-- change it. Safe to run more than once.

create table if not exists public.heir_progress (
  member_id    uuid primary key references public.heir_members (id) on delete cascade,
  household_id uuid not null references public.heir_households (id) on delete cascade,
  data         jsonb not null,
  updated_at   timestamptz not null default now()
);

create index if not exists heir_progress_household on public.heir_progress (household_id);

alter table public.heir_progress enable row level security;

-- A row must be for a member of the same household, and that household must be the signed-in account's.
drop policy if exists heir_progress_own on public.heir_progress;
create policy heir_progress_own on public.heir_progress for all to authenticated
  using (exists (select 1 from public.heir_households h where h.id = household_id and h.owner_id = (select auth.uid())))
  with check (
    exists (select 1 from public.heir_households h where h.id = household_id and h.owner_id = (select auth.uid()))
    and exists (select 1 from public.heir_members m where m.id = member_id and m.household_id = heir_progress.household_id)
  );

revoke all on public.heir_progress from anon;
grant select, insert, update, delete on public.heir_progress to authenticated;
