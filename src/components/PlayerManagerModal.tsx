import { useState } from 'react';
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CreatePlayerInput } from '../domain/players';
import { Player } from '../domain/types';
import { useMatchStore } from '../store/useMatchStore';
import { positionLabel, usualZoneLabel } from '../utils/labels';
import { fontSize, spacing } from '../utils/responsive';
import { ActionButton } from './ActionButton';
import { PlayerForm } from './PlayerForm';

type PlayerManagerModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function PlayerManagerModal({ visible, onClose }: PlayerManagerModalProps) {
  const players = useMatchStore((state) => state.players);
  const createPlayer = useMatchStore((state) => state.createPlayer);
  const updatePlayer = useMatchStore((state) => state.updatePlayer);
  const [formVisible, setFormVisible] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | undefined>();
  const sortedPlayers = [...players].sort((a, b) => a.number - b.number || a.firstName.localeCompare(b.firstName));
  const editingPlayer = editingPlayerId ? players.find((player) => player.id === editingPlayerId) : undefined;
  const resetForm = () => {
    setFormVisible(false);
    setEditingPlayerId(undefined);
  };
  const openCreateForm = () => {
    resetForm();
    setFormVisible(true);
  };
  const closeModal = () => {
    onClose();
    resetForm();
  };
  const openEditForm = (player: Player) => {
    setFormVisible(true);
    setEditingPlayerId(player.id);
  };
  const savePlayer = (input: CreatePlayerInput) => {
    const saved = editingPlayerId ? updatePlayer(editingPlayerId, input) : Boolean(createPlayer(input));

    if (saved) {
      resetForm();
    }

    return saved;
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={closeModal}>
      <SafeAreaView style={styles.modalBackdrop}>
        <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.modalCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.modalTitle}>Jugadores</Text>
              <Pressable
                accessibilityLabel="Cerrar"
                accessibilityRole="button"
                onPress={closeModal}
                style={({ pressed }) => [styles.closeIconButton, pressed && styles.pressed]}
              >
                <Text style={styles.closeIconText}>✕</Text>
              </Pressable>
            </View>

            {formVisible ? (
              <PlayerForm
                key={editingPlayer?.id ?? 'new-player'}
                title={editingPlayer ? 'Editar jugador' : 'Nuevo jugador'}
                initialPlayer={editingPlayer}
                onCancel={resetForm}
                onSave={savePlayer}
              />
            ) : (
              <>
                <View style={styles.topActions}>
                  <ActionButton label="Nuevo jugador" onPress={openCreateForm} />
                </View>

                <View style={styles.playerList}>
                  {sortedPlayers.map((player) => (
                    <View key={player.id} style={styles.playerListItem}>
                      <View style={styles.playerListText}>
                        <Text style={styles.playerListName}>#{player.number} {player.firstName} {player.lastName}</Text>
                        <Text style={styles.helperText}>{positionLabel[player.position]} · {usualZoneLabel[player.usualPlayingZone]} · {player.dominantHand}</Text>
                      </View>
                      <ActionButton label="Editar" onPress={() => openEditForm(player)} variant="secondary" />
                    </View>
                  ))}
                </View>
              </>
            )}

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
    maxWidth: 760,
    alignSelf: 'center',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  topActions: {
    alignItems: 'flex-start',
  },
  playerList: {
    gap: spacing.sm,
  },
  playerListItem: {
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
  playerListText: {
    flex: 1,
  },
  playerListName: {
    color: '#0b1f33',
    fontSize: fontSize.body,
    fontWeight: '900',
  },
  helperText: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  closeFooter: {
    borderTopWidth: 1,
    borderTopColor: '#dbe4ef',
    paddingTop: spacing.sm,
    alignItems: 'flex-end',
  },
  pressed: {
    opacity: 0.86,
  },
});
