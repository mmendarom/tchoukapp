import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { CourtMapInput } from '../components/CourtMapInput';
import { Screen } from '../components/Screen';
import {
  getOpposingStatsTeamId,
  getStatsMatchScore,
  StatsMatchErrorSubtype,
} from '../domain/statsMatch';
import {
  canRecordStatsEvent,
  formatStatsEventLabel,
  getCurrentStatsPeriod,
  getNextStatsPeriodNumber,
  getStatsPlayerLabel,
  getStatsTeamName,
  getStatsTeamPlayers,
  statsMatchStatusLabel,
  STATS_ERROR_SUBTYPE_OPTIONS,
} from '../domain/statsMatchLive';
import { CourtLocation, Player } from '../domain/types';
import { useMatchStore } from '../store/useMatchStore';
import { useStatsMatchStore } from '../store/useStatsMatchStore';
import { RootStackParamList } from '../utils/navigation';
import { fontSize, spacing } from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'LiveStatsMatch'>;

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
  kind: 'point' | 'shot_defended';
  teamId: string;
  playerId: string;
  defendingTeamId?: string;
  defenderPlayerId?: string;
};

export function LiveStatsMatchScreen({ navigation, route }: Props) {
  const { matchId } = route.params;
  const players = useMatchStore((state) => state.players);
  const match = useStatsMatchStore((state) => state.statsMatches.find((item) => item.id === matchId));
  const startStatsMatch = useStatsMatchStore((state) => state.startStatsMatch);
  const recordStatsEvent = useStatsMatchStore((state) => state.recordStatsEvent);
  const undoLastStatsEvent = useStatsMatchStore((state) => state.undoLastStatsEvent);
  const finishStatsPeriod = useStatsMatchStore((state) => state.finishStatsPeriod);
  const startNextStatsPeriod = useStatsMatchStore((state) => state.startNextStatsPeriod);
  const finishStatsMatch = useStatsMatchStore((state) => state.finishStatsMatch);

  const [selectedPlayerAction, setSelectedPlayerAction] = useState<SelectedPlayerAction | undefined>();
  const [pendingShotDefended, setPendingShotDefended] = useState<PendingShotDefended | undefined>();
  const [pendingErrorPlayer, setPendingErrorPlayer] = useState<SelectedPlayerAction | undefined>();
  const [pendingLocationAction, setPendingLocationAction] = useState<PendingLocationAction | undefined>();
  const [pendingLocation, setPendingLocation] = useState<CourtLocation | undefined>();
  const [feedback, setFeedback] = useState('');

  const homePlayers = useMemo(() => getStatsTeamPlayers(match?.homeTeam, players), [match?.homeTeam, players]);
  const awayPlayers = useMemo(() => getStatsTeamPlayers(match?.awayTeam, players), [match?.awayTeam, players]);
  const defenderTeam = useMemo(
    () => (match && pendingShotDefended ? (pendingShotDefended.defendingTeamId === match.homeTeam.id ? match.homeTeam : match.awayTeam) : undefined),
    [match, pendingShotDefended],
  );
  const defenderPlayers = useMemo(() => getStatsTeamPlayers(defenderTeam, players), [defenderTeam, players]);

  if (!match) {
    return (
      <Screen>
        <Text style={styles.title}>Partido no encontrado</Text>
        <ActionButton label="Volver a Estadística 7v7" onPress={() => navigation.navigate('StatsMatches')} />
      </Screen>
    );
  }

  const score = getStatsMatchScore(match);
  const currentPeriod = getCurrentStatsPeriod(match);
  const nextPeriodNumber = getNextStatsPeriodNumber(match);
  const canRecord = canRecordStatsEvent(match);
  const canUndo = match.events.length > 0 && match.status !== 'finished' && match.status !== 'cancelled';
  const recentEvents = match.events.slice(-8).reverse();

  const closeAllModals = () => {
    setSelectedPlayerAction(undefined);
    setPendingShotDefended(undefined);
    setPendingErrorPlayer(undefined);
    setPendingLocationAction(undefined);
    setPendingLocation(undefined);
  };
  const openPlayerActions = (teamId: string, playerId: string) => {
    if (!canRecord) {
      setFeedback(match.status === 'period_break' ? 'Iniciá el tiempo para registrar acciones.' : 'El partido no está en vivo.');
      return;
    }

    setFeedback('');
    setSelectedPlayerAction({ teamId, playerId });
  };
  const openPointLocation = () => {
    if (!selectedPlayerAction) {
      return;
    }

    setPendingLocation(undefined);
    setPendingLocationAction({
      kind: 'point',
      teamId: selectedPlayerAction.teamId,
      playerId: selectedPlayerAction.playerId,
    });
    setSelectedPlayerAction(undefined);
  };
  const openDefenderPicker = () => {
    if (!selectedPlayerAction) {
      return;
    }

    const defendingTeamId = getOpposingStatsTeamId(match, selectedPlayerAction.teamId);

    if (!defendingTeamId) {
      setFeedback('No se pudo identificar el equipo defensor.');
      closeAllModals();
      return;
    }

    setPendingShotDefended({
      attackingTeamId: selectedPlayerAction.teamId,
      shooterPlayerId: selectedPlayerAction.playerId,
      defendingTeamId,
    });
    setSelectedPlayerAction(undefined);
  };
  const openErrorActions = () => {
    if (!selectedPlayerAction) {
      return;
    }

    setPendingErrorPlayer(selectedPlayerAction);
    setSelectedPlayerAction(undefined);
  };
  const recordDefense = () => {
    if (!selectedPlayerAction) {
      return;
    }

    const recorded = recordStatsEvent(match.id, {
      kind: 'defense',
      teamId: selectedPlayerAction.teamId,
      playerId: selectedPlayerAction.playerId,
    });

    setFeedback(recorded ? 'Defensa registrada.' : 'No se pudo registrar la acción.');
    closeAllModals();
  };
  const selectDefender = (defenderPlayerId: string) => {
    if (!pendingShotDefended) {
      return;
    }

    setPendingLocation(undefined);
    setPendingLocationAction({
      kind: 'shot_defended',
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

    const recorded = recordStatsEvent(match.id, {
      kind: pendingLocationAction.kind,
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

    const recorded = recordStatsEvent(match.id, {
      kind: 'own_point_against',
      teamId: pendingErrorPlayer.teamId,
      playerId: pendingErrorPlayer.playerId,
    });

    setFeedback(recorded ? 'Punto en contra registrado.' : 'No se pudo registrar la acción.');
    closeAllModals();
  };
  const recordErrorSubtype = (errorSubtype: StatsMatchErrorSubtype) => {
    if (!pendingErrorPlayer) {
      return;
    }

    const recorded = recordStatsEvent(match.id, {
      kind: 'error',
      teamId: pendingErrorPlayer.teamId,
      playerId: pendingErrorPlayer.playerId,
      errorSubtype,
    });

    setFeedback(recorded ? 'Error registrado.' : 'No se pudo registrar la acción.');
    closeAllModals();
  };
  const handleStart = () => {
    const started = startStatsMatch(match.id);

    setFeedback(started ? 'Partido iniciado.' : 'No se pudo iniciar el partido.');
  };
  const handleUndo = () => {
    const undone = undoLastStatsEvent(match.id);

    setFeedback(undone ? 'Última acción deshecha.' : 'No hay acciones para deshacer.');
  };
  const handleFinishPeriod = () => {
    const finished = finishStatsPeriod(match.id);

    setFeedback(finished ? 'Tiempo cerrado.' : 'No se pudo cerrar el tiempo.');
  };
  const handleStartNextPeriod = () => {
    const started = startNextStatsPeriod(match.id);

    setFeedback(started ? 'Tiempo iniciado.' : 'No se pudo iniciar el siguiente tiempo.');
  };
  const handleFinishMatch = () => {
    const finished = finishStatsMatch(match.id);

    setFeedback(finished ? 'Partido finalizado.' : 'No se pudo finalizar el partido.');
  };

  const selectedPlayerLabel = getStatsPlayerLabel(players, selectedPlayerAction?.playerId);
  const errorPlayerLabel = getStatsPlayerLabel(players, pendingErrorPlayer?.playerId);
  const shooterLabel = getStatsPlayerLabel(players, pendingShotDefended?.shooterPlayerId);
  const locationTeamName = pendingLocationAction ? getStatsTeamName(match, pendingLocationAction.teamId) : '';

  return (
    <Screen>
      <View style={styles.scoreboard}>
        <Text style={styles.kicker}>Estadística 7v7</Text>
        <Text style={styles.title}>{match.homeTeam.name} vs {match.awayTeam.name}</Text>
        <Text style={styles.score}>{score[match.homeTeam.id] ?? 0} - {score[match.awayTeam.id] ?? 0}</Text>
        <Text style={styles.meta}>
          Tiempo {match.currentPeriod}/{match.settings.periodCount} · {statsMatchStatusLabel[match.status]}
        </Text>
        {match.status === 'live' ? <Text style={styles.live}>En vivo</Text> : null}
      </View>

      {match.status === 'draft' ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Comenzar partido</Text>
          <Text style={styles.meta}>Iniciá el primer tiempo para registrar acciones de ambos cuadros.</Text>
          <ActionButton label="Comenzar primer tiempo" onPress={handleStart} />
        </View>
      ) : null}

      <View style={styles.teamsGrid}>
        <TeamPlayerPanel
          players={homePlayers}
          teamName={match.homeTeam.name}
          tone="blue"
          onPlayerPress={(playerId) => openPlayerActions(match.homeTeam.id, playerId)}
        />
        <TeamPlayerPanel
          players={awayPlayers}
          teamName={match.awayTeam.name}
          tone="red"
          onPlayerPress={(playerId) => openPlayerActions(match.awayTeam.id, playerId)}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Tiempo y partido</Text>
        <View style={styles.controlRow}>
          <ActionButton label="Deshacer" onPress={handleUndo} variant="secondary" disabled={!canUndo} />
          {match.status === 'live' ? (
            <ActionButton label={`Cerrar tiempo ${match.currentPeriod}`} onPress={handleFinishPeriod} variant="secondary" />
          ) : null}
          {match.status === 'period_break' && nextPeriodNumber ? (
            <ActionButton label={`Iniciar tiempo ${nextPeriodNumber}`} onPress={handleStartNextPeriod} />
          ) : null}
          {(match.status === 'live' || match.status === 'period_break') ? (
            <ActionButton label="Finalizar partido" onPress={handleFinishMatch} variant="secondary" />
          ) : null}
        </View>
        {match.status === 'period_break' && !nextPeriodNumber ? (
          <Text style={styles.meta}>No quedan más tiempos. Finalizá el partido.</Text>
        ) : null}
        {match.status === 'period_break' ? (
          <ActionButton
            label={`Ver resumen del tiempo ${match.currentPeriod}`}
            onPress={() => navigation.navigate('StatsMatchSummary', { matchId: match.id, periodNumber: match.currentPeriod })}
            variant="secondary"
          />
        ) : null}
        {match.status === 'finished' ? (
          <ActionButton
            label="Ver resumen final"
            onPress={() => navigation.navigate('StatsMatchSummary', { matchId: match.id })}
          />
        ) : null}
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
        <ActionButton label="Volver a Estadística 7v7" onPress={() => navigation.navigate('StatsMatches')} variant="secondary" />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Últimas acciones</Text>
        {recentEvents.length === 0 ? (
          <Text style={styles.meta}>Sin acciones registradas.</Text>
        ) : (
          recentEvents.map((event) => (
            <Text key={event.id} style={styles.eventText}>{formatStatsEventLabel(event, match, players)}</Text>
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
                <StatsActionButton label="Punto" tone="blue" onPress={openPointLocation} />
                <StatsActionButton label="Lo atajaron" tone="purple" onPress={openDefenderPicker} />
                <StatsActionButton label="Defensa" tone="green" onPress={recordDefense} />
                <StatsActionButton label="Error" tone="orange" onPress={openErrorActions} />
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
              <Text style={styles.meta}>Tiro de {shooterLabel}. Elegí defensor de {defenderTeam?.name ?? 'el rival'}.</Text>
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
                <StatsActionButton label="Punto en contra" tone="red" onPress={recordOwnPointAgainst} />
                {STATS_ERROR_SUBTYPE_OPTIONS.map((option) => (
                  <StatsActionButton
                    key={option.id}
                    label={option.label}
                    tone="orange"
                    onPress={() => recordErrorSubtype(option.id)}
                  />
                ))}
              </View>
              <ActionButton label="Cancelar" onPress={closeAllModals} variant="secondary" />
            </View>
          </View>
        </Modal>
      )}

      {pendingLocationAction && (
        <CourtMapInput
          mode="uruguay_point"
          kicker="Marcá la ubicación en la cancha"
          title={
            pendingLocationAction.kind === 'point'
              ? `¿Dónde cayó el punto de ${locationTeamName}?`
              : `¿Dónde atajaron el tiro de ${locationTeamName}?`
          }
          tip="Cancha completa: marcá sobre el marco correspondiente."
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

function StatsActionButton({
  label,
  onPress,
  tone,
}: {
  label: string;
  onPress: () => void;
  tone: 'blue' | 'red' | 'purple' | 'orange' | 'green';
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
  greenAction: {
    backgroundColor: '#188038',
  },
  controlRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  feedback: {
    color: '#0b6bcb',
    fontSize: fontSize.small,
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
