'use client';

// Onboarding: what you tend to think about (these become the first folders) and what you want
// help with.

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useThink } from '../ui/provider';

const TOPICS = ['Faith', 'Work & career', 'Relationships', 'Ideas', 'Health', 'Parenting', 'Books & learning', 'Decisions', 'Creative work', 'Politics & society'];
const GOALS: [string, string][] = [
  ['Think deeper', 'follow-up questions'],
  ['Think clearer', 'say what you mean'],
  ['Organize my thoughts', 'group and structure'],
  ['Write more', 'gentle nudges'],
  ['Be more persuasive', 'make the case'],
  ['Research', 'reading to go further'],
];

export default function Welcome() {
  const { store, profile, setProfile } = useThink();
  const router = useRouter();
  const [topics, setTopics] = useState<string[]>(profile?.topics ?? []);
  const [goals, setGoals] = useState<string[]>(profile?.goals ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const flip = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const finish = async () => {
    setBusy(true);
    setError('');
    try {
      const p = { topics, goals, onboardedAt: profile?.onboardedAt ?? new Date().toISOString() };
      await store.saveProfile(p);
      await store.addFolders(topics);
      setProfile(p);
      router.replace('/think');
    } catch {
      setError('That didn’t save. Check your connection and try again.');
      setBusy(false);
    }
  };

  return (
    <main className="dt-screen dt-top gap-7 px-6 pb-[140px]">
      <div className="mt-4 flex gap-[6px]" aria-hidden="true">
        <div className="h-[3px] flex-1 rounded-[2px] bg-[var(--ink)]" />
        <div className={`h-[3px] flex-1 rounded-[2px] ${topics.length ? 'bg-[var(--ink)]' : 'bg-[var(--rule)]'}`} />
        <div className={`h-[3px] flex-1 rounded-[2px] ${goals.length ? 'bg-[var(--ink)]' : 'bg-[var(--rule)]'}`} />
      </div>

      <div className="flex flex-col gap-3">
        <h1 className="serif m-0 text-[30px] font-normal leading-[1.2]">What do you tend to think about?</h1>
        <p className="m-0 text-[15px] leading-[1.5] text-[var(--muted)]">These become your first folders. You can change them anytime.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {TOPICS.map((t) => {
          const on = topics.includes(t);
          return (
            <button key={t} aria-pressed={on} onClick={() => setTopics(flip(topics, t))}
              className={`h-11 rounded-[22px] border px-4 text-[15px] ${on ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]' : 'border-[#CFC9BE] bg-transparent'}`}>{t}</button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="serif m-0 text-[24px] font-normal leading-[1.25]">What do you want help with?</h2>
        <div className="flex flex-col gap-2">
          {GOALS.map(([label, hint]) => {
            const on = goals.includes(label);
            return (
              <button key={label} aria-pressed={on} onClick={() => setGoals(flip(goals, label))}
                className={`flex min-h-12 items-center justify-between gap-3 rounded-xl bg-white px-4 py-2 text-left text-[15px] ${on ? 'border-[1.5px] border-[var(--ink)]' : 'border border-[var(--line)]'}`}>
                <span className="font-medium">{label}</span>
                <span className="text-[13px] text-[var(--muted)]">{hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="m-0 text-[14px] text-[var(--accent-deep)]" role="alert">{error}</p>}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 flex justify-center">
        <div className="dt-bottom w-full max-w-[480px] px-6 pt-8 [--pb:34px]" style={{ background: 'linear-gradient(to bottom, rgba(247,245,240,0), #F7F5F0 40%)' }}>
          <button onClick={finish} disabled={busy} className="pointer-events-auto h-14 w-full rounded-[28px] bg-[var(--ink)] text-[16px] font-medium text-[var(--paper)] disabled:opacity-60">
            {busy ? 'Saving\u2026' : 'Continue'}
          </button>
        </div>
      </div>
    </main>
  );
}
