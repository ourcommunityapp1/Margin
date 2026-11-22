-- Heir: link two accounts (a married couple) so each can VIEW the other's family and progress, and nothing more.
--
-- Every account keeps its own household, members and progress, exactly as before: only its owner can change or
-- delete them (the existing heir_*_own policies are untouched). A link adds read access only: a second, select-only
-- policy on each table. There is no policy that lets a linked account insert, update or delete anything of the
-- other's. A link is made with a single-use, 7-day invite (heir_create_invite, heir_accept_invite) and either side
-- can remove it (heir_unlink), which deletes no data. Safe to run more than once.

-- One row per direction: `viewer` may read what `owner` has.
create table if not exists public.heir_links (
  viewer     uuid not null references auth.users (id) on delete cascade,
  owner      uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (viewer, owner),
  check (viewer <> owner)
);
create index if not exists heir_links_owner on public.heir_links (owner);

alter table public.heir_links enable row level security;
drop policy if exists heir_links_read on public.heir_links;
create policy heir_links_read on public.heir_links for select to authenticated
  using (viewer = (select auth.uid()) or owner = (select auth.uid()));
-- No insert, update or delete policy: links are made and removed only by the functions below.
revoke all on public.heir_links from anon, authenticated;
grant select on public.heir_links to authenticated;

-- Whether the signed-in account is linked to the owner of this household. security definer so the read policies can
-- ask without tripping over each other's row-level security.
create or replace function public.heir_can_view_household(hid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.heir_households h join public.heir_links l on l.owner = h.owner_id
    where h.id = hid and l.viewer = auth.uid()
  )
$$;
revoke all on function public.heir_can_view_household(uuid) from public, anon;
grant execute on function public.heir_can_view_household(uuid) to authenticated;

-- Read-only access for a linked account, added beside each table's existing owner policy.
drop policy if exists heir_households_linked_read on public.heir_households;
create policy heir_households_linked_read on public.heir_households for select to authenticated
  using (public.heir_can_view_household(id));
drop policy if exists heir_members_linked_read on public.heir_members;
create policy heir_members_linked_read on public.heir_members for select to authenticated
  using (public.heir_can_view_household(household_id));
drop policy if exists heir_progress_linked_read on public.heir_progress;
create policy heir_progress_linked_read on public.heir_progress for select to authenticated
  using (public.heir_can_view_household(household_id));
drop policy if exists heir_reviews_linked_read on public.heir_reviews;
create policy heir_reviews_linked_read on public.heir_reviews for select to authenticated
  using (public.heir_can_view_household(household_id));

-- Invites to link: single use, good for a week, made and accepted only through the functions below.
create table if not exists public.heir_invites (
  code       text primary key,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  used_by    uuid references auth.users (id) on delete set null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
alter table public.heir_invites enable row level security;
drop policy if exists heir_invites_read on public.heir_invites;
create policy heir_invites_read on public.heir_invites for select to authenticated
  using (created_by = (select auth.uid()));
revoke all on public.heir_invites from anon, authenticated;
grant select on public.heir_invites to authenticated;

create or replace function public.heir_create_invite() returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  c := replace(gen_random_uuid()::text, '-', '');
  insert into public.heir_invites (code, created_by) values (c, auth.uid());
  return c;
end $$;

-- Accepting links the two accounts, each able to view the other. Returns the inviter's account id.
create or replace function public.heir_accept_invite(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv public.heir_invites%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  select * into inv from public.heir_invites where code = p_code for update;
  if not found then raise exception 'This invite isn''t valid.'; end if;
  if inv.created_by = auth.uid() then raise exception 'This is your own invite. Send it to someone else.'; end if;
  -- Already linked (for example the link was opened twice): nothing more to do.
  if exists (select 1 from public.heir_links where viewer = auth.uid() and owner = inv.created_by) then return inv.created_by; end if;
  if inv.used_by is not null or inv.expires_at < now() then raise exception 'This invite has expired or was already used.'; end if;
  insert into public.heir_links (viewer, owner) values (inv.created_by, auth.uid()), (auth.uid(), inv.created_by) on conflict do nothing;
  update public.heir_invites set used_by = auth.uid(), used_at = now() where code = p_code;
  return inv.created_by;
end $$;

-- Either side can remove the link. Nobody's progress or account is deleted.
create or replace function public.heir_unlink(p_other uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  delete from public.heir_links
   where (viewer = auth.uid() and owner = p_other) or (viewer = p_other and owner = auth.uid());
end $$;

revoke all on function public.heir_create_invite() from public, anon;
revoke all on function public.heir_accept_invite(text) from public, anon;
revoke all on function public.heir_unlink(uuid) from public, anon;
grant execute on function public.heir_create_invite() to authenticated;
grant execute on function public.heir_accept_invite(text) to authenticated;
grant execute on function public.heir_unlink(uuid) to authenticated;
