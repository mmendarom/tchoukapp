import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { CreatePlayerInput } from '../domain/players';
import { Player, PlayerPosition, PlayerUsualZone } from '../domain/types';
import { positionLabel, usualZoneLabel } from '../utils/labels';
import { fontSize, spacing } from '../utils/responsive';
import { ActionButton } from './ActionButton';

type DominantHand = Player['dominantHand'];

type PlayerFormProps = {
  title: string;
  initialPlayer?: Player;
  onCancel: () => void;
  onSave: (input: CreatePlayerInput) => boolean;
};

const positions: PlayerPosition[] = ['Wing', 'Center', 'Shooter', 'Defender', 'Pivot'];
const zones: PlayerUsualZone[] = ['izquierda', 'central', 'derecha'];
const hands: DominantHand[] = ['Right', 'Left'];

export function PlayerForm({ title, initialPlayer, onCancel, onSave }: PlayerFormProps) {
  const [firstName, setFirstName] = useState(initialPlayer?.firstName ?? '');
  const [lastName, setLastName] = useState(initialPlayer?.lastName ?? '');
  const [number, setNumber] = useState(initialPlayer ? String(initialPlayer.number) : '');
  const [position, setPosition] = useState<PlayerPosition | undefined>(initialPlayer?.position);
  const [usualPlayingZone, setUsualPlayingZone] = useState<PlayerUsualZone | undefined>(initialPlayer?.usualPlayingZone);
  const [dominantHand, setDominantHand] = useState<DominantHand | undefined>(initialPlayer?.dominantHand);
  const [error, setError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

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
    if (isSaving) {
      return;
    }

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);

    const parsedNumber = number.trim() ? Number(number) : undefined;
    const saved = onSave({
      firstName,
      lastName,
      number: Number.isFinite(parsedNumber) ? parsedNumber : undefined,
      position,
      usualPlayingZone,
      dominantHand,
    });

    if (!saved) {
      setError('No se pudo guardar el jugador.');
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.formCard}>
      <View style={styles.setupSection}>
        <Text style={styles.inputLabel}>{title}</Text>
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

      <View style={styles.formActions}>
        <ActionButton disabled={isSaving} label="Cancelar" onPress={onCancel} variant="secondary" />
        <Pressable
          disabled={isSaving}
          onPress={savePlayer}
          style={({ pressed }) => [styles.createButton, isSaving && styles.createButtonDisabled, pressed && styles.pressed]}
        >
          <Text style={styles.createButtonText}>{isSaving ? 'Guardando...' : 'Guardar'}</Text>
        </Pressable>
      </View>
    </View>
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
  formCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbe4ef',
    backgroundColor: '#ffffff',
    padding: spacing.sm,
    gap: spacing.sm,
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
  formActions: {
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
  pressed: {
    opacity: 0.86,
  },
});
