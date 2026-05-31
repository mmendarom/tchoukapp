import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getPlayerInitials, LineupSlot } from '../domain/lineupSlots';
import { fontSize, spacing } from '../utils/responsive';

type LineupCourtProps = {
  slots: LineupSlot[];
  selectedPlayerId?: string;
  selectedSlotIndex?: number;
  highlightSlots?: boolean;
  onSlotPress?: (slot: LineupSlot) => void;
};

const slotPositions = [
  { top: '10%', left: '10%' },
  { top: '10%', right: '10%' },
  { top: '35%', left: '7%' },
  { top: '35%', right: '7%' },
  { top: '58%', left: '18%' },
  { top: '58%', right: '18%' },
  { top: '36%', left: '36%' },
] as const;

export function LineupCourt({ slots, selectedPlayerId, selectedSlotIndex, highlightSlots, onSlotPress }: LineupCourtProps) {
  return (
    <View style={styles.court}>
      <View style={styles.centerLine} />
      <View style={[styles.frame, styles.leftFrame]} />
      <View style={[styles.frame, styles.rightFrame]} />
      {slots.map((slot) => {
        const selected = selectedSlotIndex === slot.index || (!!slot.playerId && selectedPlayerId === slot.playerId);
        const playerName = slot.player ? `${slot.player.firstName} ${slot.player.lastName}`.trim() : 'Lugar libre';

        return (
          <Pressable
            key={slot.id}
            disabled={!onSlotPress}
            onPress={() => onSlotPress?.(slot)}
            style={({ pressed }) => [
              styles.slot,
              slotPositions[slot.index],
              highlightSlots && styles.highlightSlot,
              selected && styles.selectedSlot,
              !slot.player && styles.emptySlot,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.avatar, selected && styles.selectedAvatar, !slot.player && styles.emptyAvatar]}>
              <Text style={[styles.avatarText, selected && styles.selectedAvatarText]}>{slot.player ? getPlayerInitials(slot.player) : '+'}</Text>
            </View>
            {slot.player?.number ? (
              <Text style={[styles.number, selected && styles.selectedText]}>#{slot.player.number}</Text>
            ) : null}
            <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.name, selected && styles.selectedText]}>
              {playerName}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  court: {
    minHeight: 276,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#0b6bcb',
    backgroundColor: '#dff5eb',
    overflow: 'hidden',
    position: 'relative',
  },
  centerLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 1,
    backgroundColor: 'rgba(11, 107, 203, 0.35)',
  },
  frame: {
    position: 'absolute',
    top: '37%',
    width: 42,
    height: 72,
    borderWidth: 2,
    borderColor: '#0b6bcb',
    backgroundColor: 'rgba(255, 255, 255, 0.32)',
  },
  leftFrame: {
    left: -14,
    borderTopRightRadius: 36,
    borderBottomRightRadius: 36,
  },
  rightFrame: {
    right: -14,
    borderTopLeftRadius: 36,
    borderBottomLeftRadius: 36,
  },
  slot: {
    position: 'absolute',
    width: '28%',
    minWidth: 86,
    maxWidth: 122,
    minHeight: 70,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#9bc5d8',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
  },
  highlightSlot: {
    borderColor: '#188038',
    borderWidth: 2,
  },
  selectedSlot: {
    backgroundColor: '#0b6bcb',
    borderColor: '#0b6bcb',
  },
  emptySlot: {
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e7f0fb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  selectedAvatar: {
    backgroundColor: '#ffffff',
  },
  selectedAvatarText: {
    color: '#0b6bcb',
  },
  emptyAvatar: {
    backgroundColor: '#f4f7fb',
  },
  avatarText: {
    color: '#0b1f33',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  number: {
    color: '#0b6bcb',
    fontSize: fontSize.tiny,
    fontWeight: '900',
  },
  name: {
    width: '100%',
    color: '#0b1f33',
    fontSize: fontSize.small,
    fontWeight: '900',
    textAlign: 'center',
  },
  selectedText: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.82,
  },
});
