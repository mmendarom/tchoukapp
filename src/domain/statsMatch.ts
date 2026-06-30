import { CourtLocation } from './types';
import { deriveTacticalCourtSector, getCourtZone, TacticalCourtSector } from './court';

export const STATS_MATCH_STORE_DATA_VERSION = 1;

export const DEFAULT_STATS_MATCH_PLAYERS_PER_TEAM = 7;
export const DEFAULT_STATS_MATCH_PERIOD_COUNT = 3;
export const DEFAULT_STATS_MATCH_PERIOD_DURATION_SECONDS = 15 * 60;

export type StatsMatchStatus = 'draft' | 'live' | 'period_break' | 'finished' | 'cancelled';

export type StatsMatchPeriodStatus = 'not_started' | 'live' | 'finished';

export type StatsMatchSideKey = 'home' | 'away';

export type StatsMatchEventKind =
  | 'point'
  | 'shot_defended'
  | 'defense'
  | 'error'
  | 'own_point_against';

export type StatsMatchErrorSubtype =
  | 'turnover'
  | 'missed_frame'
  | 'bad_rebound'
  | 'forbidden_zone'
  | 'line_step';

export type StatsMatchFilter = 'active' | 'finished' | 'archived' | 'all';

export type StatsTeam = {
  id: string;
  name: string;
  category?: string;
  playerIds: string[];
};

export type StatsMatchSettings = {
  playersPerTeam: number;
  periodCount: number;
  periodDurationSeconds: number;
};

export type StatsMatchPeriod = {
  number: number;
  status: StatsMatchPeriodStatus;
  durationSeconds: number;
  startedAt?: string;
  finishedAt?: string;
};

export type StatsMatchScore = Record<string, number>;

export type StatsMatchEvent = {
  id: string;
  matchId: string;
  periodNumber: number;
  createdAt: string;
  teamId: string;
  playerId?: string;
  kind: StatsMatchEventKind;
  location?: CourtLocation;
  defenderPlayerId?: string;
  defendingTeamId?: string;
  errorSubtype?: StatsMatchErrorSubtype;
  scoreAfter?: StatsMatchScore;
};

export type StatsMatch = {
  id: string;
  createdAt: string;
  updatedAt: string;
  homeTeam: StatsTeam;
  awayTeam: StatsTeam;
  settings: StatsMatchSettings;
  status: StatsMatchStatus;
  currentPeriod: number;
  periods: StatsMatchPeriod[];
  events: StatsMatchEvent[];
  archivedAt?: string;
};

export type StatsMatchPlayerStats = {
  playerId: string;
  teamId: string;
  points: number;
  attempts: number;
  effectiveness: number;
  shotsDefended: number;
  ownPointsAgainst: number;
  errors: number;
  defenses: number;
};

export type StatsMatchTeamStats = {
  teamId: string;
  points: number;
  pointsAgainst: number;
  attempts: number;
  effectiveness: number;
  shotsDefendedByRival: number;
  defenses: number;
  errors: number;
  ownPointsAgainst: number;
};

export type StatsMatchStats = {
  score: StatsMatchScore;
  teamStats: StatsMatchTeamStats[];
  playerStats: StatsMatchPlayerStats[];
};

export type StatsMatchValidationResult = {
  valid: boolean;
  errors: string[];
};

export const uniqueStatsIds = (ids: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  (ids ?? []).forEach((id) => {
    const normalizedId = (id ?? '').trim();

    if (!normalizedId || seen.has(normalizedId)) {
      return;
    }

    seen.add(normalizedId);
    result.push(normalizedId);
  });

  return result;
};

const normalizePositiveInteger = (value: number | undefined, fallback: number): number => {
  if (!Number.isFinite(value) || !value || (value as number) < 1) {
    return fallback;
  }

  return Math.floor(value as number);
};

