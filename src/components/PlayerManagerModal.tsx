import { useState } from 'react';
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Player, PlayerPosition, PlayerUsualZone } from '../domain/types';
import { useMatchStore } from '../store/useMatchStore';
import { positionLabel, usualZoneLabel } from '../utils/labels';
import { fontSize, spacing } from '../utils/responsive';
import { ActionButton } from './ActionButton';

type PlayerManagerModalProps = {
  visible: boolean;
  onClose: () => void;
};

type DominantHand = Player['dominantHand'];

const positions: PlayerPosition[] = ['Wing', 'Center', 'Shooter', 'Defender', 'Pivot'];
const zones: PlayerUsualZone[] = ['izquierda', 'central', 'derecha'];
const hands: DominantHand[] = ['Right', 'Left'];

export function PlayerManagerModal({ visible, onClose }: PlayerManagerModalProps) {
  const players = useMatchStore((state) => state.players);
  const createPlayer = useMatchStore((state) => state.createPlayer);
  const updatePlayer = useMatchStore((state) => state.updatePlayer);
  const [formVisible, setFormVisible] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | undefined>();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [number, setNumber] = useState('');
  const [position, setPosition] = useState<PlayerPosition | undefined>();
  const [usualPlayingZone, setUsualPlayingZone] = useState<PlayerUsualZone | undefined>();
  const [dominantHand, setDominantHand] = useState<DominantHand | undefined>();
  const [error, setError] = useState<string | undefined>();
  const sortedPlayers = [...players].sort((a, b) => a.number - b.number || a.firstName.localeCompare(b.firstName));
  const editing = Boolean(editingPlayerId);
  const resetForm = () => {
    setFormVisible(false);
    setEditingPlayerId(undefined);
    setFirstName('');
    setLastName('');
    setNumber('');
    setPosition(undefined);
    setUsualPlayingZone(undefined);
    setDominantHand(undefined);
    setError(undefined);
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
    setFirstName(player.firstName);
    setLastName(player.lastName);
    setNumber(String(player.number));
    setPosition(player.position);
    setUsualPlayingZone(player.usualPlayingZone);
    setDominantHand(player.dominantHand);
    setError(undefined);
  };
  const validateForm = () => {
    if (!firstName.trim()) {
      return 'El nombre es obligatorio.';
    }

    if (!position) {
      return 'Seleccioná una posición.';
    }

    if (!usualPlayingZone) {
      return 'Seleccioná una zona habitual.';
    }

    if (!dominantHand) {
      return 'Seleccioná mano dominante.';
    }

    return undefined;
  };
  const savePlayer = () => {
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const parsedNumber = number.trim() ? Number(number) : undefined;
    const input = {
      firstName,
      lastName,
      number: Number.isFinite(parsedNumber) ? parsedNumber : undefined,
      position,
      usualPlayingZone,
      dominantHand,
    };
    const saved = editingPlayerId
      ? updatePlayer(editingPlayerId, input)
      : Boolean(createPlayer(input));

    if (!saved) {
      setError('No se pudo guardar el jugador.');
      return;
    }

    resetForm();
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

            <View style={styles.divider} />

            {formVisible && (
              <View style={styles.formCard}>
                <View style={styles.setupSection}>
                  <Text style={styles.inputLabel}>{editing ? 'Editar jugador' : 'Nuevo jugador'}</Text>
                  <TextInput
                    autoCapitalize="words"
                    onChangeText={(value) => {
                      setFirstName(value);
                      setError(undefined);
                    }}
                    placeholder="Nombre"
                    placeholderTextColor="#8a98a8"
                    style={styles.input}
                    value={firstName}
                  />
                  <TextInput
                    autoCapitalize="words"
                    onChangeText={(value) => {
                      setLastName(value);
                      setError(undefined);
                    }}
                    placeholder="Apellido"
                    placeholderTextColor="#8a98a8"
                    style={styles.input}
                    value={lastName}
                  />
                  <TextInput
                    keyboardType="number-pad"
                    onChangeText={(value) => {
                      setNumber(value);
                      setError(undefined);
                    }}
                    placeholder="Número"
                    placeholderTextColor="#8a98a8"
                    style={styles.input}
                    value={number}
                  />
                </View>

                <SegmentedField
                  label="Posición"
                  options={positions}
                  selected={position}
                  getLabel={(value) => positionLabel[value]}
                  onSelect={(value) => {
                    setPosition(value);
                    setError(undefined);
                  }}
                />
                <SegmentedField
                  label="Zona habitual"
                  options={zones}
                  selected={usualPlayingZone}
                  getLabel={(value) => usualZoneLabel[value]}
                  onSelect={(value) => {
                    setUsualPlayingZone(value);
                    setError(undefined);
                  }}
                />
                <SegmentedField
                  label="Mano dominante"
                  options={hands}
                  selected={dominantHand}
                  getLabel={(value) => value}
                  onSelect={(value) => {
                    setDominantHand(value);
                    setError(undefined);
                  }}
                />

                {error && <Text style={styles.errorText}>{error}</Text>}

                <View style={styles.modalActions}>
                  <ActionButton label="Cancelar" onPress={resetForm} variant="secondary" />
                  <Pressable
                    onPress={savePlayer}
                    style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.createButtonText}>Guardar</Text>
                  </Pressable>
                </View>
              </View>
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

function SegmentedField<T extends string>({
  label,
  options,
  selected,
  getLabel,
  onSelect,
}: {
  label: string;
  options: T[];
  selected?: T;
  getLabel: (value: T) => string;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={styles.setupSection}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.segmentRow}>
        {options.map((option) => {
          const active = selected === option;

          return (
            <Pressable
              key={option}
              onPress={() => onSelect(option)}
              style={({ pressed }) => [styles.segmentButton, active && styles.segmentButtonSelected, pressed && styles.pressed]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextSelected]}>{getLabel(option)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
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
  divider: {
    height: 1,
    backgroundColor: '#dbe4ef',
    marginVertical: spacing.xs,
  },
  setupSection: {
    gap: spacing.xs,
  },
  formCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbe4ef',
    backgroundColor: '#ffffff',
    padding: spacing.sm,
    gap: spacing.sm,
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
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  segmentButton: {
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#f7fafc',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  segmentButtonSelected: {
    backgroundColor: '#0b6bcb',
    borderColor: '#0b6bcb',
  },
  segmentText: {
    color: '#0b1f33',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  segmentTextSelected: {
    color: '#ffffff',
  },
  errorText: {
    color: '#b42318',
    fontSize: fontSize.small,
    fontWeight: '900',
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
  createButtonText: {
    color: '#ffffff',
    fontSize: fontSize.button,
    fontWeight: '900',
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
