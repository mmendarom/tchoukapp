import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Modal, Pressable, SafeAreaView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { BenchList } from '../components/BenchList';
import { CourtMapInput } from '../components/CourtMapInput';
import { LineupCourt } from '../components/LineupCourt';
import { LiveMapPanel } from '../components/LiveMapPanel';
import { LiveRecommendationsPanel } from '../components/LiveRecommendationsPanel';
import { PlayerPerformanceBars } from '../components/PlayerPerformanceBars';
import { Screen } from '../components/Screen';
import { buildLiveRecommendations } from '../domain/liveRecommendations';
import { createLineupSlots, getBenchPlayers } from '../domain/lineupSlots';
import { resolveMatchAvailablePlayers } from '../domain/matchSetup';
import { normalizeOpponentName } from '../domain/opponent';
import { buildLivePlayerPerformance } from '../domain/playerPerformance';
import { calculateTotalScore, formatPeriodName, formatTimer, getEventsByPeriod } from '../domain/periodStats';
import { getCurrentLineup } from '../domain/stats';
import { CourtLocation, MatchEvent, Player } from '../domain/types';
import { useMatchStore } from '../store/useMatchStore';
import { eventKindLabel, safeErrorLabel, statusLabel, zoneLabel } from '../utils/labels';
import { RootStackParamList } from '../utils/navigation';
import { fontSize, spacing } from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'LiveMatch'>;
type CourtMapMode = 'uruguay_point' | 'opponent_point' | 'opponent_defense';

const getPlayerName = (players: Player[], playerId?: string) => {
  const player = players.find((item) => item.id === playerId);
  return player ? `#${player.number} ${player.lastName || player.firstName}` : 'Equipo';
};

const getPlayerShortName = (players: Player[], playerId?: string) => {
  const player = players.find((item) => item.id === playerId);
  return player ? player.lastName || player.firstName : 'Equipo';
};

const describeEvent = (event: MatchEvent, players: Player[]) => {
  switch (event.kind) {
    case 'point':
      if (event.pointSource === 'opponent_own_point') {
        return 'Punto en contra rival (+1 Uruguay)';
      }

      return `${eventKindLabel(event)} - ${getPlayerName(players, event.playerId)} - ${zoneLabel[event.zone]}`;
    case 'error':
      return event.errorType === 'punto_en_contra'
        ? `Punto en contra de ${getPlayerName(players, event.playerId)} (+1 rival)`
        : `${safeErrorLabel(event.errorType)} de ${getPlayerName(players, event.playerId)}`;
    case 'defense':
      return `Defensa de ${getPlayerName(players, event.playerId)}`;
    case 'opponent_defense':
      return event.playerId ? `Defensa rival a tiro de ${getPlayerName(players, event.playerId)}` : 'Defensa rival registrada';
    case 'substitution':
      return event.playerOutId
        ? `Cambio - sale ${getPlayerName(players, event.playerOutId)}, entra ${getPlayerName(players, event.playerInId)}`
        : `Cambio - entra ${getPlayerName(players, event.playerInId)}`;
    case 'lineup_swap':
      return `Intercambio en cancha: ${getPlayerName(players, event.playerAId)} ↔ ${getPlayerName(players, event.playerBId)}`;
    default:
      return 'Accion registrada';
  }
};

