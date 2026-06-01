import { groupOpponentDefensesByZone, groupOpponentPointsByZone, groupPointsByZone, LandingZoneStat } from './court';
import { createTacticalInsights, InsightCard } from './insights';
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
import { LineupSwapEvent, Match, MatchEvent, MatchPeriod, Player, Score, SubstitutionEvent } from './types';

export type ReportStat = {
  label: string;
  total: number;
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
  substitutions: ReportSubstitution[];
  insights: PeriodInsight[];
};

export type MatchReportData = {
  title: string;
  matchLabel: string;
  opponent: string;
  dateLabel: string;
  venueLabel: string;
  competitionLabel: string;
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
    opponentOwnPoints: number;
    substitutions: ReportSubstitution[];
    insights: InsightCard[];
  };
  zones: {
    attack: LandingZoneStat[];
    against: LandingZoneStat[];
    defended: LandingZoneStat[];
  };
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

export function buildMatchReportData(match: Match, players: Player[]): MatchReportData {
  const getPlayerLabel = createPlayerLabeler(players);
  const finalScore = calculateTotalScore(match.events);
  const initialLineup = match.lineupSnapshots.find((lineup) => lineup.team === 'uruguay');
  const finalLineup = [...match.lineupSnapshots].reverse().find((lineup) => lineup.team === 'uruguay');
  const totalErrorBreakdown = getErrorsByTypeByPlayer(match.events);
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
      substitutions: mapLineupActions(
        [...getSubstitutionsByPeriod(match.events, periodNumber), ...getLineupSwapsByPeriod(match.events, periodNumber)],
        getPlayerLabel,
      ),
      insights: generatePeriodInsights({ ...match, events: periodEvents }, periodNumber, (playerId) => getPlayerLabel(playerId)),
    };
  });

  return {
    title: 'Reporte del partido',
    matchLabel: `Uruguay vs ${match.opponent || 'Rival'}`,
    opponent: match.opponent || 'Rival',
    dateLabel: formatMatchDateTime(match.startsAt),
    venueLabel: match.venue || 'Sin sede registrada',
    competitionLabel: 'Sin competencia registrada',
    finalScore,
    scoreByPeriod: getScoreByPeriod(match.events).map((item) => ({
      periodLabel: formatPeriodName(item.periodNumber),
      score: item.score,
    })),
    periods,
    totals: {
      topScorers: mapPlayerStats(getPointsByPlayer(match.events), getPlayerLabel),
      defenses: mapPlayerStats(getDefensesByPlayer(match.events), getPlayerLabel),
      opponentDefenses: getOpponentDefenses(match.events).length,
      faltas: mapFaltas(totalErrorBreakdown, getPlayerLabel),
      ownPointsByPlayer: mapOwnPointsByPlayer(totalErrorBreakdown, getPlayerLabel),
      totalErrors: mapPlayerStats(getErrorsByPlayer(match.events), getPlayerLabel),
      opponentOwnPoints: getOpponentOwnPoints(match.events),
      substitutions: mapLineupActions(getLineupActions(match.events), getPlayerLabel),
      insights: createTacticalInsights({
        events: match.events,
        lineupSnapshots: match.lineupSnapshots,
        players,
        opponentName: match.opponent,
      }),
    },
    zones: {
      attack: groupPointsByZone(match.events),
      against: groupOpponentPointsByZone(match.events),
      defended: groupOpponentDefensesByZone(match.events),
    },
    lineups: {
      initial: mapLineup(initialLineup?.playerIds, getPlayerLabel),
      final: mapLineup(finalLineup?.playerIds, getPlayerLabel),
    },
    notes: match.notes?.trim() || 'Sin notas registradas.',
  };
}

export const reportEmptyLabel = emptyLabel;
