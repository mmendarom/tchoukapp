import { Player, TeamPool } from './types';

export const DEFAULT_TEAM_POOL_ID = 'mayores';

export function normalizeTeamPoolName(name?: string | null) {
  return name?.trim() ?? '';
}

export function filterExistingPlayerIds(playerIds: string[] | undefined, players: Player[]) {
  const existingPlayerIds = new Set(players.map((player) => player.id));

  return Array.from(new Set((playerIds ?? []).filter((playerId) => existingPlayerIds.has(playerId))));
}

export function createDefaultTeamPool(players: Player[]): TeamPool {
  return {
    id: DEFAULT_TEAM_POOL_ID,
    name: 'Mayores',
    playerIds: players
      .filter((player) => !player.id.startsWith('plus40-') && !player.id.startsWith('femenino-'))
      .map((player) => player.id),
  };
}

export function ensureDefaultTeamPool(
  pools: TeamPool[] | undefined,
  players: Player[],
  defaultPools: TeamPool[] = [createDefaultTeamPool(players)],
) {
  // Los planteles fijos solo se siembran cuando faltan: una vez creados, las
  // ediciones del usuario (nombre y jugadores) se respetan y únicamente se
  // filtran jugadores que ya no existen.
  const normalizedPools = (pools ?? [])
    .map((pool) => ({
      ...pool,
      name: normalizeTeamPoolName(pool.name),
      playerIds: filterExistingPlayerIds(pool.playerIds, players),
    }))
    .filter((pool) => pool.id && pool.name && pool.playerIds.length > 0);
  const existingPoolIds = new Set(normalizedPools.map((pool) => pool.id));
  const missingDefaultPools = defaultPools
    .filter((pool) => !existingPoolIds.has(pool.id))
    .map((pool) => buildTeamPool({ ...pool, players }))
    .filter((pool): pool is TeamPool => Boolean(pool));

  return [...normalizedPools, ...missingDefaultPools];
}

export function buildTeamPool(input: {
  id: string;
  name?: string | null;
  playerIds?: string[];
  players: Player[];
}): TeamPool | undefined {
  const name = normalizeTeamPoolName(input.name);
  const playerIds = filterExistingPlayerIds(input.playerIds, input.players);

  if (!input.id || !name || playerIds.length === 0) {
    return undefined;
  }

  return {
    id: input.id,
    name,
    playerIds,
  };
}
