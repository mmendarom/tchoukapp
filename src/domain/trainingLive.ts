import { Player } from './types';
import { TrainingEvent, TrainingMiniMatch, TrainingSession, TrainingTeam } from './training';

export const trainingStatusLabel: Record<TrainingSession['status'] | TrainingMiniMatch['status'], string> = {
  cancelled: 'Cancelado',
  draft: 'Borrador',
  finished: 'Finalizado',
  live: 'En vivo',
  scheduled: 'Programado',
};

export function getTrainingTeam(session: TrainingSession, teamId: string) {
  return session.teams.find((team) => team.id === teamId);
}

export function getTrainingTeamName(session: TrainingSession, teamId: string) {
  return getTrainingTeam(session, teamId)?.name ?? 'Equipo';
}

export function getTrainingPlayerLabel(players: Player[], playerId?: string) {
  if (!playerId) {
    return 'Jugador';
  }

  const player = players.find((item) => item.id === playerId);

  if (!player) {
    return playerId;
  }

  return `#${player.number} ${player.lastName || player.firstName}`.trim();
}

export function getTrainingTeamPlayers(team: TrainingTeam | undefined, players: Player[]) {
  if (!team) {
    return [];
  }

  const playersById = new Map(players.map((player) => [player.id, player]));

  return team.playerIds
    .map((playerId) => playersById.get(playerId))
    .filter((player): player is Player => Boolean(player));
}

export function formatTrainingMiniMatchScore(session: TrainingSession, miniMatch: TrainingMiniMatch) {
  return `${getTrainingTeamName(session, miniMatch.teamAId)} ${miniMatch.scoreA} - ${miniMatch.scoreB} ${getTrainingTeamName(session, miniMatch.teamBId)}`;
}

export function formatTrainingEventLabel(event: TrainingEvent, session: TrainingSession, players: Player[]) {
  const playerLabel = getTrainingPlayerLabel(players, event.playerId);
  const teamName = getTrainingTeamName(session, event.teamId);

  switch (event.type) {
    case 'point':
      return `${playerLabel} punto para ${teamName}`;
    case 'own_point_against':
      return `${playerLabel} punto en contra`;
    case 'defense':
      return `${playerLabel} defensa`;
    case 'shot_defended':
      return `${playerLabel} tiro defendido`;
    case 'error':
      return `${playerLabel} error`;
  }
}
