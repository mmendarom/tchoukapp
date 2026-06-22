import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { Screen } from '../components/Screen';
import { getSuggestedNextMiniMatch, getTrainingQueue, getTrainingSessionStats, TrainingPlayerStats } from '../domain/training';
import {
  formatTrainingMiniMatchScore,
  getTrainingTeamName,
  trainingStatusLabel,
} from '../domain/trainingLive';
import {
  buildTrainingSessionSettings,
  buildTrainingSetupValidation,
  buildTrainingTeamsFromAssignments,
  createTrainingSetupTeamIds,
  getTrainingTeamCountOptions,
  parseTrainingTargetScore,
  TrainingTeamAssignment,
} from '../domain/trainingSetup';
import { Player, TeamPool } from '../domain/types';
import { useMatchStore } from '../store/useMatchStore';
import { useTrainingStore } from '../store/useTrainingStore';
import { RootStackParamList } from '../utils/navigation';
import { fontSize, spacing } from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'TrainingSessions'>;

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

const getPlayerLabel = (player: Player) => `#${player.number} ${player.lastName || player.firstName}`.trim();

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const getPlayerStatLabel = (playersById: Map<string, Player>, playerId: string) => {
  const player = playersById.get(playerId);

  return player ? getPlayerLabel(player) : 'Jugador sin datos';
};

const formatShootingLine = (stats: TrainingPlayerStats) =>
  `${stats.points}/${stats.attempts} tiros · ${stats.attempts > 0 ? formatPercent(stats.effectiveness) : 'Sin tiros'}`;

