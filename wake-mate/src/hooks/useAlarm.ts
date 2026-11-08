import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import {
  cancelAlarm,
  canScheduleExactAlarms,
  requestAlarmPermission,
  requestExactAlarms,
  scheduleDailyAlarm,
} from '../lib/alarm';
import { DEFAULT_ALARM, loadAlarm, saveAlarm, type SavedAlarm } from '../lib/alarmStore';

export function useAlarm() {
  const [alarm, setAlarm] = useState<SavedAlarm>(DEFAULT_ALARM);
  const [hydrated, setHydrated] = useState(false);
  const [exactOk, setExactOk] = useState(true);
  const [notificationsDenied, setNotificationsDenied] = useState(false);

  const refreshExact = useCallback(async () => setExactOk(await canScheduleExactAlarms()), []);

  useEffect(() => {
    void loadAlarm().then((a) => {
      setAlarm(a);
      setHydrated(true);
    });
    void refreshExact();
    // The user may have changed "Alarms & reminders" in system settings while we were away.
    const sub = AppState.addEventListener('change', (s) => s === 'active' && void refreshExact());
    return () => sub.remove();
  }, [refreshExact]);

  /** Schedules the daily alarm. Returns false if notifications are not allowed. */
  const turnOn = useCallback(
    async (hour: number, minute: number) => {
      if (!(await requestAlarmPermission())) {
        setNotificationsDenied(true);
        return false;
      }
      setNotificationsDenied(false);
      await scheduleDailyAlarm(hour, minute);
      const next = { hour, minute, on: true };
      setAlarm(next);
      await saveAlarm(next);
      void refreshExact();
      return true;
    },
    [refreshExact],
  );

  const turnOff = useCallback(async () => {
    await cancelAlarm();
    const next = { ...alarm, on: false };
    setAlarm(next);
    await saveAlarm(next);
  }, [alarm]);

  const allowExact = useCallback(async () => setExactOk(await requestExactAlarms()), []);

  return { alarm, hydrated, exactOk, notificationsDenied, turnOn, turnOff, allowExact };
}
