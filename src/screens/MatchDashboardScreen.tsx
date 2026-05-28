import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { Screen } from '../components/Screen';
import { StatCard } from '../components/StatCard';
import { createTacticalInsights } from '../domain/insights';
import {
  calculateScore,
  getDefensesByPlayer,
  getErrorsByPlayer,
  getErrorsByTypeByPlayer,
  getOpponentPointsByZone,
  getPlusMinusByLineup,
  getPointsByZone,
  getTopScorers,
} from '../domain/stats';
import { useMatchStore } from '../store/useMatchStore';
import { eventKindLabel, statusLabel, zoneLabel } from '../utils/labels';
import { RootStackParamList } from '../utils/navigation';
import { fontSize, spacing } from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'MatchDashboard'>;

export function MatchDashboardScreen({ navigation, route }: Props) {
  const { width } = useWindowDimensions();
  const isPhone = width < 768;
  const matches = useMatchStore((state) => state.matches);
  const players = useMatchStore((state) => state.players);
  const match = matches.find((item) => item.id === route.params?.matchId) ?? matches[0];

  if (!match) {
    return (
      <Screen>
        <Text style={styles.title}>No hay partido seleccionado</Text>
      </Screen>
    );
  }

  const playerById = new Map(players.map((player) => [player.id, player]));
  const playerLabel = (playerId: string) => {
    const player = playerById.get(playerId);
    return player ? player.lastName || player.firstName : playerId;
  };
  const score = calculateScore(match.events);
  const topScorers = getTopScorers(match.events);
  const errorsByPlayer = getErrorsByPlayer(match.events);
  const errorBreakdown = getErrorsByTypeByPlayer(match.events);
  const defensesByPlayer = getDefensesByPlayer(match.events);
  const pointsByZone = getPointsByZone(match.events);
  const opponentPointsByZone = getOpponentPointsByZone(match.events);
  const plusMinusByLineup = getPlusMinusByLineup(match);
  const insights = createTacticalInsights({
    events: match.events,
    lineupSnapshots: match.lineupSnapshots,
    players,
    opponentName: match.opponent,
  });

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>{statusLabel[match.status].toUpperCase()}</Text>
        <Text style={styles.title}>Uruguay {score.uruguay} - {score.opponent} {match.opponent}</Text>
      </View>

      <View style={styles.statsRow}>
        <StatCard label="Acciones" value={match.events.length} />
        <StatCard label="Set" value={match.clock.period} />
        <StatCard label="Puntos Uruguay" value={score.uruguay} />
        <StatCard label="Puntos rival" value={score.opponent} />
      </View>

      <View style={styles.analyticsGrid}>
        <View style={[styles.panel, isPhone && styles.panelPhone]}>
          <Text style={styles.sectionTitle}>Goleadores</Text>
          {topScorers.map((stat) => (
            <Text key={stat.playerId} style={styles.metric}>
              {playerLabel(stat.playerId)}: {stat.total}
            </Text>
          ))}
        </View>
        <View style={[styles.panel, isPhone && styles.panelPhone]}>
          <Text style={styles.sectionTitle}>Defensas</Text>
          {defensesByPlayer.map((stat) => (
            <Text key={stat.playerId} style={styles.metric}>
              {playerLabel(stat.playerId)}: {stat.total}
            </Text>
          ))}
        </View>
        <View style={[styles.panel, isPhone && styles.panelPhone]}>
          <Text style={styles.sectionTitle}>Faltas</Text>
          {errorBreakdown.filter((stat) => stat.faltas > 0).map((stat) => (
            <Text key={stat.playerId} style={styles.metric}>
              {playerLabel(stat.playerId)}: {stat.faltas}
            </Text>
          ))}
        </View>
        <View style={[styles.panel, isPhone && styles.panelPhone]}>
          <Text style={styles.sectionTitle}>Puntos en contra</Text>
          {errorBreakdown.filter((stat) => stat.puntosEnContra > 0).map((stat) => (
            <Text key={stat.playerId} style={styles.metric}>
              {playerLabel(stat.playerId)}: {stat.puntosEnContra}
            </Text>
          ))}
        </View>
        <View style={[styles.panel, isPhone && styles.panelPhone]}>
          <Text style={styles.sectionTitle}>Errores por jugador</Text>
          {errorsByPlayer.map((stat) => (
            <Text key={stat.playerId} style={styles.metric}>
              {playerLabel(stat.playerId)}: {stat.total}
            </Text>
          ))}
        </View>
        <View style={[styles.panel, isPhone && styles.panelPhone]}>
          <Text style={styles.sectionTitle}>Puntos por zona</Text>
          {pointsByZone.map((stat) => (
            <Text key={stat.zone} style={styles.metric}>{zoneLabel[stat.zone]}: {stat.total}</Text>
          ))}
        </View>
        <View style={[styles.panel, isPhone && styles.panelPhone]}>
          <Text style={styles.sectionTitle}>Zonas del rival</Text>
          {opponentPointsByZone.map((stat) => (
            <Text key={stat.zone} style={styles.metric}>{zoneLabel[stat.zone]}: {stat.total}</Text>
          ))}
        </View>
        <View style={[styles.panel, isPhone && styles.panelPhone]}>
          <Text style={styles.sectionTitle}>Formación actual</Text>
          {plusMinusByLineup.map((stat) => (
            <Text key={stat.lineupSnapshotId} style={styles.metric}>
              {stat.playerIds.length} jugadores: {stat.plusMinus}
            </Text>
          ))}
        </View>
      </View>

      <ActionButton label="Abrir partido en vivo" onPress={() => navigation.navigate('LiveMatch', { matchId: match.id })} />

      <View style={styles.eventList}>
        <Text style={styles.sectionTitle}>Lecturas tácticas</Text>
        {insights.length === 0 ? (
          <Text style={styles.empty}>Todavía no hay lecturas tácticas.</Text>
        ) : (
          insights.map((insight) => (
            <View key={insight.id} style={[styles.insightCard, styles[`${insight.severity}Insight`]]}>
              <Text style={styles.insightSeverity}>{insight.severity === 'critical' ? 'CRÍTICO' : insight.severity === 'warning' ? 'ATENCIÓN' : 'INFO'}</Text>
              <Text style={styles.insightTitle}>{insight.title}</Text>
              <Text style={styles.insightDescription}>{insight.description}</Text>
              <Text style={styles.insightAction}>{insight.suggestedAction}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.eventList}>
        <Text style={styles.sectionTitle}>Últimas acciones</Text>
        {match.events.length === 0 ? (
          <Text style={styles.empty}>Todavía no hay acciones registradas.</Text>
        ) : (
          match.events.slice(0, 12).map((event) => {
            const player = 'playerId' in event && event.playerId ? playerById.get(event.playerId) : undefined;

            return (
              <View key={event.id} style={styles.eventRow}>
                <Text style={styles.eventType}>{eventKindLabel(event)}</Text>
                <Text style={styles.eventMeta}>
                  P{event.clock.period}{player ? ` - #${player.number} ${player.lastName || player.firstName}` : ''}
                </Text>
              </View>
            );
          })
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 6,
  },
  kicker: {
    color: '#0b6bcb',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  title: {
    color: '#0b1f33',
    fontSize: fontSize.title,
    fontWeight: '900',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  panel: {
    minWidth: 160,
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  panelPhone: {
    minWidth: '100%',
  },
  metric: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
  },
  eventList: {
    gap: spacing.sm,
  },
  insightCard: {
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderLeftWidth: 6,
    borderWidth: 1,
    borderColor: '#dbe4ef',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  infoInsight: {
    borderLeftColor: '#0b6bcb',
  },
  warningInsight: {
    borderLeftColor: '#b7791f',
  },
  criticalInsight: {
    borderLeftColor: '#b42318',
  },
  insightSeverity: {
    color: '#5d6b7a',
    fontSize: fontSize.tiny,
    fontWeight: '900',
  },
  insightTitle: {
    color: '#0b1f33',
    fontSize: fontSize.body,
    fontWeight: '900',
  },
  insightDescription: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
  },
  insightAction: {
    color: '#0b1f33',
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  sectionTitle: {
    color: '#0b1f33',
    fontSize: fontSize.section,
    fontWeight: '800',
  },
  empty: {
    color: '#5d6b7a',
  },
  eventRow: {
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    padding: spacing.sm,
  },
  eventType: {
    color: '#0b1f33',
    fontWeight: '900',
  },
  eventMeta: {
    color: '#5d6b7a',
    marginTop: 2,
  },
});
