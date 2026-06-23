import { describe, expect, it } from 'vitest';

import { TrainingEvent, TrainingMiniMatch, TrainingSession, TrainingTeam } from './training';
import { buildTrainingPerformance } from './trainingPerformance';
import { Player } from './types';

const players: Player[] = [
  { id: 'p1', firstName: 'Mauro', lastName: 'Mauro', number: 3, position: 'Wing', usualPlayingZone: 'izquierda', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'p2', firstName: 'Nico', lastName: 'Nico', number: 7, position: 'Wing', usualPlayingZone: 'derecha', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'p3', firstName: 'Vladi', lastName: 'Vladi', number: 4, position: 'Center', usualPlayingZone: 'central', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'p4', firstName: 'Fede', lastName: 'Fede', number: 11, position: 'Wing', usualPlayingZone: 'izquierda', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'p5', firstName: 'Tadeo', lastName: 'Tadeo', number: 8, position: 'Center', usualPlayingZone: 'central', dominantHand: 'Left', caps: 0, goals: 0, blocks: 0 },
  { id: 'p6', firstName: 'Enano', lastName: 'Enano', number: 9, position: 'Wing', usualPlayingZone: 'derecha', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
];

const teams: TrainingTeam[] = [
  { id: 'team-a', name: 'Equipo 1', playerIds: ['p1', 'p2', 'p3'], queueOrder: 0 },
  { id: 'team-b', name: 'Equipo 2', playerIds: ['p4', 'p5', 'p6'], queueOrder: 1 },
];

const event = (
  id: string,
  type: TrainingEvent['type'],
  teamId: string,
  playerId: string,
  overrides: Partial<TrainingEvent> = {},
): TrainingEvent => ({
  id,
  sessionId: 'session-1',
  miniMatchId: 'mini-1',
  createdAt: 'now',
  teamId,
  playerId,
  type,
  ...overrides,
});

const miniMatch = (events: TrainingEvent[]): TrainingMiniMatch => ({
  id: 'mini-1',
  sessionId: 'session-1',
  teamAId: 'team-a',
  teamBId: 'team-b',
  scoreA: 0,
  scoreB: 0,
  targetScore: 3,
  status: 'finished',
  events,
});

const session = (events: TrainingEvent[]): TrainingSession => ({
  id: 'session-1',
  createdAt: 'now',
  updatedAt: 'now',
  participantPlayerIds: players.map((player) => player.id),
  teams,
  miniMatches: [miniMatch(events)],
  settings: { targetScore: 3, winnerStays: true },
  status: 'finished',
});

describe('training performance', () => {
  it('computes attack attempts as points, shots defended and own points against', () => {
    const data = buildTrainingPerformance(session([
      event('p1-goal', 'point', 'team-a', 'p1'),
      event('p1-defended', 'shot_defended', 'team-a', 'p1', { defendingTeamId: 'team-b', defenderPlayerId: 'p4' }),
      event('p1-own', 'own_point_against', 'team-a', 'p1'),
    ]), players);
    const row = data.attackRows.find((item) => item.playerId === 'p1');

    expect(row).toMatchObject({
      points: 1,
      attempts: 3,
      shotsDefended: 1,
      ownPointsAgainst: 1,
    });
    expect(row?.effectiveness).toBeCloseTo(1 / 3);
  });

  it('uses shot_defended for shooter and defender performance without requiring standalone defense', () => {
    const data = buildTrainingPerformance(session([
      event('shot-defended', 'shot_defended', 'team-a', 'p1', {
        defendingTeamId: 'team-b',
        defenderPlayerId: 'p4',
      }),
    ]), players);

    expect(data.attackRows.find((item) => item.playerId === 'p1')).toMatchObject({
      attempts: 1,
      shotsDefended: 1,
    });
    expect(data.defenseRows.find((item) => item.playerId === 'p4')).toMatchObject({
      defenses: 1,
      defenseShare: 1,
    });
  });

  it('keeps legacy defense events in defense totals', () => {
    const data = buildTrainingPerformance(session([
      event('legacy-defense', 'defense', 'team-b', 'p5'),
    ]), players);

    expect(data.totalDefenses).toBe(1);
    expect(data.defenseRows[0]).toMatchObject({ playerId: 'p5', defenses: 1 });
  });

  it('ranks high scorers above low-volume perfect shooters', () => {
    const data = buildTrainingPerformance(session([
      event('p1-1', 'point', 'team-a', 'p1'),
      event('p1-2', 'point', 'team-a', 'p1'),
      event('p1-3', 'point', 'team-a', 'p1'),
      event('p1-defended', 'shot_defended', 'team-a', 'p1', { defendingTeamId: 'team-b', defenderPlayerId: 'p4' }),
      event('p2-1', 'point', 'team-a', 'p2'),
    ]), players);

    expect(data.attackRows[0].playerId).toBe('p1');
    expect(data.attackRows.findIndex((row) => row.playerId === 'p1')).toBeLessThan(
      data.attackRows.findIndex((row) => row.playerId === 'p2'),
    );
  });

  it('sorts defense rows by defenses and share', () => {
    const data = buildTrainingPerformance(session([
      event('p4-defense-1', 'shot_defended', 'team-a', 'p1', { defendingTeamId: 'team-b', defenderPlayerId: 'p4' }),
      event('p4-defense-2', 'shot_defended', 'team-a', 'p2', { defendingTeamId: 'team-b', defenderPlayerId: 'p4' }),
      event('p5-defense-1', 'defense', 'team-b', 'p5'),
    ]), players);

    expect(data.defenseRows[0]).toMatchObject({ playerId: 'p4', defenses: 2 });
    expect(data.defenseRows[1]).toMatchObject({ playerId: 'p5', defenses: 1 });
  });

  it('includes ties in top attack groups and does not highlight zero-attempt players', () => {
    const data = buildTrainingPerformance(session([
      event('p1-1', 'point', 'team-a', 'p1'),
      event('p1-defended', 'shot_defended', 'team-a', 'p1', { defendingTeamId: 'team-b', defenderPlayerId: 'p4' }),
      event('p2-1', 'point', 'team-a', 'p2'),
      event('p2-defended', 'shot_defended', 'team-a', 'p2', { defendingTeamId: 'team-b', defenderPlayerId: 'p5' }),
      event('p3-1', 'point', 'team-a', 'p3'),
    ]), players);

    expect(data.topAttackPlayerIds.has('p1')).toBe(true);
    expect(data.topAttackPlayerIds.has('p2')).toBe(true);
    expect(data.topAttackPlayerIds.has('p3')).toBe(true);
    expect(data.topAttackPlayerIds.has('p6')).toBe(false);
  });

  it('includes ties in top defense groups and does not highlight zero-defense players', () => {
    const data = buildTrainingPerformance(session([
      event('p4-defense-1', 'shot_defended', 'team-a', 'p1', { defendingTeamId: 'team-b', defenderPlayerId: 'p4' }),
      event('p5-defense-1', 'shot_defended', 'team-a', 'p2', { defendingTeamId: 'team-b', defenderPlayerId: 'p5' }),
      event('p6-defense-1', 'shot_defended', 'team-a', 'p3', { defendingTeamId: 'team-b', defenderPlayerId: 'p6' }),
    ]), players);

    expect(data.topDefensePlayerIds.has('p4')).toBe(true);
    expect(data.topDefensePlayerIds.has('p5')).toBe(true);
    expect(data.topDefensePlayerIds.has('p6')).toBe(true);
    expect(data.topDefensePlayerIds.has('p1')).toBe(false);
  });
});
