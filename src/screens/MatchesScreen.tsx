import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { Screen } from '../components/Screen';
import { calculateScore } from '../domain/stats';
import { useMatchStore } from '../store/useMatchStore';
import { formatMatchDate } from '../utils/date';
import { statusLabel } from '../utils/labels';
import { RootStackParamList } from '../utils/navigation';
import { fontSize, spacing } from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'Matches'>;

export function MatchesScreen({ navigation }: Props) {
  const matches = useMatchStore((state) => state.matches);
  const startMatch = useMatchStore((state) => state.startMatch);
  const createDemoMatch = useMatchStore((state) => state.createDemoMatch);
  const visibleMatches = matches.filter((match) => match.status !== 'cancelled');

  return (
    <Screen>
      <Text style={styles.title}>Partidos</Text>
      <ActionButton
        label="Crear partido"
        onPress={() => {
          const matchId = createDemoMatch();
          navigation.navigate('LiveMatch', { matchId });
        }}
      />
      {visibleMatches.map((match) => {
        const score = calculateScore(match.events);

        return (
          <Pressable
            key={match.id}
            onPress={() => navigation.navigate('MatchDashboard', { matchId: match.id })}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.opponent}>Uruguay vs {match.opponent}</Text>
              <Text style={[styles.status, styles.statusText]}>{statusLabel[match.status].toUpperCase()}</Text>
            </View>
            <Text style={styles.meta}>{formatMatchDate(match.startsAt)} - {match.venue}</Text>
            <Text style={styles.score}>{score.uruguay} - {score.opponent}</Text>
            <View style={styles.actions}>
              <Pressable
                onPress={() => {
                  startMatch(match.id);
                  navigation.navigate('LiveMatch', { matchId: match.id });
                }}
                style={styles.startButton}
              >
                <Text style={styles.startLabel}>{match.status === 'live' || match.status === 'period_break' ? 'Retomar' : 'Iniciar partido'}</Text>
              </Pressable>
            </View>
          </Pressable>
        );
      })}
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
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.86,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  opponent: {
    flex: 1,
    color: '#0b1f33',
    fontSize: fontSize.section,
    fontWeight: '800',
  },
  status: {
    fontSize: fontSize.tiny,
    fontWeight: '900',
  },
  statusText: {
    color: '#0b6bcb',
  },
  meta: {
    color: '#5d6b7a',
  },
  score: {
    color: '#0b1f33',
    fontSize: 28,
    fontWeight: '900',
  },
  actions: {
    alignItems: 'flex-start',
  },
  startButton: {
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: '#0b6bcb',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  startLabel: {
    color: '#ffffff',
    fontWeight: '800',
  },
});
