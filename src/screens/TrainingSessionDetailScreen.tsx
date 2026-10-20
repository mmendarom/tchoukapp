import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { Screen } from '../components/Screen';
import { TrainingPerformanceBars } from '../components/TrainingPerformanceBars';
import {
  getSuggestedNextMiniMatch,
  getTrainingQueue,
  getTrainingSessionEditPermissions,
  getTrainingSessionStats,
  TrainingPlayerStats,
} from '../domain/training';
import {
  formatTrainingMiniMatchScore,
  getTrainingTeamName,
  trainingStatusLabel,
} from '../domain/trainingLive';
import { parseTrainingTargetScore } from '../domain/trainingSetup';
import { buildTrainingPerformance } from '../domain/trainingPerformance';
import { buildTrainingReportData } from '../domain/trainingReportData';
import { Player } from '../domain/types';
import { exportTrainingReportPdf } from '../export/exportTrainingReport';
import { buildTrainingShareText } from '../export/trainingShareText';
import { useMatchStore } from '../store/useMatchStore';
import { useTrainingStore } from '../store/useTrainingStore';
import { RootStackParamList } from '../utils/navigation';
import { fontSize, spacing } from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'TrainingSessionDetail'>;

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

export function TrainingSessionDetailScreen({ navigation, route }: Props) {
  const { sessionId } = route.params;
  const players = useMatchStore((state) => state.players);
  const trainingSessions = useTrainingStore((state) => state.trainingSessions);
  const startTrainingSession = useTrainingStore((state) => state.startTrainingSession);
  const startMiniMatch = useTrainingStore((state) => state.startMiniMatch);
  const startSuggestedNextMiniMatch = useTrainingStore((state) => state.startSuggestedNextMiniMatch);
  const archiveTrainingSession = useTrainingStore((state) => state.archiveTrainingSession);
  const unarchiveTrainingSession = useTrainingStore((state) => state.unarchiveTrainingSession);
  const deleteTrainingSession = useTrainingStore((state) => state.deleteTrainingSession);
  const updateTrainingSessionSetup = useTrainingStore((state) => state.updateTrainingSessionSetup);
  const updateTrainingTeamDetails = useTrainingStore((state) => state.updateTrainingTeamDetails);
  const [selectedTeamAId, setSelectedTeamAId] = useState<string | undefined>();
  const [selectedTeamBId, setSelectedTeamBId] = useState<string | undefined>();
  const [showManualPicker, setShowManualPicker] = useState(false);
  const [miniMatchStatus, setMiniMatchStatus] = useState('');
  const [sharingSummary, setSharingSummary] = useState(false);
  const [shareStatus, setShareStatus] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfStatus, setPdfStatus] = useState('');
  const [editing, setEditing] = useState(false);
  const [editTeamNames, setEditTeamNames] = useState<Record<string, string>>({});
  const [editTargetScoreInput, setEditTargetScoreInput] = useState('3');
  const [editWinnerStays, setEditWinnerStays] = useState(true);
  const [editStatus, setEditStatus] = useState('');
  const session = trainingSessions.find((candidate) => candidate.id === sessionId);
  const playersById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const sessionEditPermissions = session ? getTrainingSessionEditPermissions(session) : undefined;
  const activeMiniMatch = session?.miniMatches.find((miniMatch) => miniMatch.status === 'live');
  const miniMatchHistory = session?.miniMatches.filter((miniMatch) => miniMatch.status !== 'live') ?? [];
  const latestFinishedMiniMatch = session?.miniMatches.find((miniMatch) => miniMatch.status === 'finished');
  const sessionQueue = session ? getTrainingQueue(session) : [];
  const suggestedNextMiniMatch = session ? getSuggestedNextMiniMatch(session) : undefined;
  const sessionStats = useMemo(
    () => (session ? getTrainingSessionStats(session) : undefined),
    [session],
  );
  const trainingPerformance = useMemo(
    () => (session ? buildTrainingPerformance(session, players) : undefined),
    [players, session],
  );
  const trainingAlerts = useMemo(() => {
    if (!sessionStats) {
      return [];
    }

    const alerts: string[] = [];
    const repeatedErrors = sessionStats.mostErrors.filter((stats) => stats.errors >= 2).slice(0, 2);
    const repeatedOwnPoints = sessionStats.mostOwnPointsAgainst.filter((stats) => stats.ownPointsAgainst >= 1).slice(0, 2);
    const lowEffectiveness = sessionStats.playerStats
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
  }, [playersById, sessionStats]);

  if (!session) {
    return (
      <Screen>
        <Text style={styles.title}>Práctica no encontrada</Text>
        <Text style={styles.helperText}>La práctica ya no existe o fue eliminada.</Text>
        <ActionButton label="Volver a la lista" onPress={() => navigation.navigate('TrainingSessions')} />
      </Screen>
    );
  }

  const sessionClosed = session.status === 'finished' || session.status === 'cancelled';

  const handleStartMiniMatch = () => {
    setMiniMatchStatus('');

    if (sessionClosed) {
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

    startTrainingSession(session.id);
    const miniMatchId = startMiniMatch(session.id, selectedTeamAId, selectedTeamBId);

    if (!miniMatchId) {
      setMiniMatchStatus('No se pudo iniciar el mini partido.');
      return;
    }

    navigation.navigate('LiveTrainingMiniMatch', { sessionId: session.id, miniMatchId });
  };
  const handleStartSuggestedMiniMatch = () => {
    setMiniMatchStatus('');

    if (!suggestedNextMiniMatch) {
      setMiniMatchStatus('No hay próximo sugerido.');
      return;
    }

    const miniMatchId = startSuggestedNextMiniMatch(session.id);

    if (!miniMatchId) {
      setMiniMatchStatus('No se pudo iniciar el próximo mini partido.');
      return;
    }

    navigation.navigate('LiveTrainingMiniMatch', { sessionId: session.id, miniMatchId });
  };
  const handleArchiveSession = () => {
    Alert.alert(
      'Archivar práctica',
      'La práctica se ocultará de la lista principal.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Archivar',
          onPress: () => {
            archiveTrainingSession(session.id);
            navigation.goBack();
          },
        },
      ],
    );
  };
  const handleUnarchiveSession = () => {
    unarchiveTrainingSession(session.id);
  };
  const handleDeleteSession = () => {
    Alert.alert(
      'Eliminar práctica',
      'Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteTrainingSession(session.id);
            navigation.goBack();
          },
        },
      ],
    );
  };
  const handleShareSummary = async () => {
    if (sharingSummary) {
      return;
    }

    setSharingSummary(true);
    setShareStatus('');

    try {
      await Share.share({
        title: 'Resumen de práctica 3v3',
        message: buildTrainingShareText(session, players),
      });
      setShareStatus('Resumen compartido.');
    } catch {
      setShareStatus('No se pudo compartir el resumen.');
    } finally {
      setSharingSummary(false);
    }
  };
  const handleExportPdf = async () => {
    if (exportingPdf) {
      return;
    }

    setExportingPdf(true);
    setPdfStatus('');

    try {
      const report = buildTrainingReportData(session, players);
      await exportTrainingReportPdf(report);
      setPdfStatus('PDF generado.');
    } catch {
      setPdfStatus('No se pudo exportar el PDF.');
    } finally {
      setExportingPdf(false);
    }
  };
  const handleBeginSessionEdit = () => {
    if (!sessionEditPermissions) {
      return;
    }

    if (!sessionEditPermissions.canEditTeamDetails) {
      setEditStatus(getEditBlockedMessage(sessionEditPermissions.reason));
      return;
    }

    setEditing(true);
    setEditTeamNames(Object.fromEntries(session.teams.map((team) => [team.id, team.name])));
    setEditTargetScoreInput(String(session.settings.targetScore));
    setEditWinnerStays(session.settings.winnerStays);
    setEditStatus(sessionEditPermissions.canEditSetup ? '' : getEditBlockedMessage(sessionEditPermissions.reason));
  };
  const handleCancelSessionEdit = () => {
    setEditing(false);
    setEditTeamNames({});
    setEditTargetScoreInput('3');
    setEditWinnerStays(true);
    setEditStatus('');
  };
  const handleSaveSessionEdit = () => {
    if (!sessionEditPermissions) {
      return;
    }

    if (!sessionEditPermissions.canEditTeamDetails) {
      setEditStatus(getEditBlockedMessage(sessionEditPermissions.reason));
      return;
    }

    const teamUpdates = session.teams.map((team) => ({
      teamId: team.id,
      name: editTeamNames[team.id] ?? team.name,
      color: team.color,
    }));
    const saved = sessionEditPermissions.canEditSetup
      ? updateTrainingSessionSetup(session.id, {
          teamPoolId: session.teamPoolId,
          teamPoolName: session.teamPoolName,
          participantPlayerIds: session.participantPlayerIds,
          teams: session.teams.map((team) => ({
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
      : updateTrainingTeamDetails(session.id, teamUpdates);

    if (!saved) {
      setEditStatus('No se pudieron guardar los cambios.');
      return;
    }

    setEditing(false);
    setEditStatus('Cambios guardados.');
  };

  return (
    <Screen>
      <View style={styles.headerText}>
        <Text style={styles.kicker}>Práctica 3v3</Text>
        <Text style={styles.title}>{session.teamPoolName || 'Práctica'}</Text>
        <Text style={styles.detailText}>
          {formatDate(session.createdAt)} · {trainingStatusLabel[session.status]}
          {session.archivedAt ? ' · Archivada' : ''}
        </Text>
        <Text style={styles.detailText}>
          {session.participantPlayerIds.length} jugadores · {session.teams.length} equipos · A {session.settings.targetScore} puntos · Ganador {session.settings.winnerStays ? 'queda' : 'rota'}
        </Text>
      </View>

      {session.archivedAt ? (
        <View style={styles.archivedNotice}>
          <Text style={styles.archivedNoticeTitle}>Práctica archivada</Text>
          <Text style={styles.helperText}>Restaurala para continuar registrando mini partidos.</Text>
          <ActionButton label="Restaurar práctica" onPress={handleUnarchiveSession} variant="secondary" />
        </View>
      ) : activeMiniMatch ? (
        <View style={styles.liveMiniCard}>
          <View style={styles.liveBadgeRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>Mini partido en vivo</Text>
          </View>
          <Text style={styles.liveMiniText}>{formatTrainingMiniMatchScore(session, activeMiniMatch)}</Text>
          <ActionButton
            label="Abrir mini partido"
            onPress={() => navigation.navigate('LiveTrainingMiniMatch', { sessionId: session.id, miniMatchId: activeMiniMatch.id })}
          />
        </View>
      ) : sessionClosed ? (
        <View style={styles.archivedNotice}>
          <Text style={styles.archivedNoticeTitle}>Práctica cerrada</Text>
          <Text style={styles.helperText}>Podés revisar las estadísticas, compartir el resumen o exportar el PDF.</Text>
        </View>
      ) : (
        <View style={[styles.card, styles.playCard]}>
          <Text style={styles.sectionTitle}>Próximo mini partido</Text>
          {suggestedNextMiniMatch ? (
            <View style={styles.suggestionCard}>
              <Text style={styles.liveMiniTitle}>Sugerido por la rotación</Text>
              <Text style={styles.liveMiniText}>
                {getTrainingTeamName(session, suggestedNextMiniMatch.teamAId)} vs {getTrainingTeamName(session, suggestedNextMiniMatch.teamBId)}
              </Text>
              <ActionButton label="Iniciar próximo" onPress={handleStartSuggestedMiniMatch} />
            </View>
          ) : (
            <Text style={styles.helperText}>No hay próximo sugerido. Elegí dos equipos manualmente.</Text>
          )}
          <Pressable
            onPress={() => setShowManualPicker((current) => !current)}
            style={({ pressed }) => [styles.manualToggle, pressed && styles.pressed]}
          >
            <Text style={styles.manualToggleText}>
              {showManualPicker ? 'Ocultar elección manual' : 'Elegir otro cruce manualmente'}
            </Text>
          </Pressable>
          {(showManualPicker || !suggestedNextMiniMatch) && (
            <>
              <Text style={styles.helperText}>Equipo A</Text>
              <View style={styles.optionRow}>
                {session.teams.map((team) => {
                  const selected = selectedTeamAId === team.id;

                  return (
                    <Pressable
                      key={`a-${team.id}`}
                      onPress={() => setSelectedTeamAId(team.id)}
                      style={({ pressed }) => [styles.choiceButton, selected && styles.choiceButtonSelected, pressed && styles.pressed]}
                    >
                      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{team.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.helperText}>Equipo B</Text>
              <View style={styles.optionRow}>
                {session.teams.map((team) => {
                  const selected = selectedTeamBId === team.id;

                  return (
                    <Pressable
                      key={`b-${team.id}`}
                      onPress={() => setSelectedTeamBId(team.id)}
                      style={({ pressed }) => [styles.choiceButton, selected && styles.choiceButtonSelected, pressed && styles.pressed]}
                    >
                      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{team.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <ActionButton label="Iniciar mini partido" onPress={handleStartMiniMatch} />
            </>
          )}
          {miniMatchStatus ? <Text style={styles.errorText}>{miniMatchStatus}</Text> : null}
        </View>
      )}

      {!session.archivedAt && !sessionClosed && sessionQueue.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cola de equipos</Text>
          <Text style={styles.helperText}>
            {session.settings.winnerStays
              ? 'Ganador queda, perdedor va al fondo.'
              : 'Rotan ambos equipos al fondo.'}
          </Text>
          <View style={styles.queueList}>
            {sessionQueue.map((team, index) => {
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
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Equipos</Text>
        <View style={styles.teamPreviewGrid}>
          {session.teams.map((team) => (
            <View key={team.id} style={styles.teamPreviewCard}>
              <Text style={styles.teamTitle}>{team.name} · {team.playerIds.length}</Text>
              <Text style={styles.teamPlayers}>
                {team.playerIds.map((playerId) => playersById.get(playerId)).filter((player): player is Player => Boolean(player)).map(getPlayerLabel).join(' · ')}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {sessionStats && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Resumen de la práctica</Text>
          <View style={styles.summaryGrid}>
            <SummaryCard label="Mini partidos" value={`${sessionStats.finishedMiniMatches}/${sessionStats.totalMiniMatches}`} />
            <SummaryCard label="Equipos" value={`${session.teams.length}`} />
            <SummaryCard label="Puntos" value={`${sessionStats.totalPoints}`} />
            <SummaryCard label="Target" value={`${session.settings.targetScore}`} />
          </View>

          <Text style={styles.sectionTitle}>Tabla de equipos</Text>
          <View style={styles.standingsList}>
            {sessionStats.teamStats.map((teamStat, index) => (
              <View key={teamStat.teamId} style={styles.standingRow}>
                <Text style={styles.standingRank}>{index + 1}</Text>
                <View style={styles.standingTeam}>
                  <Text style={styles.teamTitle}>{getTrainingTeamName(session, teamStat.teamId)}</Text>
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

          <Text style={styles.sectionTitle}>Top ataque</Text>
          {sessionStats.topAttackers.length === 0 ? (
            <Text style={styles.helperText}>Sin tiros registrados.</Text>
          ) : (
            sessionStats.topAttackers.slice(0, 5).map((stats) => (
              <View key={stats.playerId} style={styles.rankingRow}>
                <Text style={styles.rankingName}>{getPlayerStatLabel(playersById, stats.playerId)}</Text>
                <Text style={styles.rankingMeta}>{formatShootingLine(stats)}</Text>
              </View>
            ))
          )}

          <Text style={styles.sectionTitle}>Top defensa</Text>
          {sessionStats.topDefenders.length === 0 ? (
            <Text style={styles.helperText}>Sin defensas registradas.</Text>
          ) : (
            sessionStats.topDefenders.slice(0, 5).map((stats) => (
              <View key={stats.playerId} style={styles.rankingRow}>
                <Text style={styles.rankingName}>{getPlayerStatLabel(playersById, stats.playerId)}</Text>
                <Text style={styles.rankingMeta}>{stats.defenses} defensas · +/- {stats.plusMinus}</Text>
              </View>
            ))
          )}

          {trainingAlerts.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Alertas</Text>
              {trainingAlerts.map((alert) => (
                <Text key={alert} style={styles.alertText}>{alert}</Text>
              ))}
            </>
          )}
        </View>
      )}

      {trainingPerformance && (
        <View style={styles.card}>
          <TrainingPerformanceBars data={trainingPerformance} />
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Historial de mini partidos</Text>
        {miniMatchHistory.length === 0 ? (
          <Text style={styles.helperText}>Sin mini partidos cerrados todavía.</Text>
        ) : (
          miniMatchHistory.map((miniMatch) => (
            <View key={miniMatch.id} style={styles.historyCard}>
              <Text style={styles.teamTitle}>{formatTrainingMiniMatchScore(session, miniMatch)}</Text>
              <Text style={styles.teamPlayers}>
                {miniMatch.winnerTeamId ? `Ganador: ${getTrainingTeamName(session, miniMatch.winnerTeamId)}` : trainingStatusLabel[miniMatch.status]}
              </Text>
              <Text style={styles.detailText}>{miniMatch.events.length} acciones</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Gestión de la práctica</Text>
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
            label={editing ? 'Editando' : 'Editar'}
            onPress={handleBeginSessionEdit}
            variant="secondary"
          />
          {session.archivedAt ? (
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
        {editing && sessionEditPermissions ? (
          <View style={styles.editPanel}>
            <Text style={styles.sectionTitle}>Editar práctica</Text>
            {!sessionEditPermissions.canEditSetup ? (
              <Text style={styles.helperText}>{getEditBlockedMessage(sessionEditPermissions.reason)}</Text>
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
              {session.teams.map((team) => (
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
              <ActionButton label="Cancelar edición" onPress={handleCancelSessionEdit} variant="secondary" />
            </View>
          </View>
        ) : null}
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
  card: {
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    padding: spacing.md,
    gap: spacing.sm,
  },
  playCard: {
    borderColor: '#8bd3ff',
    backgroundColor: '#f0faff',
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
  detailText: {
    color: '#36546f',
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  liveMiniCard: {
    borderRadius: 8,
    backgroundColor: '#0b1f33',
    padding: spacing.md,
    gap: spacing.sm,
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
  suggestionCard: {
    borderRadius: 8,
    backgroundColor: '#0b1f33',
    borderWidth: 1,
    borderColor: '#16456e',
    padding: spacing.sm,
    gap: spacing.sm,
  },
  liveMiniTitle: {
    color: '#8bd3ff',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  liveMiniText: {
    color: '#ffffff',
    fontSize: fontSize.section,
    fontWeight: '900',
  },
  manualToggle: {
    minHeight: 40,
    justifyContent: 'center',
  },
  manualToggleText: {
    color: '#0b6bcb',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  choiceButton: {
    flexGrow: 1,
    flexBasis: 112,
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#ffffff',
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
  choiceTextSelected: {
    color: '#ffffff',
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
  historyCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#ffffff',
    padding: spacing.sm,
    gap: 3,
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
    padding: spacing.md,
    gap: spacing.sm,
  },
  archivedNoticeTitle: {
    color: '#374151',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  editPanel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#f7fafc',
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
    backgroundColor: '#ffffff',
    padding: spacing.sm,
    gap: spacing.xs,
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
  statusText: {
    color: '#188038',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  errorText: {
    color: '#b42318',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.82,
  },
});
