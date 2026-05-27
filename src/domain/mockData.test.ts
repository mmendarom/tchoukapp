import { describe, expect, it } from 'vitest';

import { uruguayPlayers } from './mockData';

describe('Uruguay player seed data', () => {
  it('contains the real Uruguay player list with stable ids', () => {
    expect(uruguayPlayers.map((player) => player.id)).toEqual([
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

  it('assigns expected usual playing zones', () => {
    const zonesById = new Map(uruguayPlayers.map((player) => [player.id, player.usualPlayingZone]));

    expect(zonesById.get('mauro')).toBe('izquierda');
    expect(zonesById.get('marcelo')).toBe('central');
    expect(zonesById.get('nicolas')).toBe('derecha');
    expect(zonesById.get('juan')).toBe('derecha');
    expect(zonesById.get('pablito')).toBe('central');
  });
});
