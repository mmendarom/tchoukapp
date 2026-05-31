import { describe, expect, it } from 'vitest';

import {
  clamp01,
  denormalizeLocation,
  getCourtHalf,
  getCourtZone,
  getPointEventsWithLocation,
  groupOpponentPointsByZone,
  groupPointsByZone,
  isValidCourtLayout,
  normalizeTapLocation,
} from './court';
import { getEventsByPeriod } from './periodStats';
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

describe('court derived zones', () => {
  it('clamp01 clamps values below and above the normalized range', () => {
    expect(clamp01(-0.25)).toBe(0);
    expect(clamp01(0.45)).toBe(0.45);
    expect(clamp01(1.4)).toBe(1);
  });

  it('isValidCourtLayout rejects invalid and tiny layouts', () => {
    expect(isValidCourtLayout(0, 100)).toBe(false);
    expect(isValidCourtLayout(100, 0)).toBe(false);
    expect(isValidCourtLayout(-100, 100)).toBe(false);
    expect(isValidCourtLayout(1, 1)).toBe(false);
    expect(isValidCourtLayout(240, 140)).toBe(true);
  });

  it('normalizeTapLocation converts center taps to normalized coordinates', () => {
    expect(normalizeTapLocation(100, 50, 200, 100)).toEqual({ x: 0.5, y: 0.5 });
  });

  it('normalizeTapLocation converts corners to normalized coordinates', () => {
    expect(normalizeTapLocation(0, 0, 200, 100)).toEqual({ x: 0, y: 0 });
    expect(normalizeTapLocation(200, 0, 200, 100)).toEqual({ x: 1, y: 0 });
    expect(normalizeTapLocation(0, 100, 200, 100)).toEqual({ x: 0, y: 1 });
    expect(normalizeTapLocation(200, 100, 200, 100)).toEqual({ x: 1, y: 1 });
  });

  it('normalizeTapLocation clamps out-of-bounds taps', () => {
    expect(normalizeTapLocation(-10, 120, 200, 100)).toEqual({ x: 0, y: 1 });
    expect(normalizeTapLocation(240, -20, 200, 100)).toEqual({ x: 1, y: 0 });
  });

  it('normalizeTapLocation throws for invalid layouts', () => {
    expect(() => normalizeTapLocation(10, 10, 1, 1)).toThrow('Invalid court layout dimensions');
  });

  it('denormalizeLocation converts normalized coordinates to local pixels', () => {
    expect(denormalizeLocation({ x: 0.5, y: 0.5 }, 200, 100)).toEqual({ x: 100, y: 50 });
    expect(denormalizeLocation({ x: 0, y: 0 }, 200, 100)).toEqual({ x: 0, y: 0 });
    expect(denormalizeLocation({ x: 1, y: 1 }, 200, 100)).toEqual({ x: 200, y: 100 });
  });

  it('denormalize after normalize returns the expected equivalent position', () => {
    const normalized = normalizeTapLocation(82, 37, 200, 100);

    expect(denormalizeLocation(normalized, 200, 100)).toEqual({ x: 82, y: 37 });
  });

  it('getCourtZone derives left center right from x', () => {
    expect(getCourtZone({ x: 0.1, y: 0.5 })).toBe('izquierda');
    expect(getCourtZone({ x: 0.5, y: 0.5 })).toBe('central');
    expect(getCourtZone({ x: 0.9, y: 0.5 })).toBe('derecha');
  });

  it('getCourtHalf derives frame side from x', () => {
    expect(getCourtHalf({ x: 0.2, y: 0.5 })).toBe('marco_izquierdo');
    expect(getCourtHalf({ x: 0.5, y: 0.5 })).toBe('centro');
    expect(getCourtHalf({ x: 0.8, y: 0.5 })).toBe('marco_derecho');
  });

  it('groupPointsByZone groups Uruguay landing locations', () => {
    const stats = groupPointsByZone([
      point({ landingLocation: { x: 0.8, y: 0.2 } }),
      point({ landingLocation: { x: 0.75, y: 0.4 } }),
      point({ landingLocation: { x: 0.5, y: 0.4 } }),
    ]);

    expect(stats[0]).toEqual({ label: 'Zona derecha', total: 2 });
  });

  it('groupOpponentPointsByZone groups opponent landing locations', () => {
    const stats = groupOpponentPointsByZone([
      point({ scoringTeam: 'opponent', playerId: undefined, landingLocation: { x: 0.45, y: 0.2 } }),
      point({ scoringTeam: 'opponent', playerId: undefined, landingLocation: { x: 0.5, y: 0.4 } }),
    ]);

    expect(stats[0]).toEqual({ label: 'Zona central', total: 2 });
  });

  it('old events without landingLocation do not crash or count', () => {
    expect(groupPointsByZone([point({ landingLocation: undefined })])).toEqual([]);
  });

  it('opponent own points are excluded from maps even if legacy data has a location', () => {
    const events = [
      point({ scoringTeam: 'uruguay', pointSource: 'opponent_own_point', playerId: undefined, landingLocation: { x: 0.8, y: 0.2 } }),
    ];

    expect(getPointEventsWithLocation(events, 'uruguay')).toEqual([]);
    expect(groupPointsByZone(events)).toEqual([]);
  });

  it('period summaries can use only current period locations', () => {
    const events = [
      point({ periodNumber: 1, landingLocation: { x: 0.8, y: 0.2 } }),
      point({ periodNumber: 2, clock: { period: 2, secondsElapsed: 1 }, landingLocation: { x: 0.2, y: 0.2 } }),
    ];

    expect(getPointEventsWithLocation(getEventsByPeriod(events, 1), 'uruguay')).toHaveLength(1);
    expect(groupPointsByZone(getEventsByPeriod(events, 1))[0]).toEqual({ label: 'Zona derecha', total: 1 });
  });

  it('final summaries can use all match locations', () => {
    const events = [
      point({ periodNumber: 1, landingLocation: { x: 0.8, y: 0.2 } }),
      point({ periodNumber: 2, clock: { period: 2, secondsElapsed: 1 }, landingLocation: { x: 0.75, y: 0.2 } }),
    ];

    expect(groupPointsByZone(events)[0]).toEqual({ label: 'Zona derecha', total: 2 });
  });
});
