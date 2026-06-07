import { StyleSheet, Text, View } from 'react-native';

import { getOpponentDefenseEventsWithLocation, getPointEventsWithLocation } from '../domain/court';
import { CourtLocation, MatchEvent, TeamSide } from '../domain/types';
import { fontSize, spacing } from '../utils/responsive';
import { CourtField } from './CourtField';

type CourtMapSummaryProps = {
  title: string;
  events: MatchEvent[];
  team?: TeamSide;
  source?: 'points' | 'opponent_defenses';
};

const getDensity = (location: CourtLocation, locations: CourtLocation[]) =>
  locations.filter((item) => Math.abs(item.x - location.x) <= 0.07 && Math.abs(item.y - location.y) <= 0.07).length;

export function CourtMapSummary({ title, events, team = 'uruguay', source = 'points' }: CourtMapSummaryProps) {
  const pointEvents = source === 'points' ? getPointEventsWithLocation(events, team) : [];
  const defenseEvents = source === 'opponent_defenses' ? getOpponentDefenseEventsWithLocation(events) : [];
  const locations = source === 'opponent_defenses'
    ? defenseEvents.map((event) => event.defenseLocation)
    : pointEvents.map((event) => event.landingLocation);
  const missingCount = source === 'points'
    ? events.filter((event) => event.kind === 'point' && event.scoringTeam === team && event.pointSource !== 'opponent_own_point' && !event.landingLocation).length
    : events.filter((event) => event.kind === 'opponent_defense' && !event.defenseLocation).length;
  const itemLabel = source === 'opponent_defenses' ? 'defensas del rival' : 'puntos';

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <CourtField style={styles.court}>
        {locations.map((location, index) => {
          const density = getDensity(location, locations);
          const size = Math.min(12 + density * 3, 24);

          return (
          <View
            key={`${location.x}-${location.y}-${index}`}
            style={[
              styles.dot,
              source === 'opponent_defenses'
                ? styles.opponentDefenseDot
                : team === 'uruguay'
                  ? styles.uruguayDot
                  : styles.opponentDot,
              {
                borderRadius: size / 2,
                height: size,
                left: `${location.x * 100}%`,
                marginLeft: -size / 2,
                marginTop: -size / 2,
                opacity: Math.min(0.5 + density * 0.12, 0.95),
                top: `${location.y * 100}%`,
                width: size,
              },
            ]}
          />
        );
        })}
      </CourtField>
      {locations.length === 0 ? (
        <Text style={styles.meta}>Sin ubicaciones registradas.</Text>
      ) : (
        <Text style={styles.meta}>{locations.length} {itemLabel} con ubicación.</Text>
      )}
      {missingCount > 0 && <Text style={styles.meta}>{missingCount} eventos antiguos sin ubicación registrada.</Text>}
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
  opponentDefenseDot: {
    backgroundColor: '#7c3aed',
  },
  meta: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
  },
});
