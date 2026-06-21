import { describe, expect, it } from 'vitest';

import { buildTeamPool, ensureDefaultTeamPool, filterExistingPlayerIds, normalizeTeamPoolName } from './teamPools';
import { femeninoPlayerIds, femeninoPlayers, mayoresPlayerIds, plus40PlayerIds, teamPools, uruguayPlayers } from './mockData';

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

  it('defines Femenino as a separate fixed default pool', () => {
    const femenino = teamPools.find((pool) => pool.id === 'femenino');

    expect(teamPools.map((pool) => pool.id)).toEqual(['mayores', 'plus40', 'femenino']);
    expect(femenino).toEqual({ id: 'femenino', name: 'Femenino', playerIds: femeninoPlayerIds });
    expect(femeninoPlayerIds).toEqual([
      'femenino-kari',
      'femenino-fio',
      'femenino-mori',
      'femenino-vicky',
      'femenino-larre',
      'femenino-aly',
      'femenino-flaca',
      'femenino-ile',
      'femenino-cami',
      'femenino-karen',
      'femenino-juli',
      'femenino-pau',
      'femenino-romi',
      'femenino-ede',
      'femenino-maca',
      'femenino-mariana',
    ]);
    expect(mayoresPlayerIds.some((playerId) => playerId.startsWith('femenino-'))).toBe(false);
    expect(plus40PlayerIds.some((playerId) => playerId.startsWith('femenino-'))).toBe(false);
    expect(femeninoPlayers).toHaveLength(16);
    expect(femeninoPlayers.map((player) => player.number)).toEqual(Array.from({ length: 16 }, (_, index) => index + 1));
    expect(femeninoPlayers.every((player) => player.position === 'Wing' && player.dominantHand === 'Right')).toBe(true);
    expect(femeninoPlayers.every((player) => player.caps === 0 && player.goals === 0 && player.blocks === 0)).toBe(true);
  });

  it('adds missing fixed pools once while preserving custom pools', () => {
    const existingPools = [
      teamPools.find((pool) => pool.id === 'mayores')!,
      teamPools.find((pool) => pool.id === 'plus40')!,
      { id: 'custom', name: 'Club', playerIds: ['mauro'] },
    ];
    const normalized = ensureDefaultTeamPool(existingPools, uruguayPlayers, teamPools);
    const normalizedAgain = ensureDefaultTeamPool(normalized, uruguayPlayers, teamPools);

    expect(normalized.find((pool) => pool.id === 'femenino')?.playerIds).toEqual(femeninoPlayerIds);
    expect(normalized.find((pool) => pool.id === 'custom')).toEqual(existingPools[2]);
    expect(normalizedAgain.filter((pool) => pool.id === 'femenino')).toHaveLength(1);
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
