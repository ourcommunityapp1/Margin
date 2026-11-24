-- Heir: profiles, friends, friend requests, blocks and reports (the first half of the social features).
--
-- Who can see what is decided here, in the database, not in the app:
--   * A profile is created on purpose (name, unique username, optional city and state). Nobody can read another person's
--     profile row directly. Everything goes through the functions below, which decide what each viewer may see:
--     strangers get first name and last initial; friends get the full name, streak, words in memory, stones and courses.
--   * Friendships are stored in both directions, made only by accepting a request, and removed only by the functions.
--   * Children never have profiles: a profile points at an adult in the signer's own household.
--   * Blocking hides two people from each other everywhere (search, profiles, requests).
--   * Searching, asking for friends and checking usernames are rate limited.
-- Nothing here changes lessons, progress or the existing spouse link. Safe to run more than once.

create extension if not exists citext with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------------------------------- profiles
create table if not exists public.heir_profiles (
  user_id             uuid primary key references auth.users (id) on delete cascade,
  member_id           uuid references public.heir_members (id) on delete set null,
  username            extensions.citext not null unique check (username ~ '^[A-Za-z][A-Za-z0-9_]{2,19}$'),
  first_name          text not null check (char_length(btrim(first_name)) between 1 and 40),
  last_name           text not null check (char_length(btrim(last_name)) between 1 and 40),
  city                text check (city is null or char_length(city) <= 60),
  region              text check (region is null or char_length(region) <= 30),
  discoverable        boolean not null default true,
  fof_visible         boolean not null default true,
  friends_count       integer not null default 0 check (friends_count >= 0),
  username_changed_at timestamptz,
  age_confirmed_at    timestamptz not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists heir_profiles_username_trgm on public.heir_profiles using gin (username extensions.gin_trgm_ops);
create index if not exists heir_profiles_first_trgm on public.heir_profiles using gin (lower(first_name) extensions.gin_trgm_ops);
create index if not exists heir_profiles_last_trgm on public.heir_profiles using gin (lower(last_name) extensions.gin_trgm_ops);

-- The numbers friends see. Until the server works them out from the full answer history, the phone sends them
-- (heir_stats_put) and source says so; the server job will replace those rows.
create table if not exists public.heir_stats (
  user_id         uuid primary key references public.heir_profiles (user_id) on delete cascade,
  words_in_memory integer not null default 0 check (words_in_memory >= 0),
  stones          integer[] not null default '{0,0,0,0,0,0}' check (array_length(stones, 1) = 6),
  streak          integer not null default 0 check (streak >= 0),
  last_day        date,
  courses         jsonb not null default '[]'::jsonb,
  source          text not null default 'phone' check (source in ('phone', 'server')),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------------------------------- friends
create table if not exists public.heir_friends (
  user_id    uuid not null references auth.users (id) on delete cascade,
  friend_id  uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
create index if not exists heir_friends_friend on public.heir_friends (friend_id);

create table if not exists public.heir_friend_requests (
  id         uuid primary key default gen_random_uuid(),
  from_user  uuid not null references auth.users (id) on delete cascade,
  to_user    uuid not null references auth.users (id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  check (from_user <> to_user)
);
create unique index if not exists heir_friend_requests_one_pending
  on public.heir_friend_requests (least(from_user, to_user), greatest(from_user, to_user)) where status = 'pending';
create index if not exists heir_friend_requests_to on public.heir_friend_requests (to_user, status);
create index if not exists heir_friend_requests_from on public.heir_friend_requests (from_user, created_at desc);

create table if not exists public.heir_blocks (
  blocker    uuid not null references auth.users (id) on delete cascade,
  blocked    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
create index if not exists heir_blocks_blocked on public.heir_blocks (blocked);

create table if not exists public.heir_reports (
  id         uuid primary key default gen_random_uuid(),
  reporter   uuid not null references auth.users (id) on delete cascade,
  reported   uuid not null references auth.users (id) on delete cascade,
  reason     text not null check (reason in ('name', 'username', 'abuse', 'other')),
  note       text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now()
);

create table if not exists public.heir_rate_limits (
  user_id      uuid not null references auth.users (id) on delete cascade,
  action       text not null,
  window_start timestamptz not null,
  count        integer not null default 0,
  primary key (user_id, action, window_start)
);

-- ---------------------------------------------------------------------------------------------------- access
alter table public.heir_profiles       enable row level security;
alter table public.heir_stats          enable row level security;
alter table public.heir_friends        enable row level security;
alter table public.heir_friend_requests enable row level security;
alter table public.heir_blocks         enable row level security;
alter table public.heir_reports        enable row level security;
alter table public.heir_rate_limits    enable row level security;

-- Each person can read only their own rows directly. Nobody can write directly: changes go through the functions below.
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'heir_profiles' and policyname = 'heir_profiles_own') then
  create policy heir_profiles_own on public.heir_profiles for select to authenticated using (user_id = (select auth.uid()));
end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'heir_stats' and policyname = 'heir_stats_own') then
  create policy heir_stats_own on public.heir_stats for select to authenticated using (user_id = (select auth.uid()));
end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'heir_friends' and policyname = 'heir_friends_own') then
  create policy heir_friends_own on public.heir_friends for select to authenticated using (user_id = (select auth.uid()));
end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'heir_friend_requests' and policyname = 'heir_friend_requests_own') then
  create policy heir_friend_requests_own on public.heir_friend_requests for select to authenticated
  using (from_user = (select auth.uid()) or to_user = (select auth.uid()));
end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'heir_blocks' and policyname = 'heir_blocks_own') then
  create policy heir_blocks_own on public.heir_blocks for select to authenticated using (blocker = (select auth.uid()));