export function buildStatsMatchSettings(settings?: Partial<StatsMatchSettings>): StatsMatchSettings {
  return {
    playersPerTeam: normalizePositiveInteger(settings?.playersPerTeam, DEFAULT_STATS_MATCH_PLAYERS_PER_TEAM),
    periodCount: normalizePositiveInteger(settings?.periodCount, DEFAULT_STATS_MATCH_PERIOD_COUNT),
    periodDurationSeconds: normalizePositiveInteger(
      settings?.periodDurationSeconds,
      DEFAULT_STATS_MATCH_PERIOD_DURATION_SECONDS,
    ),
  };
}

export function createStatsMatchPeriods(settings: StatsMatchSettings): StatsMatchPeriod[] {
  return Array.from({ length: settings.periodCount }, (_, index) => ({
    number: index + 1,
    status: 'not_started' as StatsMatchPeriodStatus,
    durationSeconds: settings.periodDurationSeconds,
  }));
}

export function normalizeStatsTeam(team: StatsTeam, fallbackName: string): StatsTeam {
  const category = team.category?.trim();

  return {
    id: team.id?.trim() || fallbackName,
    name: team.name?.trim() || fallbackName,
    category: category || undefined,
    playerIds: uniqueStatsIds(team.playerIds ?? []),
  };
}

