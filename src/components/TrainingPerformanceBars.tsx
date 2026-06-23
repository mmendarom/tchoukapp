import { memo } from 'react';
import { DimensionValue, StyleSheet, Text, View } from 'react-native';

import {
  TrainingPerformanceAttackRow,
  TrainingPerformanceData,
  TrainingPerformanceDefenseRow,
} from '../domain/trainingPerformance';
import { fontSize, spacing } from '../utils/responsive';

type TrainingPerformanceBarsProps = {
  data: TrainingPerformanceData;
  title?: string;
};

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;
const formatEffectiveness = (value: number | undefined) => typeof value === 'number' ? formatPercent(value) : 'Sin tiros';
const clampShare = (value: number) => Math.max(Math.min(value, 1), 0);
const plural = (value: number, singular: string, pluralLabel: string) => `${value} ${value === 1 ? singular : pluralLabel}`;

export const TrainingPerformanceBars = memo(function TrainingPerformanceBars({
  data,
  title = 'Rendimiento jugadores',
}: TrainingPerformanceBarsProps) {
  const hasAttackStats = data.totalAttempts > 0;
  const hasDefenseStats = data.totalDefenses > 0;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.columns}>
        <View style={[styles.column, styles.attackColumn]}>
          <View style={styles.columnHeader}>
            <View style={[styles.columnAccent, styles.attackAccent]} />
            <Text style={styles.columnTitle}>Ataque</Text>
            <Text style={styles.attackTotal}>Pts {data.totalPoints} · Tiros {data.totalAttempts}</Text>
          </View>
          {!hasAttackStats ? (
            <Text style={styles.emptyText}>Sin tiros registrados.</Text>
          ) : data.attackRows.map((row) => (
            <AttackRow
              key={`attack-${row.playerId}`}
              isTop={data.topAttackPlayerIds.has(row.playerId)}
              row={row}
              totalAttempts={data.totalAttempts}
            />
          ))}
        </View>

        <View style={[styles.column, styles.defenseColumn]}>
          <View style={styles.columnHeader}>
            <View style={[styles.columnAccent, styles.defenseAccent]} />
            <Text style={styles.columnTitle}>Defensa</Text>
            <Text style={styles.defenseTotal}>Total {data.totalDefenses}</Text>
          </View>
          {!hasDefenseStats ? (
            <Text style={styles.emptyText}>Sin defensas registradas.</Text>
          ) : data.defenseRows.map((row) => (
            <DefenseRow
              key={`defense-${row.playerId}`}
              isTop={data.topDefensePlayerIds.has(row.playerId)}
              row={row}
            />
          ))}
        </View>
      </View>
    </View>
  );
});

function AttackRow({
  isTop,
  row,
  totalAttempts,
}: {
  isTop: boolean;
  row: TrainingPerformanceAttackRow;
  totalAttempts: number;
}) {
  const attemptShare = totalAttempts > 0 ? row.attempts / totalAttempts : 0;
  const pointShare = totalAttempts > 0 ? row.points / totalAttempts : 0;
  const attemptBarWidth = `${clampShare(attemptShare) * 100}%` as DimensionValue;
  const pointBarWidth = `${clampShare(pointShare) * 100}%` as DimensionValue;
  const defendedText = row.shotsDefended > 0 ? plural(row.shotsDefended, 'atajado', 'atajados') : '';
  const missedText = row.ownPointsAgainst > 0 ? plural(row.ownPointsAgainst, 'errado', 'errados') : '';
  const breakdown = [defendedText, missedText].filter(Boolean).join(' · ');

  return (
    <View style={[styles.row, isTop && styles.attackTopRow]}>
      <View style={styles.rowHeader}>
        <View style={styles.playerNameWrap}>
          <Text numberOfLines={1} style={styles.playerName}>{row.playerName}</Text>
          {isTop && <Text style={[styles.topBadge, styles.attackTopBadge]}>Top</Text>}
        </View>
        <Text adjustsFontSizeToFit numberOfLines={1} style={styles.countText}>
          {row.points}/{row.attempts} tiros · {formatEffectiveness(row.effectiveness)}
        </Text>
      </View>
      {row.teamName ? <Text numberOfLines={1} style={styles.teamText}>{row.teamName}</Text> : null}
      {breakdown ? <Text adjustsFontSizeToFit numberOfLines={1} style={styles.breakdownText}>{breakdown}</Text> : null}
      <View style={[styles.track, styles.attackTrack]}>
        <View style={[styles.attemptBar, { width: attemptBarWidth }]} />
        <View style={[styles.bar, styles.attackBar, isTop && styles.topBar, { width: pointBarWidth }]} />
      </View>
    </View>
  );
}

