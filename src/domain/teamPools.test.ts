import { describe, expect, it } from 'vitest';

import { buildTeamPool, ensureDefaultTeamPool, filterExistingPlayerIds, normalizeTeamPoolName } from './teamPools';
import { uruguayPlayers } from './mockData';

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
    expect(defaultOnly[0].playerIds).toEqual(uruguayPlayers.map((player) => player.id));
    expect(withDefaultAgain.filter((pool) => pool.id === 'mayores')).toHaveLength(1);
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
