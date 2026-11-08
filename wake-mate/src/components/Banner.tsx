import { StyleSheet, Text, View } from 'react-native';

import { colors, space } from '../theme';
import { PrimaryButton } from './PrimaryButton';

type Props = {
  tone: 'warn' | 'error' | 'info';
  text: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function Banner({ tone, text, actionLabel, onAction }: Props) {
  return (
    <View
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      accessibilityLiveRegion={tone === 'error' ? 'assertive' : 'polite'}
      style={[styles.box, tone === 'error' && styles.error]}>
      <Text style={[styles.text, tone === 'warn' && { color: colors.warn }, tone === 'error' && { color: colors.danger }]}>
        {text}
      </Text>
      {actionLabel && onAction ? <PrimaryButton label={actionLabel} onPress={onAction} variant="ghost" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.surface, borderRadius: 16, padding: space.lg, gap: space.md },
  error: { borderWidth: 1, borderColor: colors.danger },
  text: { color: colors.textSoft, fontSize: 15 },
});
