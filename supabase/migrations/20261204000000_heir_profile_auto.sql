-- A new account gets a profile made for it, with "Let people find me" and "Friends of friends see my rank" on, so friends
-- work from the first day: the owner's call (Nov 2026). Only for accounts made after the cutoff below, only for an adult in the
-- family (never a child), only with a first and last name, and never again for someone who deleted their profile.
-- The person can change anything on Your profile, or delete it. Nothing here touches lessons or progress.

-- Who deleted their profile on purpose (so it is never made for them again). Only the functions below read it.
create table if not exists public.heir_profile_declined (
  user_id uuid primary key references auth.users (id) on delete cascade,
  at      timestamptz not null default now()
);
alter table public.heir_profile_declined enable row level security;

create or replace function public.heir_profile_delete() returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); others uuid[];
begin
  if me is null then raise exception 'Sign in first.'; end if;
  select coalesce(array_agg(friend_id), '{}') into others from public.heir_friends where user_id = me;
  delete from public.heir_friends where user_id = me or friend_id = me;
  delete from public.heir_friend_requests where from_user = me or to_user = me;
  delete from public.heir_blocks where blocker = me;
  delete from public.heir_profiles where user_id = me;
  insert into public.heir_profile_declined (user_id) values (me) on conflict do nothing;
  perform public.heir_recount(f) from unnest(others) f;
end $$;
revoke all on function public.heir_profile_delete() from public, anon;
grant execute on function public.heir_profile_delete() to authenticated;

-- Makes the profile if this account should have one. True when it made one now; false when there was nothing to do.
create or replace function public.heir_profile_auto() returns boolean
language plpgsql security definer set search_path = public, extensions, auth as $$
declare
  me uuid := auth.uid(); created timestamptz; mem record; clean text; first text; last text; base text; uname text; i integer := 0;
begin
  if me is null then raise exception 'Sign in first.'; end if;
  if exists (select 1 from public.heir_profiles where user_id = me) then return false; end if;
  if exists (select 1 from public.heir_profile_declined where user_id = me) then return false; end if;
  select created_at into created from auth.users where id = me;
  if created is null or created < timestamptz '2026-11-25 04:00:00+00' then return false; end if;
  -- The family's first adult.
  select m.id, m.name into mem from public.heir_members m join public.heir_households h on h.id = m.household_id
    where h.owner_id = me and m.track = 'adult' and m.deleted_at is null order by m.created_at limit 1;
  if mem.id is null then return false; end if;
  clean := btrim(regexp_replace(coalesce(mem.name, ''), '\s+', ' ', 'g'));
  first := left(split_part(clean, ' ', 1), 40);
  last := left(btrim(substr(clean, char_length(split_part(clean, ' ', 1)) + 1)), 40);
  if first = '' or last = '' then return false; end if;
  -- A username from the name ("landonw"), then with digits until one is free.
  base := regexp_replace(lower(first), '[^a-z]', '', 'g') || left(regexp_replace(lower(last), '[^a-z]', '', 'g'), 1);
  if char_length(base) < 3 then base := base || 'kz'; end if;
  base := left(base, 14);
  uname := base;
  loop
    if public.heir_username_ok(uname) is null and not exists (select 1 from public.heir_profiles where username = uname::extensions.citext) then
      begin
        insert into public.heir_profiles (user_id, member_id, username, first_name, last_name, discoverable, fof_visible, age_confirmed_at)
        values (me, mem.id, uname, first, last, true, true, now());
        return true;
      exception when unique_violation then
        if exists (select 1 from public.heir_profiles where user_id = me) then return false; end if;
      end;
    end if;
    i := i + 1;
    if i > 30 then return false; end if;
    uname := base || (1000 + floor(random() * 9000))::int;
  end loop;
end $$;
revoke all on function public.heir_profile_auto() from public, anon;
grant execute on function public.heir_profile_auto() to authenticated;
