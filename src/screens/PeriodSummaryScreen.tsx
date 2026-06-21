import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { CourtMapSummary } from '../components/CourtMapSummary';
import { PlayerPerformanceBars } from '../components/PlayerPerformanceBars';
import { Screen } from '../components/Screen';
import {
  groupOpponentDefensesByTacticalSector,
  groupOpponentPointsByTacticalSector,
  groupPointsByZone,
} from '../domain/court';
import { buildLiveRecommendations } from '../domain/liveRecommendations';
import type { LiveRecommendation } from '../domain/liveRecommendations';
import { normalizeOpponentName } from '../domain/opponent';
import {
  calculatePeriodScore,
  calculateTotalScore,
  formatPeriodName,
  getDefensesByPlayerByPeriod,
  getErrorsByPlayerByPeriod,
  getErrorsByTypeByPlayerByPeriod,
  getSubstitutionsByPeriod,
  getLineupSwapsByPeriod,
  getTopScorersByPeriod,
  getEventsByPeriod,
  getOpponentOwnPointsByPeriod,
  getOpponentDefensesByPeriod,
} from '../domain/periodStats';
import { buildPlayerPerformanceForPeriod } from '../domain/playerPerformance';
import { getOwnTeamDisplayName } from '../domain/teamLabels';
import { useMatchStore } from '../store/useMatchStore';
import { RootStackParamList } from '../utils/navigation';
import { fontSize, spacing } from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'PeriodSummary'>;

