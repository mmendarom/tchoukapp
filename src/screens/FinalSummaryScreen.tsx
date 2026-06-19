import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Share, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { CourtMapSummary } from '../components/CourtMapSummary';
import { PlayerPerformanceBars } from '../components/PlayerPerformanceBars';
import { Screen } from '../components/Screen';
import { InsightCard } from '../domain/insights';
import { normalizeOpponentName } from '../domain/opponent';
import { groupOpponentDefensesByTacticalSector, groupOpponentPointsByTacticalSector, groupPointsByZone } from '../domain/court';
import { buildPlayerPerformance } from '../domain/playerPerformance';
import { buildMatchReportData } from '../domain/reportData';
import { exportMatchReportPdf } from '../export/exportMatchReport';
import { buildMatchReportText } from '../export/reportHtml';
import {
  calculateTotalScore,
  getDefensesByPlayer,
  getErrorsByPlayer,
  getErrorsByTypeByPlayer,
  getLineupSwaps,
  getOpponentOwnPoints,
  getOpponentDefenses,
  getPointsByPlayer,
  getScoreByPeriod,
  getSubstitutions,
} from '../domain/periodStats';
import { useMatchStore } from '../store/useMatchStore';
import { RootStackParamList } from '../utils/navigation';
import { fontSize, spacing } from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'FinalSummary'>;

export function FinalSummaryScreen({ navigation, route }: Props) {
  const { width } = useWindowDimensions();
  const isWide = width >= 760;
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | undefined>();
  const matches = useMatchStore((state) => state.matches);
  const players = useMatchStore((state) => state.players);
  const updateMatchNotes = useMatchStore((state) => state.updateMatchNotes);
  const match = matches.find((item) => item.id === route.params.matchId);
  const reportData = useMemo(() => (match ? buildMatchReportData(match, players) : undefined), [match, players]);

  const shareTextReport = async () => {
    if (!reportData) {
      return;
    }

    try {
      await Share.share({
        title: 'Reporte del partido',
        message: buildMatchReportText(reportData),
      });
      setExportMessage('Resumen compartido');
    } catch {
      setExportMessage('No se pudo compartir el resumen');
    }
  };

  const exportPdfReport = async () => {
    if (!reportData) {
      return;
    }

    setExporting(true);
    setExportMessage('Generando reporte...');

    try {
      const result = await exportMatchReportPdf(reportData);
      setExportMessage(result.shared ? 'Reporte generado' : 'Reporte generado, compartir no disponible');
    } catch {
      setExportMessage('No se pudo generar el reporte');
      await shareTextReport();
    } finally {
      setExporting(false);
    }
  };

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
  const opponentName = normalizeOpponentName(match.opponent);
  const scoreByPeriod = getScoreByPeriod(match.events);
  const scorers = getPointsByPlayer(match.events);
  const errors = getErrorsByPlayer(match.events);
  const errorBreakdown = getErrorsByTypeByPlayer(match.events);
  const defenses = getDefensesByPlayer(match.events);
  const opponentDefenses = getOpponentDefenses(match.events);
  const opponentOwnPoints = getOpponentOwnPoints(match.events);
  const playerPerformance = buildPlayerPerformance(match.events, players);
  const zones = groupPointsByZone(match.events);
  const opponentZones = groupOpponentPointsByTacticalSector(match.events);
  const defendedZones = groupOpponentDefensesByTacticalSector(match.events);
  const substitutions = getSubstitutions(match.events);
  const lineupSwaps = getLineupSwaps(match.events);
  const attackTotal = scorers.reduce((sum, stat) => sum + stat.total, 0);
  const defenseTotal = defenses.reduce((sum, stat) => sum + stat.total, 0);
  const errorsTotal = errors.reduce((sum, stat) => sum + stat.total, 0);
  const teamGoals = playerPerformance.rows.reduce((sum, row) => sum + row.points, 0);
  const teamShotAttempts = playerPerformance.rows.reduce((sum, row) => sum + row.shotAttempts, 0);
  const teamEffectiveness = teamShotAttempts > 0 ? `${Math.round((teamGoals / teamShotAttempts) * 100)}%` : 'Sin tiros';
  const finalInsights = reportData?.totals.insights ?? [];
  const effectivenessRows = reportData?.totals.effectiveness ?? [];

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>Resumen final del partido</Text>
        <Text style={styles.heroScore}>Uruguay {totalScore.uruguay} - {totalScore.opponent} {opponentName}</Text>
      </View>
      <View style={[styles.statGrid, isWide && styles.statGridWide]}>
        <SummaryStatCard accentColor="#0b6bcb" label="Ataque" value={`${attackTotal}`} detail="puntos Uruguay" />
        <SummaryStatCard accentColor="#0f766e" label="Defensa" value={`${defenseTotal}`} detail="defensas" />
        <SummaryStatCard accentColor="#b45309" label="Errores" value={`${errorsTotal}`} detail="propios" />
        <SummaryStatCard accentColor="#6d28d9" label="Efectividad" value={teamEffectiveness} detail={`${teamGoals}/${teamShotAttempts} en tiros`} />
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
        <Text style={styles.sectionTitle}>Lectura final</Text>
        {finalInsights.length === 0 ? (
          <Text style={styles.metric}>Sin alertas tácticas relevantes.</Text>
        ) : (
          finalInsights.map((insight) => <InsightRow key={insight.id} insight={insight} />)
        )}
      </View>
      <PlayerPerformanceBars data={playerPerformance} title="Rendimiento total" />
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Efectividad ofensiva total</Text>
        {effectivenessRows.length === 0 ? <Text style={styles.metric}>Sin tiros registrados.</Text> : effectivenessRows.map((row) => (
          <Text key={row.playerId} style={styles.metric}>
            {row.playerName}: {row.goals}/{row.shotAttempts} tiros · {Math.round(row.effectiveness * 100)}% · {row.rivalDefendedShots} atajados
          </Text>
        ))}
      </View>
      <CourtMapSummary title="Dónde hicimos los puntos" events={match.events} team="uruguay" />
      <CourtMapSummary title="Dónde nos hicieron puntos" events={match.events} team="opponent" />
      <CourtMapSummary title="Dónde nos defendieron" events={match.events} source="opponent_defenses" />
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Goleadores</Text>
        {scorers.map((stat) => <Text key={stat.playerId} style={styles.metric}>{playerName(stat.playerId)}: {stat.total}</Text>)}
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Defensas Uruguay</Text>
        {defenses.length === 0 ? <Text style={styles.metric}>Sin defensas registradas.</Text> : defenses.map((stat) => (
          <Text key={stat.playerId} style={styles.metric}>{playerName(stat.playerId)}: {stat.total}</Text>
        ))}
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Defensas del rival</Text>
        <Text style={styles.metric}>{opponentDefenses.length}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Faltas totales</Text>
        {errorBreakdown.filter((stat) => stat.faltas > 0).length === 0 ? <Text style={styles.metric}>Sin faltas registradas.</Text> : errorBreakdown.filter((stat) => stat.faltas > 0).map((stat) => (
          <Text key={stat.playerId} style={styles.metric}>{playerName(stat.playerId)}: {stat.faltas}</Text>
        ))}
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Puntos en contra totales</Text>
        {errorBreakdown.filter((stat) => stat.puntosEnContra > 0).length === 0 ? <Text style={styles.metric}>Sin puntos en contra.</Text> : errorBreakdown.filter((stat) => stat.puntosEnContra > 0).map((stat) => (
          <Text key={stat.playerId} style={styles.metric}>{playerName(stat.playerId)}: {stat.puntosEnContra}</Text>
        ))}
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Puntos en contra del rival totales</Text>
        <Text style={styles.metric}>{opponentOwnPoints}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Errores</Text>
        {errors.length === 0 ? <Text style={styles.metric}>Sin errores registrados.</Text> : errors.map((stat) => <Text key={stat.playerId} style={styles.metric}>{playerName(stat.playerId)}: {stat.total}</Text>)}
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Zonas efectivas</Text>
        {zones.length === 0 ? <Text style={styles.metric}>Sin ubicacion registrada.</Text> : zones.map((stat) => (
          <Text key={stat.label} style={styles.metric}>{stat.label}: {stat.total}</Text>
        ))}
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Zonas donde nos entraron</Text>
        {opponentZones.length === 0 ? <Text style={styles.metric}>Sin ubicacion registrada.</Text> : opponentZones.map((stat) => (
          <Text key={stat.label} style={styles.metric}>{stat.label}: {stat.total}</Text>
        ))}
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Zonas donde nos defendieron</Text>
        {defendedZones.length === 0 ? <Text style={styles.metric}>Sin ubicaciones registradas.</Text> : defendedZones.map((stat) => (
          <Text key={stat.label} style={styles.metric}>{stat.label}: {stat.total}</Text>
        ))}
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Cambios</Text>
        <Text style={styles.metric}>{substitutions.length} cambios y {lineupSwaps.length} intercambios en cancha registrados.</Text>
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
        <View style={styles.exportActions}>
          <ActionButton label={exporting ? 'Generando reporte...' : 'Exportar reporte PDF'} onPress={exportPdfReport} disabled={exporting} />
          <ActionButton label="Compartir resumen" onPress={shareTextReport} variant="secondary" disabled={exporting} />
        </View>
        {exportMessage ? <Text style={styles.metric}>{exportMessage}</Text> : null}
      </View>
      <View style={styles.card}>
        <ActionButton label="Volver al inicio" onPress={() => navigation.navigate('Home')} variant="secondary" />
      </View>
    </Screen>
  );
}

