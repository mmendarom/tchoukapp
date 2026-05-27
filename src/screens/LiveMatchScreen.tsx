import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { CourtMapInput } from '../components/CourtMapInput';
import { Screen } from '../components/Screen';
import { calculateTotalScore, formatPeriodName, formatTimer } from '../domain/periodStats';
import { getCurrentLineup } from '../domain/stats';
import { CourtLocation, MatchEvent, Player } from '../domain/types';
import { useMatchStore } from '../store/useMatchStore';
import { errorLabel, eventKindLabel, statusLabel, zoneLabel } from '../utils/labels';
import { RootStackParamList } from '../utils/navigation';
import { fontSize, spacing } from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'LiveMatch'>;

const getPlayerName = (players: Player[], playerId?: string) => {
  const player = players.find((item) => item.id === playerId);
  return player ? `#${player.number} ${player.lastName || player.firstName}` : 'Equipo';
};

const describeEvent = (event: MatchEvent, players: Player[]) => {
  switch (event.kind) {
    case 'point':
      return `${eventKindLabel(event)} - ${getPlayerName(players, event.playerId)} - ${zoneLabel[event.zone]}`;
    case 'error':
      return `${eventKindLabel(event)} - ${getPlayerName(players, event.playerId)} - ${errorLabel[event.errorType]}`;
    case 'substitution':
      return `Cambio - sale ${getPlayerName(players, event.playerOutId)}, entra ${getPlayerName(players, event.playerInId)}`;
    default:
      return 'Accion registrada';
  }
};

