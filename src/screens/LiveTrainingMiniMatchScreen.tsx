import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { Screen } from '../components/Screen';
import { TrainingGoalMapInput } from '../components/TrainingGoalMapInput';
import { getSuggestedNextMiniMatch } from '../domain/training';
import {
  formatTrainingEventLabel,
  getTrainingPlayerLabel,
  getTrainingTeam,
  getTrainingTeamName,
  getTrainingTeamPlayers,
  trainingStatusLabel,
} from '../domain/trainingLive';
import { TrainingErrorSubtype } from '../domain/training';
import { CourtLocation, Player } from '../domain/types';
import { useMatchStore } from '../store/useMatchStore';
import { useTrainingStore } from '../store/useTrainingStore';
import { RootStackParamList } from '../utils/navigation';
import { fontSize, spacing } from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'LiveTrainingMiniMatch'>;

type SelectedPlayerAction = {
  teamId: string;
  playerId: string;
};

type PendingShotDefended = {
  attackingTeamId: string;
  shooterPlayerId: string;
  defendingTeamId: string;
};

type PendingLocationAction = {
  type: 'point' | 'shot_defended';
  teamId: string;
  playerId: string;
  defendingTeamId?: string;
  defenderPlayerId?: string;
};

const getOppositeTeamId = (teamAId: string, teamBId: string, teamId: string) =>
  teamId === teamAId ? teamBId : teamId === teamBId ? teamAId : undefined;

