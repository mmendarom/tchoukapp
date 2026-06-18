import { describe, expect, it } from 'vitest';

import {
  buildLivePlayerPerformance,
  buildPlayerPerformance,
  buildPlayerPerformanceForPeriod,
} from './playerPerformance';
import { MatchEvent, Player } from './types';

const players: Player[] = [
  { id: 'p1', firstName: 'Mauro', lastName: '', number: 1, position: 'Wing', usualPlayingZone: 'izquierda', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'p2', firstName: 'Fede', lastName: '', number: 2, position: 'Wing', usualPlayingZone: 'derecha', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'p3', firstName: 'Ileana', lastName: '', number: 3, position: 'Center', usualPlayingZone: 'central', dominantHand: 'Left', caps: 0, goals: 0, blocks: 0 },
];

const point = (overrides: Partial<MatchEvent> = {}): MatchEvent => ({
  id: `point-${Math.random()}`,
  matchId: 'match-1',
  kind: 'point',
  periodNumber: 1,
  timestamp: '2026-01-01T00:00:00.000Z',
  clock: { period: 1, secondsElapsed: 1 },
  scoringTeam: 'uruguay',
  playerId: 'p1',
  landingLocation: { x: 0.4, y: 0.5 },
  zone: 'center',
  frame: 'right-frame',
  pointSource: 'attack',
  ...overrides,
} as MatchEvent);

const defense = (overrides: Partial<MatchEvent> = {}): MatchEvent => ({
  id: `defense-${Math.random()}`,
  matchId: 'match-1',
  kind: 'defense',
  periodNumber: 1,
  timestamp: '2026-01-01T00:00:00.000Z',
  clock: { period: 1, secondsElapsed: 1 },
  team: 'uruguay',
  playerId: 'p1',
  ...overrides,
} as MatchEvent);

const opponentDefense = (overrides: Partial<MatchEvent> = {}): MatchEvent => ({
  id: `opponent-defense-${Math.random()}`,
  matchId: 'match-1',
  kind: 'opponent_defense',
  periodNumber: 1,
  timestamp: '2026-01-01T00:00:00.000Z',
  clock: { period: 1, secondsElapsed: 1 },
  team: 'opponent',
  defenseLocation: { x: 0.5, y: 0.4 },
  ...overrides,
} as MatchEvent);

