-- The five levels (ADR-005): a friend's counts are per level, Familiar to Expert, so five numbers instead of six stones.
-- Rows already saved keep their six numbers until the server next works them out again; the app reads either length
-- (src/heir/stats.ts foldStones). Safe to run more than once.
alter table public.heir_stats drop constraint if exists heir_stats_stones_check;
alter table public.heir_stats add constraint heir_stats_stones_check check (array_length(stones, 1) in (5, 6));
alter table public.heir_stats alter column stones set default '{0,0,0,0,0}';
