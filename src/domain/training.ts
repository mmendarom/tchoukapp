import { CourtLocation } from './types';

export const DEFAULT_TRAINING_TARGET_SCORE = 3;
export const TRAINING_STORE_DATA_VERSION = 1;

export type TrainingSessionStatus = 'draft' | 'live' | 'finished' | 'cancelled';

export type TrainingMiniMatchStatus = 'scheduled' | 'live' | 'finished' | 'cancelled';

export type TrainingEventType =
  | 'point'
  | 'defense'
  | 'shot_defended'
  | 'error'
  | 'own_point_against';

export type TrainingSessionSettings = {
  targetScore: number;
  winnerStays: boolean;
};

export type TrainingTeam = {
  id: string;
  name: string;
  playerIds: string[];
  queueOrder: number;
  color?: string;
};

export type TrainingEvent = {
  id: string;
  sessionId: string;
  miniMatchId: string;
  createdAt: string;
  teamId: string;
  playerId?: string;
  type: TrainingEventType;
  location?: CourtLocation;
  errorType?: 'falta' | 'punto_en_contra' | 'turnover' | 'other';
  scoreAfter?: {
    teamA: number;
    teamB: number;
  };
};

export type TrainingMiniMatch = {
  id: string;
  sessionId: string;
  teamAId: string;
  teamBId: string;
  scoreA: number;
  scoreB: number;
  targetScore: number;
  winnerTeamId?: string;
  loserTeamId?: string;
  status: TrainingMiniMatchStatus;
  startedAt?: string;
  endedAt?: string;
  events: TrainingEvent[];
};

export type TrainingSession = {
  id: string;
  createdAt: string;
  updatedAt: string;
  teamPoolId?: string;
  teamPoolName?: string;
  participantPlayerIds: string[];
  teams: TrainingTeam[];
  teamQueue?: string[];
  miniMatches: TrainingMiniMatch[];
  activeMiniMatchId?: string;
  settings: TrainingSessionSettings;
  status: TrainingSessionStatus;
};

export type TrainingPlayerStats = {
  playerId: string;
  teamIds: string[];
  points: number;
  attempts: number;
  effectiveness: number;
  shotsDefended: number;
  ownPointsAgainst: number;
  errors: number;
  defenses: number;
  miniMatchesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  plusMinus: number;
};

export type TrainingTeamStats = {
  teamId: string;
  played: number;
  wins: number;
  losses: number;
  winRate: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
};

export type TrainingSessionStats = {
  totalMiniMatches: number;
  finishedMiniMatches: number;
  activeMiniMatch?: TrainingMiniMatch;
  totalPoints: number;
  playerStats: TrainingPlayerStats[];
  teamStats: TrainingTeamStats[];
  topAttackers: TrainingPlayerStats[];
  topDefenders: TrainingPlayerStats[];
  mostEfficientPlayers: TrainingPlayerStats[];
  mostErrors: TrainingPlayerStats[];
  mostOwnPointsAgainst: TrainingPlayerStats[];
};

export type TrainingValidationResult = {
  valid: boolean;
  errors: string[];
};

export const uniqueTrainingIds = (ids: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];

  ids.forEach((id) => {
    const normalizedId = id.trim();

    if (!normalizedId || seen.has(normalizedId)) {
      return;
    }

    seen.add(normalizedId);
    result.push(normalizedId);
  });

  return result;
};

export function normalizeTrainingTargetScore(targetScore?: number) {
  if (!Number.isFinite(targetScore) || !targetScore || targetScore < 1) {
    return DEFAULT_TRAINING_TARGET_SCORE;
  }

  return Math.floor(targetScore);
}

export function buildTrainingSettings(settings?: Partial<TrainingSessionSettings>): TrainingSessionSettings {
  return {
    targetScore: normalizeTrainingTargetScore(settings?.targetScore),
    winnerStays: settings?.winnerStays ?? true,
  };
}

