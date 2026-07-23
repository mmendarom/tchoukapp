import { describe, expect, it } from 'vitest';

import { DEFAULT_STATS_MATCH_PLAYERS_PER_TEAM } from './statsMatch';
import { scoutingPlayers, scoutingTeamPoolIds, scoutingTeamPools } from './scoutingTeams';
import { defaultPlayers, defaultTeamPools, teamPools, uruguayPlayers } from './mockData';

describe('scouting team seed data', () => {
  it('exposes the twelve championship rival pools', () => {
    expect(scoutingTeamPools).toHaveLength(12);
    expect(scoutingTeamPoolIds).toEqual([
      'arg-masc',
      'arg-fem',
      'arg-master-masc',
      'can-masc',
      'col-fem-1',
      'col-fem-2',
      'col-masc-1',
      'col-masc-2',
      'bra-masc',
      'bra-fem',
      'bra-master-masc',
      'bra-fem-master',
    ]);
  });

  it('gives every rival pool at least the default players-per-team', () => {
    scoutingTeamPools.forEach((pool) => {
      expect(pool.name.trim().length).toBeGreaterThan(0);
      expect(pool.playerIds.length).toBeGreaterThanOrEqual(DEFAULT_STATS_MATCH_PLAYERS_PER_TEAM);
      expect(new Set(pool.playerIds).size).toBe(pool.playerIds.length);
    });
  });

  it('uses globally unique, slug-shaped player ids', () => {
    const ids = scoutingPlayers.map((player) => player.id);

    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(id).toMatch(/^[a-z0-9-]+$/));
  });

  it('keeps rival ids from colliding with Uruguay player ids', () => {
    const uruguayIds = new Set(uruguayPlayers.map((player) => player.id));

    scoutingPlayers.forEach((player) => {
      expect(uruguayIds.has(player.id)).toBe(false);
      expect(player.number).toBeGreaterThan(0);
      expect(player.firstName.trim().length + player.lastName.trim().length).toBeGreaterThan(0);
    });
  });

  it('resolves every pool player id against the scouting roster', () => {
    const playerIds = new Set(scoutingPlayers.map((player) => player.id));

    scoutingTeamPools.forEach((pool) => {
      pool.playerIds.forEach((playerId) => expect(playerIds.has(playerId)).toBe(true));
    });
  });

  it('appends rival pools and players to the store defaults', () => {
    expect(defaultTeamPools).toEqual([...teamPools, ...scoutingTeamPools]);
    expect(defaultPlayers).toEqual([...uruguayPlayers, ...scoutingPlayers]);
    expect(defaultTeamPools.slice(0, teamPools.length)).toEqual(teamPools);
  });
});
