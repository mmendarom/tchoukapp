import { describe, expect, it } from 'vitest';

import {
  calculatePeriodScore,
  calculateTotalScore,
  generatePeriodInsights,
  getErrorsByPlayerByPeriod,
  getEventsByPeriod,
  getTopScorersByPeriod,
} from './periodStats';
import { Match, MatchEvent } from './types';

const event = (overrides: Partial<MatchEvent>): MatchEvent => ({
  id: `event-${Math.random()}`,
  matchId: 'match-1',
  kind: 'point',
  periodNumber: 1,
  timestamp: '2026-01-01T00:00:00.000Z',
  clock: { period: 1, secondsElapsed: 10 },
  scoringTeam: 'uruguay',
  playerId: 'p1',
  zone: 'center',
  frame: 'right-frame',
  pointSource: 'attack',
  ...overrides,
} as MatchEvent);

const baseEvents: MatchEvent[] = [
  event({ periodNumber: 1, clock: { period: 1, secondsElapsed: 1 }, scoringTeam: 'uruguay', playerId: 'p1', zone: 'center' }),
  event({ periodNumber: 1, clock: { period: 1, secondsElapsed: 2 }, scoringTeam: 'opponent', playerId: undefined, zone: 'right-wing' }),
  event({ periodNumber: 2, clock: { period: 2, secondsElapsed: 1 }, scoringTeam: 'uruguay', playerId: 'p2', zone: 'left-wing' }),
  event({
    id: 'error-1',
    kind: 'error',
    periodNumber: 1,
    clock: { period: 1, secondsElapsed: 4 },
    team: 'uruguay',
    playerId: 'p1',
    errorType: 'turnover',
  }),
];

const match: Match = {
  id: 'match-1',
  opponent: 'Argentina',
  venue: 'Demo',
  startsAt: '2026-01-01T00:00:00.000Z',
  status: 'period_break',
  currentPeriod: 1,
  periods: [
    { number: 1, status: 'finished', durationSeconds: 900, remainingSeconds: 0, timerRunning: false },
    { number: 2, status: 'not_started', durationSeconds: 900, remainingSeconds: 900, timerRunning: false },
    { number: 3, status: 'not_started', durationSeconds: 900, remainingSeconds: 900, timerRunning: false },
  ],
  clock: { period: 1, secondsElapsed: 0 },
  lineupSnapshots: [],
  events: [
    ...baseEvents,
    event({ id: 'p1-2', periodNumber: 1, playerId: 'p1', scoringTeam: 'uruguay' }),
    event({ id: 'p1-3', periodNumber: 1, playerId: 'p1', scoringTeam: 'uruguay' }),
  ],
};

describe('periodStats', () => {
  it('calculateTotalScore counts all scoring events', () => {
    expect(calculateTotalScore(baseEvents)).toEqual({ uruguay: 2, opponent: 1 });
  });

  it('calculatePeriodScore counts only one period', () => {
    expect(calculatePeriodScore(baseEvents, 1)).toEqual({ uruguay: 1, opponent: 1 });
  });

  it('getEventsByPeriod filters by periodNumber', () => {
    expect(getEventsByPeriod(baseEvents, 2)).toHaveLength(1);
  });

  it('getTopScorersByPeriod returns Uruguay scorers for the period', () => {
    expect(getTopScorersByPeriod(match.events, 1)[0]).toEqual({ playerId: 'p1', total: 3 });
  });

  it('getErrorsByPlayerByPeriod returns errors for the period', () => {
    expect(getErrorsByPlayerByPeriod(baseEvents, 1)).toEqual([{ playerId: 'p1', total: 1 }]);
  });

  it('generatePeriodInsights creates transparent period-break cards', () => {
    const insights = generatePeriodInsights(match, 1, (playerId) => playerId);
    expect(insights.some((insight) => insight.title === 'Jugador en racha')).toBe(true);
    expect(insights.some((insight) => insight.title === 'Tiempo positivo')).toBe(true);
  });

  it('generatePeriodInsights uses Spanish landing-location zone labels', () => {
    const matchWithLocations: Match = {
      ...match,
      events: [
        event({ id: 'u-1', scoringTeam: 'uruguay', landingLocation: { x: 0.5, y: 0.3 }, zone: 'left-wing' }),
        event({ id: 'u-2', scoringTeam: 'uruguay', landingLocation: { x: 0.52, y: 0.4 }, zone: 'right-wing' }),
        event({ id: 'u-3', scoringTeam: 'uruguay', landingLocation: { x: 0.48, y: 0.5 }, zone: 'backcourt' }),
        event({ id: 'o-1', scoringTeam: 'opponent', playerId: undefined, landingLocation: { x: 0.82, y: 0.3 }, zone: 'center' }),
        event({ id: 'o-2', scoringTeam: 'opponent', playerId: undefined, landingLocation: { x: 0.84, y: 0.4 }, zone: 'center' }),
        event({ id: 'o-3', scoringTeam: 'opponent', playerId: undefined, landingLocation: { x: 0.86, y: 0.5 }, zone: 'center' }),
      ],
    };

    const text = generatePeriodInsights(matchWithLocations, 1, (playerId) => playerId)
      .map((insight) => `${insight.title} ${insight.description}`)
      .join(' ');

    expect(text).toContain('zona central');
    expect(text).toContain('zona derecha');
    expect(text).not.toMatch(/\b(center|left|right)\b/);
    expect(text).not.toContain('desde center');
  });

  it('generatePeriodInsights does not create zone insights from old events without landingLocation', () => {
    const oldEventMatch: Match = {
      ...match,
      events: [
        event({ id: 'old-1', scoringTeam: 'opponent', playerId: undefined, landingLocation: undefined, zone: 'center' }),
        event({ id: 'old-2', scoringTeam: 'opponent', playerId: undefined, landingLocation: undefined, zone: 'center' }),
        event({ id: 'old-3', scoringTeam: 'opponent', playerId: undefined, landingLocation: undefined, zone: 'center' }),
      ],
    };

    expect(generatePeriodInsights(oldEventMatch, 1, (playerId) => playerId).some((insight) => insight.title === 'Zona vulnerable')).toBe(false);
  });
});
