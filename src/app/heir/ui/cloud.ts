'use client';

// Heir's connection to its database. Null when Heir's database settings aren't set; the app then keeps
// the household and progress on this device only.

import type { SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
import { HEIR_SUPABASE_KEY, HEIR_SUPABASE_URL, heirCloudConfigured } from '@/heir/env';
import { fromRows, removedMemberIds, toRows, type HouseholdRow, type MemberRow } from '@/heir/sync';
import type { Household } from '@/heir/types';
import { mergeProgress, parseProgress, sameProgress, type MemberProgress } from '@/heir/progress';
import { toAnswerRows, unsent } from '@/heir/answers';
import type { Board, BoardStatus, Period } from '@/heir/board';
import type { Plan } from '@/heir/types';

let client: SupabaseClient | null = null;

export function cloud(): SupabaseClient | null {
  if (!heirCloudConfigured()) return null;
  client ??= createBrowserClient(HEIR_SUPABASE_URL, HEIR_SUPABASE_KEY);
  return client;
}

/** This phone's time zone (an IANA name such as America/Chicago), so the server works out local days the way the phone does. */
function timeZone(): string | null {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch { return null; }
}

export interface Remote { householdId: string; household: Household; memberRows: MemberRow[] }

// The signed-in account's own household. (A linked account's household is readable too, so this asks for its own.)
export async function loadRemote(db: SupabaseClient): Promise<Remote | null> {
  const { data: session } = await db.auth.getSession();
  const me = session.session?.user.id;
  if (!me) return null;
  const { data: hh, error } = await db.from('heir_households').select('id, plan, active_member_id').eq('owner_id', me).maybeSingle();
  if (error) throw error;
  if (!hh) return null;
  const { data: members, error: e2 } = await db.from('heir_members').select('id, household_id, name, track, created_at').eq('household_id', hh.id).is('deleted_at', null);
  if (e2) throw e2;
  const rows = (members ?? []) as MemberRow[];
  return { householdId: hh.id, household: fromRows(hh as HouseholdRow, rows), memberRows: rows };
}

// Writes the whole household. Small enough that sending it all is simpler and safer than tracking edits.
export async function saveRemote(db: SupabaseClient, h: Household, known: Remote | null): Promise<Remote> {
  let householdId = known?.householdId;
  if (!householdId) {
    const { data, error } = await db.from('heir_households').insert({ plan: h.plan, active_member_id: h.activeMemberId }).select('id').single();
    if (error) throw error;
    householdId = data.id as string;
  }
  const rows = toRows(h, householdId);
  if (rows.members.length) {
    // deleted_at: null also brings back a person who was removed (their row, and so their progress, is still there).
    const { error } = await db.from('heir_members').upsert(rows.members.map((m) => ({ ...m, deleted_at: null })));
    if (error) throw error;
  }
  // A removed person is only marked removed, so their lessons, stones and days stay for 30 days and can be brought back.
  const gone = removedMemberIds(known?.memberRows ?? [], h);
  if (gone.length) {
    const { error } = await db.from('heir_members').update({ deleted_at: new Date().toISOString() }).in('id', gone);
    if (error) throw error;
  }
  const { error } = await db.from('heir_households').update({ plan: rows.household.plan, active_member_id: rows.household.active_member_id, tz: timeZone(), updated_at: new Date().toISOString() }).eq('id', householdId);
  if (error) throw error;
  return { householdId, household: h, memberRows: rows.members };
}

// ---- Progress: one row per member. Reads merge the account's copy into this phone's; writes first read the
// account's copy and merge it in, so a lesson done on another phone in the meantime is kept, never overwritten.

export async function loadProgressRows(db: SupabaseClient, householdId: string): Promise<Record<string, MemberProgress>> {
  const { data, error } = await db.from('heir_progress').select('member_id, data').eq('household_id', householdId);
  if (error) throw error;
  const raw = Object.fromEntries((data ?? []).map((r) => [r.member_id as string, r.data]));
  return parseProgress(JSON.stringify(raw));
}

/** Merge these members' progress with the account's and save the result there. Returns what was saved. */
export async function saveProgressRows(db: SupabaseClient, householdId: string, mine: Record<string, MemberProgress>): Promise<Record<string, MemberProgress>> {
  const ids = Object.keys(mine);
  if (!ids.length) return {};
  const theirs = await loadProgressRows(db, householdId);
  const merged = Object.fromEntries(ids.map((id) => [id, theirs[id] ? mergeProgress(theirs[id], mine[id]) : mine[id]]));
  const changed = ids.filter((id) => !theirs[id] || !sameProgress(theirs[id], merged[id]));
  if (changed.length) {
    const at = new Date().toISOString();
    const { error } = await db.from('heir_progress').upsert(changed.map((id) => ({ member_id: id, household_id: householdId, data: merged[id], updated_at: at })));
    if (error) throw error;
  }
  // Every answer also goes up as its own row, so the account keeps the whole history even though the phone trims its copy.
  // A failure here never fails the save above: the same answers are sent again next time.
  await sendAnswers(db, householdId, merged).catch(() => { /* retried on the next save */ });
  return merged;
}

// ---- Answers: one row each. This phone remembers, per person, the time of the newest answer it has sent.
const SENT_KEY = 'heir-answers-sent-v1';
const readSent = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(SENT_KEY) ?? '{}') ?? {}; } catch { return {}; } };
const writeSent = (s: Record<string, string>) => { try { localStorage.setItem(SENT_KEY, JSON.stringify(s)); } catch { /* storage full or blocked: everything is sent again next time, harmlessly */ } };

