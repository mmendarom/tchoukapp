import { describe, expect, it } from 'vitest';

import {
  buildTrainingSettings,
  advanceTrainingQueueAfterMiniMatch,
  getSuggestedNextMiniMatch,
  getOppositeTrainingTeamId,
  getTrainingMiniMatchScore,
  getTrainingMiniMatchWinner,
  getTrainingQueue,
  getTrainingSessionStats,
  recalculateTrainingMiniMatch,
  TrainingMiniMatch,
  TrainingSession,
  TrainingTeam,
  validateTrainingTeams,
} from './training';

const participants = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];

const teams: TrainingTeam[] = [
  { id: 'team-a', name: 'Equipo A', playerIds: ['p1', 'p2', 'p3'], queueOrder: 0 },
  { id: 'team-b', name: 'Equipo B', playerIds: ['p4', 'p5', 'p6'], queueOrder: 1 },
];
const fourTeams: TrainingTeam[] = [
  ...teams,
  { id: 'team-c', name: 'Equipo C', playerIds: ['p7', 'p8', 'p9'], queueOrder: 2 },
  { id: 'team-d', name: 'Equipo D', playerIds: ['p10', 'p11', 'p12'], queueOrder: 3 },
];

const miniMatch = (overrides: Partial<TrainingMiniMatch> = {}): TrainingMiniMatch => ({
  id: 'mini-1',
  sessionId: 'session-1',
  teamAId: 'team-a',
  teamBId: 'team-b',
  scoreA: 0,
  scoreB: 0,
  targetScore: 3,
  status: 'live',
  startedAt: '2026-01-01T00:00:00.000Z',
  events: [],
  ...overrides,
});

const session = (overrides: Partial<TrainingSession> = {}): TrainingSession => ({
  id: 'session-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  participantPlayerIds: participants,
  teams,
  miniMatches: [],
  settings: { targetScore: 3, winnerStays: true },
  status: 'live',
  ...overrides,
});

