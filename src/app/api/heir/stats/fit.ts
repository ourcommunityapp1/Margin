import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fitAndCheck, pointsFrom, type AnswerForFit, type Point } from '@/heir/calibrate';
import { MODEL_VERSION, setPopulationCal, type Cal } from '@/heir/memory';

// The daily fit (ADR-001 Decision 7): from every answer that carries the model's prediction, correct the population's chance,
// and each person's once they have enough answers of their own. A fit is kept only if it predicts the newest answers better.
const POPULATION_MIN = 300, MEMBER_MIN = 400;

export async function fitAll(db: SupabaseClient): Promise<{ population: boolean; members: number; answers: number }> {
  const by = new Map<string, Point[]>();
  let answers = 0;
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('heir_answers').select('member_id, kind, correct, hints, misses, words, p_recall, session_at')
      .eq('model_version', MODEL_VERSION).not('p_recall', 'is', null).in('kind', ['type', 'say']).order('session_at').order('id').range(from, from + 999);
    if (error) throw error;
    for (const r of (data ?? []) as (AnswerForFit & { member_id: string })[]) {
      const pts = pointsFrom([r]);
      if (pts.length) { (by.get(r.member_id) ?? by.set(r.member_id, []).get(r.member_id)!).push(...pts); answers++; }
    }
    if (!data || data.length < 1000) break;
  }
  const row = (scope: 'population' | 'member', memberId: string | null, f: NonNullable<ReturnType<typeof fitAndCheck>>) => ({
    scope, member_id: memberId, model_version: MODEL_VERSION, a: f.cal.a, b: f.cal.b, n: f.n, loss_before: f.lossBefore, loss_after: f.lossAfter,
  });
  const rows = [];
  const pop = fitAndCheck([...by.values()].flat(), POPULATION_MIN);
  if (pop) rows.push(row('population', null, pop));
  let members = 0;
  for (const [memberId, pts] of by) {
    const f = fitAndCheck(pts, MEMBER_MIN);
    if (f) { rows.push(row('member', memberId, f)); members++; }
  }
  if (rows.length) { const { error } = await db.from('heir_model_params').insert(rows); if (error) throw error; }
  return { population: !!pop, members, answers };
}

/** The latest population correction, applied for this request (so what is "in memory" uses it). */
export async function loadPopulationCal(db: SupabaseClient): Promise<Cal | null> {
  const { data } = await db.from('heir_model_params').select('a, b').eq('scope', 'population').eq('model_version', MODEL_VERSION).order('fitted_at', { ascending: false }).limit(1).maybeSingle();
  const cal = data ? { a: Number(data.a), b: Number(data.b) } : null;
  setPopulationCal(cal);
  return cal;
}
