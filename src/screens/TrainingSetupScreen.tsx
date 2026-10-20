import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { Screen } from '../components/Screen';
import {
  buildTrainingSessionSettings,
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

type Props = NativeStackScreenProps<RootStackParamList, 'TrainingSetup'>;

type SetupStep = 1 | 2 | 3;

const stepTitles: Record<SetupStep, string> = {
  1: '¿Quiénes juegan hoy?',
  2: 'Armá los equipos',
  3: 'Reglas de la práctica',
};

const stepHints: Record<SetupStep, string> = {
  1: 'Elegí el plantel y marcá los jugadores presentes. Necesitás al menos 6.',
  2: 'Asigná cada jugador a un equipo. Cada equipo necesita 3 o 4 jugadores.',
  3: 'Definí a cuántos puntos se juega y confirmá para empezar.',
};

const getPlayerLabel = (player: Player) => `#${player.number} ${player.lastName || player.firstName}`.trim();

export function TrainingSetupScreen({ navigation }: Props) {
  const players = useMatchStore((state) => state.players);
  const teamPools = useMatchStore((state) => state.teamPools);
  const createTrainingSession = useTrainingStore((state) => state.createTrainingSession);
  const [step, setStep] = useState<SetupStep>(1);
  const [selectedTeamPoolId, setSelectedTeamPoolId] = useState(teamPools[0]?.id ?? '');
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [teamCount, setTeamCount] = useState(2);
  const [assignments, setAssignments] = useState<TrainingTeamAssignment>({});
  const [targetScoreInput, setTargetScoreInput] = useState('3');
  const [winnerStays, setWinnerStays] = useState(true);
  const [createStatus, setCreateStatus] = useState('');
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
  const invalidTeams = teamsPreview.filter((team) => team.playerIds.length < 3 || team.playerIds.length > 4);
  const stepOneError = participantIds.length < 6 ? 'Seleccioná al menos 6 jugadores.' : '';
  const stepTwoError = invalidTeams.length > 0 ? 'Cada equipo necesita 3 o 4 jugadores.' : '';
  const stepThreeError = targetScore < 1 ? 'Los puntos para ganar deben ser al menos 1.' : '';

  const handleSelectPool = (pool: TeamPool) => {
    if (pool.id === selectedTeamPoolId) {
      return;
    }

    setSelectedTeamPoolId(pool.id);
    setParticipantIds([]);
    setAssignments({});
    setTeamCount(2);
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
  const handleBack = () => {
    setCreateStatus('');

    if (step === 1) {
      navigation.goBack();
      return;
    }

    setStep((current) => (current - 1) as SetupStep);
  };
  const handleNext = () => {
    setCreateStatus('');

    if (step === 1 && !stepOneError) {
      setStep(2);
    } else if (step === 2 && !stepTwoError) {
      setStep(3);
    }
  };
  const handleCreateSession = () => {
    setCreateStatus('');

    if (stepThreeError || !selectedTeamPool) {
      setCreateStatus(stepThreeError || 'Seleccioná un plantel.');
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

    navigation.replace('TrainingSessionDetail', { sessionId });
  };

  return (
    <Screen>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>Paso {step} de 3</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
        </View>
        <Text style={styles.title}>{stepTitles[step]}</Text>
        <Text style={styles.copy}>{stepHints[step]}</Text>
      </View>

      {step === 1 && (
        <>
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
              <Text style={styles.sectionTitle}>Jugadores presentes</Text>
              <Text style={styles.countBadge}>{participantIds.length} seleccionados</Text>
            </View>
            {poolPlayers.length === 0 ? (
              <Text style={styles.helperText}>Este plantel no tiene jugadores cargados.</Text>
            ) : (
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
            )}
          </View>
        </>
      )}

      {step === 2 && (
        <>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Cantidad de equipos</Text>
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
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Asignación de jugadores</Text>
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
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Equipos armados</Text>
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
        </>
      )}

      {step === 3 && (
        <>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Reglas</Text>
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
                <Text style={styles.helperText}>El equipo que gana sigue jugando y el perdedor va al fondo de la cola.</Text>
              </View>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Resumen</Text>
            <Text style={styles.detailText}>Plantel: {selectedTeamPool?.name ?? 'Sin plantel'}</Text>
            <Text style={styles.detailText}>Presentes: {participantIds.length} jugadores</Text>
            <View style={styles.teamPreviewGrid}>
              {teamsPreview.map((team) => (
                <View key={team.id} style={styles.teamPreviewCard}>
                  <Text style={styles.teamTitle}>{team.name} · {team.playerIds.length}</Text>
                  <Text style={styles.teamPlayers}>
                    {team.playerIds.map((playerId) => playersById.get(playerId)).filter((player): player is Player => Boolean(player)).map(getPlayerLabel).join(' · ')}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </>
      )}

      <View style={styles.actions}>
        {step === 1 && stepOneError ? <Text style={styles.errorText}>{stepOneError}</Text> : null}
        {step === 2 && stepTwoError ? <Text style={styles.errorText}>{stepTwoError}</Text> : null}
        {step === 3 && (stepThreeError || createStatus) ? (
          <Text style={styles.errorText}>{stepThreeError || createStatus}</Text>
        ) : null}
        {step < 3 ? (
          <ActionButton
            label="Continuar"
            onPress={handleNext}
            disabled={Boolean(step === 1 ? stepOneError : stepTwoError)}
          />
        ) : (
          <ActionButton label="Crear práctica" onPress={handleCreateSession} disabled={Boolean(stepThreeError)} />
        )}
        <ActionButton label={step === 1 ? 'Cancelar' : 'Atrás'} onPress={handleBack} variant="secondary" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressHeader: {
    gap: spacing.xs,
  },
  progressLabel: {
    color: '#0b6bcb',
    fontSize: fontSize.small,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#dbe4ef',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#0b6bcb',
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
  detailText: {
    color: '#36546f',
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  actions: {
    gap: spacing.sm,
  },
  errorText: {
    color: '#b42318',
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
