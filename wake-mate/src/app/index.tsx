import AsyncStorage from '@react-native-async-storage/async-storage';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  cancelAlarm,
  formatTime,
  localToUtcMinute,
  requestAlarmPermission,
  scheduleDailyAlarm,
} from '../lib/alarm';
import {
  blockAndReport,
  currentMatch,
  joinMatch,
  leaveMatch,
  markAwake,
  type MatchView,
} from '../lib/match';
import { isBackendConfigured } from '../lib/supabase';

const STORAGE_KEY = 'wakemate.alarm.v1';
type SavedAlarm = { hour: number; minute: number; on: boolean };

export default function Home() {
  const [alarm, setAlarm] = useState<SavedAlarm>({ hour: 7, minute: 0, on: false });
  const [match, setMatch] = useState<MatchView | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshMatch = useCallback(async () => {
    if (!isBackendConfigured) return;
    try {
      setMatch(await currentMatch());
    } catch {
      /* offline: keep what we have */
    }
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => raw && setAlarm(JSON.parse(raw) as SavedAlarm))
      .catch(() => undefined);
    void refreshMatch();
  }, [refreshMatch]);

  // Poll so you see your mate wake up without reopening the app.
  useEffect(() => {
    if (!isBackendConfigured) return;
    const t = setInterval(refreshMatch, 5000);
    return () => clearInterval(t);
  }, [refreshMatch]);

  const persist = (next: SavedAlarm) => {
    setAlarm(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  };

  const enable = async (hour: number, minute: number) => {
    setBusy(true);
    try {
      if (!(await requestAlarmPermission())) {
        Alert.alert('Notifications are off', 'Allow notifications so your alarm can ring.');
        return;
      }
      await scheduleDailyAlarm(hour, minute);
      persist({ hour, minute, on: true });
      if (isBackendConfigured) {
        if (match && !match.paired) await leaveMatch(match.id).catch(() => undefined);
        setMatch(await joinMatch(localToUtcMinute(hour, minute)));
      }
    } catch (e) {
      Alert.alert('Could not set alarm', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    await cancelAlarm();
    if (match && !match.paired) await leaveMatch(match.id).catch(() => undefined);
    persist({ ...alarm, on: false });
    setMatch(null);
  };

  const pickTime = () => {
    const value = new Date();
    value.setHours(alarm.hour, alarm.minute, 0, 0);
    DateTimePickerAndroid.open({
      value,
      mode: 'time',
      is24Hour: true,
      onChange: (event, date) => {
        if (event.type === 'set' && date) void enable(date.getHours(), date.getMinutes());
      },
    });
  };

  const imUp = async () => {
    if (!match) return;
    await markAwake(match.id).catch(() => undefined);
    await refreshMatch();
  };

  const report = () => {
    if (!match) return;
    Alert.alert('Block and report this mate?', 'You will not be matched with them again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: () => void blockAndReport(match.id).then(refreshMatch),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.title}>Wake Mate</Text>
      <Text style={styles.sub}>Set an alarm. Get matched with someone waking up at the same time.</Text>

      <Pressable onPress={pickTime} style={styles.clock}>
        <Text style={styles.time}>{formatTime(alarm.hour, alarm.minute)}</Text>
        <Text style={styles.hint}>{alarm.on ? 'Alarm on · tap to change' : 'Tap to set your wake-up time'}</Text>
      </Pressable>

      {alarm.on && (
        <Pressable onPress={disable} style={[styles.btn, styles.ghost]}>
          <Text style={styles.btnText}>Turn alarm off</Text>
        </Pressable>
      )}

      {alarm.on && isBackendConfigured && (
        <View style={styles.card}>
          {!match && <Text style={styles.cardText}>Finding your mate…</Text>}
          {match && !match.paired && (
            <Text style={styles.cardText}>Waiting for someone else to pick {formatTime(alarm.hour, alarm.minute)}…</Text>
          )}
          {match?.paired && (
            <>
              <Text style={styles.cardTitle}>You have a mate 🎉</Text>
              <Text style={styles.cardText}>
                {match.mateAwake ? 'Your mate is up!' : 'Your mate is still asleep.'}
              </Text>
              <Pressable
                onPress={imUp}
                disabled={match.meAwake || busy}
                style={[styles.btn, match.meAwake && styles.disabled]}>
                <Text style={styles.btnText}>{match.meAwake ? "You're up ✓" : "I'm up!"}</Text>
              </Pressable>
              <Pressable onPress={report}>
                <Text style={styles.link}>Block / report</Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      {!isBackendConfigured && (
        <Text style={styles.warn}>
          Backend not configured: the alarm works, but matching is off. Copy .env.example to .env and add your Supabase keys.
        </Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, gap: 20 },
  title: { color: '#fff', fontSize: 32, fontWeight: '800', marginTop: 24 },
  sub: { color: '#b9b4e0', fontSize: 16 },
  clock: { alignItems: 'center', backgroundColor: '#2a2556', borderRadius: 28, paddingVertical: 36 },
  time: { color: '#fff', fontSize: 72, fontWeight: '700' },
  hint: { color: '#b9b4e0', marginTop: 4 },
  btn: { backgroundColor: '#f59e6b', borderRadius: 16, padding: 16, alignItems: 'center' },
  ghost: { backgroundColor: '#3a3470' },
  disabled: { opacity: 0.5 },
  btnText: { color: '#14112b', fontWeight: '700', fontSize: 16 },
  card: { backgroundColor: '#1f1b43', borderRadius: 20, padding: 20, gap: 12 },
  cardTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  cardText: { color: '#d8d4f5', fontSize: 16 },
  link: { color: '#b9b4e0', textAlign: 'center', textDecorationLine: 'underline' },
  warn: { color: '#f5c76b', fontSize: 13 },
});
