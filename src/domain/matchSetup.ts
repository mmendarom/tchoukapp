import { LineupSnapshot, Match, Player, TeamPool } from './types';

export const LINEUP_STARTER_COUNT = 7;

export type MatchSetupValidation = {
  valid: boolean;
  errors: string[];
};

export function uniquePlayerIds(playerIds: string[] | undefined) {
  return Array.from(new Set((playerIds ?? []).filter(Boolean)));
}

export function getTeamPoolById(teamPools: TeamPool[], teamPoolId?: string) {
  return teamPools.find((pool) => pool.id === teamPoolId) ?? teamPools[0];
}

export function validateMatchSetup(input: {
  availablePlayerIds?: string[];
  initialPlayerIds?: string[];
}): MatchSetupValidation {
  const availablePlayerIds = uniquePlayerIds(input.availablePlayerIds);
  const initialPlayerIds = uniquePlayerIds(input.initialPlayerIds);
  const availableSet = new Set(availablePlayerIds);
  const errors: string[] = [];

  if (availablePlayerIds.length < LINEUP_STARTER_COUNT) {
    errors.push('El plantel necesita al menos 7 jugadores disponibles.');
  }

  if (initialPlayerIds.length !== LINEUP_STARTER_COUNT) {
    errors.push('Elegí 7 titulares para iniciar el partido.');
  }

  if (initialPlayerIds.some((playerId) => !availableSet.has(playerId))) {
    errors.push('Los titulares deben pertenecer al plantel del partido.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function resolveMatchAvailablePlayers(match: Pick<Match, 'availablePlayerIds'> | undefined, players: Player[]) {
  if (!match?.availablePlayerIds || match.availablePlayerIds.length === 0) {
    return players;
  }

  const availableSet = new Set(match.availablePlayerIds);
  return players.filter((player) => availableSet.has(player.id));
}

export function deriveBenchPlayers(
  players: Player[],
  lineup: Pick<LineupSnapshot, 'playerIds'> | undefined,
  match?: Pick<Match, 'availablePlayerIds'>,
) {
  const availablePlayers = resolveMatchAvailablePlayers(match, players);
  const onCourtIds = new Set((lineup?.playerIds ?? []).filter(Boolean));

  return availablePlayers.filter((player) => !onCourtIds.has(player.id));
}
