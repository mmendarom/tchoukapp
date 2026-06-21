import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '../components/Screen';
import { useMatchStore } from '../store/useMatchStore';
import { formatMatchDate } from '../utils/date';
import { fontSize, spacing } from '../utils/responsive';

export function FixturesScreen() {
  const fixtures = useMatchStore((state) => state.fixtures);

  return (
    <Screen>
      <Text style={styles.title}>Fixture</Text>
      {fixtures.map((fixture) => (
        <View key={fixture.id} style={styles.card}>
          <Text style={styles.competition}>{fixture.competition}</Text>
          <Text style={styles.opponent}>Equipo vs {fixture.opponent}</Text>
          <Text style={styles.meta}>{formatMatchDate(fixture.startsAt)} - {fixture.venue}</Text>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: '#0b1f33',
    fontSize: fontSize.title,
    fontWeight: '900',
  },
  card: {
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    padding: spacing.md,
    gap: spacing.xs,
  },
  competition: {
    color: '#0b6bcb',
    fontSize: fontSize.small,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  opponent: {
    color: '#0b1f33',
    fontSize: fontSize.section,
    fontWeight: '800',
  },
  meta: {
    color: '#5d6b7a',
  },
});