function InsightRow({ insight }: { insight: InsightCard }) {
  const visual = insight.severity === 'critical'
    ? { label: 'Atención', color: '#b42318', backgroundColor: '#fff7ed' }
    : insight.severity === 'warning'
      ? { label: 'Ajuste', color: '#0b6bcb', backgroundColor: '#f0f7ff' }
      : { label: 'Dato', color: '#0f766e', backgroundColor: '#f0fdfa' };

  return (
    <View style={[styles.insight, { backgroundColor: visual.backgroundColor, borderLeftColor: visual.color }]}>
      <Text style={[styles.insightBadge, { color: visual.color, borderColor: visual.color }]}>{visual.label}</Text>
      <Text style={styles.insightTitle}>{insight.title}</Text>
      <Text style={styles.metric} numberOfLines={2}>{insight.description}</Text>
      <Text style={styles.action} numberOfLines={2}>{insight.suggestedAction}</Text>
    </View>
  );
}

function SummaryStatCard({
  accentColor,
  detail,
  label,
  value,
}: {
  accentColor: string;
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statAccent, { backgroundColor: accentColor }]} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: accentColor }]}>{value}</Text>
      <Text style={styles.statDetail}>{detail}</Text>
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
  heroEyebrow: {
    color: '#8bd3ff',
    fontSize: fontSize.small,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  heroScore: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
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
  notes: {
    minHeight: 96,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    padding: spacing.sm,
    color: '#0b1f33',
    textAlignVertical: 'top',
  },
  exportActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
