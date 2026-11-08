import { ensureSession, supabase } from './supabase';

/** Mirrors public.match_view. The mate's identity is never sent to the client. */
export type MatchView = {
  id: string;
  slot_at: string;
  paired: boolean;
  me_awake: boolean;
  mate_awake: boolean;
};

/** PostgREST returns an all-null composite when there is no row. */
function asView(data: unknown): MatchView | null {
  const m = data as Partial<MatchView> | null;
  return m && m.id ? (m as MatchView) : null;
}

export class RateLimitedError extends Error {
  constructor() {
    super('Too many attempts. Try again in a bit.');
  }
}

function fail(error: { code?: string; message: string }): never {
  if (error.code === 'PT429' || /rate limited/i.test(error.message)) throw new RateLimitedError();
  throw new Error(error.message);
}

export async function joinMatch(utcMinute: number): Promise<MatchView | null> {
  await ensureSession();
  const { data, error } = await supabase.rpc('join_match', { p_utc_minute: utcMinute });
  if (error) fail(error);
  return asView(data);
}

export async function currentMatch(): Promise<MatchView | null> {
  await ensureSession();
  const { data, error } = await supabase.rpc('my_current_match');
  if (error) fail(error);
  return asView(data);
}

/** Resolves true if the "I'm up" was accepted (it is only allowed around the slot time). */
export async function markAwake(matchId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('mark_awake', { p_match_id: matchId });
  if (error) fail(error);
  return data === true;
}

export async function leaveMatch(matchId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_match', { p_match_id: matchId });
  if (error) fail(error);
}

export async function blockAndReport(matchId: string, reason?: string): Promise<void> {
  const { error } = await supabase.rpc('block_and_report', {
    p_match_id: matchId,
    p_reason: reason ?? null,
  });
  if (error) fail(error);
}
