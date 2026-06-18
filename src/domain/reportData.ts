import {
  getOpponentDefenseEventsWithLocation,
  getPointEventsWithLocation,
  groupOpponentDefensesByZone,
  groupOpponentPointsByZone,
  groupPointsByZone,
  LandingZoneStat,
} from './court';
import { createTacticalInsights, InsightCard } from './insights';
import { normalizeOpponentName } from './opponent';
import { buildPlayerPerformance, PlayerPerformanceRow } from './playerPerformance';
import {
  calculatePeriodScore,
  calculateTotalScore,
  formatPeriodName,
  generatePeriodInsights,
  getDefensesByPlayer,
  getDefensesByPlayerByPeriod,
  getErrorsByPlayer,
  getErrorsByPlayerByPeriod,
  getErrorsByTypeByPlayer,
  getErrorsByTypeByPlayerByPeriod,
  getEventsByPeriod,
  getLineupSwaps,
  getLineupSwapsByPeriod,
  getOpponentOwnPoints,
  getOpponentOwnPointsByPeriod,
  getOpponentDefenses,
  getOpponentDefensesByPeriod,
  getPointsByPlayer,
  getScoreByPeriod,
  getSubstitutions,
  getSubstitutionsByPeriod,
  getTopScorersByPeriod,
  PeriodInsight,
} from './periodStats';
import { CourtLocation, LineupSwapEvent, Match, MatchEvent, MatchPeriod, Player, Score, SubstitutionEvent } from './types';

export type ReportStat = {
  label: string;
  total: number;
};

export type ReportSummaryCard = {
  label: string;
  value: string;
};

export type ReportLocationMaps = {
  uruguayPoints: CourtLocation[];
  opponentPoints: CourtLocation[];
  opponentDefenses: CourtLocation[];
};

export type ReportSubstitution = {
  periodLabel: string;
  clockLabel: string;
  kind: 'substitution' | 'lineup_swap';
  playerOut: string;
  playerIn: string;
  playerA?: string;
  playerB?: string;
};

export type ReportEffectivenessRow = {
  playerId: string;
  playerName: string;
  goals: number;
  rivalDefendedShots: number;
  shotAttempts: number;
  effectiveness: number;
};

export type PeriodReportData = {
  periodNumber: MatchPeriod;
  periodLabel: string;
  score: Score;
  uruguayPoints: number;
  opponentPoints: number;
  ownPoints: number;
  opponentOwnPoints: number;
  topScorers: ReportStat[];
  defenses: ReportStat[];
  opponentDefenses: number;
  opponentDefenseZones: LandingZoneStat[];
  faltas: ReportStat[];
  ownPointsByPlayer: ReportStat[];
  totalErrors: ReportStat[];
  effectiveness: ReportEffectivenessRow[];
  legacyOpponentDefensesWithoutPlayer: number;
  substitutions: ReportSubstitution[];
  insights: PeriodInsight[];
  maps: ReportLocationMaps;
};

export type MatchReportData = {
  title: string;
  matchLabel: string;
  opponent: string;
  teamPoolName?: string;
  dateLabel: string;
  venueLabel: string;
  competitionLabel: string;
  executiveSummary: ReportSummaryCard[];
  finalScore: Score;
  scoreByPeriod: Array<{
    periodLabel: string;
    score: Score;
  }>;
  periods: PeriodReportData[];
  totals: {
    topScorers: ReportStat[];
    defenses: ReportStat[];
    opponentDefenses: number;
    faltas: ReportStat[];
    ownPointsByPlayer: ReportStat[];
    totalErrors: ReportStat[];
    effectiveness: ReportEffectivenessRow[];
    legacyOpponentDefensesWithoutPlayer: number;
    opponentOwnPoints: number;
    substitutions: ReportSubstitution[];
    insights: InsightCard[];
  };
  zones: {
    attack: LandingZoneStat[];
    against: LandingZoneStat[];
    defended: LandingZoneStat[];
  };
  totalMaps: ReportLocationMaps;
  lineups: {
    initial: string[];
    final: string[];
  };
  notes: string;
};

