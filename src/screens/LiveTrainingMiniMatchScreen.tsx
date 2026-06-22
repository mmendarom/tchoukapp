import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { CourtMapInput } from '../components/CourtMapInput';
import { Screen } from '../components/Screen';
import { getSuggestedNextMiniMatch } from '../domain/training';
import {
  formatTrainingEventLabel,
  formatTrainingMiniMatchScore,
  getTrainingPlayerLabel,
  getTrainingTeam,
  getTrainingTeamName,
  getTrainingTeamPlayers,
  trainingStatusLabel,
} from '../domain/trainingLive';
import { TrainingEventType } from '../domain/training';
import { CourtLocation } from '../domain/types';
import { useMatchStore } from '../store/useMatchStore';
import { useTrainingStore } from '../store/useTrainingStore';
import { RootStackParamList } from '../utils/navigation';
import { fontSize, spacing } from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'LiveTrainingMiniMatch'>;

type PendingAction = {
  type: TrainingEventType;
  teamId?: string;
  requiresLocation: boolean;
  title: string;
};

const isLocationAction = (type: TrainingEventType) => type === 'point' || type === 'shot_defended';

export function LiveTrainingMiniMatchScreen({ navigation, route }: Props) {
  const { sessionId, miniMatchId } = route.params;
  const players = useMatchStore((state) => state.players);
  const session = useTrainingStore((state) => state.trainingSessions.find((item) => item.id === sessionId));
  const recordTrainingEvent = useTrainingStore((state) => state.recordTrainingEvent);
  const undoLastTrainingEvent = useTrainingStore((state) => state.undoLastTrainingEvent);
  const finishMiniMatch = useTrainingStore((state) => state.finishMiniMatch);
  const startSuggestedNextMiniMatch = useTrainingStore((state) => state.startSuggestedNextMiniMatch);
  const miniMatch = session?.miniMatches.find((item) => item.id === miniMatchId);
  const [pendingAction, setPendingAction] = useState<PendingAction | undefined>();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | undefined>();
  const [pendingLocation, setPendingLocation] = useState<CourtLocation | undefined>();
  const [feedback, setFeedback] = useState('');
  const teamA = session && miniMatch ? getTrainingTeam(session, miniMatch.teamAId) : undefined;
  const teamB = session && miniMatch ? getTrainingTeam(session, miniMatch.teamBId) : undefined;
  const selectedTeam = session && pendingAction?.teamId ? getTrainingTeam(session, pendingAction.teamId) : undefined;
  const selectedTeamPlayers = useMemo(() => getTrainingTeamPlayers(selectedTeam, players), [players, selectedTeam]);
  const recentEvents = miniMatch?.events.slice(-8).reverse() ?? [];
  const targetReached = Boolean(miniMatch?.winnerTeamId);
  const canUndo = Boolean(miniMatch && miniMatch.status === 'live' && miniMatch.events.length > 0);
  const suggestedNextMiniMatch = session ? getSuggestedNextMiniMatch(session) : undefined;

  if (!session || !miniMatch || !teamA || !teamB) {
    return (
      <Screen>
        <Text style={styles.title}>Mini partido no encontrado</Text>
        <ActionButton label="Volver a la sesión" onPress={() => navigation.navigate('TrainingSessions')} />
      </Screen>
    );
  }

  const closePicker = () => {
    setPendingAction(undefined);
    setSelectedPlayerId(undefined);
    setPendingLocation(undefined);
  };
  const openAction = (action: PendingAction) => {
    if (miniMatch.status !== 'live') {
      setFeedback('El mini partido no está en vivo.');
      return;
    }

    if (targetReached) {
      setFeedback('El mini partido llegó al puntaje objetivo. Deshacé o finalizá.');
      return;
    }

    setFeedback('');
    setSelectedPlayerId(undefined);
    setPendingLocation(undefined);
    setPendingAction(action);
  };
  const recordAction = (location?: CourtLocation) => {
    if (!pendingAction?.teamId || !selectedPlayerId) {
      return;
    }

    const recorded = recordTrainingEvent(session.id, miniMatch.id, {
      type: pendingAction.type,
      teamId: pendingAction.teamId,
      playerId: selectedPlayerId,
      location,
      errorType: pendingAction.type === 'error' ? 'turnover' : undefined,
    });

    setFeedback(recorded ? 'Acción registrada.' : 'No se pudo registrar la acción.');
    closePicker();
  };
  const handlePlayerSelected = (playerId: string) => {
    setSelectedPlayerId(playerId);

    if (pendingAction && !pendingAction.requiresLocation) {
      const recorded = recordTrainingEvent(session.id, miniMatch.id, {
        type: pendingAction.type,
        teamId: pendingAction.teamId ?? '',
        playerId,
        errorType: pendingAction.type === 'error' ? 'turnover' : undefined,
      });

      setFeedback(recorded ? 'Acción registrada.' : 'No se pudo registrar la acción.');
      closePicker();
    }
  };
  const handleUndo = () => {
    const undone = undoLastTrainingEvent(session.id, miniMatch.id);

    setFeedback(undone ? 'Última acción deshecha.' : 'No hay acciones para deshacer.');
  };
  const handleFinishMiniMatch = () => {
    const finished = finishMiniMatch(session.id, miniMatch.id);

    setFeedback(finished ? 'Mini partido finalizado.' : 'El mini partido necesita ganador para finalizar.');
  };
  const handleStartSuggestedNext = () => {
    const nextMiniMatchId = startSuggestedNextMiniMatch(session.id);

    if (!nextMiniMatchId) {
      setFeedback('No se pudo iniciar el próximo mini partido.');
      return;
    }

    navigation.navigate('LiveTrainingMiniMatch', { sessionId: session.id, miniMatchId: nextMiniMatchId });
  };
  const winnerName = miniMatch.winnerTeamId ? getTrainingTeamName(session, miniMatch.winnerTeamId) : '';

  return (
    <Screen>
      <View style={styles.scoreboard}>
        <Text style={styles.kicker}>Práctica 3v3</Text>
        <Text style={styles.title}>{teamA.name} vs {teamB.name}</Text>
        <Text style={styles.score}>{miniMatch.scoreA} - {miniMatch.scoreB}</Text>
        <Text style={styles.meta}>A {miniMatch.targetScore} puntos · {trainingStatusLabel[miniMatch.status]}</Text>
        {winnerName ? <Text style={styles.winner}>Ganador: {winnerName}</Text> : <Text style={styles.live}>En vivo</Text>}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Acciones</Text>
        <View style={styles.teamActionRow}>
          <TrainingActionButton label={`Punto ${teamA.name}`} tone="blue" onPress={() => openAction({ type: 'point', teamId: teamA.id, requiresLocation: true, title: `Punto ${teamA.name}` })} />
          <TrainingActionButton label={`En contra ${teamA.name}`} tone="green" onPress={() => openAction({ type: 'own_point_against', teamId: teamA.id, requiresLocation: false, title: `En contra ${teamA.name}` })} />
        </View>
        <View style={styles.teamActionRow}>
          <TrainingActionButton label={`Punto ${teamB.name}`} tone="red" onPress={() => openAction({ type: 'point', teamId: teamB.id, requiresLocation: true, title: `Punto ${teamB.name}` })} />
          <TrainingActionButton label={`En contra ${teamB.name}`} tone="green" onPress={() => openAction({ type: 'own_point_against', teamId: teamB.id, requiresLocation: false, title: `En contra ${teamB.name}` })} />
        </View>
        <View style={styles.teamActionRow}>
          <TrainingActionButton label="Defensa" tone="teal" onPress={() => openAction({ type: 'defense', requiresLocation: false, title: 'Defensa' })} />
          <TrainingActionButton label="Tiro defendido" tone="purple" onPress={() => openAction({ type: 'shot_defended', requiresLocation: true, title: 'Tiro defendido' })} />
          <TrainingActionButton label="Error" tone="orange" onPress={() => openAction({ type: 'error', requiresLocation: false, title: 'Error' })} />
        </View>
      </View>

      <View style={styles.controlRow}>
        <ActionButton label="Deshacer" onPress={handleUndo} variant="secondary" disabled={!canUndo} />
        {targetReached && miniMatch.status === 'live' && (
          <ActionButton label="Finalizar mini partido" onPress={handleFinishMiniMatch} />
        )}
        <ActionButton label="Volver a la sesión" onPress={() => navigation.navigate('TrainingSessions')} variant="secondary" />
      </View>
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

      {miniMatch.status === 'finished' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Rotación</Text>
          {suggestedNextMiniMatch ? (
            <>
              <Text style={styles.meta}>Siguiente sugerido</Text>
              <Text style={styles.nextMatchText}>
                {getTrainingTeamName(session, suggestedNextMiniMatch.teamAId)} vs {getTrainingTeamName(session, suggestedNextMiniMatch.teamBId)}
              </Text>
              <ActionButton label="Iniciar próximo" onPress={handleStartSuggestedNext} />
            </>
          ) : (
            <Text style={styles.meta}>Sin próximo sugerido. Volvé a la sesión para elegir manualmente.</Text>
          )}
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Últimas acciones</Text>
        {recentEvents.length === 0 ? (
          <Text style={styles.meta}>Sin acciones registradas.</Text>
        ) : (
          recentEvents.map((event) => (
            <Text key={event.id} style={styles.eventText}>{formatTrainingEventLabel(event, session, players)}</Text>
          ))
        )}
      </View>

      {pendingAction && !pendingAction.teamId && (
        <Modal visible transparent animationType="fade" onRequestClose={closePicker}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{pendingAction.title}</Text>
              <Text style={styles.meta}>Elegí el equipo.</Text>
              <View style={styles.teamActionRow}>
                {[teamA, teamB].map((team) => (
                  <TrainingActionButton
                    key={team.id}
                    label={team.name}
                    tone="dark"
                    onPress={() => setPendingAction((current) => current ? { ...current, teamId: team.id } : current)}
                  />
                ))}
              </View>
              <ActionButton label="Cancelar" onPress={closePicker} variant="secondary" />
            </View>
          </View>
        </Modal>
      )}

      {pendingAction?.teamId && !selectedPlayerId && (
        <Modal visible transparent animationType="fade" onRequestClose={closePicker}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{pendingAction.title}</Text>
              <Text style={styles.meta}>Elegí jugador de {getTrainingTeamName(session, pendingAction.teamId)}.</Text>
              <ScrollView contentContainerStyle={styles.playerList}>
                {selectedTeamPlayers.map((player) => (
                  <Pressable
                    key={player.id}
                    onPress={() => handlePlayerSelected(player.id)}
                    style={({ pressed }) => [styles.playerButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.playerButtonText}>{getTrainingPlayerLabel(players, player.id)}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <ActionButton label="Cancelar" onPress={closePicker} variant="secondary" />
            </View>
          </View>
        </Modal>
      )}

      {pendingAction?.requiresLocation && selectedPlayerId && (
        <CourtMapInput
          mode={pendingAction.type === 'point' ? 'training_point' : 'training_shot_defended'}
          onCancel={closePicker}
          onConfirm={() => {
            if (pendingLocation) {
              recordAction(pendingLocation);
            }
          }}
          onSelectLocation={setPendingLocation}
          selectedLocation={pendingLocation}
        />
      )}
    </Screen>
  );
}

function TrainingActionButton({ label, onPress, tone }: { label: string; onPress: () => void; tone: 'blue' | 'red' | 'green' | 'teal' | 'purple' | 'orange' | 'dark' }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.actionButton, styles[`${tone}Action`], pressed && styles.pressed]}>
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scoreboard: {
    borderRadius: 8,
    backgroundColor: '#0b1f33',
    borderWidth: 1,
    borderColor: '#16456e',
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  kicker: {
    color: '#8bd3ff',
    fontSize: fontSize.small,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: '#ffffff',
    fontSize: fontSize.title,
    fontWeight: '900',
    textAlign: 'center',
  },
  score: {
    color: '#ffffff',
    fontSize: 54,
    fontWeight: '900',
  },
  meta: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  live: {
    color: '#8bd3ff',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  winner: {
    color: '#b7f7d4',
    fontSize: fontSize.body,
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
  sectionTitle: {
    color: '#0b1f33',
    fontSize: fontSize.section,
    fontWeight: '900',
  },
  teamActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionButton: {
    flexGrow: 1,
    flexBasis: 120,
    minHeight: 58,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  actionText: {
    color: '#ffffff',
    fontSize: fontSize.button,
    fontWeight: '900',
    textAlign: 'center',
  },
  blueAction: {
    backgroundColor: '#0b6bcb',
  },
  redAction: {
    backgroundColor: '#b42318',
  },
  greenAction: {
    backgroundColor: '#188038',
  },
  tealAction: {
    backgroundColor: '#0b6b61',
  },
  purpleAction: {
    backgroundColor: '#7c3aed',
  },
  orangeAction: {
    backgroundColor: '#c2410c',
  },
  darkAction: {
    backgroundColor: '#0b1f33',
  },
  controlRow: {
    gap: spacing.sm,
  },
  feedback: {
    color: '#0b6bcb',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  nextMatchText: {
    color: '#0b1f33',
    fontSize: fontSize.section,
    fontWeight: '900',
  },
  eventText: {
    color: '#0b1f33',
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 31, 51, 0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '84%',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    padding: spacing.md,
    gap: spacing.sm,
  },
  modalTitle: {
    color: '#0b1f33',
    fontSize: fontSize.section,
    fontWeight: '900',
    textAlign: 'center',
  },
  playerList: {
    gap: spacing.sm,
  },
  playerButton: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#f7fafc',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  playerButtonText: {
    color: '#0b1f33',
    fontSize: fontSize.body,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.82,
  },
});
