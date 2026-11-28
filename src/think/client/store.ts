// Where notes live. With an account they sync to Supabase (private to their owner by row-level
// security) and a copy is kept on the device, so a note is never lost to a dropped connection.
// Without an account they are kept on this device only.

import type { SupabaseClient } from '@supabase/supabase-js';
import { emptyTrail, type Folder, type Note, type NoteVersion, type Profile } from '../types.ts';

export interface Store {
  kind: 'device' | 'cloud';
  profile(): Promise<Profile | null>;
  saveProfile(p: Profile): Promise<void>;
  folders(): Promise<Folder[]>;
  addFolders(names: string[]): Promise<Folder[]>;
  notes(): Promise<Note[]>;
  note(id: string): Promise<Note | null>;
  saveNote(n: Note): Promise<void>;
  deleteNote(id: string): Promise<void>;
  addVersion(v: NoteVersion): Promise<void>;
  versions(noteId: string): Promise<NoteVersion[]>;
  // True when the last save reached its destination.
  synced(): boolean;
}

const uuid = () => crypto.randomUUID();

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is full or blocked (private browsing). The note stays in memory for this visit.
  }
}

const byUpdated = (a: Note, b: Note) => b.updatedAt.localeCompare(a.updatedAt);

export function deviceStore(prefix = 'dt:'): Store & { putNotes(notes: Note[]): void; putFolders(f: Folder[]): void } {
  const k = (name: string) => prefix + name;
  const notes = () => read<Record<string, Note>>(k('notes'), {});
  return {
    kind: 'device',
    async profile() { return read<Profile | null>(k('profile'), null); },
    async saveProfile(p) { write(k('profile'), p); },
    async folders() { return read<Folder[]>(k('folders'), []).sort((a, b) => a.position - b.position); },
    async addFolders(names) {
      const all = read<Folder[]>(k('folders'), []);
      for (const name of names) {
        if (!all.some((f) => f.name.toLowerCase() === name.toLowerCase())) all.push({ id: uuid(), name, position: all.length });
      }
      write(k('folders'), all);
      return all;
    },
    async notes() { return Object.values(notes()).sort(byUpdated); },
    async note(id) { return notes()[id] ?? null; },
    async saveNote(n) { write(k('notes'), { ...notes(), [n.id]: n }); },
    async deleteNote(id) {
      const all = notes();
      delete all[id];
      write(k('notes'), all);
      write(k('versions'), read<NoteVersion[]>(k('versions'), []).filter((v) => v.noteId !== id));
    },
    async addVersion(v) { write(k('versions'), [...read<NoteVersion[]>(k('versions'), []), v]); },
    async versions(noteId) {
      return read<NoteVersion[]>(k('versions'), []).filter((v) => v.noteId === noteId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    synced: () => true,
    putNotes(list) { write(k('notes'), Object.fromEntries(list.map((n) => [n.id, n]))); },
    putFolders(f) { write(k('folders'), f); },
  };
}

// ---- Supabase ----------------------------------------------------------------------------------

interface NoteRow {
  id: string; folder_id: string | null; title: string; title_edited: boolean; paragraphs: string[];
  layout: Note['layout']; transcript: string; unclear: Note['unclear']; trail: Partial<Note['trail']> | null;
  perspective: string | null; created_at: string; updated_at: string;
}

const toRow = (n: Note): NoteRow => ({
  id: n.id, folder_id: n.folderId, title: n.title, title_edited: n.titleEdited, paragraphs: n.paragraphs,
  layout: n.layout, transcript: n.transcript, unclear: n.unclear, trail: n.trail, perspective: n.perspective,
  created_at: n.createdAt, updated_at: n.updatedAt,
});

const fromRow = (r: NoteRow): Note => ({
  id: r.id, folderId: r.folder_id, title: r.title, titleEdited: r.title_edited, paragraphs: r.paragraphs ?? [],
  layout: r.layout ?? null, transcript: r.transcript ?? '', unclear: r.unclear ?? [], trail: { ...emptyTrail(), ...(r.trail ?? {}) },
  perspective: r.perspective, createdAt: r.created_at, updatedAt: r.updated_at,
});

export function cloudStore(db: SupabaseClient, userId: string): Store {
  const local = deviceStore(`dt:${userId}:`);
  const dirtyKey = `dt:${userId}:dirty`;
  const dirty = () => new Set(read<string[]>(dirtyKey, []));
  const mark = (id: string, on: boolean) => {
    const d = dirty();
    if (on) d.add(id); else d.delete(id);
    write(dirtyKey, [...d]);
  };
  const push = async (n: Note) => {
    const { error } = await db.from('think_notes').upsert(toRow(n));
    if (error) throw error;
    mark(n.id, false);
  };
  // Send anything that was saved while offline.
  const flush = async () => {
    for (const id of dirty()) {
      const n = await local.note(id);
      if (n) await push(n); else mark(id, false);
    }
  };
  return {
    kind: 'cloud',
    async profile() {
      const { data, error } = await db.from('think_profiles').select('topics, goals, onboarded_at').maybeSingle();
      if (error) return local.profile();
      const p = data ? { topics: data.topics, goals: data.goals, onboardedAt: data.onboarded_at } : null;
      if (p) await local.saveProfile(p);
      return p;
    },
    async saveProfile(p) {
      await local.saveProfile(p);
      const { error } = await db.from('think_profiles').upsert({ user_id: userId, topics: p.topics, goals: p.goals, onboarded_at: p.onboardedAt, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    async folders() {
      const { data, error } = await db.from('think_folders').select('id, name, position').order('position');
      if (error) return local.folders();
      local.putFolders(data);
      return data;
    },
    async addFolders(names) {
      const existing = await this.folders();
      const fresh = names.filter((n) => !existing.some((f) => f.name.toLowerCase() === n.toLowerCase()));
      if (fresh.length) {
        const { error } = await db.from('think_folders').insert(fresh.map((name, i) => ({ name, position: existing.length + i })));
        if (error) throw error;
      }
      return this.folders();
    },
    async notes() {
      try {
        await flush();
        const { data, error } = await db.from('think_notes').select('*').order('updated_at', { ascending: false });
        if (error) throw error;
        const list = (data as NoteRow[]).map(fromRow);
        local.putNotes(list);
        return list;
      } catch {
        return local.notes();
      }
    },
    async note(id) {
      if (dirty().has(id)) return local.note(id);
      const { data, error } = await db.from('think_notes').select('*').eq('id', id).maybeSingle();
      if (error) return local.note(id);
      return data ? fromRow(data as NoteRow) : null;
    },
    async saveNote(n) {
      await local.saveNote(n);
      mark(n.id, true);
      try { await push(n); } catch { /* kept on the device; sent on the next save or load */ }
    },
    async deleteNote(id) {
      await local.deleteNote(id);
      mark(id, false);
      const { error } = await db.from('think_notes').delete().eq('id', id);
      if (error) throw error;
    },
    async addVersion(v) {
      await local.addVersion(v);
      // The note must exist remotely before a version can point at it.
      const n = await local.note(v.noteId);
      if (n && dirty().has(n.id)) await push(n).catch(() => {});
      await db.from('think_note_versions').insert({ id: v.id, note_id: v.noteId, label: v.label, title: v.title, paragraphs: v.paragraphs, layout: v.layout, reason: v.reason, created_at: v.createdAt });
    },
    async versions(noteId) {
      const { data, error } = await db.from('think_note_versions').select('*').eq('note_id', noteId).order('created_at', { ascending: false });
      if (error) return local.versions(noteId);
      return data.map((r) => ({ id: r.id, noteId: r.note_id, label: r.label, title: r.title, paragraphs: r.paragraphs, layout: r.layout, reason: r.reason, createdAt: r.created_at }));
    },
    synced: () => dirty().size === 0,
  };
}
