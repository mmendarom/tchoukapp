import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { CourtLocationMap, MarkerVariant } from '../components/CourtLocationMap';
import { Screen } from '../components/Screen';
import {
  buildStatsMatchReport,
  formatStatsReportPercent,
  StatsReportLocation,
  StatsReportPlayerRow,
  StatsReportSectorStat,
  StatsReportTeamSection,
} from '../domain/statsMatchReportData';
import { exportStatsMatchReportPdf } from '../export/exportStatsMatchReport';
import { useMatchStore } from '../store/useMatchStore';
import { useStatsMatchStore } from '../store/useStatsMatchStore';
import { RootStackParamList } from '../utils/navigation';
import { fontSize, spacing } from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'StatsMatchSummary'>;

type ScopeOption = {
  key: string;
  label: string;
  periodNumber?: number;
};

const formatShootingLine = (row: StatsReportPlayerRow) =>
  `${row.points}/${row.attempts} tiros · ${row.attempts > 0 ? formatStatsReportPercent(row.effectiveness) : 'Sin tiros'}`;

export function StatsMatchSummaryScreen({ navigation, route }: Props) {
  const { matchId, periodNumber } = route.params;
  const players = useMatchStore((state) => state.players);
  const match = useStatsMatchStore((state) => state.statsMatches.find((item) => item.id === matchId));
  const [selectedPeriod, setSelectedPeriod] = useState<number | undefined>(periodNumber);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfStatus, setPdfStatus] = useState('');

  const scopeOptions = useMemo<ScopeOption[]>(() => {
    if (!match) {
      return [];
    }

    const periodScopes = match.periods
      .filter((period) => period.status !== 'not_started' || match.events.some((event) => event.periodNumber === period.number))
      .map((period) => ({ key: `period-${period.number}`, label: `Tiempo ${period.number}`, periodNumber: period.number }));

    return [...periodScopes, { key: 'final', label: 'Final', periodNumber: undefined }];
  }, [match]);

  const report = useMemo(
    () => (match ? buildStatsMatchReport(match, players, selectedPeriod !== undefined ? { periodNumber: selectedPeriod } : undefined) : undefined),
    [match, players, selectedPeriod],
  );

  if (!match || !report) {
    return (
      <Screen>
        <Text style={styles.title}>Partido no encontrado</Text>
        <ActionButton label="Volver a Estadística 7v7" onPress={() => navigation.navigate('StatsMatches')} />
      </Screen>
    );
  }

  const handleExportPdf = async () => {
    if (exportingPdf) {
      return;
    }

    setExportingPdf(true);
    setPdfStatus('');

    try {
      await exportStatsMatchReportPdf(report);
      setPdfStatus('PDF generado.');
    } catch {
      setPdfStatus('No se pudo exportar el PDF.');
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <Screen>
      <View style={styles.headerCard}>
        <Text style={styles.kicker}>Estadística 7v7</Text>
        <Text style={styles.title}>{report.title}</Text>
        <Text style={styles.score}>{report.scoreLabel}</Text>
      </View>

      <View style={styles.scopeRow}>
        {scopeOptions.map((option) => {
          const selected = option.periodNumber === selectedPeriod;

          return (
            <Pressable
              key={option.key}
              onPress={() => setSelectedPeriod(option.periodNumber)}
              style={({ pressed }) => [styles.scopeButton, selected && styles.scopeButtonSelected, pressed && styles.pressed]}
            >
              <Text style={[styles.scopeText, selected && styles.scopeTextSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {!report.hasEvents ? (
        <View style={styles.card}>
          <Text style={styles.helperText}>No hay acciones registradas en este tramo.</Text>
        </View>
      ) : null}

      <TeamSection section={report.home} markerVariant="uruguay" />
      <TeamSection section={report.away} markerVariant="opponent" />

      <View style={styles.actions}>
        <ActionButton
          label={exportingPdf ? 'Generando PDF...' : 'Exportar PDF'}
          onPress={handleExportPdf}
          disabled={exportingPdf}
        />
        {pdfStatus ? (
          <Text style={[styles.meta, pdfStatus.startsWith('No ') && styles.errorText]}>{pdfStatus}</Text>
        ) : null}
        <ActionButton label="Volver a Estadística 7v7" onPress={() => navigation.navigate('StatsMatches')} variant="secondary" />
      </View>
    </Screen>
  );
}

function TeamSection({ section, markerVariant }: { section: StatsReportTeamSection; markerVariant: MarkerVariant }) {
  return (
    <View style={styles.teamCard}>
      <View style={styles.teamHeader}>
        <Text style={styles.teamName}>
          {section.teamName}
          {section.category ? ` · ${section.category}` : ''}
        </Text>
        <Text style={styles.teamScore}>
          {section.points} a favor · {section.pointsAgainst} en contra
        </Text>
      </View>
      <View style={styles.statGrid}>
        <StatBox label="Intentos" value={`${section.attempts}`} />
        <StatBox label="Efectividad" value={section.attempts > 0 ? formatStatsReportPercent(section.effectiveness) : '—'} />
        <StatBox label="Defensas" value={`${section.defenses}`} />
        <StatBox label="Errores" value={`${section.errors}`} />
      </View>

      <Text style={styles.blockTitle}>Dónde tiró</Text>
      <CourtLocationMap markers={section.shotLocations.map((location) => toMarker(location, markerVariant))} />
      <Text style={styles.meta}>
        {section.shotLocations.length > 0 ? `${section.shotLocations.length} puntos con ubicación.` : 'Sin puntos ubicados.'}
        {section.shotsWithoutLocation > 0 ? ` ${section.shotsWithoutLocation} sin ubicación.` : ''}
      </Text>

      <Text style={styles.blockTitle}>Quién tiró</Text>
      {section.topAttackers.length === 0 ? (
        <Text style={styles.meta}>Sin tiros registrados.</Text>
      ) : (
        section.topAttackers.map((row) => (
          <RankRow key={row.playerId} name={row.playerName} detail={formatShootingLine(row)} />
        ))
      )}

      <Text style={styles.blockTitle}>Dónde defendió</Text>
      <CourtLocationMap markers={section.defenseLocations.map((location) => toMarker(location, 'opponentDefense'))} />
      <Text style={styles.meta}>
        {section.defenseLocations.length > 0 ? `${section.defenseLocations.length} tiros atajados con ubicación.` : 'Sin defensas ubicadas.'}
      </Text>

      <Text style={styles.blockTitle}>Destacados en defensa</Text>
      {section.topDefenders.length === 0 ? (
        <Text style={styles.meta}>Sin defensas registradas.</Text>
      ) : (
        section.topDefenders.map((row) => (
          <RankRow key={row.playerId} name={row.playerName} detail={`${row.defenses} defensas`} />
        ))
      )}

      <Text style={styles.blockTitle}>Dónde convierte</Text>
      <SectorList sectors={section.scoringSectors} emptyLabel="Sin sectores de conversión." />

      <Text style={styles.blockTitle}>Zonas flojas: dónde le anotan</Text>
      <SectorList sectors={section.concededSectors} emptyLabel="No le anotaron con ubicación." />

      <Text style={styles.blockTitle}>Zonas flojas: dónde le defienden</Text>
      <SectorList sectors={section.defendedAgainstSectors} emptyLabel="Sin tiros atajados en contra." />

      <Text style={styles.blockTitle}>Errores y pérdidas</Text>
      {section.errorBreakdown.length === 0 ? (
        <Text style={styles.meta}>Sin errores registrados.</Text>
      ) : (
        section.errorBreakdown.map((row) => (
          <RankRow key={row.subtype} name={row.label} detail={`${row.total}`} />
        ))
      )}
    </View>
  );
}

const toMarker = (location: StatsReportLocation, markerVariant: MarkerVariant) => ({
  location: location.location,
  markerVariant,
});

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function RankRow({ name, detail }: { name: string; detail: string }) {
  return (
    <View style={styles.rankRow}>
      <Text style={styles.rankName}>{name}</Text>
      <Text style={styles.rankDetail}>{detail}</Text>
    </View>
  );
}

function SectorList({ sectors, emptyLabel }: { sectors: StatsReportSectorStat[]; emptyLabel: string }) {
  if (sectors.length === 0) {
    return <Text style={styles.meta}>{emptyLabel}</Text>;
  }

  return (
    <>
      {sectors.map((sector) => (
        <RankRow key={sector.key} name={sector.label} detail={`${sector.total}`} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    borderRadius: 8,
    backgroundColor: '#0b1f33',
    borderWidth: 1,
    borderColor: '#16456e',
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  kicker: {
    color: '#8bd3ff',
    fontSize: fontSize.small,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: '#ffffff',
    fontSize: fontSize.title,
    fontWeight: '900',
    textAlign: 'center',
  },
  score: {
    color: '#ffffff',
    fontSize: fontSize.section,
    fontWeight: '900',
    textAlign: 'center',
  },
  scopeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  scopeButton: {
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#f7fafc',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  scopeButtonSelected: {
    borderColor: '#0b6bcb',
    backgroundColor: '#0b6bcb',
  },
  scopeText: {
    color: '#36546f',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  scopeTextSelected: {
    color: '#ffffff',
  },
  card: {
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    padding: spacing.md,
    gap: spacing.sm,
  },
  teamCard: {
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    padding: spacing.md,
    gap: spacing.sm,
  },
  teamHeader: {
    gap: 2,
  },
  teamName: {
    color: '#0b1f33',
    fontSize: fontSize.section,
    fontWeight: '900',
  },
  teamScore: {
    color: '#36546f',
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statBox: {
    flexGrow: 1,
    flexBasis: 76,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#f7fafc',
    padding: spacing.sm,
    gap: 2,
  },
  statValue: {
    color: '#0b1f33',
    fontSize: fontSize.section,
    fontWeight: '900',
  },
  statLabel: {
    color: '#5d6b7a',
    fontSize: fontSize.tiny,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  blockTitle: {
    color: '#0b1f33',
    fontSize: fontSize.body,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  meta: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
    fontWeight: '700',
  },
  helperText: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
    fontWeight: '700',
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbe4ef',
    backgroundColor: '#ffffff',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  rankName: {
    flex: 1,
    color: '#0b1f33',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  rankDetail: {
    color: '#36546f',
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  actions: {
    gap: spacing.sm,
  },
  errorText: {
    color: '#b42318',
  },
  pressed: {
    opacity: 0.82,
  },
});