export function validateTrainingTeams(participantPlayerIds: string[], teams: TrainingTeam[]): TrainingValidationResult {
  const errors: string[] = [];
  const participantIds = new Set(uniqueTrainingIds(participantPlayerIds));
  const assignedPlayerIds = new Set<string>();
  const teamIds = new Set<string>();

  if (participantIds.size < 6) {
    errors.push('Se necesitan al menos 6 jugadores para una practica.');
  }

  if (teams.length < 2) {
    errors.push('Se necesitan al menos 2 equipos.');
  }

  teams.forEach((team) => {
    if (!team.id.trim()) {
      errors.push('Cada equipo necesita un id.');
    }

    if (teamIds.has(team.id)) {
      errors.push(`Equipo duplicado: ${team.id}.`);
    }

    teamIds.add(team.id);

    const playerIds = uniqueTrainingIds(team.playerIds);

    if (playerIds.length < 3 || playerIds.length > 4) {
      errors.push(`${team.name || team.id} necesita 3 o 4 jugadores.`);
    }

    if (playerIds.length !== team.playerIds.length) {
      errors.push(`${team.name || team.id} tiene jugadores duplicados.`);
    }

    playerIds.forEach((playerId) => {
      if (!participantIds.has(playerId)) {
        errors.push(`${playerId} no esta entre los jugadores presentes.`);
      }

      if (assignedPlayerIds.has(playerId)) {
        errors.push(`${playerId} esta asignado a mas de un equipo.`);
      }

      assignedPlayerIds.add(playerId);
    });
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function getOppositeTrainingTeamId(miniMatch: Pick<TrainingMiniMatch, 'teamAId' | 'teamBId'>, teamId: string) {
  if (teamId === miniMatch.teamAId) {
    return miniMatch.teamBId;
  }

  if (teamId === miniMatch.teamBId) {
    return miniMatch.teamAId;
  }

  return undefined;
}

export function getTrainingEventScoringTeamId(
  miniMatch: Pick<TrainingMiniMatch, 'teamAId' | 'teamBId'>,
  event: Pick<TrainingEvent, 'teamId' | 'type'>,
) {
  if (event.type === 'point') {
    return event.teamId;
  }

  if (event.type === 'own_point_against') {
    return getOppositeTrainingTeamId(miniMatch, event.teamId);
  }

  return undefined;
}

export function getTrainingMiniMatchScore(miniMatch: Pick<TrainingMiniMatch, 'teamAId' | 'teamBId' | 'events'>) {
  return miniMatch.events.reduce(
    (score, event) => {
      const scoringTeamId = getTrainingEventScoringTeamId(miniMatch, event);

      if (scoringTeamId === miniMatch.teamAId) {
        return { ...score, scoreA: score.scoreA + 1 };
      }

      if (scoringTeamId === miniMatch.teamBId) {
        return { ...score, scoreB: score.scoreB + 1 };
      }

      return score;
    },
    { scoreA: 0, scoreB: 0 },
  );
}

export function getTrainingMiniMatchWinner(miniMatch: Pick<TrainingMiniMatch, 'scoreA' | 'scoreB' | 'targetScore' | 'teamAId' | 'teamBId'>) {
  if (miniMatch.scoreA >= miniMatch.targetScore && miniMatch.scoreA > miniMatch.scoreB) {
    return {
      winnerTeamId: miniMatch.teamAId,
      loserTeamId: miniMatch.teamBId,
    };
  }

  if (miniMatch.scoreB >= miniMatch.targetScore && miniMatch.scoreB > miniMatch.scoreA) {
    return {
      winnerTeamId: miniMatch.teamBId,
      loserTeamId: miniMatch.teamAId,
    };
  }

  return {
    winnerTeamId: undefined,
    loserTeamId: undefined,
  };
}

export function recalculateTrainingMiniMatch(miniMatch: TrainingMiniMatch): TrainingMiniMatch {
  const score = getTrainingMiniMatchScore(miniMatch);
  const winner = getTrainingMiniMatchWinner({ ...miniMatch, ...score });
  const shouldClearFinishedState = miniMatch.status !== 'finished';

  return {
    ...miniMatch,
    ...score,
    winnerTeamId: winner.winnerTeamId,
    loserTeamId: winner.loserTeamId,
    endedAt: shouldClearFinishedState && !winner.winnerTeamId ? undefined : miniMatch.endedAt,
  };
}

export function getTrainingQueue(session: Pick<TrainingSession, 'teams' | 'teamQueue'>): TrainingTeam[] {
  const teamsById = new Map(session.teams.map((team) => [team.id, team]));
  const queueIds = uniqueTrainingIds(session.teamQueue ?? []);
  const queuedTeams = queueIds
    .map((teamId) => teamsById.get(teamId))
    .filter((team): team is TrainingTeam => Boolean(team));
  const queuedTeamIds = new Set(queuedTeams.map((team) => team.id));
  const missingTeams = [...session.teams]
    .filter((team) => !queuedTeamIds.has(team.id))
    .sort((a, b) => a.queueOrder - b.queueOrder || a.name.localeCompare(b.name));

  return [...queuedTeams, ...missingTeams];
}

export function getSuggestedNextMiniMatch(session: Pick<TrainingSession, 'teams' | 'teamQueue' | 'miniMatches'>) {
  const queue = getTrainingQueue(session);
  const hasActiveMiniMatch = session.miniMatches.some((miniMatch) => miniMatch.status === 'live');

  if (hasActiveMiniMatch || queue.length < 2) {
    return undefined;
  }

  return {
    teamAId: queue[0].id,
    teamBId: queue[1].id,
  };
}

export function advanceTrainingQueueAfterMiniMatch(
  session: Pick<TrainingSession, 'teams' | 'teamQueue' | 'settings'>,
  miniMatch: Pick<TrainingMiniMatch, 'teamAId' | 'teamBId' | 'winnerTeamId' | 'loserTeamId'>,
) {
  const currentQueue = getTrainingQueue(session);

  if (currentQueue.length < 2 || !miniMatch.winnerTeamId || !miniMatch.loserTeamId) {
    return currentQueue.map((team) => team.id);
  }

  const playingTeamIds = new Set([miniMatch.teamAId, miniMatch.teamBId]);
  const waitingTeamIds = currentQueue
    .filter((team) => !playingTeamIds.has(team.id))
    .map((team) => team.id);

  if (currentQueue.length === 2) {
    return [miniMatch.winnerTeamId, miniMatch.loserTeamId];
  }

  if (session.settings.winnerStays) {
    const nextWaitingTeamId = waitingTeamIds[0];
    const remainingWaitingTeamIds = waitingTeamIds.slice(1);

    if (!nextWaitingTeamId) {
      return [miniMatch.winnerTeamId, miniMatch.loserTeamId];
    }

    return uniqueTrainingIds([
      miniMatch.winnerTeamId,
      nextWaitingTeamId,
      ...remainingWaitingTeamIds,
      miniMatch.loserTeamId,
    ]);
  }

  const rotatedPlayingTeamIds = currentQueue
    .filter((team) => playingTeamIds.has(team.id))
    .map((team) => team.id);

  return uniqueTrainingIds([...waitingTeamIds, ...rotatedPlayingTeamIds]);
}

const createEmptyPlayerStats = (playerId: string): TrainingPlayerStats => ({
  playerId,
  teamIds: [],
  points: 0,
  attempts: 0,
  effectiveness: 0,
  shotsDefended: 0,
  ownPointsAgainst: 0,
  errors: 0,
  defenses: 0,
  miniMatchesPlayed: 0,
  wins: 0,
  losses: 0,
  winRate: 0,
  plusMinus: 0,
});

const createEmptyTeamStats = (teamId: string): TrainingTeamStats => ({
  teamId,
  played: 0,
  wins: 0,
  losses: 0,
  winRate: 0,
  pointsFor: 0,
  pointsAgainst: 0,
  pointDiff: 0,
});

const sortTrainingAttackers = (a: TrainingPlayerStats, b: TrainingPlayerStats) =>
  b.points - a.points ||
  b.attempts - a.attempts ||
  b.effectiveness - a.effectiveness ||
  a.playerId.localeCompare(b.playerId);

const sortTrainingDefenders = (a: TrainingPlayerStats, b: TrainingPlayerStats) =>
  b.defenses - a.defenses || b.miniMatchesPlayed - a.miniMatchesPlayed || a.playerId.localeCompare(b.playerId);

const sortTrainingProblemStats = (field: 'errors' | 'ownPointsAgainst') =>
  (a: TrainingPlayerStats, b: TrainingPlayerStats) =>
    b[field] - a[field] || b.attempts - a.attempts || a.playerId.localeCompare(b.playerId);

const sortTrainingEfficiency = (a: TrainingPlayerStats, b: TrainingPlayerStats) =>
  b.effectiveness - a.effectiveness ||
  b.points - a.points ||
  b.attempts - a.attempts ||
  a.playerId.localeCompare(b.playerId);

export function getTrainingSessionStats(session: TrainingSession): TrainingSessionStats {
  const teamById = new Map(session.teams.map((team) => [team.id, team]));
  const playerStatsById = new Map<string, TrainingPlayerStats>();
  const teamStatsById = new Map(session.teams.map((team) => [team.id, createEmptyTeamStats(team.id)]));
  const activeMiniMatch = session.miniMatches.find((miniMatch) => miniMatch.status === 'live');
  let totalPoints = 0;

  const getPlayerStats = (playerId: string) => {
    if (!playerStatsById.has(playerId)) {
      playerStatsById.set(playerId, createEmptyPlayerStats(playerId));
    }

    return playerStatsById.get(playerId)!;
  };

  session.participantPlayerIds.forEach((playerId) => {
    getPlayerStats(playerId);
  });

  session.teams.forEach((team) => {
    team.playerIds.forEach((playerId) => {
      const stats = getPlayerStats(playerId);

      if (!stats.teamIds.includes(team.id)) {
        stats.teamIds.push(team.id);
      }
    });
  });

  session.miniMatches.forEach((miniMatch) => {
    const normalizedMiniMatch = recalculateTrainingMiniMatch(miniMatch);
    const teamAStats = teamStatsById.get(normalizedMiniMatch.teamAId) ?? createEmptyTeamStats(normalizedMiniMatch.teamAId);
    const teamBStats = teamStatsById.get(normalizedMiniMatch.teamBId) ?? createEmptyTeamStats(normalizedMiniMatch.teamBId);
    const countsAsPlayed = normalizedMiniMatch.status === 'live' || normalizedMiniMatch.status === 'finished';

    if (countsAsPlayed) {
      teamAStats.played += 1;
      teamBStats.played += 1;
      teamAStats.pointsFor += normalizedMiniMatch.scoreA;
      teamAStats.pointsAgainst += normalizedMiniMatch.scoreB;
      teamBStats.pointsFor += normalizedMiniMatch.scoreB;
      teamBStats.pointsAgainst += normalizedMiniMatch.scoreA;
      totalPoints += normalizedMiniMatch.scoreA + normalizedMiniMatch.scoreB;
    }

    if (normalizedMiniMatch.status === 'finished') {
      if (normalizedMiniMatch.winnerTeamId === normalizedMiniMatch.teamAId) {
        teamAStats.wins += 1;
        teamBStats.losses += 1;
      }

      if (normalizedMiniMatch.winnerTeamId === normalizedMiniMatch.teamBId) {
        teamBStats.wins += 1;
        teamAStats.losses += 1;
      }
    }

    teamAStats.pointDiff = teamAStats.pointsFor - teamAStats.pointsAgainst;
    teamBStats.pointDiff = teamBStats.pointsFor - teamBStats.pointsAgainst;
    teamAStats.winRate = teamAStats.played > 0 ? teamAStats.wins / teamAStats.played : 0;
    teamBStats.winRate = teamBStats.played > 0 ? teamBStats.wins / teamBStats.played : 0;
    teamStatsById.set(teamAStats.teamId, teamAStats);
    teamStatsById.set(teamBStats.teamId, teamBStats);

    if (countsAsPlayed) {
      [normalizedMiniMatch.teamAId, normalizedMiniMatch.teamBId].forEach((teamId) => {
        teamById.get(teamId)?.playerIds.forEach((playerId) => {
          const stats = getPlayerStats(playerId);

          stats.miniMatchesPlayed += 1;

          if (normalizedMiniMatch.status === 'finished') {
            if (normalizedMiniMatch.winnerTeamId === teamId) {
              stats.wins += 1;
            } else if (normalizedMiniMatch.loserTeamId === teamId) {
              stats.losses += 1;
            }
          }

          if (teamId === normalizedMiniMatch.teamAId) {
            stats.plusMinus += normalizedMiniMatch.scoreA - normalizedMiniMatch.scoreB;
          } else if (teamId === normalizedMiniMatch.teamBId) {
            stats.plusMinus += normalizedMiniMatch.scoreB - normalizedMiniMatch.scoreA;
          }
        });
      });
    }

    if (!countsAsPlayed) {
      return;
    }

    normalizedMiniMatch.events.forEach((event) => {
      if (!event.playerId) {
        return;
      }

      const stats = getPlayerStats(event.playerId);

      switch (event.type) {
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
    });
  });

  const playerStats = Array.from(playerStatsById.values()).map((stats) => ({
    ...stats,
    effectiveness: stats.attempts > 0 ? stats.points / stats.attempts : 0,
    winRate: stats.miniMatchesPlayed > 0 ? stats.wins / stats.miniMatchesPlayed : 0,
    teamIds: [...stats.teamIds].sort(),
  }));
  const teamStats = Array.from(teamStatsById.values())
    .map((stats) => ({
      ...stats,
      winRate: stats.played > 0 ? stats.wins / stats.played : 0,
      pointDiff: stats.pointsFor - stats.pointsAgainst,
    }))
    .sort((a, b) => b.wins - a.wins || b.pointDiff - a.pointDiff || b.pointsFor - a.pointsFor || a.teamId.localeCompare(b.teamId));

  return {
    totalMiniMatches: session.miniMatches.length,
    finishedMiniMatches: session.miniMatches.filter((miniMatch) => miniMatch.status === 'finished').length,
    activeMiniMatch,
    totalPoints,
    playerStats: playerStats.sort((a, b) => a.playerId.localeCompare(b.playerId)),
    teamStats,
    topAttackers: playerStats.filter((stats) => stats.points > 0 || stats.attempts > 0).sort(sortTrainingAttackers).slice(0, 5),
    topDefenders: playerStats.filter((stats) => stats.defenses > 0).sort(sortTrainingDefenders).slice(0, 5),
    mostEfficientPlayers: playerStats.filter((stats) => stats.attempts >= 2).sort(sortTrainingEfficiency).slice(0, 5),
    mostErrors: playerStats.filter((stats) => stats.errors > 0).sort(sortTrainingProblemStats('errors')).slice(0, 5),
    mostOwnPointsAgainst: playerStats.filter((stats) => stats.ownPointsAgainst > 0).sort(sortTrainingProblemStats('ownPointsAgainst')).slice(0, 5),
  };
}
