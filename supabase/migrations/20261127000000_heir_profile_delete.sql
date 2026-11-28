-- Heir: anyone can delete their own profile. Removes the profile, their friend stats, every friendship and request they
-- are in, and the blocks they made, then recounts their former friends' friend counts. Lessons and progress are not
-- touched: this only ends the social side. Safe to run more than once.
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
  perform public.heir_recount(f) from unnest(others) f;
end $$;
revoke all on function public.heir_profile_delete() from public, anon;
grant execute on function public.heir_profile_delete() to authenticated;