end if; end $$;
-- Reports and rate limits: no read policy at all (reports are read by the owner in the dashboard).

revoke all on public.heir_profiles, public.heir_stats, public.heir_friends, public.heir_friend_requests,
  public.heir_blocks, public.heir_reports, public.heir_rate_limits from anon, authenticated;
grant select on public.heir_profiles, public.heir_stats, public.heir_friends, public.heir_friend_requests, public.heir_blocks to authenticated;

-- ---------------------------------------------------------------------------------------------------- helpers (not callable from the app)
create or replace function public.heir_blocked_either(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.heir_blocks where (blocker = a and blocked = b) or (blocker = b and blocked = a))
$$;

create or replace function public.heir_is_friend(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.heir_friends where user_id = a and friend_id = b)
$$;

-- Count one use of an action; raises when the limit for the window is passed.
create or replace function public.heir_rate(p_action text, p_max integer, p_window interval) returns void
language plpgsql security definer set search_path = public as $$
declare w timestamptz; n integer;
begin
  w := to_timestamp(floor(extract(epoch from now()) / extract(epoch from p_window)) * extract(epoch from p_window));
  insert into public.heir_rate_limits (user_id, action, window_start, count) values (auth.uid(), p_action, w, 1)
  on conflict (user_id, action, window_start) do update set count = public.heir_rate_limits.count + 1
  returning count into n;
  if n > p_max then raise exception 'Too many tries. Wait a little and try again.' using errcode = 'P0001'; end if;
  if random() < 0.02 then delete from public.heir_rate_limits where window_start < now() - interval '2 days'; end if;
end $$;

create or replace function public.heir_username_ok(p text) returns text
language plpgsql immutable as $$
begin
  if p is null or p !~ '^[A-Za-z][A-Za-z0-9_]{2,19}$' then return 'Use 3 to 20 letters, numbers or underscores, starting with a letter.'; end if;
  if lower(p) in ('admin','administrator','katekize','heir','support','help','staff','official','moderator','mod','root','system','null','undefined','anonymous','everyone','me','you') then
    return 'That name is reserved.';
  end if;
  return null;
end $$;

-- "Sarah K." for strangers, "Sarah Kessler" for friends and for yourself.
create or replace function public.heir_display(p public.heir_profiles, full boolean) returns text
language sql immutable as $$
  select case when full then p.first_name || ' ' || p.last_name else p.first_name || ' ' || upper(left(p.last_name, 1)) || '.' end
$$;

create or replace function public.heir_mutual(a uuid, b uuid) returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.heir_friends x join public.heir_friends y on x.friend_id = y.friend_id where x.user_id = a and y.user_id = b
$$;

create or replace function public.heir_recount(u uuid) returns void
language sql security definer set search_path = public as $$
  update public.heir_profiles set friends_count = (select count(*) from public.heir_friends where user_id = u), updated_at = now() where user_id = u
$$;