const periodNumbers: MatchPeriod[] = [1, 2, 3];

const emptyLabel = 'Sin datos registrados';

const formatMatchDateTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Sin fecha registrada';
  }

  return new Intl.DateTimeFormat('es-UY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatClock = (secondsElapsed: number | undefined) => {
  const safeSeconds = Math.max(secondsElapsed ?? 0, 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const sortLineupActions = (items: Array<SubstitutionEvent | LineupSwapEvent>) =>
  [...items].sort((a, b) => a.periodNumber - b.periodNumber || a.clock.secondsElapsed - b.clock.secondsElapsed);

const createPlayerLabeler = (players: Player[]) => {
  const playerById = new Map(players.map((player) => [player.id, player]));

  return (playerId: string | undefined) => {
    if (!playerId) {
      return 'Equipo';
    }

    const player = playerById.get(playerId);

    if (!player) {
      return playerId;
    }

    return `#${player.number} ${player.lastName || player.firstName}`.trim();
  };
};

const mapPlayerStats = (
  stats: Array<{ playerId: string; total: number }>,
  getPlayerLabel: (playerId: string | undefined) => string,
): ReportStat[] => stats.map((stat) => ({ label: getPlayerLabel(stat.playerId), total: stat.total }));

const mapFaltas = (
  stats: Array<{ playerId: string; faltas: number }>,
  getPlayerLabel: (playerId: string | undefined) => string,
): ReportStat[] =>
  stats
    .filter((stat) => stat.faltas > 0)
    .map((stat) => ({ label: getPlayerLabel(stat.playerId), total: stat.faltas }));

const mapOwnPointsByPlayer = (
  stats: Array<{ playerId: string; puntosEnContra: number }>,
  getPlayerLabel: (playerId: string | undefined) => string,
): ReportStat[] =>
  stats
    .filter((stat) => stat.puntosEnContra > 0)
    .map((stat) => ({ label: getPlayerLabel(stat.playerId), total: stat.puntosEnContra }));

const mapLineupActions = (
  lineupActions: Array<SubstitutionEvent | LineupSwapEvent>,
  getPlayerLabel: (playerId: string | undefined) => string,
): ReportSubstitution[] =>
  sortLineupActions(lineupActions).map((event) => {
    if (event.kind === 'lineup_swap') {
      const playerA = getPlayerLabel(event.playerAId);
      const playerB = getPlayerLabel(event.playerBId);

      return {
        periodLabel: formatPeriodName(event.periodNumber),
        clockLabel: formatClock(event.clock.secondsElapsed),
        kind: 'lineup_swap',
        playerOut: playerA,
        playerIn: playerB,
        playerA,
        playerB,
      };
    }

    return {
      periodLabel: formatPeriodName(event.periodNumber),
      clockLabel: formatClock(event.clock.secondsElapsed),
      kind: 'substitution',
      playerOut: getPlayerLabel(event.playerOutId),
      playerIn: getPlayerLabel(event.playerInId),
    };
  });

const getLineupActions = (events: MatchEvent[]) => [...getSubstitutions(events), ...getLineupSwaps(events)];

const mapLineup = (
  playerIds: string[] | undefined,
  getPlayerLabel: (playerId: string | undefined) => string,
) => (playerIds && playerIds.length > 0 ? playerIds.map(getPlayerLabel) : [emptyLabel]);

const buildReportLocationMaps = (events: MatchEvent[]): ReportLocationMaps => ({
  uruguayPoints: getPointEventsWithLocation(events, 'uruguay').map((event) => event.landingLocation),
  opponentPoints: getPointEventsWithLocation(events, 'opponent').map((event) => event.landingLocation),
  opponentDefenses: getOpponentDefenseEventsWithLocation(events).map((event) => event.defenseLocation),
});

const isLegacyOpponentDefenseWithoutPlayer = (event: MatchEvent) =>
  event.kind === 'opponent_defense' && !event.playerId;

const mapEffectivenessRows = (rows: PlayerPerformanceRow[]): ReportEffectivenessRow[] =>
  rows
    .filter((row) => row.shotAttempts > 0)
    .map((row) => ({
      playerId: row.playerId,
      playerName: row.playerName,
      goals: row.points,
      rivalDefendedShots: row.rivalDefensesAgainst,
      shotAttempts: row.shotAttempts,
      effectiveness: row.effectiveness ?? 0,
    }))
    .sort((a, b) =>
      b.shotAttempts - a.shotAttempts ||
      b.goals - a.goals ||
      b.effectiveness - a.effectiveness ||
      a.playerName.localeCompare(b.playerName),
    );

const buildEffectivenessRows = (events: MatchEvent[], players: Player[]) =>
  mapEffectivenessRows(buildPlayerPerformance(events, players).rows);

export function buildMatchReportData(match: Match, players: Player[]): MatchReportData {
  const opponentName = normalizeOpponentName(match.opponent);
  const teamPoolName = match.teamPoolName?.trim() || undefined;
  const getPlayerLabel = createPlayerLabeler(players);
  const finalScore = calculateTotalScore(match.events);
  const initialLineup = match.lineupSnapshots.find((lineup) => lineup.team === 'uruguay');
  const finalLineup = [...match.lineupSnapshots].reverse().find((lineup) => lineup.team === 'uruguay');
  const totalErrorBreakdown = getErrorsByTypeByPlayer(match.events);
  const attackZones = groupPointsByZone(match.events);
  const againstZones = groupOpponentPointsByZone(match.events);
  const defendedZones = groupOpponentDefensesByZone(match.events);
  const periods = periodNumbers.map((periodNumber): PeriodReportData => {
    const periodEvents = getEventsByPeriod(match.events, periodNumber);
    const periodScore = calculatePeriodScore(match.events, periodNumber);
    const errorBreakdown = getErrorsByTypeByPlayerByPeriod(match.events, periodNumber);
    const ownPoints = errorBreakdown.reduce((sum, stat) => sum + stat.puntosEnContra, 0);

    return {
      periodNumber,
      periodLabel: formatPeriodName(periodNumber),
      score: periodScore,
      uruguayPoints: periodScore.uruguay,
      opponentPoints: periodScore.opponent,
      ownPoints,
      opponentOwnPoints: getOpponentOwnPointsByPeriod(match.events, periodNumber),
      topScorers: mapPlayerStats(getTopScorersByPeriod(match.events, periodNumber), getPlayerLabel),
      defenses: mapPlayerStats(getDefensesByPlayerByPeriod(match.events, periodNumber), getPlayerLabel),
      opponentDefenses: getOpponentDefensesByPeriod(match.events, periodNumber).length,
      opponentDefenseZones: groupOpponentDefensesByZone(periodEvents),
      faltas: mapFaltas(errorBreakdown, getPlayerLabel),
      ownPointsByPlayer: mapOwnPointsByPlayer(errorBreakdown, getPlayerLabel),
      totalErrors: mapPlayerStats(getErrorsByPlayerByPeriod(match.events, periodNumber), getPlayerLabel),
      effectiveness: buildEffectivenessRows(periodEvents, players),
      legacyOpponentDefensesWithoutPlayer: periodEvents.filter(isLegacyOpponentDefenseWithoutPlayer).length,
      substitutions: mapLineupActions(
        [...getSubstitutionsByPeriod(match.events, periodNumber), ...getLineupSwapsByPeriod(match.events, periodNumber)],
        getPlayerLabel,
      ),
      insights: generatePeriodInsights({ ...match, events: periodEvents }, periodNumber, (playerId) => getPlayerLabel(playerId)),
      maps: buildReportLocationMaps(periodEvents),
    };
  });
  const topScorers = mapPlayerStats(getPointsByPlayer(match.events), getPlayerLabel);
  const defenses = mapPlayerStats(getDefensesByPlayer(match.events), getPlayerLabel);
  const faltas = mapFaltas(totalErrorBreakdown, getPlayerLabel);
  const ownPointsByPlayer = mapOwnPointsByPlayer(totalErrorBreakdown, getPlayerLabel);
  const totalErrors = mapPlayerStats(getErrorsByPlayer(match.events), getPlayerLabel);
  const opponentOwnPoints = getOpponentOwnPoints(match.events);
  const opponentDefenses = getOpponentDefenses(match.events).length;
  const effectiveness = buildEffectivenessRows(match.events, players);
  const legacyOpponentDefensesWithoutPlayer = match.events.filter(isLegacyOpponentDefenseWithoutPlayer).length;
  const totalErrorCount = totalErrors.reduce((sum, stat) => sum + stat.total, 0);

  return {
    title: 'Reporte del partido',
    matchLabel: `Uruguay vs ${opponentName}`,
    opponent: opponentName,
    teamPoolName,
    dateLabel: formatMatchDateTime(match.startsAt),
    venueLabel: match.venue || 'Sin sede registrada',
    competitionLabel: 'Sin competencia registrada',
    executiveSummary: [
      { label: 'Resultado final', value: `Uruguay ${finalScore.uruguay} - ${finalScore.opponent} ${opponentName}` },
      ...(teamPoolName ? [{ label: 'Plantel', value: teamPoolName }] : []),
      { label: 'Mejor goleador', value: topScorers[0] ? `${topScorers[0].label} (${topScorers[0].total})` : emptyLabel },
      { label: 'Mas defensas Uruguay', value: defenses[0] ? `${defenses[0].label} (${defenses[0].total})` : emptyLabel },
      { label: 'Errores totales', value: String(totalErrorCount) },
      { label: 'Puntos en contra', value: String(ownPointsByPlayer.reduce((sum, stat) => sum + stat.total, 0)) },
      { label: 'Puntos en contra del rival', value: String(opponentOwnPoints) },
      { label: 'Zona mas efectiva', value: attackZones[0] ? `${attackZones[0].label} (${attackZones[0].total})` : emptyLabel },
      { label: 'Zona vulnerable', value: againstZones[0] ? `${againstZones[0].label} (${againstZones[0].total})` : emptyLabel },
      { label: 'Zona donde mas nos defendieron', value: defendedZones[0] ? `${defendedZones[0].label} (${defendedZones[0].total})` : emptyLabel },
    ],
    finalScore,
    scoreByPeriod: getScoreByPeriod(match.events).map((item) => ({
      periodLabel: formatPeriodName(item.periodNumber),
      score: item.score,
    })),
    periods,
    totals: {
      topScorers,
      defenses,
      opponentDefenses,
      faltas,
      ownPointsByPlayer,
      totalErrors,
      effectiveness,
      legacyOpponentDefensesWithoutPlayer,
      opponentOwnPoints,
      substitutions: mapLineupActions(getLineupActions(match.events), getPlayerLabel),
      insights: createTacticalInsights({
        events: match.events,
        lineupSnapshots: match.lineupSnapshots,
        players,
        opponentName,
      }),
    },
    zones: {
      attack: attackZones,
      against: againstZones,
      defended: defendedZones,
    },
    totalMaps: buildReportLocationMaps(match.events),
    lineups: {
      initial: mapLineup(initialLineup?.playerIds, getPlayerLabel),
      final: mapLineup(finalLineup?.playerIds, getPlayerLabel),
    },
    notes: match.notes?.trim() || 'Sin notas registradas.',
  };
}

export const reportEmptyLabel = emptyLabel;
