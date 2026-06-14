import { useState } from 'react';
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useMatchStore } from '../store/useMatchStore';
import { fontSize, spacing } from '../utils/responsive';
import { ActionButton } from './ActionButton';

type TeamPoolManagerModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function TeamPoolManagerModal({ visible, onClose }: TeamPoolManagerModalProps) {
  const [editingPoolId, setEditingPoolId] = useState<string | undefined>();
  const [poolNameInput, setPoolNameInput] = useState('');
  const [selectedPoolPlayerIds, setSelectedPoolPlayerIds] = useState<string[]>([]);
  const [poolError, setPoolError] = useState<string | undefined>();
  const players = useMatchStore((state) => state.players);
  const teamPools = useMatchStore((state) => state.teamPools);
  const createTeamPool = useMatchStore((state) => state.createTeamPool);
  const updateTeamPool = useMatchStore((state) => state.updateTeamPool);
  const resetPoolForm = () => {
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
  const closeModal = () => {
    onClose();
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

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={closeModal}>
      <SafeAreaView style={styles.modalBackdrop}>
        <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.modalCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.modalTitle}>Planteles</Text>
              <Pressable
                accessibilityLabel="Cerrar"
                accessibilityRole="button"
                onPress={closeModal}
                style={({ pressed }) => [styles.closeIconButton, pressed && styles.pressed]}
              >
                <Text style={styles.closeIconText}>✕</Text>
              </Pressable>
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

            <View style={styles.closeFooter}>
              <ActionButton label="Cerrar" onPress={closeModal} variant="secondary" />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    flex: 1,
    color: '#0b1f33',
    fontSize: fontSize.title,
    fontWeight: '900',
  },
  closeIconButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#f7fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIconText: {
    color: '#0b1f33',
    fontSize: fontSize.section,
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
  closeFooter: {
    borderTopWidth: 1,
    borderTopColor: '#dbe4ef',
    paddingTop: spacing.sm,
    alignItems: 'flex-end',
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
  pressed: {
    opacity: 0.86,
  },
});
