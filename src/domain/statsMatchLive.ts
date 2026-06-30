import {
  getStatsMatchScore,
  getStatsMatchTeam,
  StatsMatch,
  StatsMatchErrorSubtype,
  StatsMatchEvent,
  StatsMatchPeriod,
  StatsMatchStatus,
  StatsTeam,
} from './statsMatch';
import { Player } from './types';

export const statsMatchStatusLabel: Record<StatsMatchStatus, string> = {
  draft: 'Borrador',
  live: 'En vivo',
  period_break: 'Entre tiempos',
  finished: 'Finalizado',
  cancelled: 'Cancelado',
};

export const statsErrorSubtypeLabel: Record<StatsMatchErrorSubtype, string> = {
  turnover: 'Perdió la pelota',
  missed_frame: 'Tiro errado',
  bad_rebound: 'Se les cae / mal rebote',
  forbidden_zone: 'Invasión o zona',
  line_step: 'Pisa la línea',
};

export const STATS_ERROR_SUBTYPE_OPTIONS: { id: StatsMatchErrorSubtype; label: string }[] = [
  { id: 'turnover', label: statsErrorSubtypeLabel.turnover },
  { id: 'missed_frame', label: statsErrorSubtypeLabel.missed_frame },
  { id: 'bad_rebound', label: statsErrorSubtypeLabel.bad_rebound },
  { id: 'forbidden_zone', label: statsErrorSubtypeLabel.forbidden_zone },
  { id: 'line_step', label: statsErrorSubtypeLabel.line_step },
];

export function getStatsTeamPlayers(team: StatsTeam | undefined, players: Player[]): Player[] {
  if (!team) {
    return [];
  }

  const playersById = new Map(players.map((player) => [player.id, player]));

  return team.playerIds
    .map((playerId) => playersById.get(playerId))
    .filter((player): player is Player => Boolean(player));
}

export function getStatsPlayerLabel(players: Player[], playerId?: string): string {
  if (!playerId) {
    return 'Jugador';
  }

  const player = players.find((item) => item.id === playerId);

  if (!player) {
    return playerId;
  }

  return `#${player.number} ${player.lastName || player.firstName}`.trim();
}

export function getStatsTeamName(match: Pick<StatsMatch, 'homeTeam' | 'awayTeam'>, teamId: string): string {
  return getStatsMatchTeam(match, teamId)?.name ?? 'Equipo';
}

export function formatStatsMatchScore(match: Pick<StatsMatch, 'homeTeam' | 'awayTeam' | 'events'>): string {
  const score = getStatsMatchScore(match);

  return `${match.homeTeam.name} ${score[match.homeTeam.id] ?? 0} - ${score[match.awayTeam.id] ?? 0} ${match.awayTeam.name}`;
}

export function getCurrentStatsPeriod(
  match: Pick<StatsMatch, 'periods' | 'currentPeriod'>,
): StatsMatchPeriod | undefined {
  return match.periods.find((period) => period.number === match.currentPeriod);
}

export function getNextStatsPeriodNumber(match: Pick<StatsMatch, 'periods'>): number | undefined {
  return match.periods.find((period) => period.status === 'not_started')?.number;
}

export function canRecordStatsEvent(match: Pick<StatsMatch, 'status' | 'archivedAt'>): boolean {
  return match.status === 'live' && !match.archivedAt;
}

export function formatStatsEventLabel(
  event: StatsMatchEvent,
  match: Pick<StatsMatch, 'homeTeam' | 'awayTeam'>,
  players: Player[],
): string {
  const playerLabel = getStatsPlayerLabel(players, event.playerId);
  const teamName = getStatsTeamName(match, event.teamId);
  const defenderLabel = getStatsPlayerLabel(players, event.defenderPlayerId);

  switch (event.kind) {
    case 'point':
      return `${playerLabel} punto para ${teamName}`;
    case 'own_point_against':
      return `${playerLabel} punto en contra (${teamName})`;
    case 'defense':
      return `${playerLabel} defensa (${teamName})`;
    case 'shot_defended':
      return event.defenderPlayerId
        ? `${playerLabel} (${teamName}) tiro atajado por ${defenderLabel}`
        : `${playerLabel} (${teamName}) tiro atajado`;
    case 'error': {
      const subtypeLabel = event.errorSubtype ? statsErrorSubtypeLabel[event.errorSubtype] : 'error';

      return `${playerLabel} (${teamName}) ${subtypeLabel.toLowerCase()}`;
    }
  }
}
