import { describe, expect, it } from 'vitest';

import { eventKindLabel } from './labels';
import { MatchEvent } from '../domain/types';

const point = (overrides: Partial<MatchEvent>): MatchEvent => ({
  id: 'event-1',
  matchId: 'match-1',
  kind: 'point',
  periodNumber: 1,
  timestamp: '2026-01-01T00:00:00.000Z',
  clock: { period: 1, secondsElapsed: 1 },
  scoringTeam: 'uruguay',
  zone: 'center',
  frame: 'right-frame',
  pointSource: 'attack',
  ...overrides,
} as MatchEvent);

describe('eventKindLabel', () => {
  it('labels opponent own points without raw event type', () => {
    const label = eventKindLabel(point({ pointSource: 'opponent_own_point', playerId: undefined, landingLocation: undefined }));

    expect(label).toBe('Punto en contra rival');
    expect(label).not.toContain('opponent_own_point');
  });
});
