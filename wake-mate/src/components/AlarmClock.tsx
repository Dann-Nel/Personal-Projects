import { Pressable, StyleSheet, Text } from 'react-native';

import { formatTime } from '../lib/alarm';
import { colors } from '../theme';

type Props = { hour: number; minute: number; on: boolean; onPress: () => void };

export function AlarmClock({ hour, minute, on, onPress }: Props) {
  const time = formatTime(hour, minute);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Wake-up time ${time}, alarm ${on ? 'on' : 'off'}`}
      accessibilityHint="Opens the time picker"
      onPress={onPress}
      style={styles.clock}>
      {/* Capped so a very large system font cannot push the screen's controls off-screen. */}
      <Text style={styles.time} maxFontSizeMultiplier={1.2} adjustsFontSizeToFit numberOfLines={1}>
        {time}
      </Text>
      <Text style={styles.hint}>{on ? 'Alarm on · tap to change' : 'Tap to set your wake-up time'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  clock: { alignItems: 'center', backgroundColor: colors.surfaceRaised, borderRadius: 28, paddingVertical: 36, paddingHorizontal: 12, minHeight: 48 },
  time: { color: colors.text, fontSize: 64, fontWeight: '700' },
  hint: { color: colors.textMuted, marginTop: 4 },
});
