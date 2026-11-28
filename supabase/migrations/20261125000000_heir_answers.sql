-- Heir: every answer kept as its own row, so history is never cut off and numbers can be worked out on the server.
--
-- Until now each person's answers lived inside one JSON record (heir_progress.data.log) that the phone trims to its
-- last 1,500 answers. Stones from Long-term up need months to years of history, so they need all of it. This table is
-- append-only: the account's owner can add answers and read them, nobody can change or delete one (they go only when
-- the person or the account is deleted). Each answer has an id made on the phone, so sending one twice is harmless.
-- The old, unused heir_reviews table stays untouched. Safe to run more than once.

create table if not exists public.heir_answers (
  id           uuid primary key,
  household_id uuid not null references public.heir_households (id) on delete cascade,
  member_id    uuid not null references public.heir_members (id) on delete cascade,
  item_id      text not null,
  kind         text not null check (kind in ('intro','order','meaning','blanks','letters','say','type','next','match','spot','info','quiz','verse')),
  correct      boolean not null,
  -- Words wrong or missing in a typed or spoken answer; null when the answer wasn't one, or wasn't recorded (older answers).
  misses       smallint check (misses is null or misses >= 0),
  hints        smallint not null default 0 check (hints >= 0),
  ms           integer not null default 0 check (ms >= 0),
  review       boolean not null default false,
  -- Which part of the item ("wsc-1#2"); null unless it was a text answer, and for older answers.
  part         text,
  -- When the lesson ended (the log's `at`: every answer in one lesson shares it).
  session_at   timestamptz not null,
  -- The phone's local date, so days are never guessed in another time zone. Null for answers from before this table.
  local_day    date,
  received_at  timestamptz not null default now()
);

create index if not exists heir_answers_member_item on public.heir_answers (member_id, item_id, session_at);
create index if not exists heir_answers_member_time on public.heir_answers (member_id, session_at);
create index if not exists heir_answers_household on public.heir_answers (household_id);

alter table public.heir_answers enable row level security;

drop policy if exists heir_answers_read on public.heir_answers;
create policy heir_answers_read on public.heir_answers for select to authenticated
  using (exists (select 1 from public.heir_households h where h.id = household_id and h.owner_id = (select auth.uid())));

-- An answer must be for a member of the same household, and that household must be the signed-in account's.
drop policy if exists heir_answers_add on public.heir_answers;
create policy heir_answers_add on public.heir_answers for insert to authenticated
  with check (
    exists (select 1 from public.heir_households h where h.id = household_id and h.owner_id = (select auth.uid()))
    and exists (select 1 from public.heir_members m where m.id = member_id and m.household_id = heir_answers.household_id)
  );
-- No update or delete policy: answers are append-only.

revoke all on public.heir_answers from anon, authenticated;
grant select, insert on public.heir_answers to authenticated;

-- Bring over every answer already kept in the progress records. The id is worked out from the answer itself (who, when,
-- which question, which kind, review or not, and its place in the log), so running this again adds nothing twice.
insert into public.heir_answers (id, household_id, member_id, item_id, kind, correct, hints, ms, review, session_at)
select
  md5(p.member_id::text || '|' || (e.value->>'at') || '|' || (e.value->>'itemId') || '|' || (e.value->>'kind') || '|' || coalesce(e.value->>'review', 'false') || '|' || e.ord::text)::uuid,
  p.household_id, p.member_id,
  e.value->>'itemId', e.value->>'kind',
  coalesce((e.value->>'correct')::boolean, false),
  greatest(0, coalesce((e.value->>'hints')::numeric, 0)::int),
  greatest(0, coalesce((e.value->>'ms')::numeric, 0)::int),
  coalesce((e.value->>'review')::boolean, false),
  (e.value->>'at')::timestamptz
from public.heir_progress p
cross join lateral jsonb_array_elements(coalesce(p.data->'log', '[]'::jsonb)) with ordinality as e(value, ord)
where e.value->>'kind' in ('intro','order','meaning','blanks','letters','say','type','next','match','spot','info','quiz','verse')
  and e.value->>'at' is not null and e.value->>'itemId' is not null
on conflict (id) do nothing;
