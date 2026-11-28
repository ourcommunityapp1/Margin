-- Heir: each answer also records how many words its text had, so "Nearly" (a couple of slipped words) can be told from a
-- real miss on the server the same way it is on the phone. Older answers have none (treated as a longer text). Safe to run twice.
alter table public.heir_answers add column if not exists words smallint check (words is null or words >= 0);