describe('training domain', () => {
  it('validates teams of 3 or 4 players', () => {
    expect(validateTrainingTeams(participants, teams)).toEqual({ valid: true, errors: [] });
    expect(validateTrainingTeams([...participants, 'p7', 'p8'], [
      { id: 'team-a', name: 'Equipo A', playerIds: ['p1', 'p2', 'p3', 'p7'], queueOrder: 0 },
      { id: 'team-b', name: 'Equipo B', playerIds: ['p4', 'p5', 'p6', 'p8'], queueOrder: 1 },
    ])).toEqual({ valid: true, errors: [] });
  });

  it('rejects teams with fewer than 3 or more than 4 players', () => {
    const validation = validateTrainingTeams([...participants, 'p7'], [
      { id: 'team-a', name: 'Equipo A', playerIds: ['p1', 'p2'], queueOrder: 0 },
      { id: 'team-b', name: 'Equipo B', playerIds: ['p3', 'p4', 'p5', 'p6', 'p7'], queueOrder: 1 },
    ]);

    expect(validation.valid).toBe(false);
    expect(validation.errors.join(' ')).toContain('necesita 3 o 4 jugadores');
  });

  it('rejects duplicated players and players outside participants', () => {
    const validation = validateTrainingTeams(participants, [
      { id: 'team-a', name: 'Equipo A', playerIds: ['p1', 'p2', 'p3'], queueOrder: 0 },
      { id: 'team-b', name: 'Equipo B', playerIds: ['p3', 'p4', 'p9'], queueOrder: 1 },
    ]);

    expect(validation.valid).toBe(false);
    expect(validation.errors.join(' ')).toContain('p3 esta asignado a mas de un equipo');
    expect(validation.errors.join(' ')).toContain('p9 no esta entre los jugadores presentes');
  });

  it('defaults target score to 3 and validates target score >= 1', () => {
    expect(buildTrainingSettings()).toEqual({ targetScore: 3, winnerStays: true });
    expect(buildTrainingSettings({ targetScore: 0, winnerStays: false })).toEqual({ targetScore: 3, winnerStays: false });
    expect(buildTrainingSettings({ targetScore: 5.8 })).toEqual({ targetScore: 5, winnerStays: true });
  });

  it('finds the opposite team in a mini match', () => {
    expect(getOppositeTrainingTeamId(miniMatch(), 'team-a')).toBe('team-b');
    expect(getOppositeTrainingTeamId(miniMatch(), 'team-b')).toBe('team-a');
    expect(getOppositeTrainingTeamId(miniMatch(), 'team-c')).toBeUndefined();
  });

  it('calculates score from points and own points against', () => {
    const match = miniMatch({
      events: [
        { id: 'e1', sessionId: 'session-1', miniMatchId: 'mini-1', createdAt: 'now', teamId: 'team-a', playerId: 'p1', type: 'point' },
        { id: 'e2', sessionId: 'session-1', miniMatchId: 'mini-1', createdAt: 'now', teamId: 'team-a', playerId: 'p2', type: 'own_point_against' },
        { id: 'e3', sessionId: 'session-1', miniMatchId: 'mini-1', createdAt: 'now', teamId: 'team-b', playerId: 'p4', type: 'defense' },
      ],
    });

    expect(getTrainingMiniMatchScore(match)).toEqual({ scoreA: 1, scoreB: 1 });
  });

  it('determines winner when a team reaches target score', () => {
    expect(getTrainingMiniMatchWinner({ ...miniMatch(), scoreA: 3, scoreB: 2 })).toEqual({
      winnerTeamId: 'team-a',
      loserTeamId: 'team-b',
    });
    expect(getTrainingMiniMatchWinner({ ...miniMatch(), scoreA: 2, scoreB: 3 })).toEqual({
      winnerTeamId: 'team-b',
      loserTeamId: 'team-a',
    });
    expect(getTrainingMiniMatchWinner({ ...miniMatch(), scoreA: 2, scoreB: 2 })).toEqual({
      winnerTeamId: undefined,
      loserTeamId: undefined,
    });
  });

  it('recalculates score and winner from event stream', () => {
    const recalculated = recalculateTrainingMiniMatch(miniMatch({
      events: [
        { id: 'e1', sessionId: 'session-1', miniMatchId: 'mini-1', createdAt: 'now', teamId: 'team-a', playerId: 'p1', type: 'point' },
        { id: 'e2', sessionId: 'session-1', miniMatchId: 'mini-1', createdAt: 'now', teamId: 'team-a', playerId: 'p2', type: 'point' },
        { id: 'e3', sessionId: 'session-1', miniMatchId: 'mini-1', createdAt: 'now', teamId: 'team-a', playerId: 'p3', type: 'point' },
      ],
    }));

    expect(recalculated).toMatchObject({
      scoreA: 3,
      scoreB: 0,
      winnerTeamId: 'team-a',
      loserTeamId: 'team-b',
    });
  });

  it('aggregates player attempts as points + defended shots + own points against', () => {
    const stats = getTrainingSessionStats(session({
      miniMatches: [
        miniMatch({
          status: 'finished',
          scoreA: 3,
          scoreB: 1,
          winnerTeamId: 'team-a',
          loserTeamId: 'team-b',
          events: [
            { id: 'e1', sessionId: 'session-1', miniMatchId: 'mini-1', createdAt: 'now', teamId: 'team-a', playerId: 'p1', type: 'point' },
            { id: 'e2', sessionId: 'session-1', miniMatchId: 'mini-1', createdAt: 'now', teamId: 'team-a', playerId: 'p1', type: 'shot_defended' },
            { id: 'e3', sessionId: 'session-1', miniMatchId: 'mini-1', createdAt: 'now', teamId: 'team-a', playerId: 'p1', type: 'own_point_against' },
            { id: 'e4', sessionId: 'session-1', miniMatchId: 'mini-1', createdAt: 'now', teamId: 'team-a', playerId: 'p2', type: 'point' },
            { id: 'e5', sessionId: 'session-1', miniMatchId: 'mini-1', createdAt: 'now', teamId: 'team-a', playerId: 'p3', type: 'point' },
            { id: 'e6', sessionId: 'session-1', miniMatchId: 'mini-1', createdAt: 'now', teamId: 'team-a', playerId: 'p2', type: 'defense' },
            { id: 'e7', sessionId: 'session-1', miniMatchId: 'mini-1', createdAt: 'now', teamId: 'team-b', playerId: 'p4', type: 'error' },
          ],
        }),
      ],
    }));
    const p1 = stats.playerStats.find((item) => item.playerId === 'p1');
    const p2 = stats.playerStats.find((item) => item.playerId === 'p2');
    const p4 = stats.playerStats.find((item) => item.playerId === 'p4');

    expect(p1).toMatchObject({ points: 1, shotsDefended: 1, ownPointsAgainst: 1, attempts: 3, miniMatchesPlayed: 1, wins: 1 });
    expect(p2).toMatchObject({ defenses: 1, miniMatchesPlayed: 1, wins: 1 });
    expect(p4).toMatchObject({ errors: 1, miniMatchesPlayed: 1, losses: 1 });
    expect(p1?.effectiveness).toBeCloseTo(1 / 3);
    expect(p1?.winRate).toBe(1);
    expect(p1?.plusMinus).toBe(2);
  });

  it('aggregates team standings across mini matches', () => {
    const stats = getTrainingSessionStats(session({
      miniMatches: [
        miniMatch({
          status: 'finished',
          events: [
            { id: 'e1', sessionId: 'session-1', miniMatchId: 'mini-1', createdAt: 'now', teamId: 'team-a', playerId: 'p1', type: 'point' },
            { id: 'e2', sessionId: 'session-1', miniMatchId: 'mini-1', createdAt: 'now', teamId: 'team-a', playerId: 'p2', type: 'point' },
            { id: 'e3', sessionId: 'session-1', miniMatchId: 'mini-1', createdAt: 'now', teamId: 'team-a', playerId: 'p3', type: 'point' },
            { id: 'e4', sessionId: 'session-1', miniMatchId: 'mini-1', createdAt: 'now', teamId: 'team-b', playerId: 'p4', type: 'point' },
          ],
        }),
      ],
    }));

    expect(stats.teamStats.find((item) => item.teamId === 'team-a')).toMatchObject({
      played: 1,
      wins: 1,
      losses: 0,
      winRate: 1,
      pointsFor: 3,
      pointsAgainst: 1,
      pointDiff: 2,
    });
    expect(stats.teamStats.find((item) => item.teamId === 'team-b')).toMatchObject({
      played: 1,
      wins: 0,
      losses: 1,
      winRate: 0,
      pointsFor: 1,
      pointsAgainst: 3,
      pointDiff: -2,
    });
  });

  it('builds session summary totals and rankings', () => {
    const pointEvents = Array.from({ length: 8 }, (_, index) => ({
      id: `a-point-${index}`,
      sessionId: 'session-1',
      miniMatchId: 'mini-1',
      createdAt: 'now',
      teamId: 'team-a',
      playerId: 'p1',
      type: 'point' as const,
    }));
    const defendedEvents = Array.from({ length: 3 }, (_, index) => ({
      id: `a-defended-${index}`,
      sessionId: 'session-1',
      miniMatchId: 'mini-1',
      createdAt: 'now',
      teamId: 'team-a',
      playerId: 'p1',
      type: 'shot_defended' as const,
    }));
    const lowVolumePerfectEvents = [
      { id: 'b-point-1', sessionId: 'session-1', miniMatchId: 'mini-1', createdAt: 'now', teamId: 'team-b', playerId: 'p4', type: 'point' as const },
    ];
    const stats = getTrainingSessionStats(session({
      miniMatches: [
        miniMatch({
          status: 'finished',
          events: [
            ...pointEvents,
            ...defendedEvents,
            ...lowVolumePerfectEvents,
            { id: 'e-defense', sessionId: 'session-1', miniMatchId: 'mini-1', createdAt: 'now', teamId: 'team-a', playerId: 'p2', type: 'defense' },
            { id: 'e-error', sessionId: 'session-1', miniMatchId: 'mini-1', createdAt: 'now', teamId: 'team-b', playerId: 'p5', type: 'error' },
            { id: 'e-own', sessionId: 'session-1', miniMatchId: 'mini-1', createdAt: 'now', teamId: 'team-b', playerId: 'p6', type: 'own_point_against' },
          ],
        }),
      ],
    }));

    expect(stats.totalMiniMatches).toBe(1);
    expect(stats.finishedMiniMatches).toBe(1);
    expect(stats.totalPoints).toBe(10);
    expect(stats.topAttackers[0]).toMatchObject({ playerId: 'p1', points: 8, attempts: 11 });
    expect(stats.topAttackers.find((item) => item.playerId === 'p4')).toMatchObject({ points: 1, attempts: 1, effectiveness: 1 });
    expect(stats.topDefenders[0]).toMatchObject({ playerId: 'p2', defenses: 1 });
    expect(stats.mostErrors[0]).toMatchObject({ playerId: 'p5', errors: 1 });
    expect(stats.mostOwnPointsAgainst[0]).toMatchObject({ playerId: 'p6', ownPointsAgainst: 1 });
  });

  it('sorts team standings by wins, point differential and points for', () => {
    const stats = getTrainingSessionStats(session({
      participantPlayerIds: [...participants, 'p7', 'p8', 'p9'],
      teams: fourTeams.slice(0, 3),
      miniMatches: [
        miniMatch({
          id: 'mini-1',
          status: 'finished',
          teamAId: 'team-a',
          teamBId: 'team-b',
          events: [
            { id: 'e1', sessionId: 'session-1', miniMatchId: 'mini-1', createdAt: 'now', teamId: 'team-a', playerId: 'p1', type: 'point' },
            { id: 'e2', sessionId: 'session-1', miniMatchId: 'mini-1', createdAt: 'now', teamId: 'team-a', playerId: 'p2', type: 'point' },
            { id: 'e3', sessionId: 'session-1', miniMatchId: 'mini-1', createdAt: 'now', teamId: 'team-a', playerId: 'p3', type: 'point' },
            { id: 'e4', sessionId: 'session-1', miniMatchId: 'mini-1', createdAt: 'now', teamId: 'team-b', playerId: 'p4', type: 'point' },
          ],
        }),
        miniMatch({
          id: 'mini-2',
          teamAId: 'team-c',
          teamBId: 'team-a',
          status: 'finished',
          events: [
            { id: 'e5', sessionId: 'session-1', miniMatchId: 'mini-2', createdAt: 'now', teamId: 'team-c', playerId: 'p7', type: 'point' },
            { id: 'e6', sessionId: 'session-1', miniMatchId: 'mini-2', createdAt: 'now', teamId: 'team-c', playerId: 'p8', type: 'point' },
            { id: 'e7', sessionId: 'session-1', miniMatchId: 'mini-2', createdAt: 'now', teamId: 'team-c', playerId: 'p9', type: 'point' },
          ],
        }),
      ],
    }));

    expect(stats.teamStats.map((item) => item.teamId)).toEqual(['team-c', 'team-a', 'team-b']);
  });

  it('excludes cancelled mini matches from standings and player rankings', () => {
    const stats = getTrainingSessionStats(session({
      miniMatches: [
        miniMatch({
          status: 'cancelled',
          events: [
            { id: 'e1', sessionId: 'session-1', miniMatchId: 'mini-1', createdAt: 'now', teamId: 'team-a', playerId: 'p1', type: 'point' },
          ],
        }),
      ],
    }));

    expect(stats.totalPoints).toBe(0);
    expect(stats.topAttackers).toHaveLength(0);
    expect(stats.teamStats.find((item) => item.teamId === 'team-a')).toMatchObject({ played: 0, pointsFor: 0 });
  });

  it('returns initial queue order and suggested first matchup', () => {
    const currentSession = session({ teams: fourTeams });

    expect(getTrainingQueue(currentSession).map((team) => team.id)).toEqual(['team-a', 'team-b', 'team-c', 'team-d']);
    expect(getSuggestedNextMiniMatch(currentSession)).toEqual({ teamAId: 'team-a', teamBId: 'team-b' });
  });

  it('keeps winner and rotates loser to back with two teams', () => {
    const nextQueue = advanceTrainingQueueAfterMiniMatch(session(), {
      teamAId: 'team-a',
      teamBId: 'team-b',
      winnerTeamId: 'team-a',
      loserTeamId: 'team-b',
    });

    expect(nextQueue).toEqual(['team-a', 'team-b']);
  });

  it('suggests winner against next waiting team with three teams', () => {
    const currentSession = session({
      participantPlayerIds: [...participants, 'p7', 'p8', 'p9'],
      teams: fourTeams.slice(0, 3),
    });
    const queueAfterFirst = advanceTrainingQueueAfterMiniMatch(currentSession, {
      teamAId: 'team-a',
      teamBId: 'team-b',
      winnerTeamId: 'team-a',
      loserTeamId: 'team-b',
    });
    const afterSecondSession = {
      ...currentSession,
      teamQueue: queueAfterFirst,
    };
    const queueAfterSecond = advanceTrainingQueueAfterMiniMatch(afterSecondSession, {
      teamAId: 'team-a',
      teamBId: 'team-c',
      winnerTeamId: 'team-c',
      loserTeamId: 'team-a',
    });

    expect(queueAfterFirst).toEqual(['team-a', 'team-c', 'team-b']);
    expect(getSuggestedNextMiniMatch({ ...currentSession, teamQueue: queueAfterFirst, miniMatches: [] })).toEqual({
      teamAId: 'team-a',
      teamBId: 'team-c',
    });
    expect(queueAfterSecond).toEqual(['team-c', 'team-b', 'team-a']);
  });

  it('keeps winner, next waiting teams and loser with four teams', () => {
    const nextQueue = advanceTrainingQueueAfterMiniMatch(session({
      participantPlayerIds: [...participants, 'p7', 'p8', 'p9', 'p10', 'p11', 'p12'],
      teams: fourTeams,
    }), {
      teamAId: 'team-a',
      teamBId: 'team-b',
      winnerTeamId: 'team-a',
      loserTeamId: 'team-b',
    });

    expect(nextQueue).toEqual(['team-a', 'team-c', 'team-d', 'team-b']);
  });

  it('rotates both teams when winnerStays is false', () => {
    const nextQueue = advanceTrainingQueueAfterMiniMatch(session({
      participantPlayerIds: [...participants, 'p7', 'p8', 'p9', 'p10', 'p11', 'p12'],
      teams: fourTeams,
      settings: { targetScore: 3, winnerStays: false },
    }), {
      teamAId: 'team-a',
      teamBId: 'team-b',
      winnerTeamId: 'team-a',
      loserTeamId: 'team-b',
    });

    expect(nextQueue).toEqual(['team-c', 'team-d', 'team-a', 'team-b']);
  });

  it('uses manual override match result to update the following suggestion', () => {
    const currentSession = session({
      participantPlayerIds: [...participants, 'p7', 'p8', 'p9', 'p10', 'p11', 'p12'],
      teams: fourTeams,
      teamQueue: ['team-a', 'team-c', 'team-d', 'team-b'],
    });
    const nextQueue = advanceTrainingQueueAfterMiniMatch(currentSession, {
      teamAId: 'team-a',
      teamBId: 'team-d',
      winnerTeamId: 'team-d',
      loserTeamId: 'team-a',
    });

    expect(nextQueue).toEqual(['team-d', 'team-c', 'team-b', 'team-a']);
  });
});
