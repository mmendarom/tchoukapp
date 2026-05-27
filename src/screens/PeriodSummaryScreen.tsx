import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { CourtMapSummary } from '../components/CourtMapSummary';
import { Screen } from '../components/Screen';
import {
  groupOpponentPointsByZone,
  groupPointsByZone,
} from '../domain/court';
import {
  calculatePeriodScore,
  calculateTotalScore,
  formatPeriodName,
  generatePeriodInsights,
  getErrorsByPlayerByPeriod,
  getSubstitutionsByPeriod,
  getTopScorersByPeriod,
  getEventsByPeriod,
} from '../domain/periodStats';
import { useMatchStore } from '../store/useMatchStore';
import { RootStackParamList } from '../utils/navigation';
import { fontSize, spacing } from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'PeriodSummary'>;

export function PeriodSummaryScreen({ navigation, route }: Props) {
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
  const scorers = getTopScorersByPeriod(match.events, periodNumber);
  const errors = getErrorsByPlayerByPeriod(match.events, periodNumber);
  const substitutions = getSubstitutionsByPeriod(match.events, periodNumber);
  const periodEvents = getEventsByPeriod(match.events, periodNumber);
  const effectiveZones = groupPointsByZone(periodEvents);
  const vulnerableZones = groupOpponentPointsByZone(periodEvents);
  const previousErrors = periodNumber > 1 ? getErrorsByPlayerByPeriod(match.events, (periodNumber - 1) as 1 | 2).reduce((sum, stat) => sum + stat.total, 0) : undefined;
  const currentErrors = errors.reduce((sum, stat) => sum + stat.total, 0);
  const previousOpponentCentral = periodNumber > 1
    ? groupOpponentPointsByZone(getEventsByPeriod(match.events, (periodNumber - 1) as 1 | 2)).find((stat) => stat.label === 'Zona central')?.total ?? 0
    : undefined;
  const currentOpponentCentral = vulnerableZones.find((stat) => stat.label === 'Zona central')?.total ?? 0;
  const insights = generatePeriodInsights(match, periodNumber, playerName);

  return (
    <Screen>
      <Text style={styles.title}>Resumen del tiempo</Text>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{formatPeriodName(periodNumber)}</Text>
        <Text style={styles.score}>Uruguay {periodScore.uruguay} - {periodScore.opponent} {match.opponent}</Text>
        <Text style={styles.metric}>Global: Uruguay {totalScore.uruguay} - {totalScore.opponent} {match.opponent}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Lecturas tácticas</Text>
        {insights.length === 0 ? <Text style={styles.metric}>Sin alertas tácticas para este tiempo.</Text> : insights.map((insight) => (
          <View key={`${insight.title}-${insight.description}`} style={styles.insight}>
            <Text style={styles.insightBadge}>{insight.severity === 'critical' ? '!' : insight.severity === 'warning' ? 'AT' : 'OK'}</Text>
            <Text style={styles.insightTitle}>{insight.title}</Text>
            <Text style={styles.metric} numberOfLines={2}>{insight.description}</Text>
            <Text style={styles.action} numberOfLines={2}>{insight.suggestedAction}</Text>
          </View>
        ))}
      </View>

      <CourtMapSummary title="Dónde hicimos los puntos" events={periodEvents} team="uruguay" />
      <CourtMapSummary title="Dónde nos hicieron puntos" events={periodEvents} team="opponent" />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Goleadores del tiempo</Text>
        {scorers.length === 0 ? <Text style={styles.metric}>Sin puntos de Uruguay.</Text> : scorers.map((stat) => (
          <Text key={stat.playerId} style={styles.metric}>{playerName(stat.playerId)}: {stat.total}</Text>
        ))}
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

      {periodNumber > 1 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Comparación con el tiempo anterior</Text>
          <Text style={styles.metric}>
            {previousErrors !== undefined && currentErrors < previousErrors
              ? `Mejoramos en errores propios: ${previousErrors} a ${currentErrors}`
              : `Errores propios: ${previousErrors ?? 0} a ${currentErrors}`}
          </Text>
          <Text style={styles.metric}>
            Nos anotaron por zona central: {previousOpponentCentral ?? 0} a {currentOpponentCentral}
          </Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Cambios</Text>
        <Text style={styles.metric}>{substitutions.length} cambios en este tiempo.</Text>
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

const styles = StyleSheet.create({
  title: {
    color: '#0b1f33',
    fontSize: fontSize.title,
    fontWeight: '900',
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
    backgroundColor: '#f4f7fb',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  insightBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    backgroundColor: '#e7eef7',
    color: '#0b1f33',
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
});
