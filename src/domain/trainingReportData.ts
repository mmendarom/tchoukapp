import {
  getTrainingSessionStats,
  recalculateTrainingMiniMatch,
  TrainingEvent,
  TrainingMiniMatch,
  TrainingSession,
} from './training';
import { deriveTrainingGoalSector } from './trainingGoalMap';
import {
  formatTrainingEventLabel,
  getTrainingPlayerLabel,
  getTrainingTeamName,
  trainingStatusLabel,
} from './trainingLive';
import { buildTrainingPerformance, TrainingPerformanceData } from './trainingPerformance';
import { CourtLocation, Player } from './types';

export type TrainingReportTeam = {
  teamId: string;
  name: string;
  players: string[];
};

export type TrainingReportStanding = {
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
  winRate: number;
};

export type TrainingReportMiniMatch = {
  id: string;
  scoreLabel: string;
  statusLabel: string;
  winnerLabel?: string;
  eventCount: number;
  events: string[];
};

export type TrainingReportLocation = {
  id: string;
  location: CourtLocation;
  label: string;
  teamName: string;
  playerName?: string;
  defenderName?: string;
  sectorLabel?: string;
  markerKind?: 'point' | 'shot_defended' | 'defense';
};

export type TrainingReportSectorStat = {
  key: string;
  label: string;
  total: number;
};

export type TrainingReportAlertRow = {
  playerId: string;
  playerName: string;
  value: number;
};

export type TrainingReportSummaryCard = {
  label: string;
  value: string;
};

export type TrainingReportPlayerDetail = {
  playerId: string;
  playerName: string;
  teamName?: string;
  miniMatchesPlayed: number;
  points: number;
  attempts: number;
  shotsDefended: number;
  ownPointsAgainst: number;
  effectiveness: number;
  defenses: number;
  defenseShare: number;
  errors: number;
  winRate: number;
  shotLocations: TrainingReportLocation[];
  defenseLocations: TrainingReportLocation[];
};

export type TrainingReportData = {
  title: string;
  teamPoolName?: string;
  dateLabel: string;
  createdAt: string;
  targetScore: number;
  winnerStaysLabel: string;
  statusLabel: string;
  teams: TrainingReportTeam[];
  summaryCards: TrainingReportSummaryCard[];
  standings: TrainingReportStanding[];
  performance: TrainingPerformanceData;
  topAttack: TrainingPerformanceData['attackRows'];
  topDefense: TrainingPerformanceData['defenseRows'];
  errors: TrainingReportAlertRow[];
  ownPointsAgainst: TrainingReportAlertRow[];
  miniMatches: TrainingReportMiniMatch[];
  pointLocations: TrainingReportLocation[];
  shotDefendedLocations: TrainingReportLocation[];
  scoringSectors: TrainingReportSectorStat[];
  defendedSectors: TrainingReportSectorStat[];
  playerDetails: TrainingReportPlayerDetail[];
};

const MAX_TOP_ROWS = 5;

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

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const formatDiff = (value: number) => value >= 0 ? `+${value}` : `${value}`;

const isTrackedMiniMatch = (miniMatch: TrainingMiniMatch) =>
  miniMatch.status === 'live' || miniMatch.status === 'finished';

const incrementSector = (rows: Map<string, TrainingReportSectorStat>, location?: CourtLocation) => {
  const sector = deriveTrainingGoalSector(location);

  if (!sector) {
    return;
  }

  const current = rows.get(sector.key);

  rows.set(sector.key, {
    key: sector.key,
    label: sector.shortLabel,
    total: (current?.total ?? 0) + 1,
  });
};

const sortSectorStats = (rows: Map<string, TrainingReportSectorStat>) =>
  Array.from(rows.values()).sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));

