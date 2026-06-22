import { buildTrainingSettings, TrainingSessionSettings } from './training';

export type TrainingTeamAssignment = Record<string, string | undefined>;

export type TrainingSetupTeamInput = {
  id: string;
  name: string;
  playerIds: string[];
  queueOrder: number;
};

export function getTrainingTeamCountOptions(participantCount: number) {
  return [2, 3, 4].filter((teamCount) => participantCount >= teamCount * 3);
}

export function createTrainingSetupTeamIds(teamCount: number) {
  return Array.from({ length: Math.max(Math.min(Math.floor(teamCount), 4), 2) }, (_, index) => `team-${index + 1}`);
}

export function buildTrainingTeamsFromAssignments(teamIds: string[], assignments: TrainingTeamAssignment): TrainingSetupTeamInput[] {
  return teamIds.map((teamId, index) => ({
    id: teamId,
    name: `Equipo ${index + 1}`,
    queueOrder: index,
    playerIds: Object.entries(assignments)
      .filter(([, assignedTeamId]) => assignedTeamId === teamId)
      .map(([playerId]) => playerId),
  }));
}

export function parseTrainingTargetScore(value: string) {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 0;
}

export function buildTrainingSetupValidation(input: {
  participantCount: number;
  teamIds: string[];
  assignments: TrainingTeamAssignment;
  targetScore: number;
}) {
  if (input.participantCount < 6) {
    return 'Seleccioná al menos 6 jugadores.';
  }

  if (input.teamIds.length < 2) {
    return 'Seleccioná al menos 2 equipos.';
  }

  const teams = buildTrainingTeamsFromAssignments(input.teamIds, input.assignments);
  const invalidTeam = teams.find((team) => team.playerIds.length < 3 || team.playerIds.length > 4);

  if (invalidTeam) {
    return 'Cada equipo necesita 3 o 4 jugadores.';
  }

  if (input.targetScore < 1) {
    return 'Los puntos para ganar deben ser al menos 1.';
  }

  return '';
}

export function buildTrainingSessionSettings(targetScore: number, winnerStays: boolean): TrainingSessionSettings {
  return buildTrainingSettings({ targetScore, winnerStays });
}
