import { StyleSheet, Text, View } from 'react-native';

import { fontSize, spacing } from '../utils/responsive';

type StatCardProps = {
  label: string;
  value: string | number;
};

export function StatCard({ label, value }: StatCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 132,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#dbe4ef',
  },
  value: {
    color: '#0b1f33',
    fontSize: 24,
    fontWeight: '800',
  },
  label: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
    marginTop: 4,
  },
});
