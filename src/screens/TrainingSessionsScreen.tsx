import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { Screen } from '../components/Screen';
import { TrainingPerformanceBars } from '../components/TrainingPerformanceBars';
import {
  filterTrainingSessions,
  getSuggestedNextMiniMatch,
  getTrainingQueue,
  getTrainingSessionEditPermissions,
  getTrainingSessionStats,
  TrainingPlayerStats,
  TrainingSessionFilter,
} from '../domain/training';
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
import { buildTrainingPerformance } from '../domain/trainingPerformance';
import { buildTrainingReportData } from '../domain/trainingReportData';
import { Player, TeamPool } from '../domain/types';
import { exportTrainingReportPdf } from '../export/exportTrainingReport';
import { buildTrainingShareText } from '../export/trainingShareText';
import { useMatchStore } from '../store/useMatchStore';
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

const getPlayerLabel = (player: Player) => `#${player.number} ${player.lastName || player.firstName}`.trim();

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const getPlayerStatLabel = (playersById: Map<string, Player>, playerId: string) => {
  const player = playersById.get(playerId);

  return player ? getPlayerLabel(player) : 'Jugador sin datos';
};

const formatShootingLine = (stats: TrainingPlayerStats) =>
  `${stats.points}/${stats.attempts} tiros · ${stats.attempts > 0 ? formatPercent(stats.effectiveness) : 'Sin tiros'}`;

const getEditBlockedMessage = (reason?: string) => {
  switch (reason) {
    case 'archived':
      return 'Restaurala para editar la practica.';
    case 'active_mini_match':
      return 'Cerra el mini partido en vivo antes de editar.';
    case 'closed_session':
      return 'La sesion esta cerrada: solo se pueden corregir nombres de equipos.';
    case 'history_locked':
      return 'Ya hay historial jugado: solo se pueden corregir nombres de equipos.';
    default:
      return 'No se puede editar esta practica ahora.';
  }
};

