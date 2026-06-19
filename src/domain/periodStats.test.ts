import { describe, expect, it } from 'vitest';

import {
  calculatePeriodScore,
  calculateTotalScore,
  generatePeriodInsights,
  getDefensesByPlayer,
  getDefensesByPlayerByPeriod,
  getErrorsByPlayerByPeriod,
  getErrorsByTypeByPlayer,
  getEventsByPeriod,
  getOpponentOwnPoints,
  getOpponentOwnPointsByPeriod,
  getOpponentDefenses,
  getOpponentDefensesByPeriod,
  getOpponentDefenseLocationsByPeriod,
  getPlayerErrorSummary,
  getPointsByZoneForEvents,
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
    errorType: 'falta',
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

  it('counts defenses by player and period', () => {
    const defenseEvents: MatchEvent[] = [
      event({ id: 'd-1', kind: 'defense', playerId: 'p1', team: 'uruguay' } as Partial<MatchEvent>),
      event({ id: 'd-2', kind: 'defense', playerId: 'p1', team: 'uruguay' } as Partial<MatchEvent>),
      event({ id: 'd-3', kind: 'defense', periodNumber: 2, clock: { period: 2, secondsElapsed: 1 }, playerId: 'p2', team: 'uruguay' } as Partial<MatchEvent>),
    ];

    expect(getDefensesByPlayer(defenseEvents)).toEqual([
      { playerId: 'p1', total: 2 },
      { playerId: 'p2', total: 1 },
    ]);
    expect(getDefensesByPlayerByPeriod(defenseEvents, 1)).toEqual([{ playerId: 'p1', total: 2 }]);
  });

  it('counts rival defenses by period and keeps score unchanged', () => {
    const defenseEvents: MatchEvent[] = [
      event({ id: 'rd-1', kind: 'opponent_defense', team: 'opponent', playerId: undefined, defenseLocation: { x: 0.5, y: 0.3 } } as Partial<MatchEvent>),
      event({ id: 'rd-2', kind: 'opponent_defense', team: 'opponent', periodNumber: 2, clock: { period: 2, secondsElapsed: 3 }, playerId: undefined, defenseLocation: { x: 0.8, y: 0.3 } } as Partial<MatchEvent>),
    ];

    expect(getOpponentDefenses(defenseEvents)).toHaveLength(2);
    expect(getOpponentDefensesByPeriod(defenseEvents, 1)).toHaveLength(1);
    expect(getOpponentDefenseLocationsByPeriod(defenseEvents, 1)).toEqual([{ x: 0.5, y: 0.3 }]);
    expect(calculateTotalScore(defenseEvents)).toEqual({ uruguay: 0, opponent: 0 });
  });

  it('counts typed errors by player and keeps total errors', () => {
    const errorEvents: MatchEvent[] = [
      event({ id: 'f-1', kind: 'error', team: 'uruguay', playerId: 'p1', errorType: 'falta' } as Partial<MatchEvent>),
      event({ id: 'p-1', kind: 'error', team: 'uruguay', playerId: 'p1', errorType: 'punto_en_contra' } as Partial<MatchEvent>),
      event({ id: 'p-2', kind: 'error', team: 'uruguay', playerId: 'p2', errorType: 'punto_en_contra' } as Partial<MatchEvent>),
    ];

    expect(getErrorsByTypeByPlayer(errorEvents)).toEqual([
      { playerId: 'p1', faltas: 1, puntosEnContra: 1, total: 2 },
      { playerId: 'p2', faltas: 0, puntosEnContra: 1, total: 1 },
    ]);
    expect(getPlayerErrorSummary(errorEvents)[0]).toMatchObject({ playerId: 'p1', total: 2 });
  });

  it('punto en contra adds one opponent point and falta does not change score', () => {
    const errorEvents: MatchEvent[] = [
      event({ id: 'f-1', kind: 'error', team: 'uruguay', playerId: 'p1', errorType: 'falta' } as Partial<MatchEvent>),
      event({ id: 'p-1', kind: 'error', team: 'uruguay', playerId: 'p1', errorType: 'punto_en_contra' } as Partial<MatchEvent>),
    ];

    expect(calculateTotalScore(errorEvents)).toEqual({ uruguay: 0, opponent: 1 });
    expect(calculatePeriodScore(errorEvents, 1)).toEqual({ uruguay: 0, opponent: 1 });
  });

  it('punto en contra rival adds one Uruguay point without player or landingLocation', () => {
    const events: MatchEvent[] = [
      event({
        id: 'opponent-own-1',
        scoringTeam: 'uruguay',
        playerId: undefined,
        landingLocation: undefined,
        pointSource: 'opponent_own_point',
      }),
      event({
        id: 'attack-1',
        scoringTeam: 'uruguay',
        playerId: 'p1',
        landingLocation: { x: 0.7, y: 0.3 },
        pointSource: 'attack',
      }),
    ];

    expect(calculateTotalScore(events)).toEqual({ uruguay: 2, opponent: 0 });
    expect(calculatePeriodScore(events, 1)).toEqual({ uruguay: 2, opponent: 0 });
    expect(getOpponentOwnPoints(events)).toBe(1);
    expect(getOpponentOwnPointsByPeriod(events, 1)).toBe(1);
    expect(getTopScorersByPeriod(events, 1)).toEqual([{ playerId: 'p1', total: 1 }]);
    expect(getPointsByZoneForEvents(events, 'uruguay')).toEqual([{ zone: 'center', total: 1 }]);
  });

  it('legacy errors are safe and do not affect score or typed totals', () => {
    const legacyEvents: MatchEvent[] = [
      event({ id: 'legacy-1', kind: 'error', team: 'uruguay', playerId: 'p1', errorType: 'turnover' } as Partial<MatchEvent>),
    ];

    expect(calculateTotalScore(legacyEvents)).toEqual({ uruguay: 0, opponent: 0 });
    expect(getErrorsByPlayerByPeriod(legacyEvents, 1)).toEqual([]);
    expect(getErrorsByTypeByPlayer(legacyEvents)).toEqual([]);
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
        event({ id: 'o-1', scoringTeam: 'opponent', playerId: undefined, landingLocation: { x: 0.18, y: 0.3 }, zone: 'center' }),
        event({ id: 'o-2', scoringTeam: 'opponent', playerId: undefined, landingLocation: { x: 0.2, y: 0.32 }, zone: 'center' }),
        event({ id: 'o-3', scoringTeam: 'opponent', playerId: undefined, landingLocation: { x: 0.22, y: 0.32 }, zone: 'center' }),
      ],
    };

    const text = generatePeriodInsights(matchWithLocations, 1, (playerId) => playerId)
      .map((insight) => `${insight.title} ${insight.description}`)
      .join(' ');

    expect(text).toContain('zona central');
    expect(text).toContain('marco izquierdo · lado derecho · 30°-60°');
    expect(text).not.toContain('marco derecho · lado izquierdo · 30°-60°');
    expect(text).not.toMatch(/\b(center|left|right)\b/);
    expect(text).not.toMatch(/zona izquierda|zona derecha/i);
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

  it('generatePeriodInsights creates a rival own-point insight without location insight', () => {
    const ownPointMatch: Match = {
      ...match,
      events: [
        event({ id: 'own-1', scoringTeam: 'uruguay', playerId: undefined, landingLocation: undefined, pointSource: 'opponent_own_point' }),
        event({ id: 'own-2', scoringTeam: 'uruguay', playerId: undefined, landingLocation: undefined, pointSource: 'opponent_own_point' }),
      ],
    };
    const insights = generatePeriodInsights(ownPointMatch, 1, (playerId) => playerId);

    expect(insights.some((insight) => insight.title === 'Puntos regalados por el rival')).toBe(true);
    expect(insights.some((insight) => insight.title === 'Zona efectiva')).toBe(false);
  });

  it('generatePeriodInsights creates a rival defense zone insight without raw values', () => {
    const defenseMatch: Match = {
      ...match,
      events: [
        event({ id: 'rd-1', kind: 'opponent_defense', team: 'opponent', playerId: undefined, defenseLocation: { x: 0.55, y: 0.3 } } as Partial<MatchEvent>),
        event({ id: 'rd-2', kind: 'opponent_defense', team: 'opponent', playerId: undefined, defenseLocation: { x: 0.58, y: 0.32 } } as Partial<MatchEvent>),
        event({ id: 'rd-3', kind: 'opponent_defense', team: 'opponent', playerId: undefined, defenseLocation: { x: 0.6, y: 0.32 } } as Partial<MatchEvent>),
      ],
    };
    const text = generatePeriodInsights(defenseMatch, 1, (playerId) => playerId)
      .map((insight) => `${insight.title} ${insight.description}`)
      .join(' ');

    expect(text).toContain('Nos defienden seguido en un sector');
    expect(text).toContain('marco derecho · lado izquierdo · 30°-60°');
    expect(text).not.toMatch(/\b(center|left|right|opponent_defense)\b/);
  });
});
