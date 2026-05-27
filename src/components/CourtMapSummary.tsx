import { StyleSheet, Text, View } from 'react-native';

import { getPointEventsWithLocation } from '../domain/court';
import { MatchEvent, TeamSide } from '../domain/types';
import { fontSize, spacing } from '../utils/responsive';
import { CourtField } from './CourtField';

type CourtMapSummaryProps = {
  title: string;
  events: MatchEvent[];
  team: TeamSide;
};

export function CourtMapSummary({ title, events, team }: CourtMapSummaryProps) {
  const points = getPointEventsWithLocation(events, team);
  const missingCount = events.filter((event) => event.kind === 'point' && event.scoringTeam === team && !event.landingLocation).length;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <CourtField style={styles.court}>
        {points.map((event, index) => (
          <View
            key={`${event.id}-${index}`}
            style={[
              styles.dot,
              team === 'uruguay' ? styles.uruguayDot : styles.opponentDot,
              {
                left: `${event.landingLocation.x * 100}%`,
                top: `${event.landingLocation.y * 100}%`,
                opacity: Math.min(0.55 + index * 0.03, 0.95),
              },
            ]}
          />
        ))}
      </CourtField>
      {points.length === 0 ? (
        <Text style={styles.meta}>Sin ubicación registrada.</Text>
      ) : (
        <Text style={styles.meta}>{points.length} puntos con ubicación.</Text>
      )}
      {missingCount > 0 && <Text style={styles.meta}>{missingCount} puntos antiguos sin ubicación registrada.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  title: {
    color: '#0b1f33',
    fontSize: fontSize.section,
    fontWeight: '900',
  },
  court: {
    height: 150,
  },
  dot: {
    position: 'absolute',
    width: 14,
    height: 14,
    marginLeft: -7,
    marginTop: -7,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  uruguayDot: {
    backgroundColor: '#0b6bcb',
  },
  opponentDot: {
    backgroundColor: '#b42318',
  },
  meta: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
  },
});