export function LiveMatchScreen({ navigation, route }: Props) {
  const { width } = useWindowDimensions();
  const isPhone = width < 768;
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | undefined>();
  const [subOutId, setSubOutId] = useState<string | undefined>();
  const [subInId, setSubInId] = useState<string | undefined>();
  const [pointMode, setPointMode] = useState<'uruguay_point' | 'opponent_point' | undefined>();
  const [selectedLandingLocation, setSelectedLandingLocation] = useState<CourtLocation | undefined>();
  const players = useMatchStore((state) => state.players);
  const matches = useMatchStore((state) => state.matches);
  const activeMatchId = useMatchStore((state) => state.activeMatchId);
  const startMatch = useMatchStore((state) => state.startMatch);
  const startCurrentPeriod = useMatchStore((state) => state.startCurrentPeriod);
  const endCurrentPeriod = useMatchStore((state) => state.endCurrentPeriod);
  const pauseTimer = useMatchStore((state) => state.pauseTimer);
  const resumeTimer = useMatchStore((state) => state.resumeTimer);
  const tickTimer = useMatchStore((state) => state.tickTimer);
  const recordEvent = useMatchStore((state) => state.recordEvent);
  const substitutePlayer = useMatchStore((state) => state.substitutePlayer);
  const undoLastEvent = useMatchStore((state) => state.undoLastEvent);
  const advancePeriod = useMatchStore((state) => state.advancePeriod);
  const completeActiveMatch = useMatchStore((state) => state.completeActiveMatch);
  const cancelMatch = useMatchStore((state) => state.cancelMatch);
  const targetMatchId = route.params?.matchId ?? activeMatchId ?? matches.find((item) => item.status !== 'cancelled')?.id;
  const match = useMemo(
    () => matches.find((item) => item.id === targetMatchId) ?? matches.find((item) => item.status !== 'cancelled'),
    [matches, targetMatchId],
  );

  useEffect(() => {
    if (match && activeMatchId !== match.id && match.status !== 'draft' && match.status !== 'finished' && match.status !== 'cancelled') {
      startMatch(match.id);
    }
  }, [activeMatchId, match, startMatch]);

  const currentPeriodState = match?.periods.find((period) => period.number === match.currentPeriod);

  useEffect(() => {
    if (!currentPeriodState?.timerRunning) {
      return undefined;
    }

    const intervalId = setInterval(tickTimer, 1000);
    return () => clearInterval(intervalId);
  }, [currentPeriodState?.timerRunning, tickTimer]);

  const currentLineup = match ? getCurrentLineup(match, 'uruguay') : undefined;
  const onCourtPlayers = players.filter((player) => currentLineup?.playerIds.includes(player.id));
  const benchPlayers = players.filter((player) => !currentLineup?.playerIds.includes(player.id));

  useEffect(() => {
    if (!selectedPlayerId && onCourtPlayers[0]) {
      setSelectedPlayerId(onCourtPlayers[0].id);
    }
  }, [onCourtPlayers, selectedPlayerId]);

  if (!match) {
    return (
      <Screen>
        <Text style={styles.emptyTitle}>No hay partidos disponibles</Text>
      </Screen>
    );
  }

  const score = calculateTotalScore(match.events);
  const canRecord = match.status === 'live' && currentPeriodState?.status === 'live';
  const canSubstitute = Boolean(canRecord && subOutId && subInId);
  const lastFiveEvents = match.events.slice(0, 5);
  const timerText = currentPeriodState?.remainingSeconds === 0 ? 'Tiempo cumplido' : formatTimer(currentPeriodState?.remainingSeconds ?? 0);

  const confirmCancel = () => {
    Alert.alert(
      'Cancelar partido',
      '¿Seguro que querés cancelar este partido? Se perderán las acciones registradas.',
      [
        { text: 'No, volver', style: 'cancel' },
        {
          text: 'Sí, cancelar partido',
          style: 'destructive',
          onPress: () => {
            cancelMatch(match.id);
            navigation.navigate('Home');
          },
        },
      ],
    );
  };

  const finishPeriod = () => {
    endCurrentPeriod();
    navigation.navigate('PeriodSummary', { matchId: match.id, periodNumber: match.currentPeriod });
  };

  const confirmPointLocation = () => {
    if (!selectedLandingLocation) {
      Alert.alert('Ubicación requerida', 'Marcá primero dónde cayó la pelota.');
      return;
    }

    recordEvent({
      type: 'goal',
      side: pointMode === 'uruguay_point' ? 'uruguay' : 'opponent',
      playerId: pointMode === 'uruguay_point' ? selectedPlayerId : undefined,
      landingLocation: selectedLandingLocation,
    });
    setPointMode(undefined);
    setSelectedLandingLocation(undefined);
  };

  return (
    <Screen>
      <View style={styles.scoreboard}>
        <View style={styles.scoreBlock}>
          <Text style={styles.teamLabel}>Uruguay</Text>
          <Text style={styles.score}>{score.uruguay}</Text>
        </View>
        <View style={[styles.matchMeta, isPhone && styles.matchMetaPhone]}>
          <Text style={styles.setIndicator}>{formatPeriodName(match.currentPeriod)}</Text>
          <Text style={styles.matchTitle}>vs {match.opponent}</Text>
          <Text style={styles.matchStatus}>{match.status === 'period_break' ? 'Entretiempo' : statusLabel[match.status]}</Text>
          <Text style={styles.timerLabel}>Tiempo restante</Text>
          <Text style={styles.timer}>{timerText}</Text>
        </View>
        <View style={styles.scoreBlock}>
          <Text style={styles.teamLabel}>Rival</Text>
          <Text style={styles.score}>{score.opponent}</Text>
        </View>
      </View>

      {match.status === 'draft' && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Partido en borrador</Text>
          <Text style={styles.emptyText}>Iniciá el partido y luego el 1er tiempo para empezar a registrar acciones.</Text>
          <View style={styles.utilityRow}>
            <ActionButton label="Iniciar partido" onPress={() => startMatch(match.id)} />
            <ActionButton label="Cancelar" onPress={confirmCancel} variant="secondary" />
          </View>
        </View>
      )}

      {match.status === 'live' && currentPeriodState?.status !== 'live' && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{formatPeriodName(match.currentPeriod)}</Text>
          <ActionButton label="Iniciar tiempo" onPress={startCurrentPeriod} />
        </View>
      )}

      {match.status === 'period_break' && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Entretiempo</Text>
          <Text style={styles.emptyText}>El registro de acciones está pausado hasta iniciar el siguiente tiempo.</Text>
          <View style={styles.utilityRow}>
            <ActionButton label="Ver resumen del tiempo" onPress={() => navigation.navigate('PeriodSummary', { matchId: match.id, periodNumber: match.currentPeriod })} />
            {match.currentPeriod < 3 ? (
              <ActionButton
                label="Iniciar siguiente tiempo"
                onPress={() => {
                  advancePeriod();
                  startCurrentPeriod();
                }}
                variant="secondary"
              />
            ) : (
              <ActionButton
                label="Finalizar partido"
                onPress={() => {
                  completeActiveMatch();
                  navigation.navigate('FinalSummary', { matchId: match.id });
                }}
                variant="danger"
              />
            )}
            <ActionButton label="Cancelar partido" onPress={confirmCancel} variant="danger" />
          </View>
        </View>
      )}

      {pointMode && (
        <CourtMapInput
          mode={pointMode}
          selectedLocation={selectedLandingLocation}
          onSelectLocation={setSelectedLandingLocation}
          onConfirm={confirmPointLocation}
          onCancel={() => {
            setPointMode(undefined);
            setSelectedLandingLocation(undefined);
          }}
        />
      )}

      <View style={[styles.mainGrid, isPhone && styles.mainGridPhone]}>
        <View style={styles.leftColumn}>
          <View style={styles.bigActionGrid}>
            <Pressable
              disabled={!canRecord}
              onPress={() => {
                setPointMode('uruguay_point');
                setSelectedLandingLocation(undefined);
              }}
              style={({ pressed }) => [styles.bigButton, styles.uruguayButton, !canRecord && styles.disabledButton, pressed && styles.pressed]}
            >
              <Text style={styles.bigButtonLabel}>Punto Uruguay</Text>
              <Text style={styles.bigButtonHint}>{getPlayerName(players, selectedPlayerId)}</Text>
            </Pressable>

            <Pressable
              disabled={!canRecord}
              onPress={() => {
                setPointMode('opponent_point');
                setSelectedLandingLocation(undefined);
              }}
              style={({ pressed }) => [styles.bigButton, styles.opponentButton, !canRecord && styles.disabledButton, pressed && styles.pressed]}
            >
              <Text style={styles.bigButtonLabel}>Punto rival</Text>
              <Text style={styles.bigButtonHint}>Suma rápida</Text>
            </Pressable>

            <Pressable
              disabled={!canRecord}
              onPress={() => recordEvent({ type: 'fault', side: 'uruguay', playerId: selectedPlayerId })}
              style={({ pressed }) => [styles.bigButton, styles.errorButton, !canRecord && styles.disabledButton, pressed && styles.pressed]}
            >
              <Text style={styles.bigButtonLabel}>Error propio</Text>
              <Text style={styles.bigButtonHint}>{getPlayerName(players, selectedPlayerId)}</Text>
            </Pressable>

            <Pressable
              disabled={!canSubstitute}
              onPress={() => {
                if (!subOutId || !subInId) {
                  return;
                }

                substitutePlayer({ playerOutId: subOutId, playerInId: subInId });
                setSelectedPlayerId(subInId);
                setSubOutId(undefined);
                setSubInId(undefined);
              }}
              style={({ pressed }) => [
                styles.bigButton,
                styles.subButton,
                !canSubstitute && styles.disabledButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.bigButtonLabel}>Cambio</Text>
              <Text style={styles.bigButtonHint}>
                {canSubstitute ? `${getPlayerName(players, subOutId)} -> ${getPlayerName(players, subInId)}` : 'Elegí cancha y banco'}
              </Text>
            </Pressable>
          </View>

          {match.status === 'live' && (
            <View style={styles.utilityRow}>
              <ActionButton label="Deshacer" onPress={undoLastEvent} variant="secondary" />
              {currentPeriodState?.timerRunning ? (
                <ActionButton label="Pausar" onPress={pauseTimer} variant="secondary" />
              ) : (
                <ActionButton label="Reanudar" onPress={resumeTimer} variant="secondary" />
              )}
              <ActionButton label="Finalizar tiempo" onPress={finishPeriod} variant="secondary" />
              <ActionButton label="Cancelar partido" onPress={confirmCancel} variant="danger" />
            </View>
          )}
        </View>

        <View style={styles.rightColumn}>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Jugador en cancha</Text>
            <View style={styles.rosterGrid}>
              {onCourtPlayers.map((player) => (
                <Pressable
                  key={player.id}
                  onPress={() => {
                    setSelectedPlayerId(player.id);
                    setSubOutId(player.id);
                  }}
                  style={[
                    styles.playerTile,
                    selectedPlayerId === player.id && styles.selectedTile,
                    subOutId === player.id && styles.subOutTile,
                  ]}
                >
                  <Text style={[styles.playerNumber, (selectedPlayerId === player.id || subOutId === player.id) && styles.selectedText]}>
                    #{player.number}
                  </Text>
                  <Text style={[styles.playerName, (selectedPlayerId === player.id || subOutId === player.id) && styles.selectedText]}>
                    {player.lastName || player.firstName}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Banco</Text>
            <View style={styles.rosterGrid}>
              {benchPlayers.map((player) => (
                <Pressable
                  key={player.id}
                  onPress={() => setSubInId(player.id)}
                  style={[styles.playerTile, subInId === player.id && styles.benchSelectedTile]}
                >
                  <Text style={[styles.playerNumber, subInId === player.id && styles.selectedText]}>#{player.number}</Text>
                  <Text style={[styles.playerName, subInId === player.id && styles.selectedText]}>{player.lastName || player.firstName}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Últimas acciones</Text>
            {lastFiveEvents.length === 0 ? (
              <Text style={styles.emptyText}>Todavía no hay acciones.</Text>
            ) : (
              lastFiveEvents.map((event) => (
                <View key={event.id} style={styles.eventRow}>
                  <Text style={styles.eventTime}>{formatPeriodName(event.periodNumber).slice(0, 3)}</Text>
                  <Text style={styles.eventText}>{describeEvent(event, players)}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyTitle: {
    color: '#0b1f33',
    fontSize: fontSize.title,
    fontWeight: '900',
  },
  scoreboard: {
    minHeight: 112,
    borderRadius: 8,
    backgroundColor: '#0b1f33',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  scoreBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamLabel: {
    color: '#8bd3ff',
    fontSize: fontSize.small,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  score: {
    color: '#ffffff',
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 48,
  },
  matchMeta: {
    width: 178,
    alignItems: 'center',
    gap: spacing.xs,
  },
  matchMetaPhone: {
    width: 122,
  },
  setIndicator: {
    borderRadius: 8,
    backgroundColor: '#ffffff',
    color: '#0b1f33',
    fontSize: fontSize.small,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    textAlign: 'center',
  },
  matchTitle: {
    color: '#ffffff',
    fontSize: fontSize.body,
    fontWeight: '900',
    textAlign: 'center',
  },
  matchStatus: {
    color: '#d7e5f2',
    fontSize: fontSize.tiny,
    fontWeight: '800',
  },
  timerLabel: {
    color: '#8bd3ff',
    fontSize: fontSize.tiny,
    fontWeight: '800',
  },
  timer: {
    color: '#ffffff',
    fontSize: fontSize.section,
    fontWeight: '900',
  },
  mainGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  mainGridPhone: {
    flexDirection: 'column',
  },
  leftColumn: {
    flex: 1,
    gap: spacing.sm,
    width: '100%',
  },
  rightColumn: {
    flex: 1,
    gap: spacing.sm,
    width: '100%',
  },
  bigActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  bigButton: {
    flexGrow: 1,
    flexBasis: '47%',
    minHeight: 86,
    borderRadius: 8,
    padding: spacing.md,
    justifyContent: 'center',
  },
  uruguayButton: {
    backgroundColor: '#0b6bcb',
  },
  opponentButton: {
    backgroundColor: '#2f4358',
  },
  errorButton: {
    backgroundColor: '#b42318',
  },
  subButton: {
    backgroundColor: '#188038',
  },
  disabledButton: {
    backgroundColor: '#8a98a8',
  },
  pressed: {
    opacity: 0.82,
  },
  bigButtonLabel: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  bigButtonHint: {
    color: '#edf6ff',
    fontSize: fontSize.small,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  utilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  panel: {
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    padding: spacing.sm,
    gap: spacing.sm,
  },
  panelTitle: {
    color: '#0b1f33',
    fontSize: fontSize.section,
    fontWeight: '900',
  },
  rosterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  playerTile: {
    width: '31.8%',
    minHeight: 58,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#f7fafc',
    justifyContent: 'center',
    padding: spacing.xs,
  },
  selectedTile: {
    backgroundColor: '#0b6bcb',
    borderColor: '#0b6bcb',
  },
  subOutTile: {
    backgroundColor: '#188038',
    borderColor: '#188038',
  },
  benchSelectedTile: {
    backgroundColor: '#188038',
    borderColor: '#188038',
  },
  playerNumber: {
    color: '#0b1f33',
    fontSize: fontSize.body,
    fontWeight: '900',
  },
  playerName: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
    fontWeight: '800',
    marginTop: 1,
  },
  selectedText: {
    color: '#ffffff',
  },
  emptyText: {
    color: '#5d6b7a',
    fontSize: fontSize.body,
  },
  eventRow: {
    minHeight: 38,
    borderRadius: 8,
    backgroundColor: '#f4f7fb',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  eventTime: {
    width: 32,
    color: '#0b6bcb',
    fontWeight: '900',
  },
  eventText: {
    flex: 1,
    color: '#0b1f33',
    fontWeight: '700',
    fontSize: fontSize.small,
  },
});
