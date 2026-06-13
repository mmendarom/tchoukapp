import { describe, expect, it } from 'vitest';

import { createLineupSlots, getBenchPlayers, getNeutralSlotVisualGroup, replaceLineupSlotPlayer } from './lineupSlots';
import { uruguayPlayers } from './mockData';

describe('lineup slot helpers', () => {
  it('creates 7 neutral slots from legacy playerIds snapshots', () => {
    const slots = createLineupSlots({ playerIds: ['mauro', 'marcelo', 'nicolas'] }, uruguayPlayers);

    expect(slots).toHaveLength(7);
    expect(slots.map((slot) => slot.id)).toEqual(['slot_1', 'slot_2', 'slot_3', 'slot_4', 'slot_5', 'slot_6', 'slot_7']);
    expect(slots[0]).toMatchObject({ index: 0, playerId: 'mauro' });
    expect(slots[3].playerId).toBeUndefined();
  });

  it('replaces a neutral slot without using tactical position metadata', () => {
    const nextPlayerIds = replaceLineupSlotPlayer(
      ['mauro', 'marcelo', 'nicolas', 'vladi', 'errazquin', 'leon', 'mathias'],
      2,
      'tadeo',
    );

    expect(nextPlayerIds).toEqual(['mauro', 'marcelo', 'tadeo', 'vladi', 'errazquin', 'leon', 'mathias']);
    expect(uruguayPlayers.find((player) => player.id === 'tadeo')?.usualPlayingZone).toBe('central');
  });

  it('keeps empty legacy slots from collapsing when filling a later slot', () => {
    const nextPlayerIds = replaceLineupSlotPlayer(['mauro', 'marcelo'], 5, 'tadeo');

    expect(nextPlayerIds).toEqual(['mauro', 'marcelo', '', '', '', 'tadeo', '']);
    expect(createLineupSlots({ playerIds: nextPlayerIds }, uruguayPlayers)[5].playerId).toBe('tadeo');
  });

  it('determines bench players from the current lineup only', () => {
    const benchPlayers = getBenchPlayers(uruguayPlayers, {
      playerIds: ['mauro', 'marcelo', 'nicolas', 'vladi', 'errazquin', 'leon', 'mathias'],
    });

    expect(benchPlayers.map((player) => player.id)).toContain('tadeo');
    expect(benchPlayers.map((player) => player.id)).not.toContain('mauro');
  });

  it('determines bench players from match available players when present', () => {
    const benchPlayers = getBenchPlayers(
      uruguayPlayers,
      {
        playerIds: ['mauro', 'marcelo', 'nicolas', 'vladi', 'errazquin', 'leon', 'mathias'],
      },
      {
        availablePlayerIds: ['mauro', 'marcelo', 'nicolas', 'vladi', 'errazquin', 'leon', 'mathias', 'tadeo'],
      },
    );

    expect(benchPlayers.map((player) => player.id)).toEqual(['tadeo']);
  });

  it('maps neutral visual slots as 3 left, 1 center and 3 right', () => {
    expect([0, 1, 2].map(getNeutralSlotVisualGroup)).toEqual(['left', 'left', 'left']);
    expect(getNeutralSlotVisualGroup(3)).toBe('center');
    expect([4, 5, 6].map(getNeutralSlotVisualGroup)).toEqual(['right', 'right', 'right']);
    expect(getNeutralSlotVisualGroup(7)).toBe('unknown');
  });
});
