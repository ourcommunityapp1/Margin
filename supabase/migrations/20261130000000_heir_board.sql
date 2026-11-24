-- Heir: the community leaderboard. Your community is you, your friends, and their friends who allow it, minus anyone
-- blocked either way. People are ranked by words in memory ("all time") or by how many they added this month.
--
-- Everything is worked out here, from numbers only the server writes (heir_stats, heir_words_history). Nobody can read
-- those tables directly; the app gets only what these functions return:
--   heir_board(period)        the rows to show: the top 3, then 3 above you, you and 3 below; or the top 10; or everyone
--                             if the community is small. Each row says where that person was the last time you looked
--                             (prev_place) so the app can animate the move.
--   heir_board_status()       whether your place changed (and whether you entered or left the top 10) since you last
--                             opened the board: the dot on Progress and the arrow.
--   heir_board_seen_mark(p)   "I've seen it": remembers your place now, clearing the dot.
-- Movement counts only words changing among the people in your community now, so making a friend never moves you.
-- Ties share a place (1, 2, 2, 4). Safe to run more than once.

create table if not exists public.heir_board_seen (
  user_id uuid not null references auth.users (id) on delete cascade,
  period  text not null check (period in ('all', 'month')),
  seen_at timestamptz not null default now(),
  place   integer not null,
  top10   boolean not null,
  primary key (user_id, period)
);
alter table public.heir_board_seen enable row level security;
revoke all on public.heir_board_seen from anon, authenticated;

-- The words a person had at a moment: their newest history point at or before it. Before their first point it is 0 for
-- someone who made their profile after that moment, and their first known number for someone who was already here.
create or replace function public.heir_words_at(uid uuid, t timestamptz) returns integer
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select words from public.heir_words_history where user_id = uid and at <= t order by at desc limit 1),
    case when (select created_at from public.heir_profiles where user_id = uid) >= t then 0
         else (select words from public.heir_words_history where user_id = uid order by at asc limit 1) end,
    0)
$$;

-- Who is in someone's community, and how they are connected: 'me', 'friend', or 'fof' (a friend's friend, with which
-- friend connects you: the one you have been friends with longest).
create or replace function public.heir_community(me uuid) returns table (user_id uuid, relation text, via uuid)
language sql stable security definer set search_path = public as $$
  with fr as (select friend_id as uid, created_at from public.heir_friends where user_id = me),
  fof as (
    select distinct on (f2.friend_id) f2.friend_id as uid, fr.uid as via
    from fr join public.heir_friends f2 on f2.user_id = fr.uid
    join public.heir_profiles p on p.user_id = f2.friend_id and p.fof_visible
    where f2.friend_id <> me and f2.friend_id not in (select uid from fr)
    order by f2.friend_id, fr.created_at
    limit 5000
  )
  select me, 'me'::text, null::uuid
  union all select uid, 'friend', null::uuid from fr
  union all select uid, 'fof', via from fof
$$;

-- The community ranked, now and (if the viewer has looked before) as it was when they last looked.
create or replace function public.heir_board_ranked(p_period text, p_since timestamptz)
returns table (user_id uuid, relation text, via uuid, value integer, place integer, idx integer, prev_place integer)
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); tz text; mstart timestamptz;
begin
  select coalesce(h.tz, 'UTC') into tz from public.heir_households h where h.owner_id = me;
  tz := coalesce(tz, 'UTC');
  begin perform now() at time zone tz; exception when others then tz := 'UTC'; end;
  mstart := date_trunc('month', now() at time zone tz) at time zone tz;
  -- A month that has turned over since the last look has nothing to compare with.
  if p_period = 'month' and p_since is not null and p_since < mstart then p_since := null; end if;
  return query
  with c as (
    select c.user_id, c.relation, c.via from public.heir_community(me) c
    join public.heir_profiles p on p.user_id = c.user_id
    where c.user_id = me or not public.heir_blocked_either(me, c.user_id)
  ), val as (
    select c.user_id, c.relation, c.via,
      case when p_period = 'month' then coalesce(s.words_in_memory, 0) - public.heir_words_at(c.user_id, mstart) else coalesce(s.words_in_memory, 0) end as v,
      case when p_since is null then null
           when p_period = 'month' then public.heir_words_at(c.user_id, p_since) - public.heir_words_at(c.user_id, mstart)
           else public.heir_words_at(c.user_id, p_since) end as then_v
    from c left join public.heir_stats s on s.user_id = c.user_id
  )
  select val.user_id, val.relation, val.via, val.v,
    (rank() over (order by val.v desc))::integer,
    (row_number() over (order by val.v desc, val.user_id))::integer,
    case when p_since is null then null else (rank() over (order by val.then_v desc))::integer end
  from val;
