import { getTrainingSessionStats, TrainingSession } from './training';
import { Player } from './types';

export type TrainingPerformanceAttackRow = {
  playerId: string;
  playerName: string;
  teamId?: string;
  teamName?: string;
  points: number;
  attempts: number;
  shotsDefended: number;
  ownPointsAgainst: number;
  effectiveness: number | undefined;
};

export type TrainingPerformanceDefenseRow = {
  playerId: string;
  playerName: string;
  teamId?: string;
  teamName?: string;
  defenses: number;
  defenseShare: number;
};

export type TrainingPerformanceData = {
  attackRows: TrainingPerformanceAttackRow[];
  defenseRows: TrainingPerformanceDefenseRow[];
  topAttackPlayerIds: Set<string>;
  topDefensePlayerIds: Set<string>;
  totalAttempts: number;
  totalPoints: number;
  totalDefenses: number;
};

const getPlayerLabel = (players: Player[], playerId: string) => {
  const player = players.find((item) => item.id === playerId);

  if (!player) {
    return playerId;
  }

  return `#${player.number} ${player.lastName || player.firstName}`.trim();
};

const getPrimaryTeam = (session: TrainingSession, teamIds: string[]) => {
  const teamId = teamIds[0];

  if (!teamId) {
    return undefined;
  }

  return session.teams.find((team) => team.id === teamId);
};

const compareText = (a?: string, b?: string) => (a ?? '').localeCompare(b ?? '');

export const sortTrainingAttackRows = (rows: TrainingPerformanceAttackRow[]) =>
  [...rows].sort((a, b) =>
    b.points - a.points ||
    b.attempts - a.attempts ||
    (b.effectiveness ?? -1) - (a.effectiveness ?? -1) ||
    compareText(a.teamName, b.teamName) ||
    compareText(a.playerName, b.playerName) ||
    a.playerId.localeCompare(b.playerId),
  );

export const sortTrainingDefenseRows = (rows: TrainingPerformanceDefenseRow[]) =>
  [...rows].sort((a, b) =>
    b.defenses - a.defenses ||
    b.defenseShare - a.defenseShare ||
    compareText(a.teamName, b.teamName) ||
    compareText(a.playerName, b.playerName) ||
    a.playerId.localeCompare(b.playerId),
  );

const getTopPlayerIds = <T extends { playerId: string }>(
  rows: T[],
  isEligible: (row: T) => boolean,
  getGroupKey: (row: T) => string,
  rankGroups = 2,
) => {
  const validRows = rows.filter(isEligible);
  const groupKeys: string[] = [];

  validRows.forEach((row) => {
    const key = getGroupKey(row);

    if (!groupKeys.includes(key)) {
      groupKeys.push(key);
    }
  });

  const topGroups = new Set(groupKeys.slice(0, rankGroups));

  return new Set(validRows.filter((row) => topGroups.has(getGroupKey(row))).map((row) => row.playerId));
};

export const getTopTrainingAttackPlayerIds = (rows: TrainingPerformanceAttackRow[], rankGroups = 2) =>
  getTopPlayerIds(
    rows,
    (row) => row.attempts > 0,
    (row) => `${row.points}:${row.attempts}:${row.effectiveness ?? -1}`,
    rankGroups,
  );

export const getTopTrainingDefensePlayerIds = (rows: TrainingPerformanceDefenseRow[], rankGroups = 2) =>
  getTopPlayerIds(
    rows,
    (row) => row.defenses > 0,
    (row) => `${row.defenses}:${row.defenseShare}`,
    rankGroups,
  );

export function buildTrainingPerformance(session: TrainingSession, players: Player[]): TrainingPerformanceData {
  const stats = getTrainingSessionStats(session);
  const totalAttempts = stats.playerStats.reduce((sum, player) => sum + player.attempts, 0);
  const totalPoints = stats.playerStats.reduce((sum, player) => sum + player.points, 0);
  const totalDefenses = stats.playerStats.reduce((sum, player) => sum + player.defenses, 0);
  const attackRows = sortTrainingAttackRows(stats.playerStats.map((playerStats) => {
    const team = getPrimaryTeam(session, playerStats.teamIds);
    const effectiveness = playerStats.attempts > 0 ? playerStats.points / playerStats.attempts : undefined;

    return {
      playerId: playerStats.playerId,
      playerName: getPlayerLabel(players, playerStats.playerId),
      teamId: team?.id,
      teamName: team?.name,
      points: playerStats.points,
      attempts: playerStats.attempts,
      shotsDefended: playerStats.shotsDefended,
      ownPointsAgainst: playerStats.ownPointsAgainst,
      effectiveness,
    };
  }));
  const defenseRows = sortTrainingDefenseRows(stats.playerStats.map((playerStats) => {
    const team = getPrimaryTeam(session, playerStats.teamIds);

    return {
      playerId: playerStats.playerId,
      playerName: getPlayerLabel(players, playerStats.playerId),
      teamId: team?.id,
      teamName: team?.name,
      defenses: playerStats.defenses,
      defenseShare: totalDefenses > 0 ? playerStats.defenses / totalDefenses : 0,
    };
  }));

  return {
    attackRows,
    defenseRows,
    topAttackPlayerIds: getTopTrainingAttackPlayerIds(attackRows),
    topDefensePlayerIds: getTopTrainingDefensePlayerIds(defenseRows),
    totalAttempts,
    totalPoints,
    totalDefenses,
  };
}
