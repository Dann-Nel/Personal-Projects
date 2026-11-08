import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Banner } from '../components/Banner';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAlarm } from '../hooks/useAlarm';
import { useMatch } from '../hooks/useMatch';
import { formatTime } from '../lib/alarm';
import { colors, space } from '../theme';

/** Opened by tapping the alarm notification: one big "I'm up" button and your mate's status. */
export default function Ring() {
  const { alarm, hydrated } = useAlarm();
  const { match, error, busy, imUp } = useMatch(alarm, hydrated);
  const up = Boolean(match?.me_awake);

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.time} maxFontSizeMultiplier={1.2}>{formatTime(alarm.hour, alarm.minute)}</Text>
      <Text accessibilityRole="header" style={styles.title}>
        {up ? 'Good morning ☀️' : 'Time to wake up'}
      </Text>
      <Text accessibilityLiveRegion="polite" style={styles.status}>
        {!match?.paired
          ? 'No mate yet for this wake-up.'
          : match.mate_awake
            ? 'Your mate is up!'
            : 'Your mate is still asleep.'}
      </Text>
      {error && <Banner tone="error" text={error} />}
      {match?.paired && !up && <PrimaryButton label="I'm up!" onPress={() => void imUp()} disabled={busy} />}
      <PrimaryButton label={up ? 'Done' : 'Close'} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} variant="ghost" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: space.xl, justifyContent: 'center', gap: space.lg },
  time: { color: colors.text, fontSize: 64, fontWeight: '700', textAlign: 'center' },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', textAlign: 'center' },
  status: { color: colors.textSoft, fontSize: 18, textAlign: 'center' },
});