end $$;

create or replace function public.heir_board(p_period text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := auth.uid(); seen_t timestamptz; result jsonb;
begin
  if me is null then raise exception 'Sign in first.'; end if;
  if p_period not in ('all', 'month') then raise exception 'Unknown board.'; end if;
  if not exists (select 1 from public.heir_profiles where user_id = me) then raise exception 'Make your profile first.'; end if;
  perform public.heir_rate('board', 120, interval '1 hour');
  select seen_at into seen_t from public.heir_board_seen where user_id = me and period = p_period;
  -- Which rows to show. A community of ten or fewer: everyone. In the top seven: the top ten. Otherwise the top three,
  -- then three above you, you and three below (the gap closes if only one row would be hidden).
  with rk as materialized (select * from public.heir_board_ranked(p_period, seen_t)),
  m as (select count(*)::integer as total, max(idx) filter (where user_id = me) as my_idx,
               max(place) filter (where user_id = me) as my_place, max(prev_place) filter (where user_id = me) as my_prev from rk)
  select jsonb_build_object('period', p_period, 'total', m.total, 'my_place', m.my_place, 'my_prev_place', m.my_prev, 'my_idx', m.my_idx, 'rows', coalesce((
    select jsonb_agg(jsonb_build_object(
        'place', r.place, 'prev_place', r.prev_place, 'idx', r.idx, 'username', p.username, 'relation', r.relation, 'words', r.value,
        'name', public.heir_display(p, r.relation <> 'fof'), 'is_me', r.user_id = me,
        'friends_since', (select created_at from public.heir_friends f where f.user_id = me and f.friend_id = r.user_id),
        'via', (select first_name from public.heir_profiles v where v.user_id = r.via)
      ) order by r.idx)
    from rk r join public.heir_profiles p on p.user_id = r.user_id
    where m.total <= 10
       or (m.my_idx <= 7 and r.idx <= 10)
       or (m.my_idx > 7 and (r.idx <= 3 or (r.idx >= case when m.my_idx - 6 <= 2 then 4 else m.my_idx - 3 end and r.idx <= m.my_idx + 3)))
  ), '[]'::jsonb))
  into result from m;
  return result;
end $$;

create or replace function public.heir_board_status() returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); seen public.heir_board_seen; res jsonb;
begin
  if me is null then raise exception 'Sign in first.'; end if;
  if not exists (select 1 from public.heir_profiles where user_id = me) then return jsonb_build_object('moved', 0, 'entered_top10', false, 'left_top10', false, 'place', null, 'total', 0); end if;
  select * into seen from public.heir_board_seen where user_id = me and period = 'all';
  with rk as materialized (select * from public.heir_board_ranked('all', seen.seen_at)),
  m as (select count(*)::integer as total, max(place) filter (where user_id = me) as my_place, max(prev_place) filter (where user_id = me) as my_prev from rk)
  select jsonb_build_object(
    'moved', case when seen.user_id is null or m.my_prev is null then 0 else m.my_prev - m.my_place end,
    'entered_top10', m.total > 10 and seen.user_id is not null and not seen.top10 and m.my_place <= 10,
    'left_top10', m.total > 10 and seen.user_id is not null and seen.top10 and m.my_place > 10,
    'place', m.my_place, 'total', m.total) into res from m;
  return res;
end $$;

create or replace function public.heir_board_seen_mark(p_period text) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); my_place integer;
begin
  if me is null then raise exception 'Sign in first.'; end if;
  if p_period not in ('all', 'month') then raise exception 'Unknown board.'; end if;
  if not exists (select 1 from public.heir_profiles where user_id = me) then return; end if;
  select place into my_place from public.heir_board_ranked(p_period, null) where user_id = me;
  insert into public.heir_board_seen (user_id, period, seen_at, place, top10) values (me, p_period, now(), coalesce(my_place, 1), coalesce(my_place, 1) <= 10)
  on conflict (user_id, period) do update set seen_at = now(), place = excluded.place, top10 = excluded.top10;
end $$;

revoke all on function public.heir_words_at(uuid, timestamptz), public.heir_community(uuid), public.heir_board_ranked(text, timestamptz) from public, anon, authenticated;
revoke all on function public.heir_board(text), public.heir_board_status(), public.heir_board_seen_mark(text) from public, anon;
grant execute on function public.heir_board(text), public.heir_board_status(), public.heir_board_seen_mark(text) to authenticated;
