import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlarmClock } from '../components/AlarmClock';
import { Banner } from '../components/Banner';
import { MateCard } from '../components/MateCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAlarm } from '../hooks/useAlarm';
import { useMatch } from '../hooks/useMatch';
import { scheduleTestAlarm } from '../lib/alarm';
import { isBackendConfigured } from '../lib/supabase';
import { colors, space } from '../theme';

export default function Home() {
  const { alarm, hydrated, exactOk, notificationsDenied, turnOn, turnOff, allowExact } = useAlarm();
  const { match, loaded, error, busy, imUp, report, leave, retry } = useMatch(alarm, hydrated);

  // Tapping the alarm notification opens the ringing screen.
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    const id = response?.notification.request.identifier;
    const kind = response?.notification.request.content.data?.kind;
    if (!id || handled.current === id || kind !== 'wake-alarm') return;
    handled.current = id;
    router.push('/ring');
  }, [response]);

  const pickTime = () => {
    const value = new Date();
    value.setHours(alarm.hour, alarm.minute, 0, 0);
    DateTimePickerAndroid.open({
      value,
      mode: 'time',
      onChange: (event, date) => {
        if (event.type !== 'set' || !date) return;
        turnOn(date.getHours(), date.getMinutes()).catch((e) =>
          Alert.alert('Could not set alarm', e instanceof Error ? e.message : String(e)),
        );
      },
    });
  };

  const confirmOff = () =>
    Alert.alert('Turn the alarm off?', 'You will also leave tomorrow\'s match.', [
      { text: 'Keep alarm', style: 'cancel' },
      {
        text: 'Turn off',
        style: 'destructive',
        onPress: () => void Promise.all([turnOff(), leave()]),
      },
    ]);

  const confirmReport = () =>
    Alert.alert('Block and report this mate?', 'You will not be matched with them again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Block', style: 'destructive', onPress: () => void report() },
    ]);

  const testAlarm = () =>
    scheduleTestAlarm().then(() =>
      Alert.alert('Test alarm set', 'Lock your phone. It should ring in about a minute.'),
    );

  if (!hydrated) return <SafeAreaView style={styles.screen} />;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          Wake Mate
        </Text>
        <Text style={styles.sub}>Set an alarm. Get matched with someone waking up at the same time.</Text>

        <AlarmClock hour={alarm.hour} minute={alarm.minute} on={alarm.on} onPress={pickTime} />

        {notificationsDenied && (
          <Banner tone="error" text="Notifications are off, so your alarm cannot ring. Allow them in system settings." />
        )}
        {alarm.on && !exactOk && (
          <Banner
            tone="warn"
            text="Android may ring your alarm a few minutes late. Allow exact alarms for on-time wake-ups."
            actionLabel="Allow exact alarms"
            onAction={() => void allowExact()}
          />
        )}

        {alarm.on && (
          <>
            <PrimaryButton label="Turn alarm off" onPress={confirmOff} variant="ghost" />
            <PrimaryButton label="Test alarm in 1 minute" onPress={testAlarm} variant="link" hint="Rings once so you can check it works with the screen off" />
          </>
        )}

        {alarm.on && isBackendConfigured && error && (
          <Banner tone="error" text={`Could not reach the server. ${error}`} actionLabel="Retry" onAction={retry} />
        )}
        {alarm.on && isBackendConfigured && (
          <MateCard
            match={match}
            loaded={loaded}
            hour={alarm.hour}
            minute={alarm.minute}
            busy={busy}
            onImUp={() => void imUp()}
            onReport={confirmReport}
          />
        )}

        {__DEV__ && !isBackendConfigured && (
          <Banner tone="warn" text="Dev: backend not configured. The alarm works but matching is off. Copy .env.example to .env." />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.xl, gap: space.lg },
  title: { color: colors.text, fontSize: 32, fontWeight: '800', marginTop: space.lg },
  sub: { color: colors.textMuted, fontSize: 16 },
});