export function LiveMatchScreen({ navigation, route }: Props) {
  const { height, width } = useWindowDimensions();
  const isPhone = width < 768;
  const isTabletLandscape = width >= 900 && width > height;
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | undefined>();
  const [changeModeActive, setChangeModeActive] = useState(false);
  const [selectedSubOutSlotIndex, setSelectedSubOutSlotIndex] = useState<number | undefined>();
  const [selectedSwapSlotIndex, setSelectedSwapSlotIndex] = useState<number | undefined>();
  const [selectedBenchPlayerId, setSelectedBenchPlayerId] = useState<string | undefined>();
  const [pointMode, setPointMode] = useState<CourtMapMode | undefined>();
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [selectedErrorPlayerId, setSelectedErrorPlayerId] = useState<string | undefined>();
  const [feedbackMessage, setFeedbackMessage] = useState<string | undefined>();
  const [liveMapsExpanded, setLiveMapsExpanded] = useState(false);
  const [selectedLandingLocation, setSelectedLandingLocation] = useState<CourtLocation | undefined>();
  const [selectedOpponentDefenseShooterId, setSelectedOpponentDefenseShooterId] = useState<string | undefined>();
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const feedbackTranslateY = useRef(new Animated.Value(-8)).current;
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
  const recordOpponentOwnPoint = useMatchStore((state) => state.recordOpponentOwnPoint);
  const recordDefense = useMatchStore((state) => state.recordDefense);
  const recordOpponentDefense = useMatchStore((state) => state.recordOpponentDefense);
  const recordError = useMatchStore((state) => state.recordError);
  const substitutePlayer = useMatchStore((state) => state.substitutePlayer);
  const swapLineupPlayers = useMatchStore((state) => state.swapLineupPlayers);
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
  const lineupSlots = useMemo(() => createLineupSlots(currentLineup, players), [currentLineup, players]);
  const availablePlayers = useMemo(() => resolveMatchAvailablePlayers(match, players), [match?.availablePlayerIds, players]);
  const onCourtPlayers = useMemo(
    () => availablePlayers.filter((player) => currentLineup?.playerIds.includes(player.id)),
    [availablePlayers, currentLineup?.playerIds],
  );
  const benchPlayers = useMemo(
    () => getBenchPlayers(players, currentLineup, { availablePlayerIds: match?.availablePlayerIds }),
    [currentLineup, match?.availablePlayerIds, players],
  );
  const selectedOnCourtPlayer = useMemo(
    () => onCourtPlayers.find((player) => player.id === selectedPlayerId),
    [onCourtPlayers, selectedPlayerId],
  );

  useEffect(() => {
    if (selectedPlayerId && !currentLineup?.playerIds.includes(selectedPlayerId)) {
      setSelectedPlayerId(undefined);
    }
  }, [currentLineup?.playerIds, selectedPlayerId]);

  useEffect(() => {
    if (selectedBenchPlayerId && !benchPlayers.some((player) => player.id === selectedBenchPlayerId)) {
      setSelectedBenchPlayerId(undefined);
    }
  }, [benchPlayers, selectedBenchPlayerId]);

  useEffect(() => {
    if (
      typeof selectedSubOutSlotIndex === 'number' &&
      !lineupSlots.some((slot) => slot.index === selectedSubOutSlotIndex && slot.playerId)
    ) {
      setSelectedSubOutSlotIndex(undefined);
    }

    if (
      typeof selectedSwapSlotIndex === 'number' &&
      !lineupSlots.some((slot) => slot.index === selectedSwapSlotIndex && slot.playerId)
    ) {
      setSelectedSwapSlotIndex(undefined);
    }
  }, [lineupSlots, selectedSubOutSlotIndex, selectedSwapSlotIndex]);

  useEffect(() => {
    if (!feedbackMessage) {
      return undefined;
    }

    feedbackOpacity.setValue(0);
    feedbackTranslateY.setValue(-8);
    Animated.parallel([
      Animated.timing(feedbackOpacity, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(feedbackTranslateY, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start();

    const timeoutId = setTimeout(() => {
      Animated.parallel([
        Animated.timing(feedbackOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(feedbackTranslateY, {
          toValue: -8,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setFeedbackMessage(undefined);
        }
      });
    }, 1800);

    return () => clearTimeout(timeoutId);
  }, [feedbackMessage, feedbackOpacity, feedbackTranslateY]);

  if (!match) {
    return (
      <Screen>
        <Text style={styles.emptyTitle}>No hay partidos disponibles</Text>
      </Screen>
    );
  }

  const score = useMemo(() => calculateTotalScore(match.events), [match.events]);
  const canRecord = match.status === 'live' && currentPeriodState?.status === 'live';
  const recentActionLimit = isTabletLandscape ? 10 : 5;
  const recentEvents = useMemo(() => match.events.slice(0, recentActionLimit), [match.events, recentActionLimit]);
  const opponentName = normalizeOpponentName(match.opponent);
  const timerText = currentPeriodState?.remainingSeconds === 0 ? 'Tiempo cumplido' : formatTimer(currentPeriodState?.remainingSeconds ?? 0);
  const shouldShowLiveMaps = match.status === 'live';
  const toggleLiveMapsExpanded = useCallback(() => setLiveMapsExpanded((current) => !current), []);
  const currentPeriodEvents = useMemo(
    () => getEventsByPeriod(match.events, match.currentPeriod),
    [match.currentPeriod, match.events],
  );
  const liveMapPanel = shouldShowLiveMaps ? (
    <LiveMapPanel
      collapsible={!isTabletLandscape}
      events={match.events}
      expanded={isTabletLandscape || liveMapsExpanded}
      onToggleExpanded={toggleLiveMapsExpanded}
      periodNumber={match.currentPeriod}
    />
  ) : undefined;
  const livePerformance = useMemo(
    () => buildLivePlayerPerformance(match.events, players, currentLineup?.playerIds ?? [], match.currentPeriod),
    [currentLineup?.playerIds, match.currentPeriod, match.events, players],
  );
  const livePerformanceBars = match.status === 'live' ? (
    <PlayerPerformanceBars data={livePerformance} showRowsWhenEmpty sortMode="contribution" title="Rendimiento en vivo" />
  ) : undefined;
  const liveRecommendations = useMemo(
    () =>
      buildLiveRecommendations({
        currentLineupPlayerIds: currentLineup?.playerIds ?? [],
        events: currentPeriodEvents,
        maxRecommendations: 12,
        players,
      }),
    [currentLineup?.playerIds, currentPeriodEvents, players],
  );
  const liveRecommendationsPanel = match.status === 'live' ? (
    <LiveRecommendationsPanel recommendations={liveRecommendations} />
  ) : undefined;

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
            resetErrorModal();
            resetSubstitutionFlow();
            setFeedbackMessage(undefined);
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

  const toggleTimer = () => {
    if (currentPeriodState?.timerRunning) {
      pauseTimer();
      return;
    }

    resumeTimer();
  };

  const openUruguayPointFlow = () => {
    if (!canRecord) {
      return;
    }

    if (!selectedPlayerId) {
      setFeedbackMessage('Seleccioná primero quién hizo el punto.');
      return;
    }

    if (!selectedOnCourtPlayer) {
      setFeedbackMessage('Seleccioná un jugador en cancha.');
      return;
    }

    setPointMode('uruguay_point');
    setSelectedLandingLocation(undefined);
    setSelectedOpponentDefenseShooterId(undefined);
  };

  const confirmPointLocation = () => {
    if (!selectedLandingLocation) {
      Alert.alert(
        'Ubicación requerida',
        pointMode === 'opponent_defense' ? 'Marcá primero dónde nos defendieron.' : 'Marcá primero dónde cayó la pelota.',
      );
      return;
    }

    if (pointMode === 'opponent_defense') {
      if (!selectedOpponentDefenseShooterId) {
        setFeedbackMessage('Seleccioná primero quién tiró.');
        return;
      }

      recordOpponentDefense({ playerId: selectedOpponentDefenseShooterId, defenseLocation: selectedLandingLocation });
      setPointMode(undefined);
      setSelectedLandingLocation(undefined);
      setSelectedOpponentDefenseShooterId(undefined);
      setFeedbackMessage('Defensa rival registrada');
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
    setSelectedOpponentDefenseShooterId(undefined);
  };

  const resetErrorModal = () => {
    setErrorModalVisible(false);
    setSelectedErrorPlayerId(undefined);
  };

  const getSelectedActionPlayer = () => {
    if (!selectedPlayerId) {
      setFeedbackMessage('Seleccioná primero un jugador en cancha.');
      return undefined;
    }

    if (!selectedOnCourtPlayer) {
      setFeedbackMessage('Seleccioná un jugador en cancha.');
      return undefined;
    }

    return selectedOnCourtPlayer;
  };

  const openErrorModal = () => {
    const player = getSelectedActionPlayer();

    if (!player) {
      return;
    }

    setPointMode(undefined);
    setSelectedLandingLocation(undefined);
    setSelectedOpponentDefenseShooterId(undefined);
    setSelectedErrorPlayerId(player.id);
    setErrorModalVisible(true);
  };

  const recordSelectedDefense = () => {
    const player = getSelectedActionPlayer();

    if (!player) {
      return;
    }

    recordDefense(player.id);
    setFeedbackMessage(`+1 defensa · ${getPlayerShortName(players, player.id)}`);
  };

  const openOpponentDefenseMap = () => {
    if (!canRecord) {
      setFeedbackMessage('Iniciá el tiempo para registrar defensas.');
      return;
    }

    if (!selectedPlayerId) {
      setFeedbackMessage('Seleccioná primero quién tiró.');
      return;
    }

    if (!selectedOnCourtPlayer) {
      setFeedbackMessage('Seleccioná un jugador en cancha.');
      return;
    }

    setErrorModalVisible(false);
    setSelectedErrorPlayerId(undefined);
    setSelectedOpponentDefenseShooterId(selectedOnCourtPlayer.id);
    setPointMode('opponent_defense');
    setSelectedLandingLocation(undefined);
  };

  const recordOpponentOwnPointAction = () => {
    if (!canRecord) {
      setFeedbackMessage('Iniciá el tiempo para registrar puntos.');
      return;
    }

    setPointMode(undefined);
    setSelectedLandingLocation(undefined);
    setSelectedOpponentDefenseShooterId(undefined);
    setErrorModalVisible(false);
    setSelectedErrorPlayerId(undefined);
    recordOpponentOwnPoint();
    setFeedbackMessage('Punto en contra rival (+1 Uruguay)');
  };

  const confirmError = (errorType: 'falta' | 'punto_en_contra') => {
    if (!selectedErrorPlayerId) {
      return;
    }

    recordError(selectedErrorPlayerId, errorType);
    setSelectedPlayerId(selectedErrorPlayerId);
    setFeedbackMessage(
      errorType === 'punto_en_contra'
        ? `Punto en contra de ${getPlayerName(players, selectedErrorPlayerId)} (+1 rival)`
        : `Falta registrada: ${getPlayerName(players, selectedErrorPlayerId)}`,
    );
    resetErrorModal();
  };

  const resetSubstitutionFlow = () => {
    setChangeModeActive(false);
    setSelectedSubOutSlotIndex(undefined);
    setSelectedSwapSlotIndex(undefined);
    setSelectedBenchPlayerId(undefined);
  };

  const prepareSubstitutionAction = () => {
    if (!canRecord) {
      setFeedbackMessage('Iniciá el tiempo para registrar cambios.');
      return false;
    }

    setPointMode(undefined);
    setSelectedLandingLocation(undefined);
    setErrorModalVisible(false);
    setSelectedErrorPlayerId(undefined);
    return true;
  };

  const handleBenchPlayerPress = (player: Player) => {
    if (!changeModeActive) {
      setFeedbackMessage('Tocá Cambiar jugadores para iniciar un cambio.');
      return;
    }

    setSelectedSwapSlotIndex(undefined);
    setSelectedBenchPlayerId((current) => (current === player.id ? undefined : player.id));
  };

  const startChangeMode = () => {
    if (!prepareSubstitutionAction()) {
      return;
    }

    setChangeModeActive(true);
    setSelectedSubOutSlotIndex(undefined);
    setSelectedSwapSlotIndex(undefined);
    setSelectedBenchPlayerId(undefined);
  };

  const cancelChangeMode = () => {
    resetSubstitutionFlow();
    setFeedbackMessage('Cambio cancelado');
  };

  const confirmSelectedSubstitution = () => {
    if (!prepareSubstitutionAction()) {
      return;
    }

    const selectedSlot =
      typeof selectedSubOutSlotIndex === 'number'
        ? lineupSlots.find((slot) => slot.index === selectedSubOutSlotIndex)
        : undefined;
    const selectedSwapSlot =
      typeof selectedSwapSlotIndex === 'number'
        ? lineupSlots.find((slot) => slot.index === selectedSwapSlotIndex)
        : undefined;

    if (!selectedSlot?.playerId || (!selectedBenchPlayerId && !selectedSwapSlot?.playerId)) {
      setFeedbackMessage('Seleccioná dos jugadores en cancha o un jugador en cancha y uno del banco.');
      return;
    }

    if (selectedSwapSlot?.playerId) {
      const playerAName = getPlayerName(players, selectedSlot.playerId);
      const playerBName = getPlayerName(players, selectedSwapSlot.playerId);

      swapLineupPlayers({ fromSlotIndex: selectedSlot.index, toSlotIndex: selectedSwapSlot.index });
      resetSubstitutionFlow();
      setFeedbackMessage(`Intercambio realizado: ${playerAName} ↔ ${playerBName}`);
      return;
    }

    if (!selectedBenchPlayerId) {
      setFeedbackMessage('Seleccioná dos jugadores en cancha o un jugador en cancha y uno del banco.');
      return;
    }

    const playerInName = getPlayerName(players, selectedBenchPlayerId);
    const playerOutName = getPlayerName(players, selectedSlot.playerId);

    substitutePlayer({ playerInId: selectedBenchPlayerId, playerOutId: selectedSlot.playerId, slotIndex: selectedSlot.index });

    if (selectedPlayerId === selectedSlot.playerId) {
      setSelectedPlayerId(undefined);
    }

    resetSubstitutionFlow();
    setFeedbackMessage(`Cambio realizado: entra ${playerInName}, sale ${playerOutName}`);
  };

  return (
    <Screen>
      <View style={styles.scoreboard}>
        <View style={styles.scoreboardTopRow}>
          <View style={styles.scoreboardControlSlot}>
            {canRecord && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={currentPeriodState?.timerRunning ? 'Pausar' : 'Reanudar'}
                hitSlop={8}
                onPress={toggleTimer}
                style={({ pressed }) => [styles.headerPillButton, pressed && styles.pressed]}
              >
                <Text style={styles.headerPillText}>{currentPeriodState?.timerRunning ? 'Pausar' : 'Reanudar'}</Text>
              </Pressable>
            )}
          </View>

          <Text numberOfLines={1} style={styles.setIndicator}>{formatPeriodName(match.currentPeriod)}</Text>

          <View style={[styles.scoreboardControlSlot, styles.scoreboardControlSlotRight]}>
            {canRecord && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Finalizar tiempo"
                hitSlop={8}
                onPress={finishPeriod}
                style={({ pressed }) => [styles.headerPillButton, styles.headerFinishButton, pressed && styles.pressed]}
              >
                <Text style={[styles.headerPillText, styles.headerFinishText]}>Fin tiempo</Text>
              </Pressable>
            )}
          </View>
        </View>

          <View style={styles.scoreboardScoreRow}>
          <View style={styles.scoreBlock}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={styles.teamLabel}>URU</Text>
            <Text style={styles.score}>{score.uruguay}</Text>
          </View>

          {match.teamPoolName && (
            <Text numberOfLines={1} style={styles.poolLabel}>Plantel: {match.teamPoolName}</Text>
          )}

          <View style={styles.matchMeta}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={styles.matchTitle}>vs {opponentName}</Text>
          </View>

          <View style={styles.scoreBlock}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={styles.teamLabel}>RIVAL</Text>
            <Text style={styles.score}>{score.opponent}</Text>
          </View>
        </View>

        <View style={styles.scoreboardTimerRow}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={styles.timerLine}>
            {match.status === 'period_break' ? 'Entretiempo' : statusLabel[match.status]} · Tiempo restante{' '}
            <Text style={styles.timerValue}>{timerText}</Text>
          </Text>
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
            setSelectedOpponentDefenseShooterId(undefined);
          }}
        />
      )}

      <Modal visible={errorModalVisible} animationType="fade" transparent onRequestClose={resetErrorModal}>
        <SafeAreaView style={styles.modalBackdrop}>
          <View style={styles.errorModal}>
            <Text style={styles.modalTitle}>Registrar error</Text>
            <Text style={styles.errorPlayerText}>Error de {getPlayerName(players, selectedErrorPlayerId)}</Text>
            <View style={styles.errorTypeRow}>
              <Pressable
                onPress={() => confirmError('falta')}
                style={styles.errorTypeButton}
              >
                <Text style={styles.errorTypeText}>Falta</Text>
                <Text style={styles.errorTypeHint}>No cambia el marcador</Text>
              </Pressable>
              <Pressable
                onPress={() => confirmError('punto_en_contra')}
                style={[styles.errorTypeButton, styles.errorTypeDanger]}
              >
                <Text style={[styles.errorTypeText, styles.errorTypeDangerText]}>Punto en contra</Text>
                <Text style={styles.errorTypeHint}>Suma +1 al rival</Text>
              </Pressable>
            </View>

            <View style={styles.modalActions}>
              <ActionButton label="Cancelar" onPress={resetErrorModal} variant="secondary" />
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {feedbackMessage && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.feedbackBanner,
            {
              opacity: feedbackOpacity,
              transform: [{ translateY: feedbackTranslateY }],
            },
          ]}
        >
          <Text style={styles.feedbackText}>{feedbackMessage}</Text>
        </Animated.View>
      )}

      <View style={[styles.mainGrid, isPhone && styles.mainGridPhone, isTabletLandscape && styles.mainGridTabletLandscape]}>
        <View style={[styles.leftColumn, isTabletLandscape && styles.leftColumnTabletLandscape]}>
          <View style={styles.actionGrid}>
            <View style={styles.actionRow}>
              <Pressable
                disabled={!canRecord}
                onPress={openUruguayPointFlow}
                style={({ pressed }) => [styles.actionCard, styles.uruguayButton, !canRecord && styles.disabledButton, pressed && styles.pressed]}
              >
                <Text numberOfLines={2} adjustsFontSizeToFit style={styles.actionButtonLabel}>Punto Uruguay</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit style={styles.actionButtonHint}>{getPlayerName(players, selectedPlayerId)}</Text>
              </Pressable>

              <Pressable
                disabled={!canRecord}
                onPress={recordSelectedDefense}
                style={({ pressed }) => [
                  styles.actionCard,
                  styles.defenseButton,
                  !canRecord && styles.disabledButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text numberOfLines={2} adjustsFontSizeToFit style={styles.actionButtonLabel}>Defensa</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit style={styles.actionButtonHint}>Jugador</Text>
              </Pressable>

              <Pressable
                disabled={!canRecord}
                onPress={openErrorModal}
                style={({ pressed }) => [styles.actionCard, styles.errorButton, !canRecord && styles.disabledButton, pressed && styles.pressed]}
              >
                <Text numberOfLines={2} adjustsFontSizeToFit style={styles.actionButtonLabel}>Error</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit style={styles.actionButtonHint}>{getPlayerName(players, selectedPlayerId)}</Text>
              </Pressable>
            </View>

            <View style={styles.actionRow}>
              <Pressable
                disabled={!canRecord}
                onPress={() => {
                  setPointMode('opponent_point');
                  setSelectedLandingLocation(undefined);
                }}
                style={({ pressed }) => [
                  styles.actionCard,
                  styles.opponentButton,
                  !canRecord && styles.disabledButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text numberOfLines={2} adjustsFontSizeToFit style={styles.actionButtonLabel}>Punto rival</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit style={styles.actionButtonHint}>Mapa</Text>
              </Pressable>

              <Pressable
                disabled={!canRecord}
                onPress={openOpponentDefenseMap}
                style={({ pressed }) => [
                  styles.actionCard,
                  styles.opponentDefenseButton,
                  !canRecord && styles.disabledButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text numberOfLines={2} adjustsFontSizeToFit style={styles.actionButtonLabel}>Defensa rival</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit style={styles.actionButtonHint}>Mapa</Text>
              </Pressable>

              <Pressable
                disabled={!canRecord}
                onPress={recordOpponentOwnPointAction}
                style={({ pressed }) => [
                  styles.actionCard,
                  styles.opponentOwnPointButton,
                  !canRecord && styles.disabledButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text numberOfLines={2} adjustsFontSizeToFit style={styles.actionButtonLabel}>En contra rival</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit style={styles.actionButtonHint}>+1 Uruguay</Text>
              </Pressable>
            </View>

          </View>

          {match.status === 'live' && (
            <View style={styles.undoRow}>
              <Pressable
                accessibilityRole="button"
                onPress={undoLastEvent}
                style={({ pressed }) => [styles.undoButton, pressed && styles.pressed]}
              >
                <Text style={styles.undoIcon}>↶</Text>
                <Text style={styles.undoText}>Deshacer</Text>
              </Pressable>
            </View>
          )}

          {isTabletLandscape && liveMapPanel}
          {isTabletLandscape && livePerformanceBars}
        </View>

        <View style={[styles.rightColumn, isTabletLandscape && styles.rightColumnTabletLandscape]}>
          <View style={styles.panel}>
            <LineupCourt
              slots={lineupSlots}
              selectedPlayerId={changeModeActive ? undefined : selectedPlayerId}
              selectedSlotIndex={changeModeActive ? selectedSubOutSlotIndex : undefined}
              selectedSecondarySlotIndex={changeModeActive ? selectedSwapSlotIndex : undefined}
              highlightSlots={changeModeActive}
              onSlotPress={(slot) => {
                if (changeModeActive) {
                  if (slot.playerId) {
                    if (typeof selectedSubOutSlotIndex !== 'number') {
                      setSelectedSubOutSlotIndex(slot.index);
                      setSelectedBenchPlayerId(undefined);
                      return;
                    }

                    if (slot.index === selectedSubOutSlotIndex) {
                      setSelectedSubOutSlotIndex(undefined);
                      setSelectedSwapSlotIndex(undefined);
                      return;
                    }

                    setSelectedSwapSlotIndex((current) => (current === slot.index ? undefined : slot.index));
                    setSelectedBenchPlayerId(undefined);
                  }
                  return;
                }

                if (slot.playerId) {
                  setSelectedPlayerId(slot.playerId);
                }
              }}
            />
            {changeModeActive ? (
              <View style={styles.changeModeActions}>
                <ActionButton label="Cancelar cambio" onPress={cancelChangeMode} variant="secondary" />
                <Pressable
                  accessibilityRole="button"
                  disabled={typeof selectedSubOutSlotIndex !== 'number' || (!selectedBenchPlayerId && typeof selectedSwapSlotIndex !== 'number')}
                  onPress={confirmSelectedSubstitution}
                  style={({ pressed }) => [
                    styles.confirmChangeButton,
                    (typeof selectedSubOutSlotIndex !== 'number' || (!selectedBenchPlayerId && typeof selectedSwapSlotIndex !== 'number')) && styles.confirmChangeDisabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.confirmChangeText}>{typeof selectedSwapSlotIndex === 'number' ? 'Intercambiar en cancha' : 'Confirmar cambio'}</Text>
                </Pressable>
              </View>
            ) : (
              <ActionButton label="Cambiar jugadores" onPress={startChangeMode} variant="secondary" />
            )}
          </View>

          {changeModeActive && (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Banco</Text>
              <Text style={styles.sectionLabel}>Seleccioná suplente o dos jugadores en cancha</Text>
              <BenchList
                players={benchPlayers}
                selectedPlayerId={selectedBenchPlayerId}
                onPlayerPress={handleBenchPlayerPress}
              />
            </View>
          )}

          <View style={[styles.panel, styles.latestActionsPanel, isTabletLandscape && styles.latestActionsPanelTablet]}>
            <Text style={styles.panelTitle}>Últimas acciones</Text>
            {recentEvents.length === 0 ? (
              <Text style={styles.emptyText}>Todavía no hay acciones.</Text>
            ) : (
              recentEvents.map((event) => (
                <View key={event.id} style={styles.eventRow}>
                  <Text style={styles.eventTime}>{formatPeriodName(event.periodNumber).slice(0, 3)}</Text>
                  <Text style={styles.eventText}>{describeEvent(event, players)}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </View>

      {!isTabletLandscape && liveMapPanel}
      {!isTabletLandscape && livePerformanceBars}
      {liveRecommendationsPanel}

      {match.status === 'live' && (
        <View style={styles.matchControlsPanel}>
          <Text style={styles.sectionLabel}>Controles del partido</Text>
          <View style={styles.utilityRow}>
            <ActionButton label="Cancelar partido" onPress={confirmCancel} variant="danger" />
          </View>
        </View>
      )}
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
    minHeight: 118,
    borderRadius: 8,
    backgroundColor: '#0b1f33',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 2,
  },
  scoreboardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  scoreboardControlSlot: {
    flex: 1,
    minWidth: 86,
    alignItems: 'flex-start',
  },
  scoreboardControlSlotRight: {
    alignItems: 'flex-end',
  },
  headerPillButton: {
    minHeight: 30,
    minWidth: 82,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  headerFinishButton: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  headerPillText: {
    color: '#0b1f33',
    fontSize: fontSize.tiny,
    fontWeight: '900',
    textAlign: 'center',
  },
  headerFinishText: {
    color: '#991b1b',
  },
  scoreboardScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  scoreBlock: {
    flex: 1,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamLabel: {
    color: '#8bd3ff',
    width: '100%',
    fontSize: fontSize.tiny,
    fontWeight: '900',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  score: {
    color: '#ffffff',
    fontSize: 54,
    fontWeight: '900',
    lineHeight: 56,
  },
  matchMeta: {
    flex: 1.25,
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setIndicator: {
    borderRadius: 8,
    backgroundColor: '#ffffff',
    color: '#0b1f33',
    fontSize: fontSize.tiny,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    textAlign: 'center',
  },
  matchTitle: {
    color: '#ffffff',
    width: '100%',
    fontSize: fontSize.small,
    fontWeight: '900',
    textAlign: 'center',
  },
  scoreboardTimerRow: {
    alignItems: 'center',
  },
  timerLine: {
    color: '#d7e5f2',
    fontSize: fontSize.tiny,
    fontWeight: '800',
    textAlign: 'center',
    width: '100%',
  },
  timerValue: {
    color: '#ffffff',
    fontWeight: '900',
  },
  poolLabel: {
    alignSelf: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(139, 211, 255, 0.16)',
    color: '#d7e5f2',
    fontSize: fontSize.small,
    fontWeight: '900',
    marginTop: 2,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    textAlign: 'center',
  },
  mainGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'stretch',
  },
  mainGridTabletLandscape: {
    gap: spacing.lg,
  },
  mainGridPhone: {
    flexDirection: 'column',
    gap: spacing.sm,
  },
  leftColumn: {
    flex: 1,
    gap: spacing.xs,
    width: '100%',
  },
  leftColumnTabletLandscape: {
    flex: 1.25,
  },
  rightColumn: {
    flex: 1,
    gap: spacing.xs,
    width: '100%',
  },
  rightColumnTabletLandscape: {
    flex: 0.9,
  },
  latestActionsPanel: {
    flexGrow: 1,
  },
  latestActionsPanelTablet: {
    minHeight: 300,
  },
  actionGrid: {
    gap: spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionCard: {
    flex: 1,
    minHeight: 68,
    borderRadius: 8,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uruguayButton: {
    backgroundColor: '#0b6bcb',
  },
  opponentButton: {
    backgroundColor: '#7f1d1d',
  },
  opponentOwnPointButton: {
    backgroundColor: '#188038',
  },
  defenseButton: {
    backgroundColor: '#0f766e',
  },
  opponentDefenseButton: {
    backgroundColor: '#6d28d9',
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 31, 51, 0.72)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  errorModal: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    padding: spacing.md,
    gap: spacing.sm,
  },
  substitutionModal: {
    width: '100%',
    maxWidth: 920,
    maxHeight: '96%',
    alignSelf: 'center',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    padding: spacing.md,
    gap: spacing.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  modalTitle: {
    color: '#0b1f33',
    fontSize: fontSize.title,
    fontWeight: '900',
  },
  modalHint: {
    color: '#5d6b7a',
    fontSize: fontSize.body,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  substitutionGrid: {
    gap: spacing.sm,
  },
  substitutionGridWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  substitutionPane: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 260,
  },
  errorPlayerText: {
    color: '#5d6b7a',
    fontSize: fontSize.body,
    fontWeight: '900',
  },
  errorTypeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  errorTypeButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#f7fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  errorTypeDanger: {
    backgroundColor: '#fff5f5',
    borderColor: '#b42318',
  },
  errorTypeText: {
    color: '#0b1f33',
    fontSize: fontSize.body,
    fontWeight: '900',
    textAlign: 'center',
  },
  errorTypeDangerText: {
    color: '#b42318',
  },
  errorTypeHint: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  changeModeActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  confirmChangeButton: {
    minHeight: 44,
    flexGrow: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#188038',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  confirmChangeDisabled: {
    backgroundColor: '#8a98a8',
  },
  confirmChangeText: {
    color: '#ffffff',
    fontSize: fontSize.button,
    fontWeight: '700',
  },
  feedbackBanner: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    zIndex: 20,
    alignSelf: 'center',
    borderRadius: 8,
    backgroundColor: '#0f766e',
    borderWidth: 1,
    borderColor: '#0b5f59',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  feedbackText: {
    color: '#ffffff',
    fontSize: fontSize.body,
    fontWeight: '900',
    textAlign: 'center',
  },
  actionButtonLabel: {
    color: '#ffffff',
    fontSize: fontSize.small,
    fontWeight: '900',
    textAlign: 'center',
  },
  actionButtonHint: {
    color: '#edf6ff',
    fontSize: fontSize.tiny,
    fontWeight: '800',
    marginTop: 2,
    textAlign: 'center',
  },
  utilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  undoRow: {
    alignItems: 'center',
  },
  undoButton: {
    minHeight: 42,
    width: '100%',
    maxWidth: 420,
    borderRadius: 8,
    backgroundColor: '#f59e0b',
    borderWidth: 1,
    borderColor: '#b45309',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  undoIcon: {
    color: '#0b1f33',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 24,
  },
  undoText: {
    color: '#0b1f33',
    fontSize: fontSize.button,
    fontWeight: '900',
  },
  panel: {
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    padding: spacing.sm,
    gap: spacing.sm,
  },
  matchControlsPanel: {
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
  sectionLabel: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
    fontWeight: '800',
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
