import { Pressable, StyleSheet, Text } from 'react-native';

import { fontSize, spacing } from '../utils/responsive';

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
};

export function ActionButton({ label, onPress, variant = 'primary', disabled = false }: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, variant === 'secondary' && styles.secondaryLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  primary: {
    backgroundColor: '#0b6bcb',
  },
  secondary: {
    backgroundColor: '#e7eef7',
  },
  danger: {
    backgroundColor: '#b42318',
  },
  disabled: {
    opacity: 0.58,
  },
  pressed: {
    opacity: 0.82,
  },
  label: {
    color: '#ffffff',
    fontSize: fontSize.button,
    fontWeight: '700',
  },
  secondaryLabel: {
    color: '#0b1f33',
  },
});