-- ---------------------------------------------------------------------------------------------------- profile
create or replace function public.heir_username_free(p_name text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  perform public.heir_rate('username_check', 60, interval '1 minute');
  if public.heir_username_ok(btrim(p_name)) is not null then return false; end if;
  return not exists (select 1 from public.heir_profiles where username = btrim(p_name) and user_id <> auth.uid());
end $$;

create or replace function public.heir_profile_save(
  p_first text, p_last text, p_username text, p_city text, p_region text,
  p_discoverable boolean, p_fof boolean, p_age_ok boolean
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := auth.uid(); old public.heir_profiles; uname text := btrim(p_username); bad text; mem uuid; result public.heir_profiles;
begin
  if me is null then raise exception 'Sign in first.'; end if;
  select * into old from public.heir_profiles where user_id = me;
  if old.user_id is null and not coalesce(p_age_ok, false) then raise exception 'Confirm you are 13 or older to make a profile.'; end if;
  bad := public.heir_username_ok(uname);
  if bad is not null then raise exception '%', bad; end if;
  if char_length(btrim(coalesce(p_first, ''))) = 0 or char_length(btrim(coalesce(p_last, ''))) = 0 then raise exception 'Add your first and last name.'; end if;
  if old.user_id is not null and old.username <> uname::extensions.citext then
    if old.username_changed_at is not null and old.username_changed_at > now() - interval '30 days' then
      raise exception 'You can change your username once every 30 days.';
    end if;
  end if;
  if exists (select 1 from public.heir_profiles where username = uname and user_id <> me) then raise exception 'That username is taken.'; end if;
  -- The profile is for an adult in this account's own family (never a child).
  select m.id into mem from public.heir_members m join public.heir_households h on h.id = m.household_id
    where h.owner_id = me and m.track = 'adult' and m.deleted_at is null order by (m.id = old.member_id) desc nulls last, m.created_at limit 1;
  insert into public.heir_profiles (user_id, member_id, username, first_name, last_name, city, region, discoverable, fof_visible, age_confirmed_at, username_changed_at)
  values (me, mem, uname, btrim(p_first), btrim(p_last), nullif(btrim(coalesce(p_city, '')), ''), nullif(btrim(coalesce(p_region, '')), ''),
          coalesce(p_discoverable, true), coalesce(p_fof, true), now(), null)
  on conflict (user_id) do update set
    member_id = excluded.member_id, username = excluded.username, first_name = excluded.first_name, last_name = excluded.last_name,
    city = excluded.city, region = excluded.region, discoverable = excluded.discoverable, fof_visible = excluded.fof_visible, updated_at = now(),
    username_changed_at = case when public.heir_profiles.username <> excluded.username then now() else public.heir_profiles.username_changed_at end
  returning * into result;
  return jsonb_build_object('username', result.username, 'first_name', result.first_name, 'last_name', result.last_name, 'city', result.city,
    'region', result.region, 'discoverable', result.discoverable, 'fof_visible', result.fof_visible, 'friends_count', result.friends_count,
    'member_id', result.member_id, 'username_changed_at', result.username_changed_at);
exception when unique_violation then raise exception 'That username is taken.';
end $$;

create or replace function public.heir_profile_get() returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(p) - 'user_id' - 'age_confirmed_at' - 'created_at' - 'updated_at' from public.heir_profiles p where p.user_id = auth.uid()
$$;

-- What the phone works out about you, for your friends to see (until the server does it).
create or replace function public.heir_stats_put(p_words integer, p_stones integer[], p_streak integer, p_last_day date, p_courses jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if not exists (select 1 from public.heir_profiles where user_id = auth.uid()) then return; end if;
  perform public.heir_rate('stats_put', 120, interval '1 hour');
  insert into public.heir_stats (user_id, words_in_memory, stones, streak, last_day, courses, source)
  values (auth.uid(), greatest(0, coalesce(p_words, 0)), coalesce(p_stones, '{0,0,0,0,0,0}'), greatest(0, coalesce(p_streak, 0)), p_last_day,
          coalesce(p_courses, '[]'::jsonb), 'phone')
  on conflict (user_id) do update set words_in_memory = excluded.words_in_memory, stones = excluded.stones, streak = excluded.streak,
    last_day = excluded.last_day, courses = excluded.courses, source = 'phone', updated_at = now()
  where public.heir_stats.source = 'phone';
end $$;

-- ---------------------------------------------------------------------------------------------------- search and view
create or replace function public.heir_search(p_q text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := auth.uid(); q text := lower(btrim(coalesce(p_q, ''))); ql text; out jsonb;
begin
  if me is null then raise exception 'Sign in first.'; end if;
  if not exists (select 1 from public.heir_profiles where user_id = me) then raise exception 'Make your profile first.'; end if;
  q := regexp_replace(q, '^@', '');
  if char_length(q) < 2 or char_length(q) > 40 then return '[]'::jsonb; end if;
  perform public.heir_rate('search', 30, interval '1 minute');
  ql := replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_');
  select coalesce(jsonb_agg(r order by (r->>'rank')::numeric desc), '[]'::jsonb) into out from (
    select jsonb_build_object(
      'username', p.username, 'name', public.heir_display(p, f.user_id is not null), 'city', p.city, 'region', p.region,
      'friends_count', p.friends_count, 'mutual', public.heir_mutual(me, p.user_id),
      'relation', case when f.user_id is not null then 'friend'
                       when exists (select 1 from public.heir_friend_requests r where r.status = 'pending' and r.from_user = me and r.to_user = p.user_id) then 'requested'
                       when exists (select 1 from public.heir_friend_requests r where r.status = 'pending' and r.to_user = me and r.from_user = p.user_id) then 'incoming'
                       else 'none' end,
      'rank', (public.heir_mutual(me, p.user_id) * 10)
              + (case when lower(p.username::text) = q then 1000 else 0 end)
              + (extensions.similarity(lower(p.username::text), q) * 5)
              + (case when f.user_id is not null then 50 else 0 end)
    ) as r
    from public.heir_profiles p
    left join public.heir_friends f on f.user_id = me and f.friend_id = p.user_id
    where p.user_id <> me
      and (p.discoverable or f.user_id is not null)
      and not public.heir_blocked_either(me, p.user_id)
      and (lower(p.username::text) like ql || '%' or lower(p.first_name) like ql || '%' or lower(p.last_name) like ql || '%'
           or lower(p.first_name || ' ' || p.last_name) like ql || '%' or extensions.similarity(lower(p.username::text), q) > 0.4)
    limit 20
  ) s;
  return out;
end $$;

create or replace function public.heir_profile_view(p_username text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := auth.uid(); p public.heir_profiles; fr boolean; rel text; st public.heir_stats; since timestamptz; fl jsonb;
begin
  if me is null then raise exception 'Sign in first.'; end if;
  select * into p from public.heir_profiles where username = btrim(p_username);
  if p.user_id is null or public.heir_blocked_either(me, p.user_id) then return null; end if;
  if p.user_id = me then fr := true; else fr := public.heir_is_friend(me, p.user_id); end if;
  select created_at into since from public.heir_friends where user_id = me and friend_id = p.user_id;
  rel := case when p.user_id = me then 'me' when fr then 'friend'
              when exists (select 1 from public.heir_friend_requests r where r.status = 'pending' and r.from_user = me and r.to_user = p.user_id) then 'requested'
              when exists (select 1 from public.heir_friend_requests r where r.status = 'pending' and r.to_user = me and r.from_user = p.user_id) then 'incoming'
              else 'none' end;
  -- Someone who is neither discoverable, nor a friend, nor waiting on a request can't be looked up.
  if not p.discoverable and rel in ('none') then return null; end if;
  select * into st from public.heir_stats where user_id = p.user_id;
  if fr then
    select coalesce(jsonb_agg(jsonb_build_object('username', q.username, 'name', public.heir_display(q, public.heir_is_friend(me, q.user_id) or q.user_id = me)) order by f.created_at), '[]'::jsonb) into fl
      from (select friend_id, created_at from public.heir_friends where user_id = p.user_id order by created_at limit 12) f
      join public.heir_profiles q on q.user_id = f.friend_id
      where not public.heir_blocked_either(me, q.user_id);
  end if;
  return jsonb_build_object(
    'username', p.username, 'name', public.heir_display(p, fr), 'city', p.city, 'region', p.region, 'friends_count', p.friends_count,
    'mutual', case when p.user_id = me then 0 else public.heir_mutual(me, p.user_id) end, 'relation', rel, 'friends_since', since
  ) || case when fr and st.user_id is not null then jsonb_build_object(
    'words_in_memory', st.words_in_memory, 'stones', st.stones, 'streak', st.streak, 'last_day', st.last_day, 'courses', st.courses, 'friends', fl)
    when fr then jsonb_build_object('friends', fl, 'words_in_memory', 0, 'stones', '[0,0,0,0,0,0]'::jsonb, 'streak', 0, 'courses', '[]'::jsonb) else '{}'::jsonb end;
end $$;

create or replace function public.heir_friends_list() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'username', p.username, 'name', public.heir_display(p, true), 'city', p.city, 'region', p.region, 'friends_since', f.created_at,
    'words_in_memory', coalesce(s.words_in_memory, 0), 'streak', coalesce(s.streak, 0), 'last_day', s.last_day
  ) order by coalesce(s.words_in_memory, 0) desc, p.first_name), '[]'::jsonb)
  from public.heir_friends f join public.heir_profiles p on p.user_id = f.friend_id left join public.heir_stats s on s.user_id = p.user_id
  where f.user_id = auth.uid() and not public.heir_blocked_either(auth.uid(), p.user_id)
$$;

-- ---------------------------------------------------------------------------------------------------- requests
create or replace function public.heir_befriend(a uuid, b uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.heir_friends (user_id, friend_id) values (a, b), (b, a) on conflict do nothing;
  perform public.heir_recount(a); perform public.heir_recount(b);
end $$;

create or replace function public.heir_request_send(p_username text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := auth.uid(); t public.heir_profiles; req public.heir_friend_requests;
begin
  if me is null then raise exception 'Sign in first.'; end if;
  if not exists (select 1 from public.heir_profiles where user_id = me) then raise exception 'Make your profile first.'; end if;
  select * into t from public.heir_profiles where username = btrim(p_username);
  if t.user_id is null or t.user_id = me or public.heir_blocked_either(me, t.user_id) then raise exception 'We couldn''t find that person.'; end if;
  if public.heir_is_friend(me, t.user_id) then return 'friends'; end if;
  -- They already asked you: asking back makes you friends.
  select * into req from public.heir_friend_requests where status = 'pending' and from_user = t.user_id and to_user = me;
  if req.id is not null then
    update public.heir_friend_requests set status = 'accepted', decided_at = now() where id = req.id;
    perform public.heir_befriend(me, t.user_id);
    return 'friends';
  end if;
  if not t.discoverable then raise exception 'We couldn''t find that person.'; end if;
  if exists (select 1 from public.heir_friend_requests where status = 'pending' and from_user = me and to_user = t.user_id) then return 'requested'; end if;
  if exists (select 1 from public.heir_friend_requests where status = 'declined' and from_user = me and to_user = t.user_id and decided_at > now() - interval '30 days') then
    raise exception 'You can ask again later.';
  end if;
  perform public.heir_rate('friend_request', 30, interval '1 day');
  insert into public.heir_friend_requests (from_user, to_user) values (me, t.user_id);
  return 'requested';
exception when unique_violation then return 'requested';
end $$;

create or replace function public.heir_request_answer(p_id uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r public.heir_friend_requests;
begin
  if me is null then raise exception 'Sign in first.'; end if;
  select * into r from public.heir_friend_requests where id = p_id and to_user = me and status = 'pending' for update;
  if r.id is null then raise exception 'That request isn''t there any more.'; end if;
  if public.heir_blocked_either(me, r.from_user) then raise exception 'That request isn''t there any more.'; end if;
  update public.heir_friend_requests set status = case when p_accept then 'accepted' else 'declined' end, decided_at = now() where id = r.id;
  if p_accept then perform public.heir_befriend(me, r.from_user); end if;
end $$;

create or replace function public.heir_request_cancel(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  update public.heir_friend_requests set status = 'cancelled', decided_at = now() where id = p_id and from_user = auth.uid() and status = 'pending';
end $$;

create or replace function public.heir_requests_list() returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); inc jsonb; outg jsonb;
begin
  if me is null then raise exception 'Sign in first.'; end if;
  update public.heir_friend_requests set status = 'expired', decided_at = now() where status = 'pending' and created_at < now() - interval '30 days' and (from_user = me or to_user = me);
  select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'username', p.username, 'name', public.heir_display(p, false), 'city', p.city, 'region', p.region,
    'friends_count', p.friends_count, 'mutual', public.heir_mutual(me, p.user_id), 'created_at', r.created_at) order by r.created_at desc), '[]'::jsonb) into inc
    from public.heir_friend_requests r join public.heir_profiles p on p.user_id = r.from_user
    where r.to_user = me and r.status = 'pending' and not public.heir_blocked_either(me, p.user_id);
  select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'username', p.username, 'name', public.heir_display(p, false), 'created_at', r.created_at) order by r.created_at desc), '[]'::jsonb) into outg
    from public.heir_friend_requests r join public.heir_profiles p on p.user_id = r.to_user
    where r.from_user = me and r.status = 'pending' and not public.heir_blocked_either(me, p.user_id);
  return jsonb_build_object('incoming', inc, 'outgoing', outg);
