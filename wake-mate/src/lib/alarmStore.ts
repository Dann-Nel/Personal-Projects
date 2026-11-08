import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'wakemate.alarm.v1';

export type SavedAlarm = { hour: number; minute: number; on: boolean };
export const DEFAULT_ALARM: SavedAlarm = { hour: 7, minute: 0, on: false };

function isValid(v: unknown): v is SavedAlarm {
  if (typeof v !== 'object' || v === null) return false;
  const a = v as Record<string, unknown>;
  return (
    Number.isInteger(a.hour) && (a.hour as number) >= 0 && (a.hour as number) <= 23 &&
    Number.isInteger(a.minute) && (a.minute as number) >= 0 && (a.minute as number) <= 59 &&
    typeof a.on === 'boolean'
  );
}

/** Returns the stored alarm, or the default if nothing valid is stored. */
export async function loadAlarm(): Promise<SavedAlarm> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_ALARM;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : DEFAULT_ALARM;
  } catch {
    return DEFAULT_ALARM;
  }
}

export async function saveAlarm(alarm: SavedAlarm): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(alarm));
  } catch {
    /* non-fatal: the alarm itself is scheduled by the OS */
  }
}
