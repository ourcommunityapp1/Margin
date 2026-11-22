-- Heir: more than one account in a family (a spouse), by invite.
--
-- Until now a household belonged to exactly one account (its owner). Now an account is linked to its household in
-- heir_household_users, and every account in a household can read and change that household's members and their
-- progress. Each account keeps its own current course (plan) and its own active person on its own phone, so one
-- spouse's choices don't change the other's. An invite (heir_invites) is a single-use, 7-day code made by a family
-- member; heir_join() adds the signed-in account to the family that made it. Safe to run more than once.

create table if not exists public.heir_household_users (
  user_id          uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  household_id     uuid not null references public.heir_households (id) on delete cascade,
  role             text not null default 'member' check (role in ('owner', 'member')),
  plan             jsonb,
  active_member_id uuid,
  created_at       timestamptz not null default now()
);
create index if not exists heir_household_users_household on public.heir_household_users (household_id);

-- Existing owners become the first account of their household, keeping their course and active person.
insert into public.heir_household_users (user_id, household_id, role, plan, active_member_id)
select owner_id, id, 'owner', plan, active_member_id from public.heir_households
on conflict (user_id) do nothing;

-- The household of the signed-in account. security definer so policies can ask it without recursing into their own table.
create or replace function public.heir_my_household() returns uuid
language sql stable security definer set search_path = public as $$
  select household_id from public.heir_household_users where user_id = auth.uid()
$$;
revoke all on function public.heir_my_household() from public, anon;
grant execute on function public.heir_my_household() to authenticated;

alter table public.heir_household_users enable row level security;

drop policy if exists heir_household_users_read on public.heir_household_users;
create policy heir_household_users_read on public.heir_household_users for select to authenticated
  using (user_id = (select auth.uid()));
-- Only a household's owner links their own account to it directly; others arrive through heir_join().
drop policy if exists heir_household_users_add on public.heir_household_users;
create policy heir_household_users_add on public.heir_household_users for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.heir_households h where h.id = household_id and h.owner_id = (select auth.uid())));
drop policy if exists heir_household_users_change on public.heir_household_users;
create policy heir_household_users_change on public.heir_household_users for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and household_id = (select public.heir_my_household()));
drop policy if exists heir_household_users_leave on public.heir_household_users;
create policy heir_household_users_leave on public.heir_household_users for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.heir_household_users from anon;
grant select, insert, update, delete on public.heir_household_users to authenticated;

-- Households, members, reviews and progress: shared by every account in the household.
drop policy if exists heir_households_own on public.heir_households;
drop policy if exists heir_households_read on public.heir_households;
create policy heir_households_read on public.heir_households for select to authenticated
  using (id = (select public.heir_my_household()) or owner_id = (select auth.uid()));
drop policy if exists heir_households_add on public.heir_households;
create policy heir_households_add on public.heir_households for insert to authenticated
  with check (owner_id = (select auth.uid()));
drop policy if exists heir_households_change on public.heir_households;
create policy heir_households_change on public.heir_households for update to authenticated
  using (id = (select public.heir_my_household())) with check (id = (select public.heir_my_household()));
drop policy if exists heir_households_remove on public.heir_households;
create policy heir_households_remove on public.heir_households for delete to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists heir_members_own on public.heir_members;
drop policy if exists heir_members_family on public.heir_members;
create policy heir_members_family on public.heir_members for all to authenticated
  using (household_id = (select public.heir_my_household())) with check (household_id = (select public.heir_my_household()));

drop policy if exists heir_reviews_own on public.heir_reviews;
drop policy if exists heir_reviews_family on public.heir_reviews;
create policy heir_reviews_family on public.heir_reviews for all to authenticated
  using (household_id = (select public.heir_my_household()))
  with check (household_id = (select public.heir_my_household())
    and exists (select 1 from public.heir_members m where m.id = member_id and m.household_id = heir_reviews.household_id));

drop policy if exists heir_progress_own on public.heir_progress;
drop policy if exists heir_progress_family on public.heir_progress;
create policy heir_progress_family on public.heir_progress for all to authenticated
  using (household_id = (select public.heir_my_household()))
  with check (household_id = (select public.heir_my_household())
    and exists (select 1 from public.heir_members m where m.id = member_id and m.household_id = heir_progress.household_id));

-- Invites: made and joined only through the two functions below.
create table if not exists public.heir_invites (
  code         text primary key,
  household_id uuid not null references public.heir_households (id) on delete cascade,
  created_by   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  expires_at   timestamptz not null default now() + interval '7 days',
  used_by      uuid references auth.users (id) on delete set null,
  used_at      timestamptz,
  created_at   timestamptz not null default now()
);
alter table public.heir_invites enable row level security;
drop policy if exists heir_invites_read on public.heir_invites;
create policy heir_invites_read on public.heir_invites for select to authenticated
  using (household_id = (select public.heir_my_household()));
revoke all on public.heir_invites from anon, authenticated;
grant select on public.heir_invites to authenticated;

create or replace function public.heir_create_invite() returns text
language plpgsql security definer set search_path = public as $$
declare hh uuid := public.heir_my_household(); c text;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if hh is null then raise exception 'Set up your family first.'; end if;
  c := replace(gen_random_uuid()::text, '-', '');
  insert into public.heir_invites (code, household_id, created_by) values (c, hh, auth.uid());
  return c;
end $$;

create or replace function public.heir_join(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv public.heir_invites%rowtype; mine uuid := public.heir_my_household();
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  select * into inv from public.heir_invites where code = p_code for update;
  if not found then raise exception 'This invite isn''t valid.'; end if;
  if mine is not null then
    if mine = inv.household_id then return mine; end if;
    -- An empty family made by mistake on the way here is let go; a family with people in it is not.
    if exists (select 1 from public.heir_members where household_id = mine) then raise exception 'You''re already in a family.'; end if;
    delete from public.heir_household_users where user_id = auth.uid();
    delete from public.heir_households where id = mine and owner_id = auth.uid();
  end if;
  if inv.used_by is not null or inv.expires_at < now() then raise exception 'This invite has expired or was already used.'; end if;
  insert into public.heir_household_users (user_id, household_id, role) values (auth.uid(), inv.household_id, 'member');
  update public.heir_invites set used_by = auth.uid(), used_at = now() where code = p_code;
  return inv.household_id;
end $$;

revoke all on function public.heir_create_invite() from public, anon;
revoke all on function public.heir_join(text) from public, anon;
grant execute on function public.heir_create_invite() to authenticated;
grant execute on function public.heir_join(text) to authenticated;
