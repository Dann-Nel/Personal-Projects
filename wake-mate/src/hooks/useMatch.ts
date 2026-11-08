import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { localToUtcMinute } from '../lib/alarm';
import type { SavedAlarm } from '../lib/alarmStore';
import {
  blockAndReport,
  currentMatch,
  joinMatch,
  leaveMatch,
  markAwake,
  type MatchView,
} from '../lib/match';
import { isBackendConfigured } from '../lib/supabase';

const POLL_MS = 5_000;
const MAX_BACKOFF_MS = 60_000;

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Keeps the user's match in sync and enrols them in the next wake slot.
 * - polls only while the app is in the foreground, backing off after failures
 * - re-enrols when the time changes, on a new day, or after the user said "I'm up"
 *   (the next slot is computed fresh, so daylight-saving changes are picked up)
 */
export function useMatch(alarm: SavedAlarm, hydrated: boolean) {
  const enabled = isBackendConfigured && hydrated && alarm.on;
  const [match, setMatch] = useState<MatchView | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pollNonce, setPollNonce] = useState(0);
  const lastEnrolledTime = useRef<string | null>(null);
  const lastEnrolKey = useRef<string | null>(null);

  // Polling loop
  useEffect(() => {
    if (!enabled) {
      setMatch(null);
      setLoaded(false);
      setError(null);
      return;
    }
    let cancelled = false;
    let inflight = false;
    let delay = POLL_MS;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      if (inflight || cancelled) return;
      if (AppState.currentState === 'active') {
        inflight = true;
        try {
          const m = await currentMatch();
          if (cancelled) return;
          setMatch(m);
          setError(null);
          delay = POLL_MS;
        } catch (e) {
          if (cancelled) return;
          setError(message(e));
          delay = Math.min(delay * 2, MAX_BACKOFF_MS);
        } finally {
          inflight = false;
          if (!cancelled) setLoaded(true);
        }
      }
      if (!cancelled) timer = setTimeout(tick, delay);
    };

    void tick();
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') return;
      if (timer) clearTimeout(timer);
      delay = POLL_MS;
      void tick();
    });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      sub.remove();
    };
  }, [enabled, pollNonce]);

  // Enrolment
  useEffect(() => {
    if (!enabled || !loaded) return;
    const timeKey = `${alarm.hour}:${alarm.minute}`;
    const needs = lastEnrolledTime.current !== timeKey || !match || match.me_awake;
    const key = `${timeKey}|${new Date().toDateString()}|${match?.id ?? 'none'}|${match?.me_awake ?? ''}`;
    if (!needs || lastEnrolKey.current === key) return;
    lastEnrolKey.current = key;
    joinMatch(localToUtcMinute(alarm.hour, alarm.minute))
      .then((m) => {
        lastEnrolledTime.current = timeKey;
        // keep showing today's match (for "I'm up") until its window closes
        setMatch((cur) => (cur && cur.me_awake ? cur : m));
        setError(null);
      })
      .catch((e) => setError(message(e)));
  }, [enabled, loaded, alarm.hour, alarm.minute, match]);

  const retry = useCallback(() => {
    lastEnrolKey.current = null;
    setError(null);
    setPollNonce((n) => n + 1);
  }, []);

  const run = useCallback(async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      setError(null);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const imUp = useCallback(
    () =>
      run(async () => {
        if (!match) return;
        const ok = await markAwake(match.id);
        if (!ok) throw new Error("It's too early (or too late) to check in for this wake-up.");
        setMatch(await currentMatch());
      }),
    [match, run],
  );

  const report = useCallback(
    () =>
      run(async () => {
        if (!match) return;
        await blockAndReport(match.id);
        setMatch(await currentMatch());
      }),
    [match, run],
  );

  /** Leave the upcoming slot (used when the alarm is switched off). */
  const leave = useCallback(
    () =>
      run(async () => {
        if (match) await leaveMatch(match.id);
        lastEnrolledTime.current = null;
        lastEnrolKey.current = null;
        setMatch(null);
      }),
    [match, run],
  );

  return { match, loaded, error, busy, enabled, imUp, report, leave, retry };
}
