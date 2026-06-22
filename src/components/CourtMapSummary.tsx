import { StyleSheet, Text, View } from 'react-native';

import { getOpponentDefenseEventsWithLocation, getPointEventsWithLocation } from '../domain/court';
import { MatchEvent, TeamSide } from '../domain/types';
import { fontSize, spacing } from '../utils/responsive';
import { CourtLocationMap } from './CourtLocationMap';

type CourtMapSummaryProps = {
  title: string;
  events: MatchEvent[];
  team?: TeamSide;
  source?: 'points' | 'opponent_defenses';
};

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
      <CourtLocationMap
        locations={locations}
        markerVariant={source === 'opponent_defenses' ? 'opponentDefense' : team === 'uruguay' ? 'uruguay' : 'opponent'}
      />
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
  meta: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
  },
});
