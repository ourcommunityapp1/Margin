-- Heir: invite someone who isn't on Katekize yet to be your friend. A link, single use, good for 7 days. The person
-- who opens it signs in (or makes an account), makes a profile, sees who invited them and chooses to accept; you are
-- then friends. Uses the existing invites table, with a kind so a friend link can never link accounts (and the other
-- way round). Safe to run more than once.

alter table public.heir_invites add column if not exists kind text not null default 'link';
alter table public.heir_invites drop constraint if exists heir_invites_kind_check;
alter table public.heir_invites add constraint heir_invites_kind_check check (kind in ('link', 'friend'));

-- Linking accounts only ever accepts a 'link' invite. (Same function as before, with the kind check.)
create or replace function public.heir_accept_invite(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv public.heir_invites%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  select * into inv from public.heir_invites where code = p_code and kind = 'link' for update;
  if not found then raise exception 'This invite isn''t valid.'; end if;
  if inv.created_by = auth.uid() then raise exception 'This is your own invite. Send it to someone else.'; end if;
  if exists (select 1 from public.heir_links where viewer = auth.uid() and owner = inv.created_by) then return inv.created_by; end if;
  if inv.used_by is not null or inv.expires_at < now() then raise exception 'This invite has expired or was already used.'; end if;
  insert into public.heir_links (viewer, owner) values (inv.created_by, auth.uid()), (auth.uid(), inv.created_by) on conflict do nothing;
  update public.heir_invites set used_by = auth.uid(), used_at = now() where code = p_code;
  return inv.created_by;
end $$;

create or replace function public.heir_friend_invite_create() returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c text;
begin
  if me is null then raise exception 'Sign in first.'; end if;
  if not exists (select 1 from public.heir_profiles where user_id = me) then raise exception 'Make your profile first.'; end if;
  perform public.heir_rate('friend_invite', 20, interval '1 day');
  c := replace(gen_random_uuid()::text, '-', '');
  insert into public.heir_invites (code, created_by, kind) values (c, me, 'friend');
  return c;
end $$;

-- Who is inviting me: first name and last initial only, and only while the invite can still be used.
create or replace function public.heir_friend_invite_peek(p_code text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := auth.uid(); inv public.heir_invites; p public.heir_profiles;
begin
  if me is null then raise exception 'Sign in first.'; end if;
  perform public.heir_rate('friend_invite_peek', 60, interval '1 hour');
  select * into inv from public.heir_invites where code = p_code and kind = 'friend';
  if inv.code is null then return jsonb_build_object('status', 'invalid'); end if;
  select * into p from public.heir_profiles where user_id = inv.created_by;
  if p.user_id is null or public.heir_blocked_either(me, inv.created_by) then return jsonb_build_object('status', 'invalid'); end if;
  if inv.created_by = me then return jsonb_build_object('status', 'own'); end if;
  if public.heir_is_friend(me, inv.created_by) then return jsonb_build_object('status', 'friends', 'name', public.heir_display(p, true), 'username', p.username); end if;
  if inv.used_by is not null or inv.expires_at < now() then return jsonb_build_object('status', 'used'); end if;
  return jsonb_build_object('status', 'ok', 'name', public.heir_display(p, false), 'username', p.username);
end $$;

create or replace function public.heir_friend_invite_accept(p_code text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := auth.uid(); inv public.heir_invites; p public.heir_profiles;
begin
  if me is null then raise exception 'Sign in first.'; end if;
  if not exists (select 1 from public.heir_profiles where user_id = me) then raise exception 'Make your profile first.'; end if;
  perform public.heir_rate('friend_invite_accept', 30, interval '1 day');
  select * into inv from public.heir_invites where code = p_code and kind = 'friend' for update;
  if inv.code is null then raise exception 'This invite isn''t valid.'; end if;
  select * into p from public.heir_profiles where user_id = inv.created_by;
  if p.user_id is null or public.heir_blocked_either(me, inv.created_by) then raise exception 'This invite isn''t valid.'; end if;
  if inv.created_by = me then raise exception 'This is your own invite. Send it to someone else.'; end if;
  -- Opened twice, or already friends some other way: nothing more to do.
  if public.heir_is_friend(me, inv.created_by) then return jsonb_build_object('name', public.heir_display(p, true), 'username', p.username); end if;
  if inv.used_by is not null or inv.expires_at < now() then raise exception 'This invite has expired or was already used.'; end if;
  perform public.heir_befriend(me, inv.created_by);
  update public.heir_friend_requests set status = 'accepted', decided_at = now()
    where status = 'pending' and ((from_user = me and to_user = inv.created_by) or (from_user = inv.created_by and to_user = me));
  update public.heir_invites set used_by = me, used_at = now() where code = p_code;
  return jsonb_build_object('name', public.heir_display(p, true), 'username', p.username);
end $$;

revoke all on function public.heir_friend_invite_create(), public.heir_friend_invite_peek(text), public.heir_friend_invite_accept(text) from public, anon;
grant execute on function public.heir_friend_invite_create(), public.heir_friend_invite_peek(text), public.heir_friend_invite_accept(text) to authenticated;
