-- Deep Think: a private thinking journal.
--
-- Four tables, all prefixed think_ so they sit beside the listening app's tables without
-- touching them. Every row belongs to one signed-in user, and row-level security lets a user
-- see and change only their own rows. Nothing here is readable with the publishable key alone.
--
-- Apply with the Supabase CLI (`supabase db push`) or by pasting this file into the SQL editor.
-- See docs/journal/RUNNING.md. It is safe to run more than once.

-- The onboarding choices: what you tend to think about, and what you want help with.
create table if not exists public.think_profiles (
  user_id      uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  topics       text[] not null default '{}',
  goals        text[] not null default '{}',
  onboarded_at timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.think_folders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 80),
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- A note. `paragraphs` holds the user's own words and is the source of truth. `layout` is a
-- chosen arrangement of those same words ({ label, blocks: [{ k, v }] }), or null for the
-- original. `transcript` keeps the words as they were heard, before punctuation and spacing.
create table if not exists public.think_notes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  folder_id    uuid references public.think_folders (id) on delete set null,
  title        text not null default '',
  -- True once the user has edited the title. The app never changes it after that.
  title_edited boolean not null default false,
  paragraphs   jsonb not null default '[]'::jsonb,
  layout       jsonb,
  transcript   text not null default '',
  -- Words the transcription wasn't sure of: [{ word, context }]. Shown as questions.
  unclear      jsonb not null default '[]'::jsonb,
  -- The authorship trail: { punctuation, paragraphs, flagged }.
  trail        jsonb not null default '{}'::jsonb,
  -- express | explore | explain | persuade | tell, once the coach has read the note.
  perspective  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists think_notes_user_updated on public.think_notes (user_id, updated_at desc);
create index if not exists think_notes_folder on public.think_notes (folder_id);

-- Every time a note is reformatted or reverted, the state it had before is kept here, so the
-- original (and every step since) can always be brought back.
create table if not exists public.think_note_versions (
  id         uuid primary key default gen_random_uuid(),
  note_id    uuid not null references public.think_notes (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label      text not null default 'Original',
  title      text not null default '',
  paragraphs jsonb not null default '[]'::jsonb,
  layout     jsonb,
  reason     text not null default 'reformat' check (reason in ('reformat', 'revert', 'edit')),
  created_at timestamptz not null default now()
);

create index if not exists think_note_versions_note on public.think_note_versions (note_id, created_at desc);

-- Row-level security: each user sees only their own rows.
alter table public.think_profiles      enable row level security;
alter table public.think_folders       enable row level security;
alter table public.think_notes         enable row level security;
alter table public.think_note_versions enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['think_profiles', 'think_folders', 'think_notes', 'think_note_versions'] loop
    execute format('drop policy if exists %I on public.%I', t || '_own_rows', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t || '_own_rows', t
    );
  end loop;
end $$;

-- Signed-out visitors get nothing at all.
revoke all on public.think_profiles, public.think_folders, public.think_notes, public.think_note_versions from anon;
grant select, insert, update, delete on public.think_profiles, public.think_folders, public.think_notes, public.think_note_versions to authenticated;

-- A version may only be attached to a note its author owns, and a note only to its author's folder.
create or replace function public.think_check_owner() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_table_name = 'think_note_versions' then
    if not exists (select 1 from public.think_notes n where n.id = new.note_id and n.user_id = new.user_id) then
      raise exception 'note does not belong to this user';
    end if;
  elsif new.folder_id is not null then
    if not exists (select 1 from public.think_folders f where f.id = new.folder_id and f.user_id = new.user_id) then
      raise exception 'folder does not belong to this user';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists think_note_versions_owner on public.think_note_versions;
create trigger think_note_versions_owner before insert or update on public.think_note_versions
  for each row execute function public.think_check_owner();

drop trigger if exists think_notes_owner on public.think_notes;
create trigger think_notes_owner before insert or update on public.think_notes
  for each row execute function public.think_check_owner();
