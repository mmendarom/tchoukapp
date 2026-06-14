import { describe, expect, it } from 'vitest';

import { mayoresPlayerIds, plus40PlayerIds, teamPools, uruguayPlayers } from './mockData';

describe('Uruguay player seed data', () => {
  it('contains the Mayores player list with stable ids', () => {
    expect(mayoresPlayerIds).toEqual([
      'mauro',
      'marcelo',
      'nicolas',
      'vladi',
      'errazquin',
      'leon',
      'mathias',
      'tadeo',
      'enano',
      'juan',
      'fede',
      'leo',
      'pablito',
      'juanse',
    ]);
  });

  it('defines +40 as a separate pool using existing player ids', () => {
    const playerIds = new Set(uruguayPlayers.map((player) => player.id));
    const mayores = teamPools.find((pool) => pool.id === 'mayores');
    const plus40 = teamPools.find((pool) => pool.id === 'plus40');

    expect(mayores?.playerIds).toEqual(mayoresPlayerIds);
    expect(plus40?.name).toBe('+40');
    expect(plus40?.playerIds).toEqual(plus40PlayerIds);
    expect(mayores?.playerIds.some((playerId) => playerId.startsWith('plus40-'))).toBe(false);
    expect(plus40PlayerIds.every((playerId) => playerIds.has(playerId))).toBe(true);
    expect(new Set(mayoresPlayerIds).size).toBe(mayoresPlayerIds.length);
    expect(new Set(plus40PlayerIds).size).toBe(plus40PlayerIds.length);
    expect(plus40PlayerIds).toEqual(expect.arrayContaining(['errazquin', 'fede', 'plus40-ana-canteras', 'plus40-milena']));
    expect(uruguayPlayers.filter((player) => player.id === 'errazquin')).toHaveLength(1);
    expect(uruguayPlayers.filter((player) => player.id === 'fede')).toHaveLength(1);
  });

  it('assigns expected usual playing zones', () => {
    const zonesById = new Map(uruguayPlayers.map((player) => [player.id, player.usualPlayingZone]));

    expect(zonesById.get('mauro')).toBe('izquierda');
    expect(zonesById.get('marcelo')).toBe('central');
    expect(zonesById.get('nicolas')).toBe('derecha');
    expect(zonesById.get('juan')).toBe('derecha');
    expect(zonesById.get('pablito')).toBe('central');
  });
});
