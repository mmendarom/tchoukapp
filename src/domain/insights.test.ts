import { describe, expect, it } from 'vitest';

import { createTacticalInsights } from './insights';
import { MatchEvent } from './types';

const point = (overrides: Partial<MatchEvent>): MatchEvent => ({
  id: `event-${Math.random()}`,
  matchId: 'match-1',
  kind: 'point',
  periodNumber: 1,
  timestamp: '2026-01-01T00:00:00.000Z',
  clock: { period: 1, secondsElapsed: 10 },
  scoringTeam: 'opponent',
  playerId: undefined,
  landingLocation: { x: 0.5, y: 0.5 },
  zone: 'left-wing',
  frame: 'right-frame',
  pointSource: 'attack',
  ...overrides,
} as MatchEvent);

describe('createTacticalInsights zone labels', () => {
  it('uses Spanish labels derived from landingLocation', () => {
    const insights = createTacticalInsights(
      {
        events: [
          point({ id: 'p1', landingLocation: { x: 0.5, y: 0.2 }, zone: 'left-wing' }),
          point({ id: 'p2', landingLocation: { x: 0.52, y: 0.3 }, zone: 'right-wing' }),
          point({ id: 'p3', landingLocation: { x: 0.48, y: 0.4 }, zone: 'backcourt' }),
        ],
        lineupSnapshots: [],
        opponentName: 'Argentina',
      },
      { repeatedOpponentZoneWarning: 2 },
    );

    const text = insights.map((insight) => `${insight.title} ${insight.description}`).join(' ');

    expect(text).toContain('zona central');
    expect(text).not.toMatch(/\b(center|left|right)\b/);
    expect(text).not.toContain('desde center');
  });

  it('does not create misleading zone insights for old events without landingLocation', () => {
    const insights = createTacticalInsights(
      {
        events: [
          point({ id: 'old-1', landingLocation: undefined, zone: 'center' }),
          point({ id: 'old-2', landingLocation: undefined, zone: 'center' }),
          point({ id: 'old-3', landingLocation: undefined, zone: 'center' }),
        ],
        lineupSnapshots: [],
      },
      { repeatedOpponentZoneWarning: 2 },
    );

    expect(insights.some((insight) => insight.id.startsWith('opponent-zone'))).toBe(false);
  });
});
