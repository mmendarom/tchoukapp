import { memo, useMemo } from 'react';
import { DimensionValue, StyleSheet, Text, View } from 'react-native';

import {
  getTopAttackPlayerIds,
  getTopDefensePlayerIds,
  PlayerPerformanceData,
  PlayerPerformanceRow,
  PlayerPerformanceSortMode,
  sortPlayerPerformanceRows,
} from '../domain/playerPerformance';
import { fontSize, spacing } from '../utils/responsive';

type PlayerPerformanceBarsProps = {
  data: PlayerPerformanceData;
  showRowsWhenEmpty?: boolean;
  sortMode?: PlayerPerformanceSortMode;
  title?: string;
};

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;
const formatEffectiveness = (value: number | undefined) => (typeof value === 'number' ? `${Math.round(value * 100)}%` : 'Sin tiros');
const clampShare = (value: number) => Math.max(Math.min(value, 1), 0);

export const PlayerPerformanceBars = memo(function PlayerPerformanceBars({
  data,
  showRowsWhenEmpty = false,
  sortMode = 'stat',
  title = 'Rendimiento',
}: PlayerPerformanceBarsProps) {
  const attackRows = useMemo(() => sortPlayerPerformanceRows(data.rows, 'points', sortMode), [data.rows, sortMode]);
  const defenseRows = useMemo(() => sortPlayerPerformanceRows(data.rows, 'defenses', sortMode), [data.rows, sortMode]);
  const topAttackPlayerIds = useMemo(() => getTopAttackPlayerIds(attackRows), [attackRows]);
  const topDefensePlayerIds = useMemo(() => getTopDefensePlayerIds(defenseRows), [defenseRows]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.columns}>
        <PerformanceColumn
          accentColor="#0b6bcb"
          surfaceColor="#f0f7ff"
          trackColor="#d9ebff"
          countLabel="Pts"
          emptyText="Sin tiros registrados."
          mode="attack"
          rows={attackRows}
          showRowsWhenEmpty={showRowsWhenEmpty}
          shareField="pointShare"
          statField="points"
          title="Ataque"
          topPlayerIds={topAttackPlayerIds}
          total={data.totalTeamPoints}
        />
        <PerformanceColumn
          accentColor="#0f766e"
          surfaceColor="#f0fdfa"
          trackColor="#ccfbf1"
          countLabel="Def"
          emptyText="Sin defensas registradas."
          mode="defense"
          rows={defenseRows}
          showRowsWhenEmpty={showRowsWhenEmpty}
          shareField="defenseShare"
          statField="defenses"
          title="Defensa"
          topPlayerIds={topDefensePlayerIds}
          total={data.totalTeamDefenses}
        />
      </View>
    </View>
  );
});

function PerformanceColumn({
  accentColor,
  countLabel,
  emptyText,
  mode,
  rows,
  showRowsWhenEmpty,
  shareField,
  surfaceColor,
  statField,
  title,
  topPlayerIds,
  total,
  trackColor,
}: {
  accentColor: string;
  countLabel: string;
  emptyText: string;
  mode: 'attack' | 'defense';
  rows: PlayerPerformanceRow[];
  showRowsWhenEmpty: boolean;
  shareField: 'pointShare' | 'defenseShare';
  surfaceColor: string;
  statField: 'points' | 'defenses';
  title: string;
  topPlayerIds: Set<string>;
  total: number;
  trackColor: string;
}) {
  const totalTeamAttempts = mode === 'attack' ? rows.reduce((sum, row) => sum + row.shotAttempts, 0) : 0;
  const hasColumnStats = mode === 'attack' ? totalTeamAttempts > 0 : total > 0;
  const totalLabel = mode === 'attack' && totalTeamAttempts > 0 ? `Pts ${total} · Tiros ${totalTeamAttempts}` : `Total ${total}`;

  return (
    <View style={[styles.column, { backgroundColor: surfaceColor, borderColor: trackColor }]}>
      <View style={styles.columnHeader}>
        <View style={[styles.columnAccent, { backgroundColor: accentColor }]} />
        <Text style={styles.columnTitle}>{title}</Text>
        <Text style={[styles.totalLabel, { color: accentColor }]}>{totalLabel}</Text>
      </View>

      {!hasColumnStats && !showRowsWhenEmpty ? (
        <Text style={styles.emptyText}>{emptyText}</Text>
      ) : (
        rows.map((row) => (
          <PerformanceRow
            accentColor={accentColor}
            countLabel={countLabel}
            key={`${title}-${row.playerId}`}
            playerName={row.playerName}
            row={row}
            share={row[shareField]}
            teamAttempts={totalTeamAttempts}
            trackColor={trackColor}
            total={row[statField]}
            mode={mode}
            isTop={topPlayerIds.has(row.playerId)}
          />
        ))
      )}
    </View>
  );
}

function PerformanceRow({
  accentColor,
  countLabel,
  mode,
  playerName,
  row,
  share,
  teamAttempts,
  trackColor,
  total,
  isTop,
}: {
  accentColor: string;
  countLabel: string;
  isTop: boolean;
  mode: 'attack' | 'defense';
  playerName: string;
  row: PlayerPerformanceRow;
  share: number;
  teamAttempts: number;
  trackColor: string;
  total: number;
}) {
  const convertedShare = mode === 'attack' && teamAttempts > 0 ? row.points / teamAttempts : share;
  const attemptShare = mode === 'attack' && teamAttempts > 0 ? row.shotAttempts / teamAttempts : 0;
  const barWidth = `${clampShare(convertedShare) * 100}%` as DimensionValue;
  const attemptBarWidth = `${clampShare(attemptShare) * 100}%` as DimensionValue;
  const detailText = mode === 'attack'
    ? row.shotAttempts > 0
      ? `${row.points}/${row.shotAttempts} tiros · ${formatEffectiveness(row.effectiveness)}`
      : 'Sin tiros'
    : `${total} ${countLabel} · ${formatPercent(share)}`;
  const attackBreakdown = mode === 'attack' && row.shotAttempts > 0
    ? `${row.rivalDefensesAgainst} atajados · ${row.ownPointsAgainst} errados`
    : undefined;

  return (
    <View style={[styles.row, isTop && { borderColor: accentColor, backgroundColor: '#ffffff' }]}>
      <View style={styles.rowMeta}>
        <View style={styles.playerNameWrap}>
          <Text numberOfLines={1} style={styles.playerName}>{playerName}</Text>
          {isTop && <Text style={[styles.topBadge, { color: accentColor, borderColor: accentColor }]}>Top</Text>}
        </View>
        <Text numberOfLines={1} adjustsFontSizeToFit style={styles.countText}>{detailText}</Text>
      </View>
      {attackBreakdown && <Text numberOfLines={1} adjustsFontSizeToFit style={styles.attackBreakdown}>{attackBreakdown}</Text>}
      <View style={[styles.track, { backgroundColor: trackColor }]}>
        {mode === 'attack' && <View style={[styles.attemptBar, { width: attemptBarWidth }]} />}
        <View style={[styles.bar, isTop && styles.topBar, { backgroundColor: accentColor, width: barWidth }]} />
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
  columnTitle: {
    flex: 1,
    color: '#0b1f33',
    fontSize: fontSize.body,
    fontWeight: '900',
  },
  totalLabel: {
    color: '#5d6b7a',
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
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  playerName: {
    color: '#0b1f33',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  playerNameWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
  countText: {
    color: '#5d6b7a',
    fontSize: fontSize.tiny,
    fontWeight: '900',
  },
  attackBreakdown: {
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
  topBar: {
    minWidth: 8,
  },
});