describe('playerPerformance', () => {
  it('calculates attack share from normal Uruguay points by player', () => {
    const data = buildPlayerPerformance([
      point({ id: 'p1-a', playerId: 'p1' }),
      point({ id: 'p1-b', playerId: 'p1' }),
      point({ id: 'p2-a', playerId: 'p2' }),
    ], players);

    expect(data.totalTeamPoints).toBe(3);
    expect(data.rows.find((row) => row.playerId === 'p1')).toMatchObject({ points: 2, pointShare: 2 / 3 });
    expect(data.rows.find((row) => row.playerId === 'p2')).toMatchObject({ points: 1, pointShare: 1 / 3 });
  });

  it('calculates defense share from Uruguay defenses by player', () => {
    const data = buildPlayerPerformance([
      defense({ id: 'p1-d', playerId: 'p1' }),
      defense({ id: 'p2-d1', playerId: 'p2' }),
      defense({ id: 'p2-d2', playerId: 'p2' }),
    ], players);

    expect(data.totalTeamDefenses).toBe(3);
    expect(data.rows.find((row) => row.playerId === 'p1')).toMatchObject({ defenses: 1, defenseShare: 1 / 3 });
    expect(data.rows.find((row) => row.playerId === 'p2')).toMatchObject({ defenses: 2, defenseShare: 2 / 3 });
  });

  it('excludes punto en contra rival from attack share', () => {
    const data = buildPlayerPerformance([
      point({ id: 'own-rival', playerId: undefined, pointSource: 'opponent_own_point', landingLocation: undefined }),
      point({ id: 'normal', playerId: 'p1' }),
    ], players);

    expect(data.totalTeamPoints).toBe(1);
    expect(data.rows).toHaveLength(1);
    expect(data.rows[0]).toMatchObject({ playerId: 'p1', points: 1, pointShare: 1 });
  });

  it('excludes rival points and events without playerId from attack share', () => {
    const data = buildPlayerPerformance([
      point({ id: 'rival', scoringTeam: 'opponent', playerId: undefined }),
      point({ id: 'missing-player', playerId: undefined }),
      point({ id: 'normal', playerId: 'p2' }),
    ], players);

    expect(data.totalTeamPoints).toBe(1);
    expect(data.rows).toEqual([
      expect.objectContaining({ playerId: 'p2', points: 1, pointShare: 1 }),
    ]);
  });

  it('excludes rival defenses from Uruguay defense share', () => {
    const data = buildPlayerPerformance([
      opponentDefense(),
      defense({ playerId: 'p3' }),
    ], players);

    expect(data.totalTeamDefenses).toBe(1);
    expect(data.rows).toEqual([
      expect.objectContaining({ playerId: 'p3', defenses: 1, defenseShare: 1 }),
    ]);
  });

  it('calculates shot effectiveness from goals and rival defenses linked to a shooter', () => {
    const data = buildPlayerPerformance([
      point({ id: 'goal-1', playerId: 'p1' }),
      point({ id: 'goal-2', playerId: 'p1' }),
      opponentDefense({ id: 'defended-1', playerId: 'p1' }),
      opponentDefense({ id: 'defended-2', playerId: 'p2' }),
    ], players);

    expect(data.rows.find((row) => row.playerId === 'p1')).toMatchObject({
      points: 2,
      rivalDefensesAgainst: 1,
      shotAttempts: 3,
      effectiveness: 2 / 3,
    });
    expect(data.rows.find((row) => row.playerId === 'p2')).toMatchObject({
      points: 0,
      rivalDefensesAgainst: 1,
      shotAttempts: 1,
      effectiveness: 0,
    });
  });

  it('excludes legacy rival defenses without playerId from player effectiveness', () => {
    const data = buildPlayerPerformance([
      opponentDefense({ id: 'legacy-defense', playerId: undefined }),
      point({ id: 'goal', playerId: 'p1' }),
    ], players);

    expect(data.rows.find((row) => row.playerId === 'p1')).toMatchObject({
      points: 1,
      rivalDefensesAgainst: 0,
      shotAttempts: 1,
      effectiveness: 1,
    });
    expect(data.rows).toHaveLength(1);
  });

  it('excludes rival points and punto en contra rival from shot attempts', () => {
    const data = buildPlayerPerformance([
      point({ id: 'rival-point', scoringTeam: 'opponent', playerId: undefined }),
      point({ id: 'own-rival', playerId: undefined, pointSource: 'opponent_own_point', landingLocation: undefined }),
      opponentDefense({ id: 'defended', playerId: 'p3' }),
    ], players);

    expect(data.totalTeamPoints).toBe(0);
    expect(data.rows).toEqual([
      expect.objectContaining({
        playerId: 'p3',
        points: 0,
        rivalDefensesAgainst: 1,
        shotAttempts: 1,
        effectiveness: 0,
      }),
    ]);
  });

  it('includes live on-court players with zero stats in lineup order', () => {
    const data = buildLivePlayerPerformance([
      point({ playerId: 'p2' }),
    ], players, ['p3', 'p2', 'p1'], 1);

    expect(data.rows.map((row) => row.playerId)).toEqual(['p3', 'p2', 'p1']);
    expect(data.rows.find((row) => row.playerId === 'p3')).toMatchObject({
      points: 0,
      pointShare: 0,
      rivalDefensesAgainst: 0,
      shotAttempts: 0,
      effectiveness: undefined,
      defenses: 0,
      defenseShare: 0,
    });
  });

  it('does not divide by zero for empty totals', () => {
    const data = buildPlayerPerformance([], players, ['p1']);

    expect(data.totalTeamPoints).toBe(0);
    expect(data.totalTeamDefenses).toBe(0);
    expect(data.rows[0]).toMatchObject({ pointShare: 0, shotAttempts: 0, effectiveness: undefined, defenseShare: 0 });
  });

  it('filters period performance by periodNumber', () => {
    const data = buildPlayerPerformanceForPeriod([
      point({ id: 'period-1', playerId: 'p1', periodNumber: 1, clock: { period: 1, secondsElapsed: 1 } }),
      point({ id: 'period-2', playerId: 'p2', periodNumber: 2, clock: { period: 2, secondsElapsed: 1 } }),
      defense({ id: 'period-1-defense', playerId: 'p3', periodNumber: 1, clock: { period: 1, secondsElapsed: 2 } }),
      opponentDefense({ id: 'period-1-rival-defense', playerId: 'p1', periodNumber: 1, clock: { period: 1, secondsElapsed: 3 } }),
      opponentDefense({ id: 'period-2-rival-defense', playerId: 'p2', periodNumber: 2, clock: { period: 2, secondsElapsed: 3 } }),
    ], players, [], 1);

    expect(data.totalTeamPoints).toBe(1);
    expect(data.totalTeamDefenses).toBe(1);
    expect(data.rows.map((row) => row.playerId)).toEqual(['p1', 'p3']);
    expect(data.rows.find((row) => row.playerId === 'p1')).toMatchObject({ shotAttempts: 2, effectiveness: 1 / 2 });
  });

  it('keeps match total performance across all periods', () => {
    const data = buildPlayerPerformance([
      point({ id: 'period-1', playerId: 'p1', periodNumber: 1, clock: { period: 1, secondsElapsed: 1 } }),
      point({ id: 'period-2', playerId: 'p2', periodNumber: 2, clock: { period: 2, secondsElapsed: 1 } }),
      defense({ id: 'period-3-defense', playerId: 'p2', periodNumber: 3, clock: { period: 3, secondsElapsed: 1 } }),
    ], players);

    expect(data.totalTeamPoints).toBe(2);
    expect(data.totalTeamDefenses).toBe(1);
    expect(data.rows.find((row) => row.playerId === 'p2')).toMatchObject({ points: 1, defenses: 1 });
  });
});
