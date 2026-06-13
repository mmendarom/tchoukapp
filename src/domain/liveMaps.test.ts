import { describe, expect, it } from 'vitest';

import { getCombinedLiveMapMarkers, getLiveMapLocationCount, getLiveMapLocationData } from './liveMaps';
import { MatchEvent } from './types';

const point = (overrides: Partial<MatchEvent>): MatchEvent => ({
  id: `event-${Math.random()}`,
  matchId: 'match-1',
  kind: 'point',
  periodNumber: 1,
  timestamp: '2026-01-01T00:00:00.000Z',
  clock: { period: 1, secondsElapsed: 1 },
  scoringTeam: 'uruguay',
  playerId: 'p1',
  landingLocation: { x: 0.2, y: 0.4 },
  zone: 'center',
  frame: 'right-frame',
  pointSource: 'attack',
  ...overrides,
} as MatchEvent);

const opponentDefense = (overrides: Partial<MatchEvent> = {}): MatchEvent => ({
  id: `defense-${Math.random()}`,
  matchId: 'match-1',
  kind: 'opponent_defense',
  periodNumber: 1,
  timestamp: '2026-01-01T00:00:00.000Z',
  clock: { period: 1, secondsElapsed: 1 },
  team: 'opponent',
  defenseLocation: { x: 0.7, y: 0.3 },
  ...overrides,
} as MatchEvent);

const uruguayDefense = (overrides: Partial<MatchEvent> = {}): MatchEvent => ({
  id: `uruguay-defense-${Math.random()}`,
  matchId: 'match-1',
  kind: 'defense',
  periodNumber: 1,
  timestamp: '2026-01-01T00:00:00.000Z',
  clock: { period: 1, secondsElapsed: 1 },
  team: 'uruguay',
  playerId: 'p1',
  ...overrides,
} as MatchEvent);

const error = (overrides: Partial<MatchEvent> = {}): MatchEvent => ({
  id: `error-${Math.random()}`,
  matchId: 'match-1',
  kind: 'error',
  periodNumber: 1,
  timestamp: '2026-01-01T00:00:00.000Z',
  clock: { period: 1, secondsElapsed: 1 },
  team: 'uruguay',
  playerId: 'p1',
  errorType: 'punto_en_contra',
  pointAwardedTo: 'opponent',
  ...overrides,
} as MatchEvent);

describe('live map location data', () => {
  it('selects current period Uruguay point locations', () => {
    const events = [
      point({ id: 'current-1', landingLocation: { x: 0.1, y: 0.2 } }),
      point({ id: 'current-2', landingLocation: { x: 0.3, y: 0.4 } }),
      point({ id: 'old-period', periodNumber: 2, clock: { period: 2, secondsElapsed: 1 }, landingLocation: { x: 0.8, y: 0.2 } }),
    ];

    const data = getLiveMapLocationData(events, 1, 'ourPoints');

    expect(data.events.map((event) => event.id)).toEqual(['current-1', 'current-2']);
    expect(data.locations).toEqual([
      { x: 0.1, y: 0.2 },
      { x: 0.3, y: 0.4 },
    ]);
  });

  it('selects current period rival point locations', () => {
    const events = [
      point({ id: 'ours', scoringTeam: 'uruguay', landingLocation: { x: 0.1, y: 0.2 } }),
      point({ id: 'rival', scoringTeam: 'opponent', playerId: undefined, landingLocation: { x: 0.5, y: 0.6 } }),
    ];

    const data = getLiveMapLocationData(events, 1, 'rivalPoints');

    expect(data.events.map((event) => event.id)).toEqual(['rival']);
    expect(data.locations).toEqual([{ x: 0.5, y: 0.6 }]);
  });

  it('selects current period rival defense locations', () => {
    const events = [
      opponentDefense({ id: 'rival-defense', defenseLocation: { x: 0.4, y: 0.5 } }),
      opponentDefense({ id: 'old-defense', periodNumber: 2, clock: { period: 2, secondsElapsed: 1 }, defenseLocation: { x: 0.2, y: 0.2 } }),
      uruguayDefense(),
    ];

    const data = getLiveMapLocationData(events, 1, 'rivalDefenses');

    expect(data.events.map((event) => event.id)).toEqual(['rival-defense']);
    expect(data.locations).toEqual([{ x: 0.4, y: 0.5 }]);
  });

  it('excludes punto en contra and punto en contra rival from live maps', () => {
    const events = [
      error(),
      point({
        id: 'opponent-own-point',
        scoringTeam: 'uruguay',
        playerId: undefined,
        pointSource: 'opponent_own_point',
        landingLocation: { x: 0.9, y: 0.9 },
      }),
      point({ id: 'normal-point', scoringTeam: 'uruguay', landingLocation: { x: 0.2, y: 0.3 } }),
    ];

    expect(getLiveMapLocationData(events, 1, 'ourPoints').events.map((event) => event.id)).toEqual(['normal-point']);
    expect(getLiveMapLocationData(events, 1, 'rivalPoints').events).toEqual([]);
  });

  it('ignores old events without location without crashing', () => {
    const events = [
      point({ landingLocation: undefined }),
      opponentDefense({ defenseLocation: undefined } as Partial<MatchEvent>),
    ];

    expect(getLiveMapLocationCount(events, 1, 'ourPoints')).toBe(0);
    expect(getLiveMapLocationCount(events, 1, 'rivalDefenses')).toBe(0);
  });

  it('builds combined markers with our points, rival points and rival defenses for the current period', () => {
    const events = [
      point({ id: 'our-point', scoringTeam: 'uruguay', landingLocation: { x: 0.1, y: 0.2 } }),
      point({ id: 'rival-point', scoringTeam: 'opponent', playerId: undefined, landingLocation: { x: 0.3, y: 0.4 } }),
      opponentDefense({ id: 'rival-defense', defenseLocation: { x: 0.5, y: 0.6 } }),
      point({ id: 'old-period', periodNumber: 2, clock: { period: 2, secondsElapsed: 1 }, landingLocation: { x: 0.7, y: 0.8 } }),
    ];

    const markers = getCombinedLiveMapMarkers(events, 1);

    expect(markers.map((marker) => marker.event.id)).toEqual(['our-point', 'rival-point', 'rival-defense']);
    expect(markers.map((marker) => marker.kind)).toEqual(['ourPoint', 'rivalPoint', 'rivalDefense']);
    expect(markers.map((marker) => marker.location)).toEqual([
      { x: 0.1, y: 0.2 },
      { x: 0.3, y: 0.4 },
      { x: 0.5, y: 0.6 },
    ]);
  });

  it('excludes non-location tactical events from combined markers', () => {
    const events = [
      uruguayDefense(),
      error(),
      point({
        id: 'opponent-own-point',
        scoringTeam: 'uruguay',
        playerId: undefined,
        pointSource: 'opponent_own_point',
        landingLocation: { x: 0.9, y: 0.9 },
      }),
      point({ id: 'legacy-point', landingLocation: undefined }),
      opponentDefense({ id: 'legacy-defense', defenseLocation: undefined } as Partial<MatchEvent>),
    ];

    expect(getCombinedLiveMapMarkers(events, 1)).toEqual([]);
    expect(getLiveMapLocationCount(events, 1, 'combined')).toBe(0);
  });
});