export function PeriodSummaryScreen({ navigation, route }: Props) {
  const { width } = useWindowDimensions();
  const isWide = width >= 760;
  const matches = useMatchStore((state) => state.matches);
  const players = useMatchStore((state) => state.players);
  const advancePeriod = useMatchStore((state) => state.advancePeriod);
  const startCurrentPeriod = useMatchStore((state) => state.startCurrentPeriod);
  const completeActiveMatch = useMatchStore((state) => state.completeActiveMatch);
  const match = matches.find((item) => item.id === route.params.matchId);

  if (!match) {
    return (
      <Screen>
        <Text style={styles.title}>No se encontró el partido</Text>
      </Screen>
    );
  }

  const playerName = (playerId: string) => {
    const player = players.find((item) => item.id === playerId);
    return player ? player.lastName || player.firstName : playerId;
  };
  const periodNumber = route.params.periodNumber;
  const periodScore = calculatePeriodScore(match.events, periodNumber);
  const totalScore = calculateTotalScore(match.events);
  const opponentName = normalizeOpponentName(match.opponent);
  const ownTeamName = getOwnTeamDisplayName(match);
  const scorers = getTopScorersByPeriod(match.events, periodNumber);
  const errors = getErrorsByPlayerByPeriod(match.events, periodNumber);
  const errorBreakdown = getErrorsByTypeByPlayerByPeriod(match.events, periodNumber);
  const defenses = getDefensesByPlayerByPeriod(match.events, periodNumber);
  const substitutions = getSubstitutionsByPeriod(match.events, periodNumber);
  const lineupSwaps = getLineupSwapsByPeriod(match.events, periodNumber);
  const opponentOwnPoints = getOpponentOwnPointsByPeriod(match.events, periodNumber);
  const opponentDefenses = getOpponentDefensesByPeriod(match.events, periodNumber);
  const periodEvents = getEventsByPeriod(match.events, periodNumber);
  const periodLineupPlayerIds = Array.from(new Set(
    match.lineupSnapshots
      .filter((lineup) => lineup.team === 'uruguay' && lineup.clock.period === periodNumber)
      .flatMap((lineup) => lineup.playerIds),
  ));
  const playerPerformance = buildPlayerPerformanceForPeriod(match.events, players, periodLineupPlayerIds, periodNumber);
  const effectiveZones = groupPointsByZone(periodEvents);
  const vulnerableZones = groupOpponentPointsByTacticalSector(periodEvents);
  const defendedZones = groupOpponentDefensesByTacticalSector(periodEvents);
  const previousErrors = periodNumber > 1 ? getErrorsByPlayerByPeriod(match.events, (periodNumber - 1) as 1 | 2).reduce((sum, stat) => sum + stat.total, 0) : undefined;
  const currentErrors = errors.reduce((sum, stat) => sum + stat.total, 0);
  const periodRecommendations = buildLiveRecommendations({
    currentLineupPlayerIds: periodLineupPlayerIds,
    events: periodEvents,
    maxRecommendations: 8,
    players,
  });
  const attackTotal = scorers.reduce((sum, stat) => sum + stat.total, 0);
  const defenseTotal = defenses.reduce((sum, stat) => sum + stat.total, 0);
  const teamGoals = playerPerformance.rows.reduce((sum, row) => sum + row.points, 0);
  const teamShotAttempts = playerPerformance.rows.reduce((sum, row) => sum + row.shotAttempts, 0);
  const teamEffectiveness = teamShotAttempts > 0 ? `${Math.round((teamGoals / teamShotAttempts) * 100)}%` : 'Sin tiros';
  const resultLabel =
    periodScore.uruguay > periodScore.opponent
      ? 'Tiempo ganado'
      : periodScore.uruguay < periodScore.opponent
        ? 'Tiempo abajo'
        : 'Tiempo parejo';

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <Text style={styles.heroEyebrow}>Resumen del tiempo</Text>
          <Text style={styles.resultPill}>{resultLabel}</Text>
        </View>
        <Text style={styles.heroTitle}>{formatPeriodName(periodNumber)}</Text>
        <Text style={styles.heroScore}>{ownTeamName} {periodScore.uruguay} - {periodScore.opponent} {opponentName}</Text>
        <Text style={styles.heroMeta}>Global: {ownTeamName} {totalScore.uruguay} - {totalScore.opponent} {opponentName}</Text>
      </View>

      <View style={[styles.statGrid, isWide && styles.statGridWide]}>
        <SummaryStatCard accentColor="#0b6bcb" surfaceColor="#f0f7ff" label="Ataque" value={`${attackTotal}`} detail={`puntos ${ownTeamName}`} />
        <SummaryStatCard accentColor="#0f766e" surfaceColor="#f0fdfa" label="Defensa" value={`${defenseTotal}`} detail="defensas" />
        <SummaryStatCard accentColor="#b45309" surfaceColor="#fff7ed" label="Errores" value={`${currentErrors}`} detail="propios" />
        <SummaryStatCard accentColor="#6d28d9" surfaceColor="#f5f3ff" label="Efectividad" value={teamEffectiveness} detail={`${teamGoals}/${teamShotAttempts} en tiros`} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Lectura del tiempo</Text>
        {periodRecommendations.length === 0 ? <Text style={styles.metric}>Sin alertas tácticas relevantes en este tiempo.</Text> : periodRecommendations.map((recommendation) => (
          <InsightRow key={recommendation.id} recommendation={recommendation} />
        ))}
      </View>

      <PlayerPerformanceBars data={playerPerformance} title="Rendimiento del tiempo" />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderTitle}>Mapas del tiempo</Text>
      </View>
      <CourtMapSummary title="Dónde hicimos los puntos" events={periodEvents} team="uruguay" />
      <CourtMapSummary title="Dónde nos hicieron puntos" events={periodEvents} team="opponent" />
      <CourtMapSummary title="Dónde nos defendieron" events={periodEvents} source="opponent_defenses" />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Goleadores del tiempo</Text>
        {scorers.length === 0 ? <Text style={styles.metric}>Sin puntos de {ownTeamName}.</Text> : scorers.map((stat) => (
          <Text key={stat.playerId} style={styles.metric}>{playerName(stat.playerId)}: {stat.total}</Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Defensas {ownTeamName}</Text>
        {defenses.length === 0 ? <Text style={styles.metric}>Sin defensas registradas.</Text> : defenses.map((stat) => (
          <Text key={stat.playerId} style={styles.metric}>{playerName(stat.playerId)}: {stat.total}</Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Defensas del rival</Text>
        <Text style={styles.metric}>{opponentDefenses.length}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Faltas del tiempo</Text>
        {errorBreakdown.filter((stat) => stat.faltas > 0).length === 0 ? <Text style={styles.metric}>Sin faltas registradas.</Text> : errorBreakdown.filter((stat) => stat.faltas > 0).map((stat) => (
          <Text key={stat.playerId} style={styles.metric}>{playerName(stat.playerId)}: {stat.faltas}</Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Puntos en contra del tiempo</Text>
        {errorBreakdown.filter((stat) => stat.puntosEnContra > 0).length === 0 ? <Text style={styles.metric}>Sin puntos en contra.</Text> : errorBreakdown.filter((stat) => stat.puntosEnContra > 0).map((stat) => (
          <Text key={stat.playerId} style={styles.metric}>{playerName(stat.playerId)}: {stat.puntosEnContra}</Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Puntos en contra del rival</Text>
        <Text style={styles.metric}>{opponentOwnPoints}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Errores del tiempo</Text>
        {errors.length === 0 ? <Text style={styles.metric}>Sin errores propios registrados.</Text> : errors.map((stat) => (
          <Text key={stat.playerId} style={styles.metric}>{playerName(stat.playerId)}: {stat.total}</Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Zonas más efectivas</Text>
        {effectiveZones.length === 0 ? <Text style={styles.metric}>Sin ubicación registrada.</Text> : effectiveZones.map((stat) => (
          <Text key={stat.label} style={styles.metric}>{stat.label}: {stat.total}</Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Zonas vulnerables</Text>
        {vulnerableZones.length === 0 ? <Text style={styles.metric}>Sin ubicación registrada.</Text> : vulnerableZones.map((stat) => (
          <Text key={stat.label} style={styles.metric}>{stat.label}: {stat.total}</Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Zonas donde nos defendieron</Text>
        {defendedZones.length === 0 ? <Text style={styles.metric}>Sin ubicaciones registradas.</Text> : defendedZones.map((stat) => (
          <Text key={stat.label} style={styles.metric}>{stat.label}: {stat.total}</Text>
        ))}
      </View>

      {periodNumber > 1 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Comparación con el tiempo anterior</Text>
          <Text style={styles.metric}>
            {previousErrors !== undefined && currentErrors < previousErrors
              ? `Mejoramos en errores propios: ${previousErrors} a ${currentErrors}`
              : `Errores propios: ${previousErrors ?? 0} a ${currentErrors}`}
          </Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Cambios</Text>
        <Text style={styles.metric}>{substitutions.length} cambios y {lineupSwaps.length} intercambios en cancha en este tiempo.</Text>
      </View>

      <View style={styles.actions}>
        <ActionButton label="Ver estadísticas generales" onPress={() => navigation.navigate('MatchDashboard', { matchId: match.id })} variant="secondary" />
        <ActionButton label="Volver al partido" onPress={() => navigation.navigate('LiveMatch', { matchId: match.id })} variant="secondary" />
        {periodNumber < 3 ? (
          <ActionButton
            label="Iniciar siguiente tiempo"
            onPress={() => {
              advancePeriod();
              startCurrentPeriod();
              navigation.navigate('LiveMatch', { matchId: match.id });
            }}
          />
        ) : (
          <ActionButton
            label="Finalizar partido"
            onPress={() => {
              completeActiveMatch();
              navigation.navigate('FinalSummary', { matchId: match.id });
            }}
            variant="danger"
          />
        )}
      </View>
    </Screen>
  );
}

function SummaryStatCard({
  accentColor,
  detail,
  label,
  surfaceColor,
  value,
}: {
  accentColor: string;
  detail: string;
  label: string;
  surfaceColor: string;
  value: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: surfaceColor }]}>
      <View style={[styles.statAccent, { backgroundColor: accentColor }]} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: accentColor }]}>{value}</Text>
      <Text style={styles.statDetail}>{detail}</Text>
    </View>
  );
}

function InsightRow({
  recommendation,
}: {
  recommendation: LiveRecommendation;
}) {
  const visual = recommendation.type === 'warning'
    ? { label: 'Atención', color: '#b42318', backgroundColor: '#fff7ed' }
    : recommendation.type === 'adjustment'
      ? { label: 'Ajuste', color: '#0b6bcb', backgroundColor: '#f0f7ff' }
      : { label: 'Dato', color: '#0f766e', backgroundColor: '#f0fdfa' };

  return (
    <View style={[styles.insight, { backgroundColor: visual.backgroundColor, borderLeftColor: visual.color }]}>
      <Text style={[styles.insightBadge, { color: visual.color, borderColor: visual.color }]}>{visual.label}</Text>
      <Text style={styles.insightTitle}>{recommendation.title}</Text>
      {recommendation.detail && <Text style={styles.metric} numberOfLines={2}>{recommendation.detail}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    color: '#0b1f33',
    fontSize: fontSize.title,
    fontWeight: '900',
  },
  hero: {
    borderRadius: 8,
    backgroundColor: '#0b1f33',
    borderWidth: 1,
    borderColor: '#0b1f33',
    padding: spacing.md,
    gap: spacing.xs,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  heroEyebrow: {
    color: '#8bd3ff',
    fontSize: fontSize.small,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  resultPill: {
    borderRadius: 8,
    backgroundColor: '#ffffff',
    color: '#0b1f33',
    fontSize: fontSize.tiny,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: fontSize.title,
    fontWeight: '900',
  },
  heroScore: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
  },
  heroMeta: {
    color: '#d7e5f2',
    fontSize: fontSize.body,
    fontWeight: '800',
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statGridWide: {
    flexWrap: 'nowrap',
  },
  statCard: {
    flex: 1,
    minWidth: 145,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    padding: spacing.sm,
    gap: 2,
  },
  statAccent: {
    width: 30,
    height: 4,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  statLabel: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '900',
  },
  statDetail: {
    color: '#5d6b7a',
    fontSize: fontSize.tiny,
    fontWeight: '800',
  },
  card: {
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  sectionTitle: {
    color: '#0b1f33',
    fontSize: fontSize.section,
    fontWeight: '900',
  },
  score: {
    color: '#0b1f33',
    fontSize: 20,
    fontWeight: '900',
  },
  metric: {
    color: '#5d6b7a',
    fontSize: fontSize.body,
  },
  insight: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e3ebf4',
    borderLeftWidth: 4,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  insightBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    fontSize: fontSize.tiny,
    fontWeight: '900',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  insightTitle: {
    color: '#0b1f33',
    fontSize: fontSize.body,
    fontWeight: '900',
  },
  action: {
    color: '#0b1f33',
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sectionHeader: {
    borderRadius: 8,
    backgroundColor: '#eef6ff',
    borderWidth: 1,
    borderColor: '#cfe4ff',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  sectionHeaderTitle: {
    color: '#0b1f33',
    fontSize: fontSize.section,
    fontWeight: '900',
  },
});
