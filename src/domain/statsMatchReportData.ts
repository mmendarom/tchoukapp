import { deriveTacticalCourtSector } from './court';
import {
  getStatsMatchScore,
  getStatsMatchStats,
  rankStatsAttackers,
  rankStatsDefenders,
  StatsMatch,
  StatsMatchErrorSubtype,
  StatsMatchEvent,
  StatsMatchPlayerStats,
  StatsTeam,
} from './statsMatch';
import { getStatsPlayerLabel, statsErrorSubtypeLabel, statsMatchStatusLabel } from './statsMatchLive';
import { CourtLocation, Player } from './types';

const MAX_TOP_ROWS = 5;
const MAX_SECTORS = 3;

export type StatsReportScope = 'period' | 'final';

export type StatsReportLocation = {
  id: string;
  location: CourtLocation;
  label: string;
  markerKind: 'point' | 'defense';
};

export type StatsReportSectorStat = {
  key: string;
  label: string;
  total: number;
};

export type StatsReportPlayerRow = {
  playerId: string;
  playerName: string;
  points: number;
  attempts: number;
  effectiveness: number;
  shotsDefended: number;
  ownPointsAgainst: number;
  errors: number;
  defenses: number;
};

export type StatsReportErrorRow = {
  subtype: StatsMatchErrorSubtype | 'own_point_against';
  label: string;
  total: number;
};

export type StatsReportTeamSection = {
  teamId: string;
  teamName: string;
  category?: string;
  points: number;
  pointsAgainst: number;
  attempts: number;
  effectiveness: number;
  defenses: number;
  errors: number;
  ownPointsAgainst: number;
  shotLocations: StatsReportLocation[];
  defenseLocations: StatsReportLocation[];
  shotsWithoutLocation: number;
  topAttackers: StatsReportPlayerRow[];
  topDefenders: StatsReportPlayerRow[];
  scoringSectors: StatsReportSectorStat[];
  concededSectors: StatsReportSectorStat[];
  defendedAgainstSectors: StatsReportSectorStat[];
  errorBreakdown: StatsReportErrorRow[];
  players: StatsReportPlayerRow[];
};