export function TrainingSessionsScreen({ navigation }: Props) {
  const players = useMatchStore((state) => state.players);
  const teamPools = useMatchStore((state) => state.teamPools);
  const trainingSessions = useTrainingStore((state) => state.trainingSessions);
  const createTrainingSession = useTrainingStore((state) => state.createTrainingSession);
  const startTrainingSession = useTrainingStore((state) => state.startTrainingSession);
  const startMiniMatch = useTrainingStore((state) => state.startMiniMatch);
  const startSuggestedNextMiniMatch = useTrainingStore((state) => state.startSuggestedNextMiniMatch);
  const archiveTrainingSession = useTrainingStore((state) => state.archiveTrainingSession);
  const unarchiveTrainingSession = useTrainingStore((state) => state.unarchiveTrainingSession);
  const deleteTrainingSession = useTrainingStore((state) => state.deleteTrainingSession);
  const updateTrainingSessionSetup = useTrainingStore((state) => state.updateTrainingSessionSetup);
  const updateTrainingTeamDetails = useTrainingStore((state) => state.updateTrainingTeamDetails);
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
  const [sessionFilter, setSessionFilter] = useState<TrainingSessionFilter>('active');
  const [sharingSummary, setSharingSummary] = useState(false);
  const [shareStatus, setShareStatus] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfStatus, setPdfStatus] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | undefined>();
  const [editTeamNames, setEditTeamNames] = useState<Record<string, string>>({});
  const [editTargetScoreInput, setEditTargetScoreInput] = useState('3');
  const [editWinnerStays, setEditWinnerStays] = useState(true);
  const [editStatus, setEditStatus] = useState('');
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
  const teamsPreview = useMemo(
    () => buildTrainingTeamsFromAssignments(teamIds, assignments, players),
    [assignments, players, teamIds],
  );
  const unassignedParticipantIds = participantIds.filter((playerId) => !assignments[playerId]);
  const validationMessage = buildTrainingSetupValidation({
    participantCount: participantIds.length,
    teamIds,
    assignments,
    targetScore,
  });
  const selectedSession = trainingSessions.find((session) => session.id === selectedSessionId);
  const selectedSessionEditPermissions = selectedSession ? getTrainingSessionEditPermissions(selectedSession) : undefined;
  const visibleTrainingSessions = useMemo(
    () => filterTrainingSessions(trainingSessions, sessionFilter),
    [sessionFilter, trainingSessions],
  );
  const activeMiniMatch = selectedSession?.miniMatches.find((miniMatch) => miniMatch.status === 'live');
  const miniMatchHistory = selectedSession?.miniMatches.filter((miniMatch) => miniMatch.status !== 'live') ?? [];
  const latestFinishedMiniMatch = selectedSession?.miniMatches.find((miniMatch) => miniMatch.status === 'finished');
  const selectedSessionQueue = selectedSession ? getTrainingQueue(selectedSession) : [];
  const suggestedNextMiniMatch = selectedSession ? getSuggestedNextMiniMatch(selectedSession) : undefined;
  const selectedSessionStats = useMemo(
    () => selectedSession ? getTrainingSessionStats(selectedSession) : undefined,
    [selectedSession],
  );
  const selectedTrainingPerformance = useMemo(
    () => selectedSession ? buildTrainingPerformance(selectedSession, players) : undefined,
    [players, selectedSession],
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

  useEffect(() => {
    setEditingSessionId(undefined);
    setEditTeamNames({});
    setEditTargetScoreInput('3');
    setEditWinnerStays(true);
    setEditStatus('');
  }, [selectedSessionId]);

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
  const handleArchiveSession = () => {
    if (!selectedSession) {
      return;
    }

    Alert.alert(
      'Archivar práctica',
      'La práctica se ocultará de la lista principal.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Archivar',
          onPress: () => {
            archiveTrainingSession(selectedSession.id);
            setSelectedSessionId(undefined);
            setSelectedTeamAId(undefined);
            setSelectedTeamBId(undefined);
          },
        },
      ],
    );
  };
  const handleUnarchiveSession = () => {
    if (!selectedSession) {
      return;
    }

    unarchiveTrainingSession(selectedSession.id);
    setSelectedSessionId(undefined);
  };
  const handleDeleteSession = () => {
    if (!selectedSession) {
      return;
    }

    Alert.alert(
      'Eliminar práctica',
      'Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteTrainingSession(selectedSession.id);
            setSelectedSessionId(undefined);
            setSelectedTeamAId(undefined);
            setSelectedTeamBId(undefined);
          },
        },
      ],
    );
  };
  const handleShareSummary = async () => {
    if (!selectedSession || sharingSummary) {
      return;
    }

    setSharingSummary(true);
    setShareStatus('');

    try {
      await Share.share({
        title: 'Resumen de práctica 3v3',
        message: buildTrainingShareText(selectedSession, players),
      });
      setShareStatus('Resumen compartido.');
    } catch {
      setShareStatus('No se pudo compartir el resumen.');
    } finally {
      setSharingSummary(false);
    }
  };
  const handleExportPdf = async () => {
    if (!selectedSession || exportingPdf) {
      return;
    }

    setExportingPdf(true);
    setPdfStatus('');

    try {
      const report = buildTrainingReportData(selectedSession, players);
      await exportTrainingReportPdf(report);
      setPdfStatus('PDF generado.');
    } catch {
      setPdfStatus('No se pudo exportar el PDF.');
    } finally {
      setExportingPdf(false);
    }
  };
  const handleBeginSessionEdit = () => {
    if (!selectedSession || !selectedSessionEditPermissions) {
      return;
    }

    if (!selectedSessionEditPermissions.canEditTeamDetails) {
      setEditStatus(getEditBlockedMessage(selectedSessionEditPermissions.reason));
      return;
    }

    setEditingSessionId(selectedSession.id);
    setEditTeamNames(Object.fromEntries(selectedSession.teams.map((team) => [team.id, team.name])));
    setEditTargetScoreInput(String(selectedSession.settings.targetScore));
    setEditWinnerStays(selectedSession.settings.winnerStays);
    setEditStatus(selectedSessionEditPermissions.canEditSetup ? '' : getEditBlockedMessage(selectedSessionEditPermissions.reason));
  };
  const handleCancelSessionEdit = () => {
    setEditingSessionId(undefined);
    setEditTeamNames({});
    setEditTargetScoreInput('3');
    setEditWinnerStays(true);
    setEditStatus('');
  };
  const handleSaveSessionEdit = () => {
    if (!selectedSession || !selectedSessionEditPermissions) {
      return;
    }

    if (!selectedSessionEditPermissions.canEditTeamDetails) {
      setEditStatus(getEditBlockedMessage(selectedSessionEditPermissions.reason));
      return;
    }

    const teamUpdates = selectedSession.teams.map((team) => ({
      teamId: team.id,
      name: editTeamNames[team.id] ?? team.name,
      color: team.color,
    }));
    const saved = selectedSessionEditPermissions.canEditSetup
      ? updateTrainingSessionSetup(selectedSession.id, {
          teamPoolId: selectedSession.teamPoolId,
          teamPoolName: selectedSession.teamPoolName,
          participantPlayerIds: selectedSession.participantPlayerIds,
          teams: selectedSession.teams.map((team) => ({
            id: team.id,
            name: editTeamNames[team.id] ?? team.name,
            playerIds: team.playerIds,
            queueOrder: team.queueOrder,
            color: team.color,
          })),
          settings: {
            targetScore: parseTrainingTargetScore(editTargetScoreInput),
            winnerStays: editWinnerStays,
          },
        })
      : updateTrainingTeamDetails(selectedSession.id, teamUpdates);

    if (!saved) {
      setEditStatus('No se pudieron guardar los cambios.');
      return;
    }

    setEditingSessionId(undefined);
    setEditStatus('Cambios guardados.');
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
          <View style={styles.filterRow}>
            {sessionFilters.map((filter) => {
              const selected = sessionFilter === filter.id;

              return (
                <Pressable
                  key={filter.id}
                  onPress={() => {
                    setSessionFilter(filter.id);
                    setSelectedSessionId(undefined);
                  }}
                  style={({ pressed }) => [styles.filterButton, selected && styles.filterButtonSelected, pressed && styles.pressed]}
                >
                  <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{filter.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.sessionList}>
            {visibleTrainingSessions.length === 0 ? (
              <Text style={styles.helperText}>No hay sesiones en este filtro.</Text>
            ) : visibleTrainingSessions.map((session) => (
              <Pressable
                key={session.id}
                onPress={() => {
                  setSelectedSessionId(session.id);
                  setShareStatus('');
                  setPdfStatus('');
                }}
                style={({ pressed }) => [styles.sessionCard, selectedSessionId === session.id && styles.sessionCardSelected, pressed && styles.pressed]}
              >
                <Text style={styles.sessionTitle}>{session.teamPoolName || 'Práctica'}</Text>
                <Text style={styles.sessionMeta}>
                  {formatDate(session.createdAt)} · {session.teams.length} equipos · {session.participantPlayerIds.length} jugadores
                </Text>
                <Text style={styles.sessionMeta}>{session.miniMatches.length} mini partidos</Text>
                <View style={styles.sessionBadgeRow}>
                  <Text style={styles.sessionStatus}>{trainingStatusLabel[session.status]}</Text>
                  {session.archivedAt ? <Text style={styles.archivedBadge}>Archivada</Text> : null}
                </View>
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
          <View style={styles.managementActions}>
            <ActionButton
              disabled={sharingSummary}
              label={sharingSummary ? 'Compartiendo...' : 'Compartir resumen'}
              onPress={handleShareSummary}
              variant="secondary"
            />
            <ActionButton
              disabled={exportingPdf}
              label={exportingPdf ? 'Generando PDF...' : 'Exportar PDF'}
              onPress={handleExportPdf}
              variant="secondary"
            />
            <ActionButton
              label={editingSessionId === selectedSession.id ? 'Editando' : 'Editar'}
              onPress={handleBeginSessionEdit}
              variant="secondary"
            />
            {selectedSession.archivedAt ? (
              <ActionButton label="Restaurar" onPress={handleUnarchiveSession} variant="secondary" />
            ) : (
              <ActionButton label="Archivar" onPress={handleArchiveSession} variant="secondary" />
            )}
            <Pressable
              accessibilityRole="button"
              onPress={handleDeleteSession}
              style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
            >
              <Text style={styles.deleteButtonText}>Eliminar</Text>
            </Pressable>
          </View>
          {shareStatus ? (
            <Text style={[styles.statusText, shareStatus.startsWith('No ') && styles.errorText]}>{shareStatus}</Text>
          ) : null}
          {pdfStatus ? (
            <Text style={[styles.statusText, pdfStatus.startsWith('No ') && styles.errorText]}>{pdfStatus}</Text>
          ) : null}
          {editStatus ? (
            <Text style={[styles.statusText, editStatus.startsWith('No ') || editStatus.startsWith('Restaurala') || editStatus.startsWith('Cerra') ? styles.errorText : undefined]}>
              {editStatus}
            </Text>
          ) : null}
          {editingSessionId === selectedSession.id && selectedSessionEditPermissions ? (
            <View style={styles.editPanel}>
              <Text style={styles.sectionTitle}>Editar practica</Text>
              {!selectedSessionEditPermissions.canEditSetup ? (
                <Text style={styles.helperText}>{getEditBlockedMessage(selectedSessionEditPermissions.reason)}</Text>
              ) : (
                <View style={styles.editSettingsGrid}>
                  <View style={styles.editSettingItem}>
                    <Text style={styles.inputLabel}>Puntos para ganar</Text>
                    <TextInput
                      keyboardType="number-pad"
                      onChangeText={setEditTargetScoreInput}
                      placeholder="3"
                      placeholderTextColor="#8a98a8"
                      style={styles.input}
                      value={editTargetScoreInput}
                    />
                  </View>
                  <Pressable onPress={() => setEditWinnerStays((current) => !current)} style={({ pressed }) => [styles.toggleRow, pressed && styles.pressed]}>
                    <View style={[styles.checkbox, editWinnerStays && styles.checkboxSelected]}>
                      <Text style={styles.checkboxMark}>{editWinnerStays ? '✓' : ''}</Text>
                    </View>
                    <View style={styles.toggleTextWrap}>
                      <Text style={styles.inputLabel}>Ganador queda</Text>
                      <Text style={styles.helperText}>Solo se puede cambiar antes de iniciar mini partidos.</Text>
                    </View>
                  </Pressable>
                </View>
              )}
              <View style={styles.editTeamList}>
                {selectedSession.teams.map((team) => (
                  <View key={team.id} style={styles.editTeamRow}>
                    <Text style={styles.inputLabel}>Nombre del equipo</Text>
                    <TextInput
                      onChangeText={(value) => setEditTeamNames((current) => ({ ...current, [team.id]: value }))}
                      placeholder={team.name}
                      placeholderTextColor="#8a98a8"
                      style={styles.input}
                      value={editTeamNames[team.id] ?? team.name}
                    />
                    <Text style={styles.helperText}>{team.playerIds.length} jugadores</Text>
                  </View>
                ))}
              </View>
              <View style={styles.managementActions}>
                <ActionButton label="Guardar cambios" onPress={handleSaveSessionEdit} />
                <ActionButton label="Cancelar edicion" onPress={handleCancelSessionEdit} variant="secondary" />
              </View>
            </View>
          ) : null}
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

          {selectedTrainingPerformance && (
            <View style={styles.setupSection}>
              <TrainingPerformanceBars data={selectedTrainingPerformance} />
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

          {selectedSession.archivedAt ? (
            <View style={styles.archivedNotice}>
              <Text style={styles.archivedNoticeTitle}>Práctica archivada</Text>
              <Text style={styles.helperText}>Restaurala para continuar registrando mini partidos.</Text>
            </View>
          ) : activeMiniMatch ? (
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
          {teamsPreview.map((team, index) => {
            const validSize = team.playerIds.length >= 3 && team.playerIds.length <= 4;

            return (
              <View key={team.id} style={[styles.teamPreviewCard, !validSize && styles.invalidTeamCard]}>
                <Text style={styles.teamTitle}>{team.name}</Text>
                <Text style={styles.teamPlayers}>Equipo {index + 1} · {team.playerIds.length} jugadores</Text>
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
  editPanel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#ffffff',
    padding: spacing.sm,
    gap: spacing.sm,
  },
  editSettingsGrid: {
    gap: spacing.sm,
  },
  editSettingItem: {
    gap: spacing.xs,
  },
  editTeamList: {
    gap: spacing.sm,
  },
  editTeamRow: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbe4ef',
    backgroundColor: '#f7fafc',
    padding: spacing.sm,
    gap: spacing.xs,
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
  managementActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deleteButton: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dc2626',
    backgroundColor: '#fff7f7',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  deleteButtonText: {
    color: '#b42318',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  archivedNotice: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#f7fafc',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  archivedNoticeTitle: {
    color: '#374151',
    fontSize: fontSize.small,
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