end $$;

create or replace function public.heir_unfriend(p_username text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := auth.uid(); t uuid;
begin
  if me is null then raise exception 'Sign in first.'; end if;
  select user_id into t from public.heir_profiles where username = btrim(p_username);
  if t is null then return; end if;
  delete from public.heir_friends where (user_id = me and friend_id = t) or (user_id = t and friend_id = me);
  perform public.heir_recount(me); perform public.heir_recount(t);
end $$;

create or replace function public.heir_block(p_username text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := auth.uid(); t uuid;
begin
  if me is null then raise exception 'Sign in first.'; end if;
  select user_id into t from public.heir_profiles where username = btrim(p_username);
  if t is null or t = me then return; end if;
  insert into public.heir_blocks (blocker, blocked) values (me, t) on conflict do nothing;
  delete from public.heir_friends where (user_id = me and friend_id = t) or (user_id = t and friend_id = me);
  update public.heir_friend_requests set status = 'cancelled', decided_at = now()
    where status = 'pending' and ((from_user = me and to_user = t) or (from_user = t and to_user = me));
  perform public.heir_recount(me); perform public.heir_recount(t);
end $$;

create or replace function public.heir_unblock(p_username text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  delete from public.heir_blocks where blocker = auth.uid() and blocked = (select user_id from public.heir_profiles where username = btrim(p_username));
end $$;

create or replace function public.heir_report(p_username text, p_reason text, p_note text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare t uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  select user_id into t from public.heir_profiles where username = btrim(p_username);
  if t is null then return; end if;
  perform public.heir_rate('report', 10, interval '1 day');
  insert into public.heir_reports (reporter, reported, reason, note) values (auth.uid(), t, p_reason, nullif(left(coalesce(p_note, ''), 500), ''));
end $$;

-- ---------------------------------------------------------------------------------------------------- who can call what
-- Helpers are for the functions above only. The app may call the functions listed last.
revoke all on function public.heir_blocked_either(uuid, uuid), public.heir_is_friend(uuid, uuid), public.heir_rate(text, integer, interval),
  public.heir_username_ok(text), public.heir_mutual(uuid, uuid), public.heir_recount(uuid), public.heir_befriend(uuid, uuid) from public, anon, authenticated;
revoke all on function public.heir_display(public.heir_profiles, boolean) from public, anon, authenticated;

revoke all on function public.heir_username_free(text), public.heir_profile_save(text, text, text, text, text, boolean, boolean, boolean), public.heir_profile_get(),
  public.heir_stats_put(integer, integer[], integer, date, jsonb), public.heir_search(text), public.heir_profile_view(text), public.heir_friends_list(),
  public.heir_request_send(text), public.heir_request_answer(uuid, boolean), public.heir_request_cancel(uuid), public.heir_requests_list(),
  public.heir_unfriend(text), public.heir_block(text), public.heir_unblock(text), public.heir_report(text, text, text) from public, anon;
grant execute on function public.heir_username_free(text), public.heir_profile_save(text, text, text, text, text, boolean, boolean, boolean), public.heir_profile_get(),
  public.heir_stats_put(integer, integer[], integer, date, jsonb), public.heir_search(text), public.heir_profile_view(text), public.heir_friends_list(),
  public.heir_request_send(text), public.heir_request_answer(uuid, boolean), public.heir_request_cancel(uuid), public.heir_requests_list(),
  public.heir_unfriend(text), public.heir_block(text), public.heir_unblock(text), public.heir_report(text, text, text) to authenticated;
