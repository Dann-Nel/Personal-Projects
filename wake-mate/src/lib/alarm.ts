import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const ALARM_CHANNEL = 'wake-alarm';

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
    sound: 'default',
  });
}

export async function requestAlarmPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/** Replaces any existing alarm with one repeating daily at the given local time. */
export async function scheduleDailyAlarm(hour: number, minute: number) {
  await setupAlarmChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time to wake up ☀️',
      body: 'Your Wake Mate is waiting. Tap to say you are up.',
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: ALARM_CHANNEL,
    },
  });
}

export async function cancelAlarm() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Minute-of-day in UTC for a local wake time, so users in any timezone can be matched. */
export function localToUtcMinute(hour: number, minute: number): number {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

export function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
