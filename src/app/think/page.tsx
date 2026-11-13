'use client';

// The library: search, folders, recent notes, and one New note button.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { newId } from '@/think/client/session';
import type { Folder, Note } from '@/think/types';
import { CloseIcon, dayLabel, GearIcon, PlusIcon, Quiet, SearchIcon, sectionLabel, Sheet, iconButton } from './ui/bits';
import { useThink } from './ui/provider';

const preview = (n: Note) => {
  const text = n.paragraphs.join(' ');
  return text.length > 96 ? `${text.slice(0, 96).replace(/\s+\S*$/, '')}…` : text;
};
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function Library() {
  const { store, status, email, signOut } = useThink();
  const router = useRouter();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [query, setQuery] = useState('');
  const [folder, setFolder] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.all([store.notes(), store.folders()]).then(([n, f]) => {
      if (!live) return;
      setNotes(n);
      setFolders(f);
    });
    return () => { live = false; };
  }, [store]);

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const n of notes ?? []) if (n.folderId) c.set(n.folderId, (c.get(n.folderId) ?? 0) + 1);
    return c;
  }, [notes]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (notes ?? []).filter((n) =>
      (!folder || n.folderId === folder) &&
      (!q || n.title.toLowerCase().includes(q) || n.paragraphs.join(' ').toLowerCase().includes(q)));
  }, [notes, query, folder]);

  const current = folders.find((f) => f.id === folder);
  const startNote = () => router.push(`/think/note/${newId()}?new=1${folder ? `&folder=${folder}` : ''}`);

  return (
    <main className="dt-screen">
      <div className="dt-top flex flex-col gap-5 px-6">
        <div className="mt-2 flex items-center justify-between">
          <h1 className="serif m-0 text-[32px] font-medium tracking-[-0.5px]">Deep Think</h1>
          <button aria-label="Settings" onClick={() => setSettings(true)} className={`${iconButton} -mr-[11px]`}><GearIcon /></button>
        </div>
        <label className="flex h-11 items-center gap-[10px] rounded-xl bg-[var(--well)] px-[14px] text-[15px] text-[var(--muted)]">
          <SearchIcon />
          <span className="sr-only">Search notes</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your thinking" className="min-w-0 flex-1 border-0 bg-transparent text-[16px] text-[var(--ink)] placeholder:text-[var(--muted)]" />
          {query && <button aria-label="Clear search" onClick={() => setQuery('')} className="-mr-2 flex h-11 w-9 items-center justify-center"><CloseIcon size={16} /></button>}
        </label>
      </div>

      {folders.length > 0 && !query && (
        <section className="px-6 pt-6">
          <h2 className={`${sectionLabel} mb-2 text-[13px]`}>Folders</h2>
          <div className="grid grid-cols-2 gap-[10px]">
            {folders.map((f) => {
              const on = f.id === folder;
              const n = counts.get(f.id) ?? 0;
              return (
                <button key={f.id} onClick={() => setFolder(on ? null : f.id)} aria-pressed={on}
                  className={`flex min-h-[68px] flex-col gap-[6px] rounded-[14px] border bg-white p-[14px] text-left ${on ? 'border-[1.5px] border-[var(--ink)]' : 'border-[var(--line)]'}`}>
                  <span className="text-[15px] font-medium">{f.name}</span>
                  <span className="text-[13px] text-[var(--muted)]">{n === 1 ? '1 note' : `${n} notes`}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="flex flex-col px-6 pb-[120px] pt-6">
        <h2 className={`${sectionLabel} mb-1 text-[13px]`}>{query ? 'Found' : current ? current.name : 'Recent'}</h2>
        {notes === null ? null : shown.length === 0 ? (
          <p className="serif m-0 py-4 text-[17px] leading-[1.5] text-[var(--muted)]">
            {query ? 'Nothing matches that.' : current ? 'Nothing in this folder yet.' : 'Nothing here yet. Tap New note and start talking.'}
          </p>
        ) : shown.map((n, i) => (
          <Link key={n.id} href={`/think/note/${n.id}`} className={`flex flex-col gap-1 py-[14px] text-[var(--ink)] no-underline ${i < shown.length - 1 ? 'border-b border-[var(--line)]' : ''}`}>
            <span className="flex items-baseline justify-between gap-3">
              <span className={`truncate text-[16px] font-semibold ${n.title ? '' : 'text-[var(--faint)]'}`}>{n.title || 'Untitled'}</span>
              <span className="shrink-0 text-[12px] text-[var(--muted)]">{dayLabel(n.updatedAt)}</span>
            </span>
            <span className="serif text-[16px] leading-[1.4] text-[#3D3A35]">{preview(n)}</span>
            {n.perspective && <span className="text-[12px] font-medium text-[var(--accent)]">{capital(n.perspective)}</span>}
          </Link>
        ))}
        {store.kind === 'device' && notes !== null && (
          <div className="pt-6"><Quiet>Notes are kept on this device only. Set up accounts to sync them (see Settings).</Quiet></div>
        )}
      </section>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 flex justify-center">
        <div className="dt-bottom flex w-full max-w-[480px] justify-end px-6 [--pb:38px]">
          <button onClick={startNote} className="pointer-events-auto flex h-14 items-center gap-2 rounded-[28px] bg-[var(--ink)] pl-[18px] pr-[22px] text-[16px] font-medium text-[var(--paper)] shadow-[0_6px_20px_rgba(28,27,25,0.18)]">
            <PlusIcon />New note
          </button>
        </div>
      </div>

      {settings && (
        <Sheet title="Settings" onClose={() => setSettings(false)}>
          <div className="flex flex-col gap-4 pb-2 text-[15px] leading-[1.5]">
            <div className="flex flex-col gap-1">
              <h2 className={sectionLabel}>Your notes</h2>
              {store.kind === 'cloud'
                ? <p className="m-0">Signed in as {email}. Notes sync to your account and only you can read them.</p>
                : <p className="m-0">Kept on this device only. {status.accounts ? '' : 'Sign-in isn’t set up on this server yet, so nothing syncs.'}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <h2 className={sectionLabel}>Listening</h2>
              <p className="m-0">{status.speech ? 'Speech is written down by ElevenLabs.' : 'Using this browser’s built-in speech recognition. Add an ElevenLabs key on the server for better transcripts.'}</p>
            </div>
            <div className="flex flex-col gap-1">
              <h2 className={sectionLabel}>The AI</h2>
              <p className="m-0">{status.ai
                ? 'It adds punctuation and paragraph breaks, suggests a title, and asks questions when you tap Suggestions. It never adds or changes your words.'
                : 'Off: no AI key on the server. Notes get plain spacing only, and prompts aren’t available.'}</p>
            </div>
            <Link href="/think/welcome?edit=1" className="flex h-12 items-center justify-center rounded-[24px] border border-[var(--rule)] text-[15px] text-[var(--ink)] no-underline">Change your topics and goals</Link>
            {store.kind === 'cloud' && (
              <button onClick={() => { signOut(); setSettings(false); }} className="h-12 rounded-[24px] border border-[var(--rule)] text-[15px]">Sign out</button>
            )}
          </div>
        </Sheet>
      )}
    </main>
  );
}