function DefenseRow({
  isTop,
  row,
}: {
  isTop: boolean;
  row: TrainingPerformanceDefenseRow;
}) {
  const barWidth = `${clampShare(row.defenseShare) * 100}%` as DimensionValue;

  return (
    <View style={[styles.row, isTop && styles.defenseTopRow]}>
      <View style={styles.rowHeader}>
        <View style={styles.playerNameWrap}>
          <Text numberOfLines={1} style={styles.playerName}>{row.playerName}</Text>
          {isTop && <Text style={[styles.topBadge, styles.defenseTopBadge]}>Top</Text>}
        </View>
        <Text adjustsFontSizeToFit numberOfLines={1} style={styles.countText}>
          {plural(row.defenses, 'defensa', 'defensas')} · {formatPercent(row.defenseShare)}
        </Text>
      </View>
      {row.teamName ? <Text numberOfLines={1} style={styles.teamText}>{row.teamName}</Text> : null}
      <View style={[styles.track, styles.defenseTrack]}>
        <View style={[styles.bar, styles.defenseBar, isTop && styles.topBar, { width: barWidth }]} />
      </View>
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
    gap: spacing.sm,
  },
  title: {
    color: '#0b1f33',
    fontSize: fontSize.section,
    fontWeight: '900',
  },
  columns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  column: {
    flex: 1,
    minWidth: 220,
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  attackColumn: {
    backgroundColor: '#f0f7ff',
    borderColor: '#d9ebff',
  },
  defenseColumn: {
    backgroundColor: '#f0fdfa',
    borderColor: '#ccfbf1',
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  columnAccent: {
    width: 6,
    height: 18,
    borderRadius: 8,
  },
  attackAccent: {
    backgroundColor: '#0b6bcb',
  },
  defenseAccent: {
    backgroundColor: '#0f766e',
  },
  columnTitle: {
    flex: 1,
    color: '#0b1f33',
    fontSize: fontSize.body,
    fontWeight: '900',
  },
  attackTotal: {
    color: '#0b6bcb',
    fontSize: fontSize.tiny,
    fontWeight: '900',
  },
  defenseTotal: {
    color: '#0f766e',
    fontSize: fontSize.tiny,
    fontWeight: '900',
  },
  emptyText: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  row: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    padding: 2,
    gap: 3,
  },
  attackTopRow: {
    borderColor: '#0b6bcb',
    backgroundColor: '#ffffff',
  },
  defenseTopRow: {
    borderColor: '#0f766e',
    backgroundColor: '#ffffff',
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  playerNameWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  playerName: {
    color: '#0b1f33',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  topBadge: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: fontSize.tiny,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  attackTopBadge: {
    borderColor: '#0b6bcb',
    color: '#0b6bcb',
  },
  defenseTopBadge: {
    borderColor: '#0f766e',
    color: '#0f766e',
  },
  countText: {
    color: '#5d6b7a',
    fontSize: fontSize.tiny,
    fontWeight: '900',
  },
  teamText: {
    color: '#7a8794',
    fontSize: fontSize.tiny,
    fontWeight: '800',
  },
  breakdownText: {
    color: '#7c4a03',
    fontSize: fontSize.tiny,
    fontWeight: '800',
    textAlign: 'right',
  },
  track: {
    height: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  attackTrack: {
    backgroundColor: '#d9ebff',
  },
  defenseTrack: {
    backgroundColor: '#ccfbf1',
  },
  attemptBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    top: 0,
    backgroundColor: '#8bd3ff',
    borderRadius: 8,
  },
  bar: {
    height: '100%',
    borderRadius: 8,
  },
  attackBar: {
    backgroundColor: '#0b6bcb',
  },
  defenseBar: {
    backgroundColor: '#0f766e',
  },
  topBar: {
    minWidth: 8,
  },
});
