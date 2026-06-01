import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { getPlayerInitials, LineupSlot } from '../domain/lineupSlots';
import { fontSize, spacing } from '../utils/responsive';

type LineupCourtProps = {
  slots: LineupSlot[];
  selectedPlayerId?: string;
  selectedSlotIndex?: number;
  selectedSecondarySlotIndex?: number;
  highlightSlots?: boolean;
  onSlotPress?: (slot: LineupSlot) => void;
};

const slotPositions = [
  { top: '20%', left: '20%' },
  { top: '50%', left: '20%' },
  { top: '80%', left: '20%' },
  { top: '50%', left: '50%' },
  { top: '20%', left: '80%' },
  { top: '50%', left: '80%' },
  { top: '80%', left: '80%' },
] as const;

export function LineupCourt({
  slots,
  selectedPlayerId,
  selectedSlotIndex,
  selectedSecondarySlotIndex,
  highlightSlots,
  onSlotPress,
}: LineupCourtProps) {
  const { width } = useWindowDimensions();
  const compact = width < 768;
  const slotWidth = compact ? 72 : 88;
  const slotHeight = compact ? 58 : 66;
  const avatarSize = compact ? 23 : 27;

  return (
    <View style={[styles.court, compact && styles.courtPhone]}>
      <View style={styles.centerLine} />
      <View style={[styles.frame, styles.leftFrame]} />
      <View style={[styles.frame, styles.rightFrame]} />
      {slots.map((slot) => {
        const selected = selectedSlotIndex === slot.index || (!!slot.playerId && selectedPlayerId === slot.playerId);
        const secondarySelected = selectedSecondarySlotIndex === slot.index;
        const playerName = slot.player ? `${slot.player.firstName} ${slot.player.lastName}`.trim() : 'Lugar libre';

        return (
          <Pressable
            key={slot.id}
            disabled={!onSlotPress}
            onPress={() => onSlotPress?.(slot)}
            style={({ pressed }) => [
              styles.slot,
              slotPositions[slot.index],
              { width: slotWidth, height: slotHeight, marginLeft: -slotWidth / 2, marginTop: -slotHeight / 2 },
              highlightSlots && styles.highlightSlot,
              selected && styles.selectedSlot,
              secondarySelected && styles.secondarySelectedSlot,
              !slot.player && styles.emptySlot,
              pressed && styles.pressed,
            ]}
          >
            <View
              style={[
                styles.avatar,
                { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
                selected && styles.selectedAvatar,
                secondarySelected && styles.secondarySelectedAvatar,
                !slot.player && styles.emptyAvatar,
              ]}
            >
              <Text style={[styles.avatarText, (selected || secondarySelected) && styles.selectedAvatarText]}>{slot.player ? getPlayerInitials(slot.player) : '+'}</Text>
            </View>
            {slot.player?.number ? (
              <Text style={[styles.number, (selected || secondarySelected) && styles.selectedText]}>#{slot.player.number}</Text>
            ) : null}
            <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.name, (selected || secondarySelected) && styles.selectedText]}>
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
    minHeight: 300,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#0b6bcb',
    backgroundColor: '#dff5eb',
    overflow: 'hidden',
    position: 'relative',
  },
  courtPhone: {
    minHeight: 286,
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#9bc5d8',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  highlightSlot: {
    borderColor: '#188038',
    borderWidth: 2,
  },
  selectedSlot: {
    backgroundColor: '#0b6bcb',
    borderColor: '#0b6bcb',
  },
  secondarySelectedSlot: {
    backgroundColor: '#188038',
    borderColor: '#188038',
  },
  emptySlot: {
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  avatar: {
    backgroundColor: '#e7f0fb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  selectedAvatar: {
    backgroundColor: '#ffffff',
  },
  secondarySelectedAvatar: {
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
    fontSize: fontSize.tiny,
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
    fontSize: fontSize.tiny,
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
