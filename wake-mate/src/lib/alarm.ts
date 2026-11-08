import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Channels are immutable after creation on Android, so a changed config needs a new id.
export const ALARM_CHANNEL = 'wake-alarm-v2';
export const ALARM_ID = 'wake-alarm';
export const TEST_ALARM_ID = 'wake-alarm-test';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupAlarmChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ALARM_CHANNEL, {
    name: 'Wake-up alarm',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 300, 500, 300, 500],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    // Alarm audio usage so the volume follows the alarm stream, not the notification stream.
    audioAttributes: {
      usage: Notifications.AndroidAudioUsage.ALARM,
      contentType: Notifications.AndroidAudioContentType.SONIFICATION,
    },
  });
}

export async function requestAlarmPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/** Without exact-alarm permission, Android may fire the alarm minutes late. */
export async function canScheduleExactAlarms(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    return (await Notifications.getExactAlarmPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Opens the system screen for "Alarms & reminders". Resolves with the new state. */
export async function requestExactAlarms(): Promise<boolean> {
  try {
    return (await Notifications.requestExactAlarmPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/**
 * Replaces the existing alarm with one repeating daily at the given local time.
 * `alarmClock` delivery uses AlarmManager.setAlarmClock, which the system does not defer
 * for battery optimisation (the default `bestEffort` can be delayed by minutes on some OEMs).
 */
export async function scheduleDailyAlarm(hour: number, minute: number) {
  await setupAlarmChannel();
  await cancelAlarm();
  return Notifications.scheduleNotificationAsync({
    identifier: ALARM_ID,
    content: {
      title: 'Time to wake up ☀️',
      body: 'Your Wake Mate is waiting. Tap to say you are up.',
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
      data: { kind: 'wake-alarm' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: ALARM_CHANNEL,
      delivery: 'alarmClock',
    },
  });
}

/** Fires once in 60 s so users can lock the phone and check the alarm really rings. */
export async function scheduleTestAlarm() {
  await setupAlarmChannel();
  return Notifications.scheduleNotificationAsync({
    identifier: TEST_ALARM_ID,
    content: {
      title: 'Test alarm ⏰',
      body: 'If you heard this with the screen off, your alarm will work.',
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
      data: { kind: 'wake-alarm-test' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 60,
      channelId: ALARM_CHANNEL,
    },
  });
}

/** Cancels only Wake Mate's own alarm, not every scheduled notification. */
export async function cancelAlarm() {
  await Notifications.cancelScheduledNotificationAsync(ALARM_ID).catch(() => undefined);
}

/**
 * Minute-of-day in UTC for the NEXT occurrence of a local wake time, so matching works across
 * timezones and stays correct after a daylight-saving change (recomputed on each enrolment).
 */
export function localToUtcMinute(hour: number, minute: number, now = new Date()): number {
  const d = new Date(now);
  d.setHours(hour, minute, 0, 0);
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/** Formats using the device's 12/24-hour preference. */
export function formatTime(hour: number, minute: number): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