/** Send answers this phone hasn't sent yet. Sending one twice is harmless (same id, ignored). */
export async function sendAnswers(db: SupabaseClient, householdId: string, progress: Record<string, MemberProgress>): Promise<void> {
  const sent = readSent();
  for (const [memberId, p] of Object.entries(progress)) {
    const fresh = unsent(p.log, sent[memberId] ?? '');
    if (!fresh.length) continue;
    const rows = toAnswerRows(householdId, memberId, fresh);
    for (let i = 0; i < rows.length; i += 400) {
      const { error } = await db.from('heir_answers').upsert(rows.slice(i, i + 400), { onConflict: 'id', ignoreDuplicates: true });
      if (error) throw error;
    }
    sent[memberId] = fresh[fresh.length - 1].at;
    writeSent(sent);
  }
}

// ---- Linking two accounts (a couple): each can VIEW the other's family and progress, and nothing more. The database
// allows only reading across a link; changing or deleting anything of the other's is refused there.

/** Make a single-use link invite (good for a week) to send to the other person. */
export async function createInvite(db: SupabaseClient): Promise<string> {
  const { data, error } = await db.rpc('heir_create_invite');
  if (error) throw error;
  return data as string;
}

/** Accept an invite: links this account with the one that made it. Throws an Error whose message says why not. */
export async function acceptInvite(db: SupabaseClient, code: string): Promise<void> {
  const { error } = await db.rpc('heir_accept_invite', { p_code: code });
  if (error) throw new Error(error.message || 'That invite didn’t work.');
}

export async function unlinkAccount(db: SupabaseClient, ownerId: string): Promise<void> {
  const { error } = await db.rpc('heir_unlink', { p_other: ownerId });
  if (error) throw error;
}

export interface LinkedAccount {
  ownerId: string;
  plan: Plan | null;
  members: { id: string; name: string; track: 'adult' | 'child' }[];
  progress: Record<string, MemberProgress>;
}

/** Every account linked to this one, with its family and their progress, for reading only. */
export async function loadLinked(db: SupabaseClient): Promise<LinkedAccount[]> {
  const { data: session } = await db.auth.getSession();
  const me = session.session?.user.id;
  if (!me) return [];
  const { data: hhs, error } = await db.from('heir_households').select('id, owner_id, plan').neq('owner_id', me);
  if (error) throw error;
  if (!hhs?.length) return [];
  const ids = hhs.map((h) => h.id as string);
  const [{ data: members, error: e2 }, { data: rows, error: e3 }] = await Promise.all([
    db.from('heir_members').select('id, household_id, name, track, created_at').in('household_id', ids).is('deleted_at', null).order('created_at'),
    db.from('heir_progress').select('member_id, household_id, data').in('household_id', ids),
  ]);
  if (e2) throw e2;
  if (e3) throw e3;
  const progress = parseProgress(JSON.stringify(Object.fromEntries((rows ?? []).map((r) => [r.member_id as string, r.data]))));
  return hhs.map((h) => {
    const mine = (members ?? []).filter((m) => m.household_id === h.id);
    return {
      ownerId: h.owner_id as string,
      plan: (h.plan as Plan | null) ?? null,
      members: mine.map((m) => ({ id: m.id as string, name: m.name as string, track: m.track === 'child' ? 'child' as const : 'adult' as const })),
      progress: Object.fromEntries(mine.filter((m) => progress[m.id as string]).map((m) => [m.id as string, progress[m.id as string]])),
    };
  });
}

// ---- Friends. Everything goes through database functions that decide what each person may see (see
// supabase/migrations/20261126000000_heir_friends.sql); the app never reads other people's rows directly.