export function TrainingSessionsScreen({ navigation }: Props) {
  const players = useMatchStore((state) => state.players);
  const teamPools = useMatchStore((state) => state.teamPools);
  const trainingSessions = useTrainingStore((state) => state.trainingSessions);
  const createTrainingSession = useTrainingStore((state) => state.createTrainingSession);
  const startTrainingSession = useTrainingStore((state) => state.startTrainingSession);
  const startMiniMatch = useTrainingStore((state) => state.startMiniMatch);
  const startSuggestedNextMiniMatch = useTrainingStore((state) => state.startSuggestedNextMiniMatch);
  const [selectedTeamPoolId, setSelectedTeamPoolId] = useState(teamPools[0]?.id ?? '');
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [teamCount, setTeamCount] = useState(2);
  const [assignments, setAssignments] = useState<TrainingTeamAssignment>({});
  const [targetScoreInput, setTargetScoreInput] = useState('3');
  const [winnerStays, setWinnerStays] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>();
  const [selectedTeamAId, setSelectedTeamAId] = useState<string | undefined>();
  const [selectedTeamBId, setSelectedTeamBId] = useState<string | undefined>();
  const [createStatus, setCreateStatus] = useState('');
  const [miniMatchStatus, setMiniMatchStatus] = useState('');
  const selectedTeamPool = useMemo(
    () => teamPools.find((pool) => pool.id === selectedTeamPoolId) ?? teamPools[0],
    [selectedTeamPoolId, teamPools],
  );
  const playersById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const poolPlayers = useMemo(
    () =>
      (selectedTeamPool?.playerIds ?? [])
        .map((playerId) => playersById.get(playerId))
        .filter((player): player is Player => Boolean(player)),
    [playersById, selectedTeamPool?.playerIds],
  );
  const teamIds = useMemo(() => createTrainingSetupTeamIds(teamCount), [teamCount]);
  const targetScore = parseTrainingTargetScore(targetScoreInput);
  const teamCountOptions = getTrainingTeamCountOptions(participantIds.length);
  const teamsPreview = useMemo(() => buildTrainingTeamsFromAssignments(teamIds, assignments), [assignments, teamIds]);
  const unassignedParticipantIds = participantIds.filter((playerId) => !assignments[playerId]);
  const validationMessage = buildTrainingSetupValidation({
    participantCount: participantIds.length,
    teamIds,
    assignments,
    targetScore,
  });
  const selectedSession = trainingSessions.find((session) => session.id === selectedSessionId);
  const activeMiniMatch = selectedSession?.miniMatches.find((miniMatch) => miniMatch.status === 'live');
  const miniMatchHistory = selectedSession?.miniMatches.filter((miniMatch) => miniMatch.status !== 'live') ?? [];
  const latestFinishedMiniMatch = selectedSession?.miniMatches.find((miniMatch) => miniMatch.status === 'finished');
  const selectedSessionQueue = selectedSession ? getTrainingQueue(selectedSession) : [];
  const suggestedNextMiniMatch = selectedSession ? getSuggestedNextMiniMatch(selectedSession) : undefined;
  const selectedSessionStats = useMemo(
    () => selectedSession ? getTrainingSessionStats(selectedSession) : undefined,
    [selectedSession],
  );
  const playerRanking = useMemo(
    () =>
      (selectedSessionStats?.playerStats ?? [])
        .filter((stats) =>
          stats.points > 0 ||
          stats.attempts > 0 ||
          stats.defenses > 0 ||
          stats.errors > 0 ||
          stats.ownPointsAgainst > 0 ||
          stats.miniMatchesPlayed > 0)
        .sort((a, b) =>
          b.points - a.points ||
          b.defenses - a.defenses ||
          b.attempts - a.attempts ||
          b.plusMinus - a.plusMinus ||
          a.playerId.localeCompare(b.playerId))
        .slice(0, 7),
    [selectedSessionStats?.playerStats],
  );
  const trainingAlerts = useMemo(() => {
    if (!selectedSessionStats) {
      return [];
    }

    const alerts: string[] = [];
    const repeatedErrors = selectedSessionStats.mostErrors.filter((stats) => stats.errors >= 2).slice(0, 2);
    const repeatedOwnPoints = selectedSessionStats.mostOwnPointsAgainst.filter((stats) => stats.ownPointsAgainst >= 1).slice(0, 2);
    const lowEffectiveness = selectedSessionStats.playerStats
      .filter((stats) => stats.attempts >= 3 && stats.effectiveness <= 0.34)
      .sort((a, b) => a.effectiveness - b.effectiveness || b.attempts - a.attempts)
      .slice(0, 2);

    repeatedErrors.forEach((stats) => {
      alerts.push(`Errores repetidos: ${getPlayerStatLabel(playersById, stats.playerId)} · ${stats.errors} errores`);
    });
    repeatedOwnPoints.forEach((stats) => {
      alerts.push(`Puntos en contra: ${getPlayerStatLabel(playersById, stats.playerId)} · ${stats.ownPointsAgainst}`);
    });
    lowEffectiveness.forEach((stats) => {
      alerts.push(`Baja efectividad: ${getPlayerStatLabel(playersById, stats.playerId)} · ${formatShootingLine(stats)}`);
    });

    return alerts.slice(0, 5);
  }, [playersById, selectedSessionStats]);
  const resetSetup = () => {
    setParticipantIds([]);
    setAssignments({});
    setTeamCount(2);
    setTargetScoreInput('3');
    setWinnerStays(true);
  };
  const handleSelectPool = (pool: TeamPool) => {
    setSelectedTeamPoolId(pool.id);
    resetSetup();
  };
  const toggleParticipant = (playerId: string) => {
    setParticipantIds((current) => {
      if (current.includes(playerId)) {
        setAssignments((currentAssignments) => {
          const nextAssignments = { ...currentAssignments };

          delete nextAssignments[playerId];
          return nextAssignments;
        });
        return current.filter((id) => id !== playerId);
      }

      return [...current, playerId];
    });
  };
  const assignPlayer = (playerId: string, teamId?: string) => {
    if (!participantIds.includes(playerId)) {
      return;
    }

    setAssignments((current) => ({
      ...current,
      [playerId]: teamId,
    }));
  };
  const handleTeamCount = (nextTeamCount: number) => {
    setTeamCount(nextTeamCount);
    setAssignments((current) => {
      const allowedTeamIds = new Set(createTrainingSetupTeamIds(nextTeamCount));

      return Object.fromEntries(Object.entries(current).filter(([, teamId]) => teamId && allowedTeamIds.has(teamId)));
    });
  };
  const handleCreateSession = () => {
    setCreateStatus('');

    if (validationMessage || !selectedTeamPool) {
      setCreateStatus(validationMessage || 'Seleccioná un plantel.');
      return;
    }

    const sessionId = createTrainingSession({
      teamPoolId: selectedTeamPool.id,
      teamPoolName: selectedTeamPool.name,
      participantPlayerIds: participantIds,
      teams: teamsPreview,
      settings: buildTrainingSessionSettings(targetScore, winnerStays),
    });

    if (!sessionId) {
      setCreateStatus('No se pudo crear la práctica.');
      return;
    }

    setSelectedSessionId(sessionId);
    setSelectedTeamAId(undefined);
    setSelectedTeamBId(undefined);
    setCreateStatus('Sesión creada.');
    resetSetup();
  };
  const handleStartMiniMatch = () => {
    setMiniMatchStatus('');

    if (!selectedSession) {
      setMiniMatchStatus('Seleccioná una sesión.');
      return;
    }

    if (selectedSession.status === 'finished' || selectedSession.status === 'cancelled') {
      setMiniMatchStatus('La sesión ya está cerrada.');
      return;
    }

    if (activeMiniMatch) {
      setMiniMatchStatus('Ya hay un mini partido en vivo.');
      return;
    }

    if (!selectedTeamAId || !selectedTeamBId || selectedTeamAId === selectedTeamBId) {
      setMiniMatchStatus('Elegí dos equipos distintos.');
      return;
    }

    startTrainingSession(selectedSession.id);
    const miniMatchId = startMiniMatch(selectedSession.id, selectedTeamAId, selectedTeamBId);

    if (!miniMatchId) {
      setMiniMatchStatus('No se pudo iniciar el mini partido.');
      return;
    }

    navigation.navigate('LiveTrainingMiniMatch', { sessionId: selectedSession.id, miniMatchId });
  };
  const handleStartSuggestedMiniMatch = () => {
    setMiniMatchStatus('');

    if (!selectedSession || !suggestedNextMiniMatch) {
      setMiniMatchStatus('No hay próximo sugerido.');
      return;
    }

    const miniMatchId = startSuggestedNextMiniMatch(selectedSession.id);

    if (!miniMatchId) {
      setMiniMatchStatus('No se pudo iniciar el próximo mini partido.');
      return;
    }

    navigation.navigate('LiveTrainingMiniMatch', { sessionId: selectedSession.id, miniMatchId });
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>Entrenamiento</Text>
          <Text style={styles.title}>Práctica 3v3</Text>
          <Text style={styles.copy}>Armá equipos internos, iniciá mini partidos y registrá acciones en vivo.</Text>
        </View>
        <ActionButton label="Inicio" onPress={() => navigation.navigate('Home')} variant="secondary" />
      </View>

      {trainingSessions.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Sesiones guardadas</Text>
          <View style={styles.sessionList}>
            {trainingSessions.map((session) => (
              <Pressable
                key={session.id}
                onPress={() => setSelectedSessionId(session.id)}
                style={({ pressed }) => [styles.sessionCard, selectedSessionId === session.id && styles.sessionCardSelected, pressed && styles.pressed]}
              >
                <Text style={styles.sessionTitle}>{session.teamPoolName || 'Práctica'}</Text>
                <Text style={styles.sessionMeta}>
                  {formatDate(session.createdAt)} · {session.teams.length} equipos · {session.participantPlayerIds.length} jugadores
                </Text>
                <Text style={styles.sessionStatus}>{trainingStatusLabel[session.status]}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {selectedSession && (
        <View style={[styles.card, styles.detailCard]}>
          <Text style={styles.sectionTitle}>Sesión creada</Text>
          <Text style={styles.detailText}>Plantel: {selectedSession.teamPoolName || 'Sin plantel'}</Text>
          <Text style={styles.detailText}>Participantes: {selectedSession.participantPlayerIds.length}</Text>
          <Text style={styles.detailText}>Puntos para ganar: {selectedSession.settings.targetScore}</Text>
          <Text style={styles.detailText}>Ganador queda: {selectedSession.settings.winnerStays ? 'Sí' : 'No'}</Text>
          <View style={styles.teamPreviewGrid}>
            {selectedSession.teams.map((team) => (
              <View key={team.id} style={styles.teamPreviewCard}>
                <Text style={styles.teamTitle}>{team.name} · {team.playerIds.length}</Text>
                <Text style={styles.teamPlayers}>
                  {team.playerIds.map((playerId) => playersById.get(playerId)).filter((player): player is Player => Boolean(player)).map(getPlayerLabel).join(' · ')}
                </Text>
              </View>
            ))}
          </View>

          {selectedSessionStats && (
            <View style={styles.setupSection}>
              <Text style={styles.sectionTitle}>Resumen de la práctica</Text>
              <View style={styles.summaryGrid}>
                <SummaryCard label="Mini partidos" value={`${selectedSessionStats.finishedMiniMatches}/${selectedSessionStats.totalMiniMatches}`} />
                <SummaryCard label="Equipos" value={`${selectedSession.teams.length}`} />
                <SummaryCard label="Puntos" value={`${selectedSessionStats.totalPoints}`} />
                <SummaryCard label="Target" value={`${selectedSession.settings.targetScore}`} />
              </View>
            </View>
          )}

          {selectedSessionStats && (
            <View style={styles.setupSection}>
              <Text style={styles.sectionTitle}>Tabla de equipos</Text>
              <View style={styles.standingsList}>
                {selectedSessionStats.teamStats.map((teamStat, index) => (
                  <View key={teamStat.teamId} style={styles.standingRow}>
                    <Text style={styles.standingRank}>{index + 1}</Text>
                    <View style={styles.standingTeam}>
                      <Text style={styles.teamTitle}>{getTrainingTeamName(selectedSession, teamStat.teamId)}</Text>
                      <Text style={styles.teamPlayers}>
                        J {teamStat.played} · G {teamStat.wins} · P {teamStat.losses} · {formatPercent(teamStat.winRate)}
                      </Text>
                    </View>
                    <Text style={styles.standingScore}>PF {teamStat.pointsFor}</Text>
                    <Text style={styles.standingScore}>PC {teamStat.pointsAgainst}</Text>
                    <Text style={[styles.standingDiff, teamStat.pointDiff >= 0 ? styles.positiveText : styles.negativeText]}>
                      {teamStat.pointDiff >= 0 ? '+' : ''}{teamStat.pointDiff}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {selectedSessionStats && (
            <View style={styles.setupSection}>
              <Text style={styles.sectionTitle}>Top ataque</Text>
              {selectedSessionStats.topAttackers.length === 0 ? (
                <Text style={styles.helperText}>Sin tiros registrados.</Text>
              ) : (
                selectedSessionStats.topAttackers.slice(0, 5).map((stats) => (
                  <View key={stats.playerId} style={styles.rankingRow}>
                    <Text style={styles.rankingName}>{getPlayerStatLabel(playersById, stats.playerId)}</Text>
                    <Text style={styles.rankingMeta}>{formatShootingLine(stats)}</Text>
                  </View>
                ))
              )}
            </View>
          )}

          {selectedSessionStats && (
            <View style={styles.setupSection}>
              <Text style={styles.sectionTitle}>Top defensa</Text>
              {selectedSessionStats.topDefenders.length === 0 ? (
                <Text style={styles.helperText}>Sin defensas registradas.</Text>
              ) : (
                selectedSessionStats.topDefenders.slice(0, 5).map((stats) => (
                  <View key={stats.playerId} style={styles.rankingRow}>
                    <Text style={styles.rankingName}>{getPlayerStatLabel(playersById, stats.playerId)}</Text>
                    <Text style={styles.rankingMeta}>{stats.defenses} defensas · +/- {stats.plusMinus}</Text>
                  </View>
                ))
              )}
            </View>
          )}

          {selectedSessionStats && (
            <View style={styles.setupSection}>
              <Text style={styles.sectionTitle}>Alertas</Text>
              {trainingAlerts.length === 0 ? (
                <Text style={styles.helperText}>Sin alertas estadísticas relevantes.</Text>
              ) : (
                trainingAlerts.map((alert) => (
                  <Text key={alert} style={styles.alertText}>{alert}</Text>
                ))
              )}
            </View>
          )}

          {playerRanking.length > 0 && (
            <View style={styles.setupSection}>
              <Text style={styles.sectionTitle}>Rendimiento jugadores</Text>
              {playerRanking.map((stats) => (
                <View key={stats.playerId} style={styles.playerStatRow}>
                  <View style={styles.playerStatMain}>
                    <Text style={styles.rankingName}>{getPlayerStatLabel(playersById, stats.playerId)}</Text>
                    <Text style={styles.rankingMeta}>
                      {formatShootingLine(stats)} · Def {stats.defenses} · Err {stats.errors} · EC {stats.ownPointsAgainst}
                    </Text>
                  </View>
                  <Text style={styles.playerStatRecord}>{stats.wins}-{stats.losses}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.setupSection}>
            <Text style={styles.sectionTitle}>Cola</Text>
            <Text style={styles.helperText}>
              {selectedSession.settings.winnerStays
                ? 'Ganador queda, perdedor va al fondo.'
                : 'Rotan ambos equipos al fondo.'}
            </Text>
            <View style={styles.queueList}>
              {selectedSessionQueue.map((team, index) => {
                const playing = activeMiniMatch ? [activeMiniMatch.teamAId, activeMiniMatch.teamBId].includes(team.id) : false;
                const lastLoser = latestFinishedMiniMatch?.loserTeamId === team.id;
                const statusLabel = playing ? 'jugando' : lastLoser ? 'último perdedor' : 'esperando';

                return (
                  <View key={team.id} style={[styles.queueItem, playing && styles.queueItemActive]}>
                    <Text style={styles.queuePosition}>{index + 1}</Text>
                    <View style={styles.queueTextWrap}>
                      <Text style={styles.teamTitle}>{team.name}</Text>
                      <Text style={styles.queueStatus}>{statusLabel}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {activeMiniMatch ? (
            <View style={styles.liveMiniCard}>
              <Text style={styles.liveMiniTitle}>Mini partido en vivo</Text>
              <Text style={styles.liveMiniText}>{formatTrainingMiniMatchScore(selectedSession, activeMiniMatch)}</Text>
              <ActionButton
                label="Abrir mini partido"
                onPress={() => navigation.navigate('LiveTrainingMiniMatch', { sessionId: selectedSession.id, miniMatchId: activeMiniMatch.id })}
              />
            </View>
          ) : (
            <View style={styles.setupSection}>
              <Text style={styles.sectionTitle}>Próximo mini partido</Text>
              {suggestedNextMiniMatch ? (
                <View style={styles.suggestionCard}>
                  <Text style={styles.liveMiniTitle}>Próximo sugerido</Text>
                  <Text style={styles.liveMiniText}>
                    {getTrainingTeamName(selectedSession, suggestedNextMiniMatch.teamAId)} vs {getTrainingTeamName(selectedSession, suggestedNextMiniMatch.teamBId)}
                  </Text>
                  <ActionButton label="Iniciar próximo" onPress={handleStartSuggestedMiniMatch} />
                </View>
              ) : (
                <Text style={styles.helperText}>No hay próximo sugerido. Elegí dos equipos manualmente.</Text>
              )}
              <Text style={styles.sectionTitle}>Elegir manualmente</Text>
              <Text style={styles.helperText}>Podés saltear la sugerencia y elegir cualquier cruce válido.</Text>
              <View style={styles.optionRow}>
                {selectedSession.teams.map((team) => {
                  const selected = selectedTeamAId === team.id;

                  return (
                    <Pressable
                      key={`a-${team.id}`}
                      onPress={() => setSelectedTeamAId(team.id)}
                      style={({ pressed }) => [styles.choiceButton, selected && styles.choiceButtonSelected, pressed && styles.pressed]}
                    >
                      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>A: {team.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.optionRow}>
                {selectedSession.teams.map((team) => {
                  const selected = selectedTeamBId === team.id;

                  return (
                    <Pressable
                      key={`b-${team.id}`}
                      onPress={() => setSelectedTeamBId(team.id)}
                      style={({ pressed }) => [styles.choiceButton, selected && styles.choiceButtonSelected, pressed && styles.pressed]}
                    >
                      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>B: {team.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {miniMatchStatus ? <Text style={[styles.statusText, styles.errorText]}>{miniMatchStatus}</Text> : null}
              <ActionButton label="Iniciar mini partido" onPress={handleStartMiniMatch} />
            </View>
          )}

          <View style={styles.setupSection}>
            <Text style={styles.sectionTitle}>Historial de mini partidos</Text>
            {miniMatchHistory.length === 0 ? (
              <Text style={styles.helperText}>Sin mini partidos cerrados todavía.</Text>
            ) : (
              miniMatchHistory.map((miniMatch) => (
                <View key={miniMatch.id} style={styles.historyCard}>
                  <Text style={styles.teamTitle}>{formatTrainingMiniMatchScore(selectedSession, miniMatch)}</Text>
                  <Text style={styles.teamPlayers}>
                    {miniMatch.winnerTeamId ? `Ganador: ${getTrainingTeamName(selectedSession, miniMatch.winnerTeamId)}` : trainingStatusLabel[miniMatch.status]}
                  </Text>
                  <Text style={styles.detailText}>{miniMatch.events.length} acciones</Text>
                </View>
              ))
            )}
          </View>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Plantel</Text>
        <View style={styles.optionRow}>
          {teamPools.map((pool) => {
            const selected = selectedTeamPool?.id === pool.id;

            return (
              <Pressable
                key={pool.id}
                onPress={() => handleSelectPool(pool)}
                style={({ pressed }) => [styles.choiceButton, selected && styles.choiceButtonSelected, pressed && styles.pressed]}
              >
                <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{pool.name}</Text>
                <Text style={[styles.choiceHint, selected && styles.choiceTextSelected]}>{pool.playerIds.length} jugadores</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Jugadores de la práctica</Text>
          <Text style={styles.countBadge}>{participantIds.length} seleccionados</Text>
        </View>
        <View style={styles.playerGrid}>
          {poolPlayers.map((player) => {
            const selected = participantIds.includes(player.id);

            return (
              <Pressable
                key={player.id}
                onPress={() => toggleParticipant(player.id)}
                style={({ pressed }) => [styles.playerTile, selected && styles.playerTileSelected, pressed && styles.pressed]}
              >
                <Text style={[styles.playerNumber, selected && styles.playerSelectedText]}>#{player.number}</Text>
                <Text numberOfLines={1} style={[styles.playerName, selected && styles.playerSelectedText]}>{player.lastName || player.firstName}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Equipos</Text>
        <Text style={styles.helperText}>Asigná cada jugador a un equipo. Cada equipo necesita 3 o 4 jugadores.</Text>
        <View style={styles.optionRow}>
          {[2, 3, 4].map((count) => {
            const selected = teamCount === count;
            const disabled = !teamCountOptions.includes(count);

            return (
              <Pressable
                key={count}
                disabled={disabled}
                onPress={() => handleTeamCount(count)}
                style={({ pressed }) => [styles.choiceButton, selected && styles.choiceButtonSelected, disabled && styles.disabled, pressed && styles.pressed]}
              >
                <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{count} equipos</Text>
                <Text style={[styles.choiceHint, selected && styles.choiceTextSelected]}>{disabled ? 'Faltan jugadores' : 'Disponible'}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.assignmentList}>
          {participantIds.map((playerId) => {
            const player = playersById.get(playerId);

            if (!player) {
              return null;
            }

            return (
              <View key={playerId} style={styles.assignmentRow}>
                <View style={styles.assignmentPlayer}>
                  <Text style={styles.assignmentName}>{getPlayerLabel(player)}</Text>
                  <Text style={styles.assignmentHint}>{assignments[playerId] ? 'Asignado' : 'Sin equipo'}</Text>
                </View>
                <View style={styles.assignmentButtons}>
                  <Pressable onPress={() => assignPlayer(playerId, undefined)} style={[styles.teamButton, !assignments[playerId] && styles.teamButtonSelected]}>
                    <Text style={[styles.teamButtonText, !assignments[playerId] && styles.teamButtonSelectedText]}>Sin equipo</Text>
                  </Pressable>
                  {teamIds.map((teamId, index) => {
                    const selected = assignments[playerId] === teamId;

                    return (
                      <Pressable key={teamId} onPress={() => assignPlayer(playerId, teamId)} style={[styles.teamButton, selected && styles.teamButtonSelected]}>
                        <Text style={[styles.teamButtonText, selected && styles.teamButtonSelectedText]}>Eq {index + 1}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.teamPreviewGrid}>
          {teamsPreview.map((team) => {
            const validSize = team.playerIds.length >= 3 && team.playerIds.length <= 4;

            return (
              <View key={team.id} style={[styles.teamPreviewCard, !validSize && styles.invalidTeamCard]}>
                <Text style={styles.teamTitle}>{team.name} · {team.playerIds.length} jugadores</Text>
                <Text style={styles.teamPlayers}>
                  {team.playerIds.length > 0
                    ? team.playerIds.map((playerId) => playersById.get(playerId)).filter((player): player is Player => Boolean(player)).map(getPlayerLabel).join(' · ')
                    : 'Sin jugadores asignados'}
                </Text>
              </View>
            );
          })}
          {unassignedParticipantIds.length > 0 && (
            <View style={styles.unassignedCard}>
              <Text style={styles.teamTitle}>Sin equipo · {unassignedParticipantIds.length}</Text>
              <Text style={styles.teamPlayers}>
                {unassignedParticipantIds.map((playerId) => playersById.get(playerId)).filter((player): player is Player => Boolean(player)).map(getPlayerLabel).join(' · ')}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Configuración</Text>
        <Text style={styles.inputLabel}>Puntos para ganar</Text>
        <TextInput
          keyboardType="number-pad"
          onChangeText={setTargetScoreInput}
          placeholder="3"
          placeholderTextColor="#8a98a8"
          style={styles.input}
          value={targetScoreInput}
        />
        <Pressable onPress={() => setWinnerStays((current) => !current)} style={({ pressed }) => [styles.toggleRow, pressed && styles.pressed]}>
          <View style={[styles.checkbox, winnerStays && styles.checkboxSelected]}>
            <Text style={styles.checkboxMark}>{winnerStays ? '✓' : ''}</Text>
          </View>
          <View style={styles.toggleTextWrap}>
            <Text style={styles.inputLabel}>Ganador queda</Text>
            <Text style={styles.helperText}>Se guarda para la rotación futura. La selección del próximo partido queda para Stage 4.</Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.actions}>
        {(validationMessage || createStatus) ? (
          <Text style={[styles.statusText, validationMessage && styles.errorText]}>{validationMessage || createStatus}</Text>
        ) : null}
        <ActionButton label="Crear práctica" onPress={handleCreateSession} disabled={Boolean(validationMessage)} />
        <ActionButton label="Cancelar" onPress={() => navigation.navigate('Home')} variant="secondary" />
      </View>
    </Screen>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    gap: spacing.sm,
  },
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
  detailCard: {
    borderColor: '#8bd3ff',
    backgroundColor: '#f0faff',
  },
  setupSection: {
    gap: spacing.sm,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#ffffff',
    padding: spacing.sm,
    gap: 3,
  },
  summaryValue: {
    color: '#0b1f33',
    fontSize: fontSize.title,
    fontWeight: '900',
  },
  summaryLabel: {
    color: '#5d6b7a',
    fontSize: fontSize.tiny,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  sectionHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
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
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  choiceButton: {
    flexGrow: 1,
    flexBasis: 112,
    minHeight: 58,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#f7fafc',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  choiceButtonSelected: {
    backgroundColor: '#0b6bcb',
    borderColor: '#0b6bcb',
  },
  choiceText: {
    color: '#0b1f33',
    fontSize: fontSize.body,
    fontWeight: '900',
  },
  choiceHint: {
    color: '#5d6b7a',
    fontSize: fontSize.tiny,
    fontWeight: '800',
    marginTop: 2,
  },
  choiceTextSelected: {
    color: '#ffffff',
  },
  countBadge: {
    color: '#0b6bcb',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  playerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  playerTile: {
    flexGrow: 1,
    flexBasis: 104,
    minHeight: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbe4ef',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  playerTileSelected: {
    backgroundColor: '#188038',
    borderColor: '#188038',
  },
  playerNumber: {
    color: '#0b6bcb',
    fontSize: fontSize.tiny,
    fontWeight: '900',
  },
  playerName: {
    color: '#0b1f33',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  playerSelectedText: {
    color: '#ffffff',
  },
  assignmentList: {
    gap: spacing.sm,
  },
  assignmentRow: {
    borderRadius: 8,
    backgroundColor: '#f7fafc',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    padding: spacing.sm,
    gap: spacing.sm,
  },
  assignmentPlayer: {
    gap: 2,
  },
  assignmentName: {
    color: '#0b1f33',
    fontSize: fontSize.body,
    fontWeight: '900',
  },
  assignmentHint: {
    color: '#5d6b7a',
    fontSize: fontSize.tiny,
    fontWeight: '800',
  },
  assignmentButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  teamButton: {
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  teamButtonSelected: {
    backgroundColor: '#0b1f33',
    borderColor: '#0b1f33',
  },
  teamButtonText: {
    color: '#0b1f33',
    fontSize: fontSize.tiny,
    fontWeight: '900',
  },
  teamButtonSelectedText: {
    color: '#ffffff',
  },
  teamPreviewGrid: {
    gap: spacing.sm,
  },
  teamPreviewCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#ffffff',
    padding: spacing.sm,
    gap: 3,
  },
  invalidTeamCard: {
    borderColor: '#f5b46b',
    backgroundColor: '#fff7ed',
  },
  unassignedCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#b7c5d3',
    borderStyle: 'dashed',
    backgroundColor: '#f7fafc',
    padding: spacing.sm,
    gap: 3,
  },
  liveMiniCard: {
    borderRadius: 8,
    backgroundColor: '#0b1f33',
    padding: spacing.sm,
    gap: spacing.sm,
  },
  suggestionCard: {
    borderRadius: 8,
    backgroundColor: '#0b1f33',
    borderWidth: 1,
    borderColor: '#16456e',
    padding: spacing.sm,
    gap: spacing.sm,
  },
  liveMiniTitle: {
    color: '#ffffff',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  liveMiniText: {
    color: '#d7e5f2',
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  historyCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#ffffff',
    padding: spacing.sm,
    gap: 3,
  },
  standingsList: {
    gap: spacing.xs,
  },
  standingRow: {
    minHeight: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbe4ef',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
  },
  standingRank: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#0b6bcb',
    color: '#ffffff',
    fontSize: fontSize.small,
    fontWeight: '900',
    lineHeight: 26,
    textAlign: 'center',
  },
  standingTeam: {
    flex: 1,
    minWidth: 120,
  },
  standingScore: {
    color: '#36546f',
    fontSize: fontSize.tiny,
    fontWeight: '900',
  },
  standingDiff: {
    minWidth: 34,
    fontSize: fontSize.small,
    fontWeight: '900',
    textAlign: 'right',
  },
  positiveText: {
    color: '#188038',
  },
  negativeText: {
    color: '#b42318',
  },
  rankingRow: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbe4ef',
    backgroundColor: '#ffffff',
    padding: spacing.sm,
    gap: 3,
  },
  rankingName: {
    color: '#0b1f33',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  rankingMeta: {
    color: '#5d6b7a',
    fontSize: fontSize.tiny,
    fontWeight: '800',
  },
  alertText: {
    borderRadius: 8,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    color: '#9a3412',
    fontSize: fontSize.small,
    fontWeight: '900',
    padding: spacing.sm,
  },
  playerStatRow: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbe4ef',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  playerStatMain: {
    flex: 1,
  },
  playerStatRecord: {
    color: '#0b6bcb',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  queueList: {
    gap: spacing.xs,
  },
  queueItem: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbe4ef',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  queueItemActive: {
    borderColor: '#0b6bcb',
    backgroundColor: '#f0faff',
  },
  queuePosition: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#0b1f33',
    color: '#ffffff',
    fontSize: fontSize.small,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 28,
  },
  queueTextWrap: {
    flex: 1,
  },
  queueStatus: {
    color: '#5d6b7a',
    fontSize: fontSize.tiny,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  teamTitle: {
    color: '#0b1f33',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  teamPlayers: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
    fontWeight: '700',
  },
  inputLabel: {
    color: '#0b1f33',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  input: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#ffffff',
    color: '#0b1f33',
    fontSize: fontSize.body,
    fontWeight: '800',
    paddingHorizontal: spacing.sm,
  },
  toggleRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0b6bcb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#0b6bcb',
  },
  checkboxMark: {
    color: '#ffffff',
    fontSize: fontSize.body,
    fontWeight: '900',
  },
  toggleTextWrap: {
    flex: 1,
  },
  actions: {
    gap: spacing.sm,
  },
  errorText: {
    color: '#b42318',
  },
  statusText: {
    color: '#188038',
    fontSize: fontSize.small,
    fontWeight: '900',
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
    gap: 3,
  },
  sessionCardSelected: {
    borderColor: '#0b6bcb',
    backgroundColor: '#f0f7ff',
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
  detailText: {
    color: '#36546f',
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  pendingText: {
    color: '#0b6bcb',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.82,
  },
});
