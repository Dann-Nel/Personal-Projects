import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, MIN_TOUCH } from '../theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'link';
  disabled?: boolean;
  hint?: string;
};

export function PrimaryButton({ label, onPress, variant = 'primary', disabled, hint }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'ghost' && styles.ghost,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.text, variant === 'primary' ? styles.onAccent : styles.onDark, variant === 'link' && styles.link]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: MIN_TOUCH, borderRadius: 16, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: colors.accent },
  ghost: { backgroundColor: colors.ghost },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  text: { fontWeight: '700', fontSize: 16 },
  onAccent: { color: colors.onAccent },
  onDark: { color: colors.text },
  link: { color: colors.textMuted, textDecorationLine: 'underline', fontWeight: '500' },
});
