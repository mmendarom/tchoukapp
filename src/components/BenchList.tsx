import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getPlayerInitials } from '../domain/lineupSlots';
import { Player } from '../domain/types';
import { fontSize, spacing } from '../utils/responsive';

type BenchListProps = {
  players: Player[];
  selectedPlayerId?: string;
  onPlayerPress?: (player: Player) => void;
};

export function BenchList({ players, selectedPlayerId, onPlayerPress }: BenchListProps) {
  if (players.length === 0) {
    return <Text style={styles.emptyText}>No hay suplentes disponibles.</Text>;
  }

  return (
    <ScrollView nestedScrollEnabled contentContainerStyle={styles.list} style={styles.scroll}>
      {players.map((player) => {
        const selected = selectedPlayerId === player.id;
        const displayName = `${player.firstName} ${player.lastName}`.trim();

        return (
          <Pressable
            key={player.id}
            onPress={() => onPlayerPress?.(player)}
            style={({ pressed }) => [styles.row, selected && styles.selectedRow, pressed && styles.pressed]}
          >
            <View style={[styles.avatar, selected && styles.selectedAvatar]}>
              <Text style={[styles.avatarText, selected && styles.selectedAvatarText]}>{getPlayerInitials(player)}</Text>
            </View>
            <View style={styles.details}>
              <Text numberOfLines={1} style={[styles.name, selected && styles.selectedText]}>
                {displayName}
              </Text>
              <Text style={[styles.number, selected && styles.selectedText]}>#{player.number}</Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    maxHeight: 280,
  },
  list: {
    gap: spacing.xs,
  },
  row: {
    minHeight: 54,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#f7fafc',
    padding: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectedRow: {
    backgroundColor: '#188038',
    borderColor: '#188038',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e7f0fb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedAvatar: {
    backgroundColor: '#ffffff',
  },
  avatarText: {
    color: '#0b1f33',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  selectedAvatarText: {
    color: '#188038',
  },
  details: {
    flex: 1,
  },
  name: {
    color: '#0b1f33',
    fontSize: fontSize.body,
    fontWeight: '900',
  },
  number: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
    fontWeight: '800',
    marginTop: 1,
  },
  selectedText: {
    color: '#ffffff',
  },
  emptyText: {
    color: '#5d6b7a',
    fontSize: fontSize.body,
  },
  pressed: {
    opacity: 0.82,
  },
});
