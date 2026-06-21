import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { Screen } from '../components/Screen';
import { getMatchupDisplayName } from '../domain/teamLabels';
import { calculateScore } from '../domain/stats';
import { useMatchStore } from '../store/useMatchStore';
import { formatMatchDate } from '../utils/date';
import { statusLabel } from '../utils/labels';
import { RootStackParamList } from '../utils/navigation';
import { fontSize, spacing } from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'Matches'>;

export function MatchesScreen({ navigation, route }: Props) {
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [opponentInput, setOpponentInput] = useState('');
  const [selectedTeamPoolId, setSelectedTeamPoolId] = useState('mayores');
  const [starterIds, setStarterIds] = useState<string[]>([]);
  const [isCreatingMatch, setIsCreatingMatch] = useState(false);
  const players = useMatchStore((state) => state.players);
  const teamPools = useMatchStore((state) => state.teamPools);
  const matches = useMatchStore((state) => state.matches);
  const startMatch = useMatchStore((state) => state.startMatch);
  const createMatch = useMatchStore((state) => state.createMatch);
  const visibleMatches = useMemo(() => matches.filter((match) => match.status !== 'cancelled'), [matches]);
  const selectedTeamPool = useMemo(
    () => teamPools.find((pool) => pool.id === selectedTeamPoolId) ?? teamPools.find((pool) => pool.id === 'mayores') ?? teamPools[0],
    [selectedTeamPoolId, teamPools],
  );
  const poolPlayerIds = selectedTeamPool?.playerIds ?? [];
  const playersById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const poolPlayers = useMemo(
    () =>
      poolPlayerIds
        .map((playerId) => playersById.get(playerId))
        .filter((player): player is typeof players[number] => Boolean(player)),
    [playersById, poolPlayerIds],
  );
  const starterIdSet = useMemo(() => new Set(starterIds), [starterIds]);
  const benchPlayers = useMemo(() => poolPlayers.filter((player) => !starterIdSet.has(player.id)), [poolPlayers, starterIdSet]);
  const canCreateMatch = starterIds.length === 7 && poolPlayers.length >= 7;
  const createMatchError = poolPlayers.length < 7
    ? 'El plantel necesita al menos 7 jugadores.'
    : 'Elegí 7 titulares para iniciar el partido.';
  const openCreateModal = () => {
    setOpponentInput('');
    setSelectedTeamPoolId(teamPools.find((pool) => pool.id === 'mayores')?.id ?? teamPools[0]?.id ?? 'mayores');
    setStarterIds([]);
    setCreateModalVisible(true);
  };
  useEffect(() => {
    if (route.params?.openCreate) {
      openCreateModal();
      navigation.setParams({ openCreate: false });
    }
  }, [route.params?.openCreate]);
  const closeCreateModal = () => {
    setCreateModalVisible(false);
    setOpponentInput('');
    setSelectedTeamPoolId(teamPools.find((pool) => pool.id === 'mayores')?.id ?? teamPools[0]?.id ?? 'mayores');
    setStarterIds([]);
    setIsCreatingMatch(false);
  };
  const confirmCreateMatch = () => {
    if (isCreatingMatch || !canCreateMatch) {
      return;
    }

    setIsCreatingMatch(true);

    const matchId = createMatch({
      opponent: opponentInput,
      teamPoolId: selectedTeamPool?.id,
      teamPoolName: selectedTeamPool?.name,
      availablePlayerIds: poolPlayerIds,
      initialPlayerIds: starterIds,
    });

    if (!matchId) {
      setIsCreatingMatch(false);
      return;
    }

    closeCreateModal();
    navigation.navigate('LiveMatch', { matchId });
  };
  const toggleStarter = (playerId: string) => {
    setStarterIds((current) => {
      if (current.includes(playerId)) {
        return current.filter((id) => id !== playerId);
      }

      if (current.length >= 7) {
        return current;
      }

      return [...current, playerId];
    });
  };
  const openMatch = (matchId: string, status: string) => {
    if (status === 'finished') {
      navigation.navigate('FinalSummary', { matchId });
      return;
    }

    navigation.navigate('MatchDashboard', { matchId });
  };
  const openMatchAction = (matchId: string, status: string) => {
    if (status === 'finished') {
      navigation.navigate('FinalSummary', { matchId });
      return;
    }

    startMatch(matchId);
    navigation.navigate('LiveMatch', { matchId });
  };

  return (
    <Screen>
      <Text style={styles.title}>Partidos</Text>
      <ActionButton
        label="Crear partido"
        onPress={openCreateModal}
      />
      <Modal visible={createModalVisible} animationType="fade" transparent onRequestClose={closeCreateModal}>
        <SafeAreaView style={styles.modalBackdrop}>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Crear partido</Text>

              <View style={styles.setupSection}>
                <Text style={styles.inputLabel}>Rival</Text>
                <TextInput
                  autoCapitalize="words"
                  autoFocus
                  onChangeText={setOpponentInput}
                  placeholder="Ej: Argentina"
                  placeholderTextColor="#8a98a8"
                  returnKeyType="done"
                  style={styles.input}
                  value={opponentInput}
                />
                <Text style={styles.helperText}>Nombre del rival</Text>
              </View>

              <View style={styles.setupSection}>
                <Text style={styles.inputLabel}>Plantel</Text>
                <View style={styles.poolRow}>
                  {teamPools.map((pool) => {
                    const selected = pool.id === selectedTeamPoolId;

                    return (
                      <Pressable
                        key={pool.id}
                        onPress={() => {
                          setSelectedTeamPoolId(pool.id);
                          setStarterIds([]);
                        }}
                        style={({ pressed }) => [styles.poolButton, selected && styles.poolButtonSelected, pressed && styles.pressed]}
                      >
                        <Text style={[styles.poolButtonText, selected && styles.poolButtonTextSelected]}>{pool.name}</Text>
                        <Text style={[styles.poolButtonHint, selected && styles.poolButtonTextSelected]}>{pool.playerIds.length} jugadores</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.helperText}>Elegí el plantel para este partido. La lista de titulares usa solo esos jugadores.</Text>
              </View>

              <View style={styles.setupSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.inputLabel}>Titulares</Text>
                  <Text style={styles.countBadge}>{starterIds.length}/7</Text>
                </View>
                <Text style={styles.helperText}>Elegí 7 titulares para iniciar el partido.</Text>
                <View style={styles.playerGrid}>
                  {poolPlayers.map((player) => {
                    const selected = starterIds.includes(player.id);

                    return (
                      <Pressable
                        key={player.id}
                        onPress={() => toggleStarter(player.id)}
                        style={({ pressed }) => [styles.playerTile, selected && styles.playerTileSelected, pressed && styles.pressed]}
                      >
                        <Text style={[styles.playerNumber, selected && styles.playerTileSelectedText]}>#{player.number}</Text>
                        <Text numberOfLines={1} style={[styles.playerName, selected && styles.playerTileSelectedText]}>
                          {player.lastName || player.firstName}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.setupSection}>
                <Text style={styles.inputLabel}>Banco</Text>
                <Text style={styles.helperText}>
                  {benchPlayers.length > 0
                    ? benchPlayers.map((player) => `#${player.number} ${player.lastName || player.firstName}`).join(' · ')
                    : 'Sin suplentes seleccionados.'}
                </Text>
              </View>

              {!canCreateMatch && (
                <Text style={styles.errorText}>{createMatchError}</Text>
              )}

              <View style={styles.modalActions}>
                <ActionButton label="Cancelar" onPress={closeCreateModal} variant="secondary" />
                <Pressable
                  disabled={!canCreateMatch || isCreatingMatch}
                  onPress={confirmCreateMatch}
                  style={({ pressed }) => [
                    styles.createButton,
                    (!canCreateMatch || isCreatingMatch) && styles.createButtonDisabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.createButtonText}>{isCreatingMatch ? 'Creando...' : 'Crear partido'}</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      {visibleMatches.map((match) => {
        const score = calculateScore(match.events);
        return (
          <Pressable
            key={match.id}
            onPress={() => openMatch(match.id, match.status)}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.opponent}>{getMatchupDisplayName(match)}</Text>
              <Text style={[styles.status, styles.statusText]}>{statusLabel[match.status].toUpperCase()}</Text>
            </View>
            <Text style={styles.meta}>{formatMatchDate(match.startsAt)} - {match.venue}</Text>
            {match.teamPoolName && (
              <View style={styles.poolChip}>
                <Text style={styles.poolChipText}>Plantel: {match.teamPoolName}</Text>
              </View>
            )}
            <Text style={styles.score}>{score.uruguay} - {score.opponent}</Text>
            <View style={styles.actions}>
              <Pressable
                onPress={() => openMatchAction(match.id, match.status)}
                style={[styles.startButton, match.status === 'finished' && styles.summaryButton]}
              >
                <Text style={styles.startLabel}>
                  {match.status === 'finished'
                    ? 'Ver resumen'
                    : match.status === 'live' || match.status === 'period_break'
                      ? 'Retomar'
                      : 'Iniciar partido'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  pressed: {
    opacity: 0.86,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  opponent: {
    flex: 1,
    color: '#0b1f33',
    fontSize: fontSize.section,
    fontWeight: '800',
  },
  status: {
    fontSize: fontSize.tiny,
    fontWeight: '900',
  },
  statusText: {
    color: '#0b6bcb',
  },
  meta: {
    color: '#5d6b7a',
  },
  poolChip: {
    alignSelf: 'center',
    borderRadius: 8,
    backgroundColor: '#e8f2ff',
    borderWidth: 1,
    borderColor: '#bfd7f2',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  poolChipText: {
    color: '#0b6bcb',
    fontSize: fontSize.body,
    fontWeight: '900',
    textAlign: 'center',
  },
  score: {
    color: '#0b1f33',
    fontSize: 28,
    fontWeight: '900',
  },
  actions: {
    alignItems: 'center',
  },
  startButton: {
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: '#0b6bcb',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  startLabel: {
    color: '#ffffff',
    fontWeight: '800',
  },
  summaryButton: {
    backgroundColor: '#188038',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 31, 51, 0.72)',
    padding: spacing.md,
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  modalCard: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    padding: spacing.md,
    gap: spacing.sm,
  },
  modalTitle: {
    color: '#0b1f33',
    fontSize: fontSize.title,
    fontWeight: '900',
  },
  setupSection: {
    gap: spacing.xs,
  },
  inputLabel: {
    color: '#0b1f33',
    fontSize: fontSize.body,
    fontWeight: '900',
  },
  input: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#f7fafc',
    color: '#0b1f33',
    fontSize: fontSize.body,
    paddingHorizontal: spacing.sm,
  },
  helperText: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  errorText: {
    color: '#b42318',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  countBadge: {
    minWidth: 48,
    borderRadius: 8,
    backgroundColor: '#e8f2ff',
    color: '#0b6bcb',
    fontSize: fontSize.small,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    textAlign: 'center',
  },
  poolRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  poolButton: {
    minHeight: 62,
    minWidth: 176,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#f7fafc',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  poolButtonSelected: {
    backgroundColor: '#0b6bcb',
    borderColor: '#0b6bcb',
  },
  poolButtonText: {
    color: '#0b1f33',
    fontSize: fontSize.section,
    fontWeight: '900',
    textAlign: 'center',
  },
  poolButtonHint: {
    color: '#5d6b7a',
    fontSize: fontSize.tiny,
    fontWeight: '800',
    marginTop: 2,
    textAlign: 'center',
  },
  poolButtonTextSelected: {
    color: '#ffffff',
  },
  playerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  playerTile: {
    width: '31.8%',
    minHeight: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#f7fafc',
    justifyContent: 'center',
    padding: spacing.xs,
  },
  playerTileSelected: {
    backgroundColor: '#0b6bcb',
    borderColor: '#0b6bcb',
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
  },
  playerTileSelectedText: {
    color: '#ffffff',
  },
  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  createButton: {
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: '#0b6bcb',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  createButtonDisabled: {
    backgroundColor: '#8a98a8',
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: fontSize.button,
    fontWeight: '900',
  },
});
