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

  it('creates defense and typed error insights without raw legacy values', () => {
    const events: MatchEvent[] = [
      point({ id: 'd-1', kind: 'defense', team: 'uruguay', playerId: 'p1' } as Partial<MatchEvent>),
      point({ id: 'd-2', kind: 'defense', team: 'uruguay', playerId: 'p1' } as Partial<MatchEvent>),
      point({ id: 'd-3', kind: 'defense', team: 'uruguay', playerId: 'p1' } as Partial<MatchEvent>),
      point({ id: 'f-1', kind: 'error', team: 'uruguay', playerId: 'p2', errorType: 'falta' } as Partial<MatchEvent>),
      point({ id: 'f-2', kind: 'error', team: 'uruguay', playerId: 'p2', errorType: 'falta' } as Partial<MatchEvent>),
      point({ id: 'p-1', kind: 'error', team: 'uruguay', playerId: 'p3', errorType: 'punto_en_contra' } as Partial<MatchEvent>),
      point({ id: 'p-2', kind: 'error', team: 'uruguay', playerId: 'p3', errorType: 'punto_en_contra' } as Partial<MatchEvent>),
      point({ id: 'p-3', kind: 'error', team: 'uruguay', playerId: 'p4', errorType: 'punto_en_contra' } as Partial<MatchEvent>),
      point({ id: 'legacy', kind: 'error', team: 'uruguay', playerId: 'p5', errorType: 'turnover' } as Partial<MatchEvent>),
    ];

    const text = createTacticalInsights({ events, lineupSnapshots: [], players: [] })
      .map((insight) => `${insight.title} ${insight.description}`)
      .join(' ');

    expect(text).toContain('Defensor clave');
    expect(text).toContain('Atencion con faltas');
    expect(text).toContain('Puntos en contra acumulados');
    expect(text).toContain('Puntos regalados');
    expect(text).not.toContain('turnover');
    expect(text).not.toContain('punto_en_contra');
  });

  it('creates opponent own-point insight without location-based insight', () => {
    const insights = createTacticalInsights(
      {
        events: [
          point({ id: 'own-1', scoringTeam: 'uruguay', playerId: undefined, landingLocation: undefined, pointSource: 'opponent_own_point' }),
          point({ id: 'own-2', scoringTeam: 'uruguay', playerId: undefined, landingLocation: undefined, pointSource: 'opponent_own_point' }),
        ],
        lineupSnapshots: [],
      },
      { opponentOwnPointWarning: 2, repeatedOpponentZoneWarning: 2 },
    );

    expect(insights.some((insight) => insight.title === 'Puntos regalados por el rival')).toBe(true);
    expect(insights.some((insight) => insight.id.startsWith('opponent-zone'))).toBe(false);
  });

  it('creates rival defense zone insight without raw enum values', () => {
    const insights = createTacticalInsights(
      {
        events: [
          point({ id: 'rd-1', kind: 'opponent_defense', team: 'opponent', defenseLocation: { x: 0.5, y: 0.2 } } as Partial<MatchEvent>),
          point({ id: 'rd-2', kind: 'opponent_defense', team: 'opponent', defenseLocation: { x: 0.52, y: 0.3 } } as Partial<MatchEvent>),
          point({ id: 'rd-3', kind: 'opponent_defense', team: 'opponent', defenseLocation: { x: 0.48, y: 0.4 } } as Partial<MatchEvent>),
        ],
        lineupSnapshots: [],
      },
      { opponentDefenseZoneWarning: 3 },
    );
    const text = insights.map((insight) => `${insight.title} ${insight.description}`).join(' ');

    expect(text).toContain('Nos defienden seguido en una zona');
    expect(text).toContain('zona central');
    expect(text).not.toContain('opponent_defense');
    expect(text).not.toMatch(/\b(center|left|right)\b/);
  });
});
