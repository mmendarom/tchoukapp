import { describe, expect, it } from 'vitest';

import { buildTeamPool, ensureDefaultTeamPool, filterExistingPlayerIds, normalizeTeamPoolName } from './teamPools';
import { mayoresPlayerIds, plus40PlayerIds, teamPools, uruguayPlayers } from './mockData';

describe('team pool helpers', () => {
  it('normalizes pool names', () => {
    expect(normalizeTeamPoolName('  Sub 18  ')).toBe('Sub 18');
    expect(normalizeTeamPoolName('   ')).toBe('');
  });

  it('filters player ids to existing global players', () => {
    expect(filterExistingPlayerIds(['mauro', 'no-existe', 'mauro', 'tadeo'], uruguayPlayers)).toEqual(['mauro', 'tadeo']);
  });

  it('ensures Mayores exists without duplicating it', () => {
    const defaultOnly = ensureDefaultTeamPool([], uruguayPlayers);
    const withDefaultAgain = ensureDefaultTeamPool(defaultOnly, uruguayPlayers);

    expect(defaultOnly[0]).toMatchObject({ id: 'mayores', name: 'Mayores' });
    expect(defaultOnly[0].playerIds).toEqual(mayoresPlayerIds);
    expect(defaultOnly[0].playerIds.some((playerId) => playerId.startsWith('plus40-'))).toBe(false);
    expect(withDefaultAgain.filter((pool) => pool.id === 'mayores')).toHaveLength(1);
  });

  it('normalizes default pools and preserves custom pools', () => {
    const pollutedMayores = {
      id: 'mayores',
      name: 'Mayores editado',
      playerIds: ['mauro', 'plus40-ana-canteras', 'plus40-milena'],
    };
    const editedPlus40 = { id: 'plus40', name: '+40 editado', playerIds: ['mauro'] };
    const customPool = { id: 'team-pool-custom', name: 'Custom', playerIds: ['mauro', 'plus40-milena'] };
    const ensured = ensureDefaultTeamPool([pollutedMayores, editedPlus40, customPool], uruguayPlayers, teamPools);

    expect(ensured.find((pool) => pool.id === 'mayores')).toEqual({
      id: 'mayores',
      name: 'Mayores',
      playerIds: mayoresPlayerIds,
    });
    expect(ensured.find((pool) => pool.id === 'plus40')?.playerIds).toEqual(teamPools.find((pool) => pool.id === 'plus40')?.playerIds);
    expect(ensured.find((pool) => pool.id === 'plus40')?.playerIds).toEqual(plus40PlayerIds);
    expect(ensured.find((pool) => pool.id === 'team-pool-custom')).toEqual(customPool);
    expect(ensured.filter((pool) => pool.id === 'mayores')).toHaveLength(1);
    expect(ensured.filter((pool) => pool.id === 'plus40')).toHaveLength(1);
  });

  it('builds valid pools and rejects invalid ones', () => {
    expect(buildTeamPool({ id: 'sub18', name: ' Sub 18 ', playerIds: ['mauro'], players: uruguayPlayers })).toEqual({
      id: 'sub18',
      name: 'Sub 18',
      playerIds: ['mauro'],
    });
    expect(buildTeamPool({ id: 'empty-name', name: ' ', playerIds: ['mauro'], players: uruguayPlayers })).toBeUndefined();
    expect(buildTeamPool({ id: 'empty-players', name: 'Sub 18', playerIds: [], players: uruguayPlayers })).toBeUndefined();
  });
});