export function LiveTrainingMiniMatchScreen({ navigation, route }: Props) {
  const { sessionId, miniMatchId } = route.params;
  const players = useMatchStore((state) => state.players);
  const session = useTrainingStore((state) => state.trainingSessions.find((item) => item.id === sessionId));
  const recordTrainingEvent = useTrainingStore((state) => state.recordTrainingEvent);
  const undoLastTrainingEvent = useTrainingStore((state) => state.undoLastTrainingEvent);
  const finishMiniMatch = useTrainingStore((state) => state.finishMiniMatch);
  const startSuggestedNextMiniMatch = useTrainingStore((state) => state.startSuggestedNextMiniMatch);
  const miniMatch = session?.miniMatches.find((item) => item.id === miniMatchId);
  const [selectedPlayerAction, setSelectedPlayerAction] = useState<SelectedPlayerAction | undefined>();
  const [pendingShotDefended, setPendingShotDefended] = useState<PendingShotDefended | undefined>();
  const [pendingErrorPlayer, setPendingErrorPlayer] = useState<SelectedPlayerAction | undefined>();
  const [pendingLocationAction, setPendingLocationAction] = useState<PendingLocationAction | undefined>();
  const [pendingLocation, setPendingLocation] = useState<CourtLocation | undefined>();
  const [feedback, setFeedback] = useState('');
  const teamA = session && miniMatch ? getTrainingTeam(session, miniMatch.teamAId) : undefined;
  const teamB = session && miniMatch ? getTrainingTeam(session, miniMatch.teamBId) : undefined;
  const teamAPlayers = useMemo(() => getTrainingTeamPlayers(teamA, players), [players, teamA]);
  const teamBPlayers = useMemo(() => getTrainingTeamPlayers(teamB, players), [players, teamB]);
  const recentEvents = miniMatch?.events.slice(-8).reverse() ?? [];
  const targetReached = Boolean(miniMatch?.winnerTeamId);
  const canUndo = Boolean(miniMatch && miniMatch.status === 'live' && miniMatch.events.length > 0);
  const suggestedNextMiniMatch = session ? getSuggestedNextMiniMatch(session) : undefined;
  const defenderTeam = session && pendingShotDefended ? getTrainingTeam(session, pendingShotDefended.defendingTeamId) : undefined;
  const defenderPlayers = useMemo(() => getTrainingTeamPlayers(defenderTeam, players), [defenderTeam, players]);

  if (!session || !miniMatch || !teamA || !teamB) {
    return (
      <Screen>
        <Text style={styles.title}>Mini partido no encontrado</Text>
        <ActionButton label="Volver a la sesión" onPress={() => navigation.navigate('TrainingSessions')} />
      </Screen>
    );
  }

  const closeAllModals = () => {
    setSelectedPlayerAction(undefined);
    setPendingShotDefended(undefined);
    setPendingErrorPlayer(undefined);
    setPendingLocationAction(undefined);
    setPendingLocation(undefined);
  };
  const ensureCanRecord = () => {
    if (miniMatch.status !== 'live') {
      setFeedback('El mini partido no está en vivo.');
      return false;
    }

    if (targetReached) {
      setFeedback('El mini partido llegó al puntaje objetivo. Deshacé o finalizá.');
      return false;
    }

    return true;
  };
  const openPlayerActions = (teamId: string, playerId: string) => {
    if (!ensureCanRecord()) {
      return;
    }

    setFeedback('');
    setSelectedPlayerAction({ teamId, playerId });
  };
  const openPointLocation = () => {
    if (!selectedPlayerAction) {
      return;
    }

    setSelectedPlayerAction(undefined);
    setPendingLocation(undefined);
    setPendingLocationAction({
      type: 'point',
      teamId: selectedPlayerAction.teamId,
      playerId: selectedPlayerAction.playerId,
    });
  };
  const openDefenderPicker = () => {
    if (!selectedPlayerAction) {
      return;
    }

    const defendingTeamId = getOppositeTeamId(miniMatch.teamAId, miniMatch.teamBId, selectedPlayerAction.teamId);

    if (!defendingTeamId) {
      setFeedback('No se pudo identificar el equipo defensor.');
      closeAllModals();
      return;
    }

    setSelectedPlayerAction(undefined);
    setPendingShotDefended({
      attackingTeamId: selectedPlayerAction.teamId,
      shooterPlayerId: selectedPlayerAction.playerId,
      defendingTeamId,
    });
  };
  const openErrorActions = () => {
    if (!selectedPlayerAction) {
      return;
    }

    setPendingErrorPlayer(selectedPlayerAction);
    setSelectedPlayerAction(undefined);
  };
  const selectDefender = (defenderPlayerId: string) => {
    if (!pendingShotDefended) {
      return;
    }

    setPendingLocation(undefined);
    setPendingLocationAction({
      type: 'shot_defended',
      teamId: pendingShotDefended.attackingTeamId,
      playerId: pendingShotDefended.shooterPlayerId,
      defendingTeamId: pendingShotDefended.defendingTeamId,
      defenderPlayerId,
    });
    setPendingShotDefended(undefined);
  };
  const recordLocationAction = () => {
    if (!pendingLocationAction || !pendingLocation) {
      return;
    }

    const recorded = recordTrainingEvent(session.id, miniMatch.id, {
      type: pendingLocationAction.type,
      teamId: pendingLocationAction.teamId,
      playerId: pendingLocationAction.playerId,
      location: pendingLocation,
      defendingTeamId: pendingLocationAction.defendingTeamId,
      defenderPlayerId: pendingLocationAction.defenderPlayerId,
    });

    setFeedback(recorded ? 'Acción registrada.' : 'No se pudo registrar la acción.');
    closeAllModals();
  };
  const recordOwnPointAgainst = () => {
    if (!pendingErrorPlayer) {
      return;
    }

    const recorded = recordTrainingEvent(session.id, miniMatch.id, {
      type: 'own_point_against',
      teamId: pendingErrorPlayer.teamId,
      playerId: pendingErrorPlayer.playerId,
    });

    setFeedback(recorded ? 'Punto en contra registrado.' : 'No se pudo registrar la acción.');
    closeAllModals();
  };
  const recordErrorSubtype = (errorSubtype: TrainingErrorSubtype) => {
    if (!pendingErrorPlayer) {
      return;
    }

    const recorded = recordTrainingEvent(session.id, miniMatch.id, {
      type: 'error',
      teamId: pendingErrorPlayer.teamId,
      playerId: pendingErrorPlayer.playerId,
      errorSubtype,
      errorType: errorSubtype === 'turnover' ? 'turnover' : 'other',
    });

    setFeedback(recorded ? 'Error registrado.' : 'No se pudo registrar la acción.');
    closeAllModals();
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
  const selectedPlayerLabel = getTrainingPlayerLabel(players, selectedPlayerAction?.playerId);
  const errorPlayerLabel = getTrainingPlayerLabel(players, pendingErrorPlayer?.playerId);
  const shooterLabel = getTrainingPlayerLabel(players, pendingShotDefended?.shooterPlayerId);

  return (
    <Screen>
      <View style={styles.scoreboard}>
        <Text style={styles.kicker}>Práctica 3v3</Text>
        <Text style={styles.title}>{teamA.name} vs {teamB.name}</Text>
        <Text style={styles.score}>{miniMatch.scoreA} - {miniMatch.scoreB}</Text>
        <Text style={styles.meta}>A {miniMatch.targetScore} puntos · {trainingStatusLabel[miniMatch.status]}</Text>
        {winnerName ? <Text style={styles.winner}>Ganador: {winnerName}</Text> : <Text style={styles.live}>En vivo</Text>}
      </View>

      <View style={styles.teamsGrid}>
        <TeamPlayerPanel
          players={teamAPlayers}
          teamName={teamA.name}
          tone="blue"
          onPlayerPress={(playerId) => openPlayerActions(teamA.id, playerId)}
        />
        <TeamPlayerPanel
          players={teamBPlayers}
          teamName={teamB.name}
          tone="red"
          onPlayerPress={(playerId) => openPlayerActions(teamB.id, playerId)}
        />
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

      {selectedPlayerAction && (
        <Modal visible transparent animationType="fade" onRequestClose={closeAllModals}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{selectedPlayerLabel}</Text>
              <Text style={styles.meta}>¿Qué pasó?</Text>
              <View style={styles.modalActions}>
                <TrainingActionButton label="Punto" tone="blue" onPress={openPointLocation} />
                <TrainingActionButton label="Lo atajaron" tone="purple" onPress={openDefenderPicker} />
                <TrainingActionButton label="Error" tone="orange" onPress={openErrorActions} />
              </View>
              <ActionButton label="Cancelar" onPress={closeAllModals} variant="secondary" />
            </View>
          </View>
        </Modal>
      )}

      {pendingShotDefended && (
        <Modal visible transparent animationType="fade" onRequestClose={closeAllModals}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>¿Quién lo atajó?</Text>
              <Text style={styles.meta}>Tiro de {shooterLabel}. Elegí defensor de {defenderTeam?.name ?? 'el otro equipo'}.</Text>
              <ScrollView contentContainerStyle={styles.playerList}>
                {defenderPlayers.map((player) => (
                  <PlayerChoiceButton key={player.id} player={player} onPress={() => selectDefender(player.id)} />
                ))}
              </ScrollView>
              <ActionButton label="Cancelar" onPress={closeAllModals} variant="secondary" />
            </View>
          </View>
        </Modal>
      )}

      {pendingErrorPlayer && (
        <Modal visible transparent animationType="fade" onRequestClose={closeAllModals}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Error de {errorPlayerLabel}</Text>
              <View style={styles.modalActions}>
                <TrainingActionButton label="Punto en contra" tone="red" onPress={recordOwnPointAgainst} />
                <TrainingActionButton label="Invasión" tone="orange" onPress={() => recordErrorSubtype('invasion')} />
                <TrainingActionButton label="Pisa la línea" tone="orange" onPress={() => recordErrorSubtype('line_step')} />
                <TrainingActionButton label="Perdió la pelota" tone="orange" onPress={() => recordErrorSubtype('turnover')} />
              </View>
              <ActionButton label="Cancelar" onPress={closeAllModals} variant="secondary" />
            </View>
          </View>
        </Modal>
      )}

      {pendingLocationAction && (
        <TrainingGoalMapInput
          eventType={pendingLocationAction.type === 'point' ? 'point' : 'shot_defended'}
          onCancel={closeAllModals}
          onConfirm={recordLocationAction}
          onSelectLocation={setPendingLocation}
          selectedLocation={pendingLocation}
        />
      )}
    </Screen>
  );
}

function TeamPlayerPanel({
  onPlayerPress,
  players,
  teamName,
  tone,
}: {
  onPlayerPress: (playerId: string) => void;
  players: Player[];
  teamName: string;
  tone: 'blue' | 'red';
}) {
  return (
    <View style={[styles.teamPanel, tone === 'blue' ? styles.teamPanelBlue : styles.teamPanelRed]}>
      <Text style={styles.teamName}>{teamName}</Text>
      <View style={styles.playerGrid}>
        {players.map((player) => (
          <Pressable
            key={player.id}
            accessibilityRole="button"
            onPress={() => onPlayerPress(player.id)}
            style={({ pressed }) => [styles.playerButton, pressed && styles.pressed]}
          >
            <Text style={styles.playerNumber}>#{player.number}</Text>
            <Text numberOfLines={1} style={styles.playerName}>{player.lastName || player.firstName}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function PlayerChoiceButton({ onPress, player }: { onPress: () => void; player: Player }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.playerChoiceButton, pressed && styles.pressed]}>
      <Text style={styles.playerChoiceText}>#{player.number} {player.lastName || player.firstName}</Text>
    </Pressable>
  );
}

function TrainingActionButton({
  label,
  onPress,
  tone,
}: {
  label: string;
  onPress: () => void;
  tone: 'blue' | 'red' | 'purple' | 'orange';
}) {
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
  teamsGrid: {
    gap: spacing.sm,
  },
  teamPanel: {
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  teamPanelBlue: {
    backgroundColor: '#eef6ff',
    borderColor: '#bfdbfe',
  },
  teamPanelRed: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  teamName: {
    color: '#0b1f33',
    fontSize: fontSize.section,
    fontWeight: '900',
  },
  playerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  playerButton: {
    flexGrow: 1,
    flexBasis: 118,
    minHeight: 74,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  playerNumber: {
    color: '#0b6bcb',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  playerName: {
    color: '#0b1f33',
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
  actionButton: {
    flexGrow: 1,
    flexBasis: 148,
    minHeight: 64,
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
  purpleAction: {
    backgroundColor: '#7c3aed',
  },
  orangeAction: {
    backgroundColor: '#c2410c',
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
  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  playerList: {
    gap: spacing.sm,
  },
  playerChoiceButton: {
    minHeight: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#f7fafc',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  playerChoiceText: {
    color: '#0b1f33',
    fontSize: fontSize.body,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.82,
  },
});
