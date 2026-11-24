import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { parseProgress, type MemberProgress } from '@/heir/progress';
import type { AnswerIn, Store } from '@/heir/statsjob';
import type { Track } from '@/heir/types';

// The database as the stats job sees it, through the service key (which lives only in the server's environment).
export function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_HEIR_SUPABASE_URL, key = process.env.HEIR_SUPABASE_SERVICE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
}

export function dbStore(db: SupabaseClient): Store {
  return {
    async profileFor(userId) {
      const { data: p, error } = await db.from('heir_profiles').select('member_id').eq('user_id', userId).maybeSingle();
      if (error) throw error;
      if (!p?.member_id) return null;
      const { data: m, error: e2 } = await db.from('heir_members').select('track, household_id, deleted_at').eq('id', p.member_id).maybeSingle();
      if (e2) throw e2;
      if (!m || m.deleted_at) return null;
      const { data: h } = await db.from('heir_households').select('tz').eq('id', m.household_id).maybeSingle();
      return { memberId: p.member_id as string, track: (m.track === 'child' ? 'child' : 'adult') as Track, tz: (h?.tz as string | null) ?? null };
    },
    async progressFor(memberId): Promise<MemberProgress | null> {
      const { data, error } = await db.from('heir_progress').select('data').eq('member_id', memberId).maybeSingle();
      if (error) throw error;
      return data ? (parseProgress(JSON.stringify({ [memberId]: data.data }))[memberId] ?? null) : null;
    },
    async answersFor(memberId) {
      const out: AnswerIn[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await db.from('heir_answers').select('item_id, kind, correct, hints, ms, review, part, misses, session_at, local_day')
          .eq('member_id', memberId).order('session_at').order('id').range(from, from + 999);
        if (error) throw error;
        out.push(...((data ?? []) as AnswerIn[]));
        if (!data || data.length < 1000) break;
      }
      return out;
    },
    async lastStats(userId) {
      const { data, error } = await db.from('heir_stats').select('words_in_memory, updated_at, source').eq('user_id', userId).maybeSingle();
      if (error) throw error;
      return data ? { words: data.words_in_memory as number, updatedAt: data.updated_at as string, source: data.source as string } : null;
    },
    async save(userId, s, now) {
      const { error } = await db.from('heir_stats').upsert({
        user_id: userId, words_in_memory: s.wordsInMemory, stones: s.stones, streak: s.streak, last_day: s.lastDay, courses: s.courses,
        source: 'server', updated_at: now.toISOString(),
      });
      if (error) throw error;
    },
    async lastRecordedWords(userId) {
      const { data, error } = await db.from('heir_words_history').select('words').eq('user_id', userId).order('at', { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data ? (data.words as number) : null;
    },
    async recordWords(userId, words, now) {
      const { error } = await db.from('heir_words_history').insert({ user_id: userId, at: now.toISOString(), words });
      if (error) throw error;
    },
  };
}
