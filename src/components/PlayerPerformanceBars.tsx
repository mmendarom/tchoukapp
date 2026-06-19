import { memo, useMemo } from 'react';
import { DimensionValue, StyleSheet, Text, View } from 'react-native';

import { PlayerPerformanceData, PlayerPerformanceRow } from '../domain/playerPerformance';
import { fontSize, spacing } from '../utils/responsive';

type PlayerPerformanceBarsProps = {
  data: PlayerPerformanceData;
  showRowsWhenEmpty?: boolean;
  sortMode?: 'input' | 'stat';
  title?: string;
};

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;
const formatEffectiveness = (value: number | undefined) => (typeof value === 'number' ? `${Math.round(value * 100)}% Efect.` : 'Sin tiros');

const sortRows = (
  rows: PlayerPerformanceRow[],
  field: 'points' | 'defenses',
  sortMode: 'input' | 'stat',
) => {
  if (sortMode === 'input') {
    return rows;
  }

  return [...rows].sort((a, b) => b[field] - a[field] || a.playerName.localeCompare(b.playerName));
};

export const PlayerPerformanceBars = memo(function PlayerPerformanceBars({
  data,
  showRowsWhenEmpty = false,
  sortMode = 'stat',
  title = 'Rendimiento',
}: PlayerPerformanceBarsProps) {
  const attackRows = useMemo(() => sortRows(data.rows, 'points', sortMode), [data.rows, sortMode]);
  const defenseRows = useMemo(() => sortRows(data.rows, 'defenses', sortMode), [data.rows, sortMode]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.columns}>
        <PerformanceColumn
          accentColor="#0b6bcb"
          surfaceColor="#f0f7ff"
          trackColor="#d9ebff"
          countLabel="Pts"
          emptyText="Sin puntos registrados."
          mode="attack"
          rows={attackRows}
          showRowsWhenEmpty={showRowsWhenEmpty}
          shareField="pointShare"
          statField="points"
          title="Ataque"
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
  total: number;
  trackColor: string;
}) {
  return (
    <View style={[styles.column, { backgroundColor: surfaceColor, borderColor: trackColor }]}>
      <View style={styles.columnHeader}>
        <View style={[styles.columnAccent, { backgroundColor: accentColor }]} />
        <Text style={styles.columnTitle}>{title}</Text>
        <Text style={[styles.totalLabel, { color: accentColor }]}>Total {total}</Text>
      </View>

      {total === 0 && !showRowsWhenEmpty ? (
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
            trackColor={trackColor}
            total={row[statField]}
            mode={mode}
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
  trackColor,
  total,
}: {
  accentColor: string;
  countLabel: string;
  mode: 'attack' | 'defense';
  playerName: string;
  row: PlayerPerformanceRow;
  share: number;
  trackColor: string;
  total: number;
}) {
  const barWidth = `${Math.max(Math.min(share, 1), 0) * 100}%` as DimensionValue;
  const detailText = mode === 'attack'
    ? `${row.points} Pts · ${row.rivalDefensesAgainst} Ataj. · ${formatEffectiveness(row.effectiveness)}`
    : `${total} ${countLabel} · ${formatPercent(share)}`;

  return (
    <View style={styles.row}>
      <View style={styles.rowMeta}>
        <Text numberOfLines={1} style={styles.playerName}>{playerName}</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit style={styles.countText}>{detailText}</Text>
      </View>
      <View style={[styles.track, { backgroundColor: trackColor }]}>
        <View style={[styles.bar, { backgroundColor: accentColor, width: barWidth }]} />
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
    gap: 3,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  playerName: {
    flex: 1,
    color: '#0b1f33',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  countText: {
    color: '#5d6b7a',
    fontSize: fontSize.tiny,
    fontWeight: '900',
  },
  track: {
    height: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 8,
  },
});
