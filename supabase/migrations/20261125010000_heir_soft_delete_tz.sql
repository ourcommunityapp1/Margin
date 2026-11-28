-- Heir: removing a person no longer deletes their progress at once, and the account remembers its time zone.
--
-- Removing a person used to delete their row, and the foreign keys then deleted all their lessons, stones and days
-- at the same moment (this is how a profile was once lost by a stray tap). Now the row is only marked removed
-- (deleted_at). The app hides marked people, and anyone can bring one back for 30 days. heir_purge_removed() deletes
-- those older than 30 days for good; it is meant for a scheduled job and cannot be called from the app.
-- The time zone (an IANA name such as "America/Chicago") is what the server uses to work out local days.
-- Only adds things: safe to run more than once.

alter table public.heir_members add column if not exists deleted_at timestamptz;
create index if not exists heir_members_live on public.heir_members (household_id) where deleted_at is null;

alter table public.heir_households add column if not exists tz text;

create or replace function public.heir_purge_removed() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  with gone as (delete from public.heir_members where deleted_at is not null and deleted_at < now() - interval '30 days' returning 1)
  select count(*) into n from gone;
  return n;
end $$;
revoke all on function public.heir_purge_removed() from public, anon, authenticated;