export type StatsMatchReport = {
  scope: StatsReportScope;
  periodNumber?: number;
  matchId: string;
  title: string;
  scoreLabel: string;
  createdAt: string;
  dateLabel: string;
  statusLabel: string;
  formatLabel: string;
  hasEvents: boolean;
  home: StatsReportTeamSection;
  away: StatsReportTeamSection;
};

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Sin fecha';
  }

  return new Intl.DateTimeFormat('es-UY', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const buildPlayerRow = (players: Player[], stats: StatsMatchPlayerStats): StatsReportPlayerRow => ({
  playerId: stats.playerId,
  playerName: getStatsPlayerLabel(players, stats.playerId),
  points: stats.points,
  attempts: stats.attempts,
  effectiveness: stats.effectiveness,
  shotsDefended: stats.shotsDefended,
  ownPointsAgainst: stats.ownPointsAgainst,
  errors: stats.errors,
  defenses: stats.defenses,
});

const buildSectors = (events: StatsMatchEvent[]): StatsReportSectorStat[] => {
  const totals = new Map<string, StatsReportSectorStat>();

  events.forEach((event) => {
    if (!event.location) {
      return;
    }

    const sector = deriveTacticalCourtSector(event.location);
    const current = totals.get(sector.shortLabel);

    totals.set(sector.shortLabel, {
      key: sector.shortLabel,
      label: sector.shortLabel,
      total: (current?.total ?? 0) + 1,
    });
  });

  return Array.from(totals.values()).sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
};

const buildErrorBreakdown = (events: StatsMatchEvent[], teamId: string): StatsReportErrorRow[] => {
  const counts = new Map<StatsReportErrorRow['subtype'], number>();

  events.forEach((event) => {
    if (event.teamId !== teamId) {
      return;
    }

    if (event.kind === 'own_point_against') {
      counts.set('own_point_against', (counts.get('own_point_against') ?? 0) + 1);
      return;
    }

    if (event.kind === 'error' && event.errorSubtype) {
      counts.set(event.errorSubtype, (counts.get(event.errorSubtype) ?? 0) + 1);
    }
  });

  return Array.from(counts.entries())
    .map(([subtype, total]) => ({
      subtype,
      label: subtype === 'own_point_against' ? 'Punto en contra' : statsErrorSubtypeLabel[subtype],
      total,
    }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
};

const buildTeamSection = (
  team: StatsTeam,
  opponent: StatsTeam,
  players: Player[],
  events: StatsMatchEvent[],
  teamStats: { points: number; pointsAgainst: number; attempts: number; effectiveness: number; defenses: number; errors: number; ownPointsAgainst: number },
  playerStats: StatsMatchPlayerStats[],
): StatsReportTeamSection => {
  const teamPointEvents = events.filter((event) => event.kind === 'point' && event.teamId === team.id);
  const opponentPointEvents = events.filter((event) => event.kind === 'point' && event.teamId === opponent.id);
  const teamDefendedShotEvents = events.filter((event) => event.kind === 'shot_defended' && event.defendingTeamId === team.id);
  const teamShotsDefendedAgainst = events.filter((event) => event.kind === 'shot_defended' && event.teamId === team.id);

  const shotLocations: StatsReportLocation[] = teamPointEvents
    .filter((event) => Boolean(event.location))
    .map((event) => ({
      id: `point:${event.id}`,
      location: event.location as CourtLocation,
      label: `Punto de ${getStatsPlayerLabel(players, event.playerId)}`,
      markerKind: 'point' as const,
    }));
  const defenseLocations: StatsReportLocation[] = teamDefendedShotEvents
    .filter((event) => Boolean(event.location))
    .map((event) => ({
      id: `defense:${event.id}`,
      location: event.location as CourtLocation,
      label: `${getStatsPlayerLabel(players, event.defenderPlayerId)} atajó a ${getStatsPlayerLabel(players, event.playerId)}`,
      markerKind: 'defense' as const,
    }));

  return {
    teamId: team.id,
    teamName: team.name,
    category: team.category,
    points: teamStats.points,
    pointsAgainst: teamStats.pointsAgainst,
    attempts: teamStats.attempts,
    effectiveness: teamStats.effectiveness,
    defenses: teamStats.defenses,
    errors: teamStats.errors,
    ownPointsAgainst: teamStats.ownPointsAgainst,
    shotLocations,
    defenseLocations,
    shotsWithoutLocation: teamPointEvents.length - shotLocations.length,
    topAttackers: rankStatsAttackers(playerStats, team.id, MAX_TOP_ROWS).map((stats) => buildPlayerRow(players, stats)),
    topDefenders: rankStatsDefenders(playerStats, team.id, MAX_TOP_ROWS).map((stats) => buildPlayerRow(players, stats)),
    scoringSectors: buildSectors(teamPointEvents).slice(0, MAX_SECTORS),
    concededSectors: buildSectors(opponentPointEvents).slice(0, MAX_SECTORS),
    defendedAgainstSectors: buildSectors(teamShotsDefendedAgainst).slice(0, MAX_SECTORS),
    errorBreakdown: buildErrorBreakdown(events, team.id),
    players: playerStats
      .filter((stats) => stats.teamId === team.id)
      .map((stats) => buildPlayerRow(players, stats)),
  };
};

export function buildStatsMatchReport(
  match: StatsMatch,
  players: Player[],
  options?: { periodNumber?: number },
): StatsMatchReport {
  const periodNumber = options?.periodNumber;
  const events = match.events.filter((event) => periodNumber === undefined || event.periodNumber === periodNumber);
  const stats = getStatsMatchStats(match, { periodNumber });
  const score = getStatsMatchScore(match, events);
  const homeStats = stats.teamStats.find((item) => item.teamId === match.homeTeam.id);
  const awayStats = stats.teamStats.find((item) => item.teamId === match.awayTeam.id);

  const home = buildTeamSection(match.homeTeam, match.awayTeam, players, events, homeStats!, stats.playerStats);
  const away = buildTeamSection(match.awayTeam, match.homeTeam, players, events, awayStats!, stats.playerStats);
  const periodMinutes = Math.round(match.settings.periodDurationSeconds / 60);

  return {
    scope: periodNumber === undefined ? 'final' : 'period',
    periodNumber,
    matchId: match.id,
    title: periodNumber === undefined ? 'Resumen final' : `Resumen del tiempo ${periodNumber}`,
    scoreLabel: `${match.homeTeam.name} ${score[match.homeTeam.id] ?? 0} - ${score[match.awayTeam.id] ?? 0} ${match.awayTeam.name}`,
    createdAt: match.createdAt,
    dateLabel: formatDate(match.createdAt),
    statusLabel: statsMatchStatusLabel[match.status],
    formatLabel: `${match.settings.playersPerTeam} jugadores · ${match.settings.periodCount} tiempos × ${periodMinutes} min`,
    hasEvents: events.length > 0,
    home,
    away,
  };
}

export { formatPercent as formatStatsReportPercent };
