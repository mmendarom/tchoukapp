import { describe, expect, it } from 'vitest';

import { deriveBenchPlayers, resolveMatchAvailablePlayers, validateMatchSetup } from './matchSetup';
import { teamPools, uruguayPlayers } from './mockData';

describe('match setup helpers', () => {
  it('seeds Mayores with the current Uruguay roster', () => {
    const mayores = teamPools.find((pool) => pool.id === 'mayores');

    expect(mayores?.name).toBe('Mayores');
    expect(mayores?.playerIds).toEqual(uruguayPlayers.map((player) => player.id));
  });

  it('validates exactly 7 starters from available players', () => {
    const availablePlayerIds = uruguayPlayers.map((player) => player.id);

    expect(validateMatchSetup({ availablePlayerIds, initialPlayerIds: availablePlayerIds.slice(0, 7) }).valid).toBe(true);
    expect(validateMatchSetup({ availablePlayerIds, initialPlayerIds: availablePlayerIds.slice(0, 6) }).valid).toBe(false);
    expect(validateMatchSetup({ availablePlayerIds, initialPlayerIds: [...availablePlayerIds.slice(0, 7), 'tadeo'] }).valid).toBe(false);
    expect(validateMatchSetup({ availablePlayerIds: availablePlayerIds.slice(0, 6), initialPlayerIds: availablePlayerIds.slice(0, 6) }).valid).toBe(false);
    expect(validateMatchSetup({ availablePlayerIds: availablePlayerIds.slice(0, 7), initialPlayerIds: [...availablePlayerIds.slice(0, 6), 'tadeo'] }).valid).toBe(false);
  });

  it('resolves old matches without availablePlayerIds to the global roster', () => {
    expect(resolveMatchAvailablePlayers(undefined, uruguayPlayers)).toHaveLength(uruguayPlayers.length);
    expect(resolveMatchAvailablePlayers({}, uruguayPlayers)).toHaveLength(uruguayPlayers.length);
  });

  it('derives bench from available players minus current lineup', () => {
    const availablePlayerIds = uruguayPlayers.slice(0, 9).map((player) => player.id);
    const lineup = { playerIds: availablePlayerIds.slice(0, 7) };
    const bench = deriveBenchPlayers(uruguayPlayers, lineup, { availablePlayerIds });

    expect(bench.map((player) => player.id)).toEqual(availablePlayerIds.slice(7, 9));
  });
});
