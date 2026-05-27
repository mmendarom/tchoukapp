import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { CourtMapSummary } from '../components/CourtMapSummary';
import { Screen } from '../components/Screen';
import { groupOpponentPointsByZone, groupPointsByZone } from '../domain/court';
import { createTacticalInsights } from '../domain/insights';
import {
  calculateTotalScore,
  getErrorsByPlayer,
  getPointsByPlayer,
  getScoreByPeriod,
  getSubstitutions,
} from '../domain/periodStats';
import { useMatchStore } from '../store/useMatchStore';
import { RootStackParamList } from '../utils/navigation';
import { fontSize, spacing } from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'FinalSummary'>;

export function FinalSummaryScreen({ route }: Props) {
  const matches = useMatchStore((state) => state.matches);
  const players = useMatchStore((state) => state.players);
  const updateMatchNotes = useMatchStore((state) => state.updateMatchNotes);
  const match = matches.find((item) => item.id === route.params.matchId);

  if (!match) {
    return (
      <Screen>
        <Text style={styles.title}>No se encontro el partido</Text>
      </Screen>
    );
  }

  const playerName = (playerId: string) => {
    const player = players.find((item) => item.id === playerId);
    return player ? player.lastName || player.firstName : playerId;
  };
  const totalScore = calculateTotalScore(match.events);
  const scoreByPeriod = getScoreByPeriod(match.events);
  const scorers = getPointsByPlayer(match.events);
  const errors = getErrorsByPlayer(match.events);
  const zones = groupPointsByZone(match.events);
  const opponentZones = groupOpponentPointsByZone(match.events);
  const substitutions = getSubstitutions(match.events);
  const insights = createTacticalInsights({
    events: match.events,
    lineupSnapshots: match.lineupSnapshots,
    players,
    opponentName: match.opponent,
  });

  return (
    <Screen>
      <Text style={styles.title}>Resumen final del partido</Text>
      <View style={styles.card}>
        <Text style={styles.score}>Uruguay {totalScore.uruguay} - {totalScore.opponent} {match.opponent}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Resultado por tiempos</Text>
        {scoreByPeriod.map((item) => (
          <Text key={item.periodNumber} style={styles.metric}>
            Tiempo {item.periodNumber}: Uruguay {item.score.uruguay} - {item.score.opponent}
          </Text>
        ))}
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Alertas tacticas generales</Text>
        {insights.length === 0 ? (
          <Text style={styles.metric}>Sin lecturas tacticas.</Text>
        ) : (
          insights.map((insight) => (
            <View key={insight.id} style={styles.insight}>
              <Text style={styles.insightTitle}>{insight.title}</Text>
              <Text style={styles.metric} numberOfLines={2}>{insight.description}</Text>
              <Text style={styles.action} numberOfLines={2}>{insight.suggestedAction}</Text>
            </View>
          ))
        )}
      </View>
      <CourtMapSummary title="Mapa general: nuestros puntos" events={match.events} team="uruguay" />
      <CourtMapSummary title="Mapa general: puntos recibidos" events={match.events} team="opponent" />
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Goleadores</Text>
        {scorers.map((stat) => <Text key={stat.playerId} style={styles.metric}>{playerName(stat.playerId)}: {stat.total}</Text>)}
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Errores</Text>
        {errors.map((stat) => <Text key={stat.playerId} style={styles.metric}>{playerName(stat.playerId)}: {stat.total}</Text>)}
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Zonas efectivas</Text>
        {zones.length === 0 ? <Text style={styles.metric}>Sin ubicacion registrada.</Text> : zones.map((stat) => (
          <Text key={stat.label} style={styles.metric}>{stat.label}: {stat.total}</Text>
        ))}
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Zonas vulnerables</Text>
        {opponentZones.length === 0 ? <Text style={styles.metric}>Sin ubicacion registrada.</Text> : opponentZones.map((stat) => (
          <Text key={stat.label} style={styles.metric}>{stat.label}: {stat.total}</Text>
        ))}
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Cambios</Text>
        <Text style={styles.metric}>{substitutions.length} cambios registrados.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Notas finales</Text>
        <TextInput
          multiline
          value={match.notes ?? ''}
          onChangeText={(value) => updateMatchNotes(match.id, value)}
          placeholder="Agregar observaciones..."
          style={styles.notes}
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Exportar</Text>
        <Text style={styles.metric}>Exportacion pendiente para una proxima iteracion.</Text>
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
  notes: {
    minHeight: 96,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    padding: spacing.sm,
    color: '#0b1f33',
    textAlignVertical: 'top',
  },
});
