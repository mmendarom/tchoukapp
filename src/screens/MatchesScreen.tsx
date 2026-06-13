import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { Screen } from '../components/Screen';
import { normalizeOpponentName } from '../domain/opponent';
import { calculateScore } from '../domain/stats';
import { useMatchStore } from '../store/useMatchStore';
import { formatMatchDate } from '../utils/date';
import { statusLabel } from '../utils/labels';
import { RootStackParamList } from '../utils/navigation';
import { fontSize, spacing } from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'Matches'>;

export function MatchesScreen({ navigation }: Props) {
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [opponentInput, setOpponentInput] = useState('');
  const [selectedTeamPoolId, setSelectedTeamPoolId] = useState('mayores');
  const [starterIds, setStarterIds] = useState<string[]>([]);
  const [poolManagerVisible, setPoolManagerVisible] = useState(false);
  const [editingPoolId, setEditingPoolId] = useState<string | undefined>();
  const [poolNameInput, setPoolNameInput] = useState('');
  const [selectedPoolPlayerIds, setSelectedPoolPlayerIds] = useState<string[]>([]);
  const [poolError, setPoolError] = useState<string | undefined>();
  const players = useMatchStore((state) => state.players);
  const teamPools = useMatchStore((state) => state.teamPools);
  const matches = useMatchStore((state) => state.matches);
  const startMatch = useMatchStore((state) => state.startMatch);
  const createMatch = useMatchStore((state) => state.createMatch);
  const createTeamPool = useMatchStore((state) => state.createTeamPool);
  const updateTeamPool = useMatchStore((state) => state.updateTeamPool);
  const visibleMatches = matches.filter((match) => match.status !== 'cancelled');
  const matchSetupPools = teamPools.filter((pool) => pool.id === 'mayores');
  const selectedTeamPool = matchSetupPools.find((pool) => pool.id === selectedTeamPoolId) ?? matchSetupPools[0] ?? teamPools[0];
  const poolPlayerIds = selectedTeamPool?.playerIds ?? [];
  const poolPlayers = players.filter((player) => poolPlayerIds.includes(player.id));
  const benchPlayers = poolPlayers.filter((player) => !starterIds.includes(player.id));
  const canCreateMatch = starterIds.length === 7 && poolPlayers.length >= 7;
  const closeCreateModal = () => {
    setCreateModalVisible(false);
    setOpponentInput('');
    setSelectedTeamPoolId(teamPools[0]?.id ?? 'mayores');
    setStarterIds([]);
  };
  const confirmCreateMatch = () => {
    const matchId = createMatch({
      opponent: opponentInput,
      teamPoolId: selectedTeamPool?.id,
      teamPoolName: selectedTeamPool?.name,
      availablePlayerIds: poolPlayerIds,
      initialPlayerIds: starterIds,
    });

    if (!matchId) {
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
  const resetPoolForm = () => {
    setEditingPoolId(undefined);
    setPoolNameInput('');
    setSelectedPoolPlayerIds([]);
    setPoolError(undefined);
  };
  const openNewPoolForm = () => {
    setEditingPoolId(undefined);
    setPoolNameInput('');
    setSelectedPoolPlayerIds([]);
    setPoolError(undefined);
  };
  const openEditPoolForm = (poolId: string) => {
    const pool = teamPools.find((item) => item.id === poolId);

    if (!pool) {
      return;
    }

    setEditingPoolId(pool.id);
    setPoolNameInput(pool.name);
    setSelectedPoolPlayerIds(pool.playerIds);
    setPoolError(undefined);
  };
  const closePoolManager = () => {
    setPoolManagerVisible(false);
    resetPoolForm();
  };
  const togglePoolPlayer = (playerId: string) => {
    setSelectedPoolPlayerIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId],
    );
  };
  const savePool = () => {
    if (!poolNameInput.trim()) {
      setPoolError('El nombre del plantel es obligatorio.');
      return;
    }

    if (selectedPoolPlayerIds.length === 0) {
      setPoolError('Seleccioná al menos un jugador.');
      return;
    }

    const saved = editingPoolId
      ? updateTeamPool(editingPoolId, { name: poolNameInput, playerIds: selectedPoolPlayerIds })
      : Boolean(createTeamPool(poolNameInput, selectedPoolPlayerIds));

    if (!saved) {
      setPoolError('No se pudo guardar el plantel.');
      return;
    }

    resetPoolForm();
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
        onPress={() => setCreateModalVisible(true)}
      />
      <ActionButton
        label="Gestionar planteles"
        onPress={() => {
          resetPoolForm();
          setPoolManagerVisible(true);
        }}
        variant="secondary"
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
                  {matchSetupPools.map((pool) => {
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
                <Text style={styles.helperText}>Los planteles personalizados se preparan desde Gestionar planteles y se usarán en creación de partido en la próxima etapa.</Text>
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
                <Text style={styles.errorText}>Elegí 7 titulares para iniciar el partido.</Text>
              )}

              <View style={styles.modalActions}>
                <ActionButton label="Cancelar" onPress={closeCreateModal} variant="secondary" />
                <Pressable
                  disabled={!canCreateMatch}
                  onPress={confirmCreateMatch}
                  style={({ pressed }) => [styles.createButton, !canCreateMatch && styles.createButtonDisabled, pressed && styles.pressed]}
                >
                  <Text style={styles.createButtonText}>Crear partido</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <Modal visible={poolManagerVisible} animationType="fade" transparent onRequestClose={closePoolManager}>
        <SafeAreaView style={styles.modalBackdrop}>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.modalCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.modalTitle}>Planteles</Text>
                <ActionButton label="Cerrar" onPress={closePoolManager} variant="secondary" />
              </View>

              <View style={styles.poolList}>
                {teamPools.map((pool) => (
                  <View key={pool.id} style={styles.poolListItem}>
                    <View style={styles.poolListText}>
                      <Text style={styles.poolListName}>{pool.name}</Text>
                      <Text style={styles.helperText}>{pool.playerIds.length} jugadores</Text>
                    </View>
                    <ActionButton label="Editar" onPress={() => openEditPoolForm(pool.id)} variant="secondary" />
                  </View>
                ))}
              </View>

              <View style={styles.divider} />

              <View style={styles.setupSection}>
                <Text style={styles.inputLabel}>{editingPoolId ? 'Editar plantel' : 'Nuevo plantel'}</Text>
                <TextInput
                  autoCapitalize="words"
                  onChangeText={(value) => {
                    setPoolNameInput(value);
                    setPoolError(undefined);
                  }}
                  placeholder="Nombre del plantel"
                  placeholderTextColor="#8a98a8"
                  returnKeyType="done"
                  style={styles.input}
                  value={poolNameInput}
                />
              </View>

              <View style={styles.setupSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.inputLabel}>Jugadores</Text>
                  <Text style={styles.countBadge}>{selectedPoolPlayerIds.length} seleccionados</Text>
                </View>
                <View style={styles.playerGrid}>
                  {players.map((player) => {
                    const selected = selectedPoolPlayerIds.includes(player.id);

                    return (
                      <Pressable
                        key={player.id}
                        onPress={() => {
                          togglePoolPlayer(player.id);
                          setPoolError(undefined);
                        }}
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

              {poolError && <Text style={styles.errorText}>{poolError}</Text>}

              <View style={styles.modalActions}>
                <ActionButton label="Cancelar" onPress={resetPoolForm} variant="secondary" />
                <Pressable
                  onPress={savePool}
                  style={({ pressed }) => [styles.createButton, (!poolNameInput.trim() || selectedPoolPlayerIds.length === 0) && styles.createButtonDisabled, pressed && styles.pressed]}
                >
                  <Text style={styles.createButtonText}>Guardar</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      {visibleMatches.map((match) => {
        const score = calculateScore(match.events);
        const opponentName = normalizeOpponentName(match.opponent);

        return (
          <Pressable
            key={match.id}
            onPress={() => openMatch(match.id, match.status)}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.opponent}>Uruguay vs {opponentName}</Text>
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
  poolList: {
    gap: spacing.sm,
  },
  poolListItem: {
    minHeight: 58,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbe4ef',
    backgroundColor: '#f7fafc',
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  poolListText: {
    flex: 1,
  },
  poolListName: {
    color: '#0b1f33',
    fontSize: fontSize.section,
    fontWeight: '900',
  },
  divider: {
    height: 1,
    backgroundColor: '#dbe4ef',
    marginVertical: spacing.xs,
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
