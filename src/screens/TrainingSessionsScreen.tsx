import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { Screen } from '../components/Screen';
import { filterTrainingSessions, TrainingSessionFilter } from '../domain/training';
import { trainingStatusLabel } from '../domain/trainingLive';
import { useTrainingStore } from '../store/useTrainingStore';
import { RootStackParamList } from '../utils/navigation';
import { fontSize, spacing } from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'TrainingSessions'>;

const sessionFilters: { id: TrainingSessionFilter; label: string }[] = [
  { id: 'active', label: 'Activas' },
  { id: 'finished', label: 'Finalizadas' },
  { id: 'archived', label: 'Archivadas' },
  { id: 'all', label: 'Todas' },
];

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Sin fecha';
  }

  return new Intl.DateTimeFormat('es-UY', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export function TrainingSessionsScreen({ navigation }: Props) {
  const trainingSessions = useTrainingStore((state) => state.trainingSessions);
  const [sessionFilter, setSessionFilter] = useState<TrainingSessionFilter>('active');
  const liveSession = useMemo(
    () => trainingSessions.find((session) => session.status === 'live' && !session.archivedAt),
    [trainingSessions],
  );
  const visibleTrainingSessions = useMemo(
    () => filterTrainingSessions(trainingSessions, sessionFilter),
    [sessionFilter, trainingSessions],
  );
  const hasSessions = trainingSessions.length > 0;

  return (
    <Screen>
      <View style={styles.headerText}>
        <Text style={styles.kicker}>Entrenamiento</Text>
        <Text style={styles.title}>Práctica 3v3</Text>
        <Text style={styles.copy}>
          Armá equipos internos con los jugadores presentes, jugá mini partidos cortos y mirá las estadísticas de la práctica.
        </Text>
      </View>

      <ActionButton label="+ Nueva práctica" onPress={() => navigation.navigate('TrainingSetup')} />

      {liveSession && (
        <Pressable
          onPress={() => navigation.navigate('TrainingSessionDetail', { sessionId: liveSession.id })}
          style={({ pressed }) => [styles.liveCard, pressed && styles.pressed]}
        >
          <View style={styles.liveBadgeRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>Práctica en curso</Text>
          </View>
          <Text style={styles.liveTitle}>{liveSession.teamPoolName || 'Práctica'}</Text>
          <Text style={styles.liveMeta}>
            {liveSession.teams.length} equipos · {liveSession.miniMatches.length} mini partidos jugados
          </Text>
          <View style={styles.liveActionRow}>
            <Text style={styles.liveActionText}>Continuar →</Text>
          </View>
        </Pressable>
      )}

      {!hasSessions ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>¿Cómo funciona?</Text>
          <View style={styles.stepRow}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepText}>Elegí el plantel y marcá quiénes vinieron a la práctica.</Text>
          </View>
          <View style={styles.stepRow}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={styles.stepText}>Armá 2, 3 o 4 equipos de 3 o 4 jugadores.</Text>
          </View>
          <View style={styles.stepRow}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepText}>Jugá mini partidos a 3 puntos con rotación y registrá cada acción en vivo.</Text>
          </View>
          <Text style={styles.helperText}>Tocá «Nueva práctica» para empezar. Todo queda guardado en el dispositivo.</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Prácticas guardadas</Text>
          <View style={styles.filterRow}>
            {sessionFilters.map((filter) => {
              const selected = sessionFilter === filter.id;

              return (
                <Pressable
                  key={filter.id}
                  onPress={() => setSessionFilter(filter.id)}
                  style={({ pressed }) => [styles.filterButton, selected && styles.filterButtonSelected, pressed && styles.pressed]}
                >
                  <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{filter.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.sessionList}>
            {visibleTrainingSessions.length === 0 ? (
              <Text style={styles.helperText}>No hay prácticas en este filtro.</Text>
            ) : visibleTrainingSessions.map((session) => (
              <Pressable
                key={session.id}
                onPress={() => navigation.navigate('TrainingSessionDetail', { sessionId: session.id })}
                style={({ pressed }) => [styles.sessionCard, pressed && styles.pressed]}
              >
                <View style={styles.sessionCardBody}>
                  <Text style={styles.sessionTitle}>{session.teamPoolName || 'Práctica'}</Text>
                  <Text style={styles.sessionMeta}>
                    {formatDate(session.createdAt)} · {session.teams.length} equipos · {session.participantPlayerIds.length} jugadores
                  </Text>
                  <View style={styles.sessionBadgeRow}>
                    <Text style={styles.sessionStatus}>{trainingStatusLabel[session.status]}</Text>
                    <Text style={styles.sessionMeta}>{session.miniMatches.length} mini partidos</Text>
                    {session.archivedAt ? <Text style={styles.archivedBadge}>Archivada</Text> : null}
                  </View>
                </View>
                <Text style={styles.sessionChevron}>›</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerText: {
    gap: spacing.xs,
  },
  kicker: {
    color: '#0b6bcb',
    fontSize: fontSize.small,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: '#0b1f33',
    fontSize: fontSize.title,
    fontWeight: '900',
  },
  copy: {
    color: '#36546f',
    fontSize: fontSize.body,
    fontWeight: '700',
    lineHeight: 20,
  },
  card: {
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    color: '#0b1f33',
    fontSize: fontSize.section,
    fontWeight: '900',
  },
  helperText: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
    fontWeight: '700',
  },
  liveCard: {
    borderRadius: 8,
    backgroundColor: '#0b1f33',
    padding: spacing.md,
    gap: spacing.xs,
  },
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4ade80',
  },
  liveBadgeText: {
    color: '#4ade80',
    fontSize: fontSize.tiny,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  liveTitle: {
    color: '#ffffff',
    fontSize: fontSize.section,
    fontWeight: '900',
  },
  liveMeta: {
    color: '#d7e5f2',
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  liveActionRow: {
    marginTop: spacing.xs,
  },
  liveActionText: {
    color: '#8bd3ff',
    fontSize: fontSize.body,
    fontWeight: '900',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#0b6bcb',
    color: '#ffffff',
    fontSize: fontSize.small,
    fontWeight: '900',
    lineHeight: 26,
    textAlign: 'center',
  },
  stepText: {
    flex: 1,
    color: '#36546f',
    fontSize: fontSize.body,
    fontWeight: '700',
    lineHeight: 20,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  filterButton: {
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#f7fafc',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  filterButtonSelected: {
    borderColor: '#0b6bcb',
    backgroundColor: '#0b6bcb',
  },
  filterText: {
    color: '#36546f',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  filterTextSelected: {
    color: '#ffffff',
  },
  sessionList: {
    gap: spacing.sm,
  },
  sessionCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbe4ef',
    backgroundColor: '#ffffff',
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sessionCardBody: {
    flex: 1,
    gap: 3,
  },
  sessionTitle: {
    color: '#0b1f33',
    fontSize: fontSize.body,
    fontWeight: '900',
  },
  sessionMeta: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
    fontWeight: '700',
  },
  sessionStatus: {
    color: '#0b6bcb',
    fontSize: fontSize.tiny,
    fontWeight: '900',
  },
  sessionBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  archivedBadge: {
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    color: '#374151',
    fontSize: fontSize.tiny,
    fontWeight: '900',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  sessionChevron: {
    color: '#8a98a8',
    fontSize: fontSize.title,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.82,
  },
});
