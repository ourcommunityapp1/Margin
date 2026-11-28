-- Heir: from now on only the server writes the numbers friends see (heir_stats). The phone used to send its own through
-- heir_stats_put; that door is closed and the function removed, so no phone can set its own numbers. Safe to run twice.
drop function if exists public.heir_stats_put(integer, integer[], integer, date, jsonb);
