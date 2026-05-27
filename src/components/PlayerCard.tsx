import { StyleSheet, Text, View } from 'react-native';

import { Player } from '../domain/types';
import { usualZoneLabel } from '../utils/labels';
import { fontSize, spacing } from '../utils/responsive';

type PlayerCardProps = {
  player: Player;
};

export function PlayerCard({ player }: PlayerCardProps) {
  const displayName = `${player.firstName} ${player.lastName}`.trim();
  const usualZone = player.usualPlayingZone ? usualZoneLabel[player.usualPlayingZone] : 'Sin zona habitual';

  return (
    <View style={styles.card}>
      <View style={styles.numberBadge}>
        <Text style={styles.number}>{player.number}</Text>
      </View>
      <View style={styles.details}>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.meta}>Zona habitual: {usualZone}</Text>
      </View>
      <View style={styles.stats}>
        <Text style={styles.stat}>{player.goals}</Text>
        <Text style={styles.statLabel}>Puntos</Text>
      </View>
      <View style={styles.stats}>
        <Text style={styles.stat}>{player.blocks}</Text>
        <Text style={styles.statLabel}>Bloqueos</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 70,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  numberBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0b6bcb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    color: '#ffffff',
    fontSize: fontSize.section,
    fontWeight: '800',
  },
  details: {
    flex: 1,
  },
  name: {
    color: '#0b1f33',
    fontSize: fontSize.body,
    fontWeight: '800',
  },
  meta: {
    color: '#5d6b7a',
    marginTop: 2,
    fontSize: fontSize.small,
  },
  stats: {
    width: 58,
    alignItems: 'flex-end',
  },
  stat: {
    color: '#0b1f33',
    fontSize: fontSize.body,
    fontWeight: '800',
  },
  statLabel: {
    color: '#5d6b7a',
    fontSize: fontSize.tiny,
  },
});
