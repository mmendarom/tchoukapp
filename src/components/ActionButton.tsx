import { Pressable, StyleSheet, Text } from 'react-native';

import { fontSize, spacing } from '../utils/responsive';

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
};

export function ActionButton({ label, onPress, variant = 'primary' }: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
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