export function validateStatsMatchSetup(
  homeTeam: StatsTeam,
  awayTeam: StatsTeam,
  settings: StatsMatchSettings,
): StatsMatchValidationResult {
  const errors: string[] = [];
  const playersPerTeam = normalizePositiveInteger(settings.playersPerTeam, DEFAULT_STATS_MATCH_PLAYERS_PER_TEAM);
  const homePlayers = uniqueStatsIds(homeTeam.playerIds ?? []);
  const awayPlayers = uniqueStatsIds(awayTeam.playerIds ?? []);

  if (!homeTeam.id?.trim() || !awayTeam.id?.trim()) {
    errors.push('Cada cuadro necesita un id.');
  }

  if (homeTeam.id?.trim() && homeTeam.id.trim() === awayTeam.id?.trim()) {
    errors.push('Elegi dos cuadros distintos.');
  }

  if (homePlayers.length < playersPerTeam) {
    errors.push(`El cuadro local necesita al menos ${playersPerTeam} jugadores.`);
  }

  if (awayPlayers.length < playersPerTeam) {
    errors.push(`El cuadro visitante necesita al menos ${playersPerTeam} jugadores.`);
  }

  if (homePlayers.length !== (homeTeam.playerIds ?? []).length) {
    errors.push('El cuadro local tiene jugadores duplicados.');
  }

  if (awayPlayers.length !== (awayTeam.playerIds ?? []).length) {
    errors.push('El cuadro visitante tiene jugadores duplicados.');
  }

  const awaySet = new Set(awayPlayers);
  const sharedPlayer = homePlayers.find((playerId) => awaySet.has(playerId));

  if (sharedPlayer) {
    errors.push('Un jugador no puede estar en los dos cuadros.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function getStatsMatchTeam(match: Pick<StatsMatch, 'homeTeam' | 'awayTeam'>, teamId: string): StatsTeam | undefined {
  if (match.homeTeam.id === teamId) {
    return match.homeTeam;
  }

  if (match.awayTeam.id === teamId) {
    return match.awayTeam;
  }

  return undefined;
}

export function getOpposingStatsTeamId(
  match: Pick<StatsMatch, 'homeTeam' | 'awayTeam'>,
  teamId: string,
): string | undefined {
  if (teamId === match.homeTeam.id) {
    return match.awayTeam.id;
  }

  if (teamId === match.awayTeam.id) {
    return match.homeTeam.id;
  }

  return undefined;
}

export function isPlayerInStatsTeam(
  match: Pick<StatsMatch, 'homeTeam' | 'awayTeam'>,
  teamId: string,
  playerId?: string,
): boolean {
  if (!playerId) {
    return false;
  }

  return Boolean(getStatsMatchTeam(match, teamId)?.playerIds.includes(playerId));
}

export function getStatsEventScoringTeamId(
  match: Pick<StatsMatch, 'homeTeam' | 'awayTeam'>,
  event: Pick<StatsMatchEvent, 'teamId' | 'kind'>,
): string | undefined {
  if (event.kind === 'point') {
    return event.teamId;
  }

  if (event.kind === 'own_point_against') {
    return getOpposingStatsTeamId(match, event.teamId);
  }

  return undefined;
}

export function getStatsMatchScore(
  match: Pick<StatsMatch, 'homeTeam' | 'awayTeam' | 'events'>,
  events?: StatsMatchEvent[],
): StatsMatchScore {
  const score: StatsMatchScore = {
    [match.homeTeam.id]: 0,
    [match.awayTeam.id]: 0,
  };

  (events ?? match.events).forEach((event) => {
    const scoringTeamId = getStatsEventScoringTeamId(match, event);

    if (scoringTeamId && scoringTeamId in score) {
      score[scoringTeamId] += 1;
    }
  });

  return score;
}

const eventMatchesPeriod = (event: StatsMatchEvent, periodNumber?: number) =>
  periodNumber === undefined || event.periodNumber === periodNumber;

const createEmptyPlayerStats = (playerId: string, teamId: string): StatsMatchPlayerStats => ({
  playerId,
  teamId,
  points: 0,
  attempts: 0,
  effectiveness: 0,
  shotsDefended: 0,
  ownPointsAgainst: 0,
  errors: 0,
  defenses: 0,
});

const createEmptyTeamStats = (teamId: string): StatsMatchTeamStats => ({
  teamId,
  points: 0,
  pointsAgainst: 0,
  attempts: 0,
  effectiveness: 0,
  shotsDefendedByRival: 0,
  defenses: 0,
  errors: 0,
  ownPointsAgainst: 0,
});

export function getStatsMatchStats(
  match: StatsMatch,
  options?: { periodNumber?: number },
): StatsMatchStats {
  const periodNumber = options?.periodNumber;
  const teams = [match.homeTeam, match.awayTeam];
  const playerTeamById = new Map<string, string>();
  const playerStatsById = new Map<string, StatsMatchPlayerStats>();
  const teamStatsById = new Map<string, StatsMatchTeamStats>();

  teams.forEach((team) => {
    teamStatsById.set(team.id, createEmptyTeamStats(team.id));
    team.playerIds.forEach((playerId) => {
      playerTeamById.set(playerId, team.id);
      playerStatsById.set(playerId, createEmptyPlayerStats(playerId, team.id));
    });
  });

  const getPlayerStats = (playerId: string, teamId: string) => {
    if (!playerStatsById.has(playerId)) {
      playerStatsById.set(playerId, createEmptyPlayerStats(playerId, teamId));
    }

    return playerStatsById.get(playerId)!;
  };

  const getTeamStats = (teamId: string) => {
    if (!teamStatsById.has(teamId)) {
      teamStatsById.set(teamId, createEmptyTeamStats(teamId));
    }

    return teamStatsById.get(teamId)!;
  };

  const relevantEvents = match.events.filter((event) => eventMatchesPeriod(event, periodNumber));
  const score = getStatsMatchScore(match, relevantEvents);

  relevantEvents.forEach((event) => {
    const teamStats = getTeamStats(event.teamId);

    switch (event.kind) {
      case 'point':
        teamStats.points += 1;
        teamStats.attempts += 1;
        break;
      case 'shot_defended':
        teamStats.shotsDefendedByRival += 1;
        teamStats.attempts += 1;
        if (event.defendingTeamId) {
          getTeamStats(event.defendingTeamId).defenses += 1;
        }
        break;
      case 'own_point_against':
        teamStats.ownPointsAgainst += 1;
        teamStats.attempts += 1;
        break;
      case 'error':
        teamStats.errors += 1;
        break;
      case 'defense':
        teamStats.defenses += 1;
        break;
    }

    if (event.playerId) {
      const stats = getPlayerStats(event.playerId, event.teamId);

      switch (event.kind) {
        case 'point':
          stats.points += 1;
          stats.attempts += 1;
          break;
        case 'shot_defended':
          stats.shotsDefended += 1;
          stats.attempts += 1;
          break;
        case 'own_point_against':
          stats.ownPointsAgainst += 1;
          stats.attempts += 1;
          break;
        case 'error':
          stats.errors += 1;
          break;
        case 'defense':
          stats.defenses += 1;
          break;
      }
    }

    if (event.kind === 'shot_defended' && event.defenderPlayerId && event.defendingTeamId) {
      getPlayerStats(event.defenderPlayerId, event.defendingTeamId).defenses += 1;
    }
  });

  const teamStats = teams.map((team) => {
    const stats = getTeamStats(team.id);
    const opposingTeamId = team.id === match.homeTeam.id ? match.awayTeam.id : match.homeTeam.id;

    return {
      ...stats,
      points: score[team.id] ?? stats.points,
      pointsAgainst: score[opposingTeamId] ?? 0,
      effectiveness: stats.attempts > 0 ? stats.points / stats.attempts : 0,
    };
  });

  const playerStats = Array.from(playerStatsById.values())
    .map((stats) => ({
      ...stats,
      effectiveness: stats.attempts > 0 ? stats.points / stats.attempts : 0,
    }))
    .sort((a, b) => a.teamId.localeCompare(b.teamId) || a.playerId.localeCompare(b.playerId));

  return {
    score,
    teamStats,
    playerStats,
  };
}

const sortAttackers = (a: StatsMatchPlayerStats, b: StatsMatchPlayerStats) =>
  b.points - a.points || b.attempts - a.attempts || b.effectiveness - a.effectiveness || a.playerId.localeCompare(b.playerId);

const sortDefenders = (a: StatsMatchPlayerStats, b: StatsMatchPlayerStats) =>
  b.defenses - a.defenses || a.playerId.localeCompare(b.playerId);

const sortErrors = (a: StatsMatchPlayerStats, b: StatsMatchPlayerStats) =>
  b.errors - a.errors || a.playerId.localeCompare(b.playerId);

export function rankStatsAttackers(playerStats: StatsMatchPlayerStats[], teamId?: string, limit = 5) {
  return playerStats
    .filter((stats) => (!teamId || stats.teamId === teamId) && (stats.points > 0 || stats.attempts > 0))
    .sort(sortAttackers)
    .slice(0, limit);
}

export function rankStatsDefenders(playerStats: StatsMatchPlayerStats[], teamId?: string, limit = 5) {
  return playerStats
    .filter((stats) => (!teamId || stats.teamId === teamId) && stats.defenses > 0)
    .sort(sortDefenders)
    .slice(0, limit);
}

export function rankStatsErrors(playerStats: StatsMatchPlayerStats[], teamId?: string, limit = 5) {
  return playerStats
    .filter((stats) => (!teamId || stats.teamId === teamId) && stats.errors > 0)
    .sort(sortErrors)
    .slice(0, limit);
}

export function getStatsEventTacticalSector(event: StatsMatchEvent): TacticalCourtSector | undefined {
  if (!event.location) {
    return undefined;
  }

  return deriveTacticalCourtSector(event.location);
}

export function getStatsEventCourtZone(event: StatsMatchEvent) {
  if (!event.location) {
    return undefined;
  }

  return getCourtZone(event.location);
}

export function filterStatsMatches(matches: StatsMatch[], filter: StatsMatchFilter): StatsMatch[] {
  switch (filter) {
    case 'active':
      return matches.filter(
        (match) => !match.archivedAt && (match.status === 'draft' || match.status === 'live' || match.status === 'period_break'),
      );
    case 'finished':
      return matches.filter((match) => !match.archivedAt && (match.status === 'finished' || match.status === 'cancelled'));
    case 'archived':
      return matches.filter((match) => Boolean(match.archivedAt));
    case 'all':
      return matches;
  }
}

export function isStatsMatchClosed(match: Pick<StatsMatch, 'status' | 'archivedAt'>): boolean {
  return match.status === 'finished' || match.status === 'cancelled' || Boolean(match.archivedAt);
}

export function hasStatsMatchHistory(match: Pick<StatsMatch, 'events' | 'status'>): boolean {
  return match.events.length > 0 || match.status !== 'draft';
}

export function statsEventRequiresPlayer(kind: StatsMatchEventKind): boolean {
  return ['point', 'shot_defended', 'defense', 'error', 'own_point_against'].includes(kind);
}
