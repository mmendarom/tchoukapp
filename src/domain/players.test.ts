import { describe, expect, it } from 'vitest';

import { uruguayPlayers } from './mockData';
import { applyPlayerUpdates, buildPlayer, createUniquePlayerId } from './players';

describe('player helpers', () => {
  it('builds a player with stable unique id and default stats', () => {
    const player = buildPlayer(
      {
        firstName: 'Ana',
        lastName: 'Canteras',
        position: 'Wing',
        usualPlayingZone: 'izquierda',
        dominantHand: 'Right',
      },
      uruguayPlayers,
    );

    expect(player).toMatchObject({
      id: 'ana-canteras',
      firstName: 'Ana',
      lastName: 'Canteras',
      number: 37,
      position: 'Wing',
      usualPlayingZone: 'izquierda',
      dominantHand: 'Right',
      caps: 0,
      goals: 0,
      blocks: 0,
    });
  });

  it('avoids duplicate ids', () => {
    expect(createUniquePlayerId({ firstName: 'Mauro', lastName: '' }, uruguayPlayers)).toBe('mauro-2');
  });

  it('rejects invalid player creation input', () => {
    expect(buildPlayer({ firstName: '   ', position: 'Wing', usualPlayingZone: 'izquierda', dominantHand: 'Right' }, uruguayPlayers)).toBeUndefined();
    expect(buildPlayer({ firstName: 'Ana', position: undefined, usualPlayingZone: 'izquierda', dominantHand: 'Right' }, uruguayPlayers)).toBeUndefined();
  });

  it('updates player fields while preserving id', () => {
    const player = uruguayPlayers[0];
    const updated = applyPlayerUpdates(player, {
      firstName: 'Mauro editado',
      number: 99,
      position: 'Center',
      usualPlayingZone: 'central',
    });

    expect(updated).toMatchObject({
      id: player.id,
      firstName: 'Mauro editado',
      number: 99,
      position: 'Center',
      usualPlayingZone: 'central',
    });
  });

  it('rejects invalid player updates', () => {
    expect(applyPlayerUpdates(uruguayPlayers[0], { firstName: '   ' })).toBeUndefined();
  });
});