const buildLocationRow = (
  session: TrainingSession,
  players: Player[],
  miniMatch: TrainingMiniMatch,
  event: TrainingEvent,
  markerKind?: TrainingReportLocation['markerKind'],
): TrainingReportLocation | undefined => {
  if (!event.location) {
    return undefined;
  }

  const sector = deriveTrainingGoalSector(event.location);
  const playerName = getTrainingPlayerLabel(players, event.playerId);
  const defenderName = getTrainingPlayerLabel(players, event.defenderPlayerId);
  const label = event.type === 'shot_defended' && event.defenderPlayerId
    ? `Tiro de ${playerName} · atajó ${defenderName}`
    : formatTrainingEventLabel(event, session, players);

  return {
    id: `${miniMatch.id}:${event.id}`,
    location: event.location,
    label,
    teamName: getTrainingTeamName(session, event.teamId),
    playerName,
    defenderName: event.defenderPlayerId ? defenderName : undefined,
    sectorLabel: sector?.shortLabel,
    markerKind,
  };
};

const getOrCreateLocationBucket = (buckets: Map<string, TrainingReportLocation[]>, playerId: string) => {
  if (!buckets.has(playerId)) {
    buckets.set(playerId, []);
  }

  return buckets.get(playerId)!;
};

export function buildTrainingReportData(session: TrainingSession, players: Player[]): TrainingReportData {
  const stats = getTrainingSessionStats(session);
  const performance = buildTrainingPerformance(session, players);
  const pointSectorTotals = new Map<string, TrainingReportSectorStat>();
  const defendedSectorTotals = new Map<string, TrainingReportSectorStat>();
  const pointLocations: TrainingReportLocation[] = [];
  const shotDefendedLocations: TrainingReportLocation[] = [];
  const playerShotLocations = new Map<string, TrainingReportLocation[]>();
  const playerDefenseLocations = new Map<string, TrainingReportLocation[]>();
  const trackedMiniMatches = session.miniMatches.filter(isTrackedMiniMatch);
  const bestTeam = stats.teamStats[0];
  const topAttack = performance.attackRows.filter((row) => row.attempts > 0).slice(0, MAX_TOP_ROWS);
  const topDefense = performance.defenseRows.filter((row) => row.defenses > 0).slice(0, MAX_TOP_ROWS);

  trackedMiniMatches.forEach((miniMatch) => {
    miniMatch.events.forEach((event) => {
      if (event.type === 'point') {
        incrementSector(pointSectorTotals, event.location);
        const row = buildLocationRow(session, players, miniMatch, event, 'point');

        if (row) {
          pointLocations.push(row);

          if (event.playerId) {
            getOrCreateLocationBucket(playerShotLocations, event.playerId).push(row);
          }
        }
      }

      if (event.type === 'shot_defended') {
        incrementSector(defendedSectorTotals, event.location);
        const shotRow = buildLocationRow(session, players, miniMatch, event, 'shot_defended');

        if (shotRow) {
          shotDefendedLocations.push(shotRow);

          if (event.playerId) {
            getOrCreateLocationBucket(playerShotLocations, event.playerId).push(shotRow);
          }

          if (event.defenderPlayerId) {
            getOrCreateLocationBucket(playerDefenseLocations, event.defenderPlayerId).push({
              ...shotRow,
              id: `${shotRow.id}:defense:${event.defenderPlayerId}`,
              label: `${shotRow.defenderName ?? getTrainingPlayerLabel(players, event.defenderPlayerId)} defendió tiro de ${shotRow.playerName ?? 'Jugador'}`,
              markerKind: 'defense',
            });
          }
        }
      }
    });
  });

  const playerStatsById = new Map(stats.playerStats.map((player) => [player.playerId, player]));
  const defenseRowsById = new Map(performance.defenseRows.map((row) => [row.playerId, row]));
  const playerDetails = performance.attackRows.map((row) => {
    const playerStats = playerStatsById.get(row.playerId);
    const defenseRow = defenseRowsById.get(row.playerId);

    return {
      playerId: row.playerId,
      playerName: row.playerName,
      teamName: row.teamName,
      miniMatchesPlayed: playerStats?.miniMatchesPlayed ?? 0,
      points: row.points,
      attempts: row.attempts,
      shotsDefended: row.shotsDefended,
      ownPointsAgainst: row.ownPointsAgainst,
      effectiveness: row.effectiveness ?? 0,
      defenses: defenseRow?.defenses ?? 0,
      defenseShare: defenseRow?.defenseShare ?? 0,
      errors: playerStats?.errors ?? 0,
      winRate: playerStats?.winRate ?? 0,
      shotLocations: playerShotLocations.get(row.playerId) ?? [],
      defenseLocations: playerDefenseLocations.get(row.playerId) ?? [],
    };
  });

  return {
    title: session.teamPoolName?.trim() ? `Práctica 3v3 · ${session.teamPoolName.trim()}` : 'Práctica 3v3',
    teamPoolName: session.teamPoolName,
    dateLabel: formatDate(session.createdAt),
    createdAt: session.createdAt,
    targetScore: session.settings.targetScore,
    winnerStaysLabel: session.settings.winnerStays ? 'Sí' : 'No',
    statusLabel: trainingStatusLabel[session.status],
    teams: session.teams.map((team) => ({
      teamId: team.id,
      name: team.name,
      players: team.playerIds.map((playerId) => getTrainingPlayerLabel(players, playerId)),
    })),
    summaryCards: [
      { label: 'Mini partidos jugados', value: `${trackedMiniMatches.length}` },
      { label: 'Equipos', value: `${session.teams.length}` },
      { label: 'Puntos totales', value: `${stats.totalPoints}` },
      { label: 'Puntos para ganar', value: `${session.settings.targetScore}` },
      { label: 'Ganador queda', value: session.settings.winnerStays ? 'Sí' : 'No' },
      { label: 'Mejor equipo', value: bestTeam ? `${getTrainingTeamName(session, bestTeam.teamId)} (${formatDiff(bestTeam.pointDiff)})` : 'Sin datos' },
      { label: 'Top ataque', value: topAttack[0] ? `${topAttack[0].playerName} · ${topAttack[0].points}/${topAttack[0].attempts}` : 'Sin tiros' },
      { label: 'Top defensa', value: topDefense[0] ? `${topDefense[0].playerName} · ${topDefense[0].defenses}` : 'Sin defensas' },
    ],
    standings: stats.teamStats.map((team) => ({
      teamId: team.teamId,
      teamName: getTrainingTeamName(session, team.teamId),
      played: team.played,
      wins: team.wins,
      losses: team.losses,
      pointsFor: team.pointsFor,
      pointsAgainst: team.pointsAgainst,
      pointDiff: team.pointDiff,
      winRate: team.winRate,
    })),
    performance,
    topAttack,
    topDefense,
    errors: stats.mostErrors.slice(0, MAX_TOP_ROWS).map((player) => ({
      playerId: player.playerId,
      playerName: getTrainingPlayerLabel(players, player.playerId),
      value: player.errors,
    })),
    ownPointsAgainst: stats.mostOwnPointsAgainst.slice(0, MAX_TOP_ROWS).map((player) => ({
      playerId: player.playerId,
      playerName: getTrainingPlayerLabel(players, player.playerId),
      value: player.ownPointsAgainst,
    })),
    miniMatches: session.miniMatches.map((miniMatch) => {
      const normalized = recalculateTrainingMiniMatch(miniMatch);

      return {
        id: normalized.id,
        scoreLabel: `${getTrainingTeamName(session, normalized.teamAId)} ${normalized.scoreA} - ${normalized.scoreB} ${getTrainingTeamName(session, normalized.teamBId)}`,
        statusLabel: trainingStatusLabel[normalized.status],
        winnerLabel: normalized.winnerTeamId ? getTrainingTeamName(session, normalized.winnerTeamId) : undefined,
        eventCount: normalized.events.length,
        events: normalized.events.map((event) => formatTrainingEventLabel(event, session, players)),
      };
    }),
    pointLocations,
    shotDefendedLocations,
    scoringSectors: sortSectorStats(pointSectorTotals),
    defendedSectors: sortSectorStats(defendedSectorTotals),
    playerDetails,
  };
}

export { formatPercent as formatTrainingReportPercent };
