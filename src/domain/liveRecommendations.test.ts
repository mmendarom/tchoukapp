import { describe, expect, it } from 'vitest';

import { buildLiveRecommendations } from './liveRecommendations';
import { MatchEvent, Player } from './types';

const players: Player[] = [
  { id: 'p1', firstName: 'Mauro', lastName: '', number: 1, position: 'Wing', usualPlayingZone: 'izquierda', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'p2', firstName: 'Fede', lastName: '', number: 2, position: 'Wing', usualPlayingZone: 'derecha', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'p3', firstName: 'Ileana', lastName: '', number: 3, position: 'Center', usualPlayingZone: 'central', dominantHand: 'Left', caps: 0, goals: 0, blocks: 0 },
  { id: 'p4', firstName: 'Ceci', lastName: '', number: 4, position: 'Center', usualPlayingZone: 'central', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
];

const baseEvent = (overrides: Partial<MatchEvent> = {}): MatchEvent => ({
  id: `event-${Math.random()}`,
  matchId: 'match-1',
  kind: 'point',
  periodNumber: 1,
  timestamp: '2026-01-01T00:00:00.000Z',
  clock: { period: 1, secondsElapsed: 1 },
  scoringTeam: 'uruguay',
  playerId: 'p1',
  landingLocation: { x: 0.5, y: 0.5 },
  zone: 'center',
  frame: 'right-frame',
  pointSource: 'attack',
  ...overrides,
} as MatchEvent);

const point = (overrides: Partial<MatchEvent> = {}) => baseEvent(overrides);

const rivalDefense = (overrides: Partial<MatchEvent> = {}) =>
  baseEvent({
    kind: 'opponent_defense',
    team: 'opponent',
    playerId: 'p1',
    defenseLocation: { x: 0.5, y: 0.5 },
    ...overrides,
  } as Partial<MatchEvent>);

const defense = (overrides: Partial<MatchEvent> = {}) =>
  baseEvent({
    kind: 'defense',
    team: 'uruguay',
    playerId: 'p1',
    ...overrides,
  } as Partial<MatchEvent>);

const error = (overrides: Partial<MatchEvent> = {}) =>
  baseEvent({
    kind: 'error',
    team: 'uruguay',
    playerId: 'p1',
    errorType: 'falta',
    ...overrides,
  } as Partial<MatchEvent>);

const build = (events: MatchEvent[], maxRecommendations = 12) =>
  buildLiveRecommendations({
    currentLineupPlayerIds: ['p1', 'p2', 'p3'],
    events,
    maxRecommendations,
    players,
  });

describe('buildLiveRecommendations', () => {
  it('returns no recommendations on empty data', () => {
    expect(build([])).toEqual([]);
  });

  it('creates blocked-player recommendation only when defended shots lower effectiveness', () => {
    const recommendations = build([
      point({ id: 'goal-1', playerId: 'p1' }),
      rivalDefense({ id: 'rd-1', playerId: 'p1' }),
      rivalDefense({ id: 'rd-2', playerId: 'p1' }),
    ]);

    expect(recommendations[0]).toMatchObject({
      id: 'blocked-p1',
      title: 'Lo están anulando',
      detail: 'A #1 Mauro le defendieron 2 tiros y lleva 1/3.',
    });
  });

  it('does not create negative blocked alert when effectiveness stays high despite defended shots', () => {
    const recommendations = build([
      point({ id: 'goal-1', playerId: 'p1' }),
      point({ id: 'goal-2', playerId: 'p1' }),
      point({ id: 'goal-3', playerId: 'p1' }),
      point({ id: 'goal-4', playerId: 'p1' }),
      point({ id: 'goal-5', playerId: 'p1' }),
      point({ id: 'goal-6', playerId: 'p1' }),
      rivalDefense({ id: 'rd-1', playerId: 'p1' }),
      rivalDefense({ id: 'rd-2', playerId: 'p1' }),
    ]);

    expect(recommendations.find((item) => item.id === 'blocked-p1')).toBeUndefined();
    expect(recommendations.find((item) => item.id === 'low-effectiveness-p1')).toBeUndefined();
    expect(recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'defended-shots-info-p1',
          title: 'Le están defendiendo tiros',
          type: 'info',
          detail: 'A #1 Mauro le defendieron 2, pero mantiene 75% de efectividad.',
        }),
      ]),
    );
  });

  it('creates low-effectiveness recommendation only after enough attempts', () => {
    expect(build([
      point({ id: 'goal-1', playerId: 'p1' }),
      rivalDefense({ id: 'rd-1', playerId: 'p1' }),
      rivalDefense({ id: 'rd-2', playerId: 'p1' }),
    ]).some((item) => item.id === 'low-effectiveness-p1')).toBe(false);

    const recommendations = build([
      point({ id: 'goal-1', playerId: 'p1' }),
      point({ id: 'goal-2', playerId: 'p1' }),
      rivalDefense({ id: 'rd-1', playerId: 'p1' }),
      rivalDefense({ id: 'rd-2', playerId: 'p1' }),
    ]);

    expect(recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'low-effectiveness-p1',
          title: 'Baja efectividad',
          detail: '#1 Mauro: 2/4 en tiros (50%).',
        }),
      ]),
    );
  });

  it('creates repeated error and own-point recommendations', () => {
    const recommendations = build([
      error({ id: 'e-1', playerId: 'p2', errorType: 'falta' }),
      error({ id: 'e-2', playerId: 'p2', errorType: 'punto_en_contra' }),
      error({ id: 'e-3', playerId: 'p1', errorType: 'punto_en_contra' }),
    ]);

    expect(recommendations.map((item) => item.id)).toEqual(expect.arrayContaining(['team-own-points', 'repeated-errors-p2']));
    expect(recommendations.find((item) => item.id === 'team-own-points')?.detail).toBe('Ya hubo 2 puntos en contra.');
  });

  it('creates opponent scoring zone alert', () => {
    const recommendations = build([
      point({ id: 'o-1', scoringTeam: 'opponent', playerId: undefined, landingLocation: { x: 0.2, y: 0.3 }, frame: 'left-frame' }),
      point({ id: 'o-2', scoringTeam: 'opponent', playerId: undefined, landingLocation: { x: 0.25, y: 0.32 }, frame: 'left-frame' }),
      point({ id: 'o-3', scoringTeam: 'opponent', playerId: undefined, landingLocation: { x: 0.3, y: 0.32 }, frame: 'left-frame' }),
    ]);

    expect(recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'opponent-zone-marco izquierdo · 30°-60°',
          title: 'Zona vulnerable',
          detail: 'Nos están entrando seguido por marco izquierdo · 30°-60°.',
        }),
      ]),
    );
    expect(recommendations.map((item) => item.detail).join(' ')).not.toMatch(/zona izquierda|zona derecha/i);
  });

  it('uses legacy rival defenses without playerId for zone alert without crashing', () => {
    const recommendations = build([
      rivalDefense({ id: 'rd-1', playerId: undefined, defenseLocation: { x: 0.55, y: 0.3 } }),
      rivalDefense({ id: 'rd-2', playerId: undefined, defenseLocation: { x: 0.6, y: 0.32 } }),
      rivalDefense({ id: 'rd-3', playerId: undefined, defenseLocation: { x: 0.58, y: 0.32 } }),
    ]);

    expect(recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'opponent-defense-zone-marco derecho · 30°-60°',
          title: 'Zona bloqueada',
          detail: 'El rival nos está defendiendo seguido en marco derecho · 30°-60°.',
        }),
      ]),
    );
  });

  it('does not show no-involvement too early or for players with defenses', () => {
    expect(build([
      point({ id: 'u-1', playerId: 'p1' }),
      point({ id: 'u-2', playerId: 'p1' }),
    ]).some((item) => item.title === 'Baja participación')).toBe(false);

    const recommendations = build([
      defense({ id: 'd-1', playerId: 'p2' }),
      point({ id: 'u-1', playerId: 'p1' }),
      point({ id: 'u-2', playerId: 'p1' }),
      point({ id: 'u-3', playerId: 'p1' }),
      point({ id: 'u-4', playerId: 'p1' }),
      point({ id: 'u-5', playerId: 'p1' }),
      point({ id: 'u-6', playerId: 'p1' }),
      point({ id: 'u-7', playerId: 'p1' }),
    ], 10);

    expect(recommendations.find((item) => item.id === 'low-involvement-p2')).toBeUndefined();
    expect(recommendations.find((item) => item.id === 'low-involvement-p3')).toMatchObject({
      detail: '#3 Ileana todavía no registra tiros ni defensas.',
    });
    expect(recommendations.map((item) => `${item.title} ${item.detail}`).join(' ')).not.toMatch(/asist/i);
  });

  it('creates recommendations sorted by priority and allows up to twelve by default', () => {
    const recommendations = build([
      error({ id: 'e-1', playerId: 'p1', errorType: 'punto_en_contra' }),
      error({ id: 'e-2', playerId: 'p2', errorType: 'punto_en_contra' }),
      error({ id: 'e-3', playerId: 'p2', errorType: 'falta' }),
      point({ id: 'goal-1', playerId: 'p1' }),
      rivalDefense({ id: 'rd-1', playerId: 'p1' }),
      rivalDefense({ id: 'rd-2', playerId: 'p1' }),
      point({ id: 'o-1', scoringTeam: 'opponent', playerId: undefined, landingLocation: { x: 0.2, y: 0.3 } }),
      point({ id: 'o-2', scoringTeam: 'opponent', playerId: undefined, landingLocation: { x: 0.25, y: 0.4 } }),
      point({ id: 'o-3', scoringTeam: 'opponent', playerId: undefined, landingLocation: { x: 0.3, y: 0.5 } }),
      rivalDefense({ id: 'rd-zone-1', playerId: undefined, defenseLocation: { x: 0.45, y: 0.3 } }),
      rivalDefense({ id: 'rd-zone-2', playerId: undefined, defenseLocation: { x: 0.5, y: 0.4 } }),
      rivalDefense({ id: 'rd-zone-3', playerId: undefined, defenseLocation: { x: 0.55, y: 0.5 } }),
      defense({ id: 'd-1', playerId: 'p3' }),
      defense({ id: 'd-2', playerId: 'p3' }),
      defense({ id: 'd-3', playerId: 'p3' }),
      defense({ id: 'd-4', playerId: 'p2' }),
    ]);

    expect(recommendations.length).toBeLessThanOrEqual(12);
    expect(recommendations.map((item) => item.priority)).toEqual([...recommendations.map((item) => item.priority)].sort((a, b) => a - b));
    expect(recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'strong-defense-p3', title: 'Aporte defensivo' }),
      ]),
    );
  });

  it('keeps strong offensive performance as a low-priority info note', () => {
    const recommendations = build([
      point({ id: 'goal-1', playerId: 'p1' }),
      point({ id: 'goal-2', playerId: 'p1' }),
      point({ id: 'goal-3', playerId: 'p1' }),
      rivalDefense({ id: 'rd-1', playerId: 'p1' }),
    ]);

    expect(recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'strong-offense-p1',
          title: 'Buen rendimiento ofensivo',
          type: 'info',
          detail: '#1 Mauro: 3/4 en tiros (75%).',
          priority: 100,
        }),
      ]),
    );
  });
});
