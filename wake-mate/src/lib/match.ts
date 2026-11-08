import { ensureSession, supabase } from './supabase';

export type Match = {
  id: string;
  match_date: string;
  wake_utc_minute: number;
  user_a: string;
  user_b: string | null;
  a_awake_at: string | null;
  b_awake_at: string | null;
};

export type MatchView = {
  id: string;
  paired: boolean;
  meAwake: boolean;
  mateAwake: boolean;
};

export async function toView(m: Match | null): Promise<MatchView | null> {
  if (!m || !m.id) return null;
  const me = await ensureSession();
  const iAmA = m.user_a === me;
  return {
    id: m.id,
    paired: m.user_b !== null,
    meAwake: Boolean(iAmA ? m.a_awake_at : m.b_awake_at),
    mateAwake: Boolean(iAmA ? m.b_awake_at : m.a_awake_at),
  };
}

export async function joinMatch(utcMinute: number) {
  await ensureSession();
  const { data, error } = await supabase.rpc('join_match', { p_utc_minute: utcMinute });
  if (error) throw error;
  return toView(data as Match);
}

export async function currentMatch() {
  await ensureSession();
  const { data, error } = await supabase.rpc('my_current_match');
  if (error) throw error;
  return toView(data as Match | null);
}

export async function markAwake(matchId: string) {
  const { error } = await supabase.rpc('mark_awake', { p_match_id: matchId });
  if (error) throw error;
}

export async function leaveMatch(matchId: string) {
  const { error } = await supabase.rpc('leave_match', { p_match_id: matchId });
  if (error) throw error;
}

export async function blockAndReport(matchId: string, reason?: string) {
  const { error } = await supabase.rpc('block_and_report', {
    p_match_id: matchId,
    p_reason: reason ?? null,
  });
  if (error) throw error;
}