export interface MyProfile {
  username: string; first_name: string; last_name: string; city: string | null; region: string | null;
  discoverable: boolean; fof_visible: boolean; friends_count: number; member_id: string | null; username_changed_at: string | null;
}
export type Relation = 'none' | 'friend' | 'requested' | 'incoming' | 'me';
export interface Person {
  username: string; name: string; city: string | null; region: string | null; friends_count: number; mutual: number; relation: Relation;
  friends_since?: string | null; words_in_memory?: number; stones?: number[]; streak?: number; last_day?: string | null;
  courses?: { course: string; learned: number; total: number }[]; friends?: { username: string; name: string }[];
}
export interface FriendRow { username: string; name: string; city: string | null; region: string | null; friends_since: string; words_in_memory: number; streak: number; last_day: string | null }
export interface RequestRow { id: string; username: string; name: string; city?: string | null; region?: string | null; friends_count?: number; mutual?: number; created_at: string }

async function call<T>(db: SupabaseClient, fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(error.message || 'Something went wrong. Try again.');
  return data as T;
}

export const getProfile = (db: SupabaseClient) => call<MyProfile | null>(db, 'heir_profile_get');
export const usernameFree = (db: SupabaseClient, name: string) => call<boolean>(db, 'heir_username_free', { p_name: name });
export const saveProfile = (db: SupabaseClient, p: { first: string; last: string; username: string; city: string; region: string; discoverable: boolean; fof: boolean; ageOk: boolean }) =>
  call<MyProfile>(db, 'heir_profile_save', { p_first: p.first, p_last: p.last, p_username: p.username, p_city: p.city, p_region: p.region, p_discoverable: p.discoverable, p_fof: p.fof, p_age_ok: p.ageOk });
export const deleteProfile = (db: SupabaseClient) => call<void>(db, 'heir_profile_delete');
export const searchPeople = (db: SupabaseClient, q: string) => call<Person[]>(db, 'heir_search', { p_q: q });
export const viewPerson = (db: SupabaseClient, username: string) => call<Person | null>(db, 'heir_profile_view', { p_username: username });
export const listFriends = (db: SupabaseClient) => call<FriendRow[]>(db, 'heir_friends_list');
export const listRequests = (db: SupabaseClient) => call<{ incoming: RequestRow[]; outgoing: RequestRow[] }>(db, 'heir_requests_list');
export const sendRequest = (db: SupabaseClient, username: string) => call<'requested' | 'friends'>(db, 'heir_request_send', { p_username: username });
export const answerRequest = (db: SupabaseClient, id: string, accept: boolean) => call<void>(db, 'heir_request_answer', { p_id: id, p_accept: accept });
export const cancelRequest = (db: SupabaseClient, id: string) => call<void>(db, 'heir_request_cancel', { p_id: id });
export const createFriendInvite = (db: SupabaseClient) => call<string>(db, 'heir_friend_invite_create');
export const peekFriendInvite = (db: SupabaseClient, code: string) => call<{ status: 'ok' | 'friends' | 'used' | 'own' | 'invalid'; name?: string; username?: string }>(db, 'heir_friend_invite_peek', { p_code: code });
export const acceptFriendInvite = (db: SupabaseClient, code: string) => call<{ name: string; username: string }>(db, 'heir_friend_invite_accept', { p_code: code });
export const unfriend = (db: SupabaseClient, username: string) => call<void>(db, 'heir_unfriend', { p_username: username });
export const blockPerson = (db: SupabaseClient, username: string) => call<void>(db, 'heir_block', { p_username: username });
export const reportPerson = (db: SupabaseClient, username: string, reason: 'name' | 'username' | 'abuse' | 'other', note = '') => call<void>(db, 'heir_report', { p_username: username, p_reason: reason, p_note: note });

/** Ask the server to work out this person's numbers for friends (it reads their answers; nothing is sent from the phone). */
export async function refreshStatsOnServer(db: SupabaseClient): Promise<void> {
  const { data: session } = await db.auth.getSession();
  const token = session.session?.access_token;
  if (!token) return;
  const res = await fetch('/api/heir/stats', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok && res.status !== 404) throw new Error('stats not updated');
}

// ---- The community leaderboard (see supabase/migrations/20261130000000_heir_board.sql).
export const getBoard = (db: SupabaseClient, period: Period) => call<Board>(db, 'heir_board', { p_period: period });
export const getBoardStatus = (db: SupabaseClient) => call<BoardStatus>(db, 'heir_board_status');
export const markBoardSeen = (db: SupabaseClient, period: Period) => call<void>(db, 'heir_board_seen_mark', { p_period: period });
