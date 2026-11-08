import { StyleSheet, Text, View } from 'react-native';

import { formatTime } from '../lib/alarm';
import type { MatchView } from '../lib/match';
import { colors, space } from '../theme';
import { PrimaryButton } from './PrimaryButton';

type Props = {
  match: MatchView | null;
  loaded: boolean;
  hour: number;
  minute: number;
  busy: boolean;
  onImUp: () => void;
  onReport: () => void;
};

export function MateCard({ match, loaded, hour, minute, busy, onImUp, onReport }: Props) {
  return (
    <View style={styles.card} accessibilityLiveRegion="polite">
      {!loaded && <Text style={styles.text}>Finding your mate…</Text>}
      {loaded && !match && <Text style={styles.text}>Setting you up for the next wake-up…</Text>}
      {loaded && match && !match.paired && (
        <Text style={styles.text}>
          Waiting for someone else around {formatTime(hour, minute)}. We will pair you as soon as they join.
        </Text>
      )}
      {match?.paired && (
        <>
          <Text accessibilityRole="header" style={styles.title}>
            You have a mate
          </Text>
          <Text style={styles.text}>{match.mate_awake ? 'Your mate is up!' : 'Your mate is still asleep.'}</Text>
          <PrimaryButton
            label={match.me_awake ? "You're up ✓" : "I'm up!"}
            onPress={onImUp}
            disabled={match.me_awake || busy}
          />
          <PrimaryButton label="Block / report this mate" onPress={onReport} variant="link" disabled={busy} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 20, padding: space.lg, gap: space.md },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  text: { color: colors.textSoft, fontSize: 16 },
});
