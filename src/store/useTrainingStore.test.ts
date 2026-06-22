import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { STORAGE_KEYS } from '../storage/asyncStorage';
import { useTrainingStore } from './useTrainingStore';

const participants = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
const teams = [
  { id: 'team-a', name: 'Equipo A', playerIds: ['p1', 'p2', 'p3'] },
  { id: 'team-b', name: 'Equipo B', playerIds: ['p4', 'p5', 'p6'] },
];
const multiParticipants = [...participants, 'p7', 'p8', 'p9', 'p10', 'p11', 'p12'];
const multiTeams = [
  ...teams,
  { id: 'team-c', name: 'Equipo C', playerIds: ['p7', 'p8', 'p9'] },
  { id: 'team-d', name: 'Equipo D', playerIds: ['p10', 'p11', 'p12'] },
];

const createSession = () => useTrainingStore.getState().createTrainingSession({
  teamPoolId: 'mayores',
  teamPoolName: 'Mayores',
  participantPlayerIds: participants,
  teams,
});

const createMultiTeamSession = (winnerStays = true) => useTrainingStore.getState().createTrainingSession({
  teamPoolId: 'mayores',
  teamPoolName: 'Mayores',
  participantPlayerIds: multiParticipants,
  teams: multiTeams,
  settings: { targetScore: 3, winnerStays },
});

const createLiveMiniMatch = () => {
  const sessionId = createSession();

  useTrainingStore.getState().startTrainingSession(sessionId);
  const miniMatchId = useTrainingStore.getState().startMiniMatch(sessionId, 'team-a', 'team-b');

  return { sessionId, miniMatchId };
};

const getSession = (sessionId: string) => {
  const session = useTrainingStore.getState().trainingSessions.find((item) => item.id === sessionId);

  if (!session) {
    throw new Error('Expected training session');
  }

  return session;
};

const getMiniMatch = (sessionId: string, miniMatchId: string) => {
  const miniMatch = getSession(sessionId).miniMatches.find((item) => item.id === miniMatchId);

  if (!miniMatch) {
    throw new Error('Expected training mini match');
  }

  return miniMatch;
};

const makeTeamWin = (sessionId: string, miniMatchId: string, teamId: string, playerId: string) => {
  useTrainingStore.getState().recordTrainingEvent(sessionId, miniMatchId, { type: 'point', teamId, playerId });
  useTrainingStore.getState().recordTrainingEvent(sessionId, miniMatchId, { type: 'point', teamId, playerId });
  useTrainingStore.getState().recordTrainingEvent(sessionId, miniMatchId, { type: 'point', teamId, playerId });
};

const flushPersist = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('useTrainingStore', () => {
  beforeEach(async () => {
    vi.useRealTimers();
    await AsyncStorage.clear();
    useTrainingStore.getState().resetTrainingData();
    useTrainingStore.getState().setHasHydrated(false);
  });

  it('creates a draft training session with default settings', () => {
    const sessionId = createSession();
    const session = getSession(sessionId);

    expect(session).toMatchObject({
      teamPoolId: 'mayores',
      teamPoolName: 'Mayores',
      participantPlayerIds: participants,
      settings: { targetScore: 3, winnerStays: true },
      status: 'draft',
    });
    expect(session.teams).toHaveLength(2);
    expect(session.teamQueue).toEqual(['team-a', 'team-b']);
    expect(useTrainingStore.getState().activeTrainingSessionId).toBe(sessionId);
  });

  it('rejects invalid team setup', () => {
    const previousCount = useTrainingStore.getState().trainingSessions.length;
    const sessionId = useTrainingStore.getState().createTrainingSession({
      participantPlayerIds: participants,
      teams: [
        { id: 'team-a', name: 'Equipo A', playerIds: ['p1', 'p2'] },
        { id: 'team-b', name: 'Equipo B', playerIds: ['p2', 'p4', 'p9'] },
      ],
    });

    expect(sessionId).toBe('');
    expect(useTrainingStore.getState().trainingSessions).toHaveLength(previousCount);
  });

  it('persists basic training session shape under its own storage key', async () => {
    const sessionId = createSession();

    await flushPersist();

    const persisted = await AsyncStorage.getItem(STORAGE_KEYS.trainingState);

    expect(persisted).toContain(sessionId);
    expect(persisted).toContain('trainingSessions');
    expect(persisted).not.toContain('matches');
  });

  it('starts a mini match with two valid teams', () => {
    const sessionId = createSession();

    expect(useTrainingStore.getState().startTrainingSession(sessionId)).toBe(true);

    const miniMatchId = useTrainingStore.getState().startMiniMatch(sessionId, 'team-a', 'team-b');
    const miniMatch = getMiniMatch(sessionId, miniMatchId);

    expect(miniMatch).toMatchObject({
      teamAId: 'team-a',
      teamBId: 'team-b',
      scoreA: 0,
      scoreB: 0,
      targetScore: 3,
      status: 'live',
    });
    expect(getSession(sessionId).status).toBe('live');
    expect(getSession(sessionId).activeMiniMatchId).toBe(miniMatchId);
  });

  it('rejects mini match with unknown or duplicated team', () => {
    const sessionId = createSession();

    useTrainingStore.getState().startTrainingSession(sessionId);

    expect(useTrainingStore.getState().startMiniMatch(sessionId, 'team-a', 'team-a')).toBe('');
    expect(useTrainingStore.getState().startMiniMatch(sessionId, 'team-a', 'team-x')).toBe('');
    expect(getSession(sessionId).miniMatches).toHaveLength(0);
  });

  it('rejects starting a second active mini match in the same session', () => {
    const { sessionId } = createLiveMiniMatch();

    expect(useTrainingStore.getState().startMiniMatch(sessionId, 'team-a', 'team-b')).toBe('');
    expect(getSession(sessionId).miniMatches).toHaveLength(1);
  });

  it('starts suggested next mini match from queue', () => {
    const sessionId = createMultiTeamSession();

    const miniMatchId = useTrainingStore.getState().startSuggestedNextMiniMatch(sessionId);

    expect(miniMatchId).toBeTruthy();
    expect(getMiniMatch(sessionId, miniMatchId)).toMatchObject({
      teamAId: 'team-a',
      teamBId: 'team-b',
      status: 'live',
    });
    expect(getSession(sessionId).status).toBe('live');
  });

  it('blocks suggested next while another mini match is live', () => {
    const sessionId = createMultiTeamSession();

    useTrainingStore.getState().startSuggestedNextMiniMatch(sessionId);

    expect(useTrainingStore.getState().startSuggestedNextMiniMatch(sessionId)).toBe('');
    expect(getSession(sessionId).miniMatches).toHaveLength(1);
  });

  it('advances winner-stays queue after finishing a mini match', () => {
    const sessionId = createMultiTeamSession();
    const firstMiniMatchId = useTrainingStore.getState().startSuggestedNextMiniMatch(sessionId);

    makeTeamWin(sessionId, firstMiniMatchId, 'team-a', 'p1');

    expect(useTrainingStore.getState().finishMiniMatch(sessionId, firstMiniMatchId)).toBe(true);
    expect(getSession(sessionId).teamQueue).toEqual(['team-a', 'team-c', 'team-d', 'team-b']);

    const nextMiniMatchId = useTrainingStore.getState().startSuggestedNextMiniMatch(sessionId);

    expect(getMiniMatch(sessionId, nextMiniMatchId)).toMatchObject({
      teamAId: 'team-a',
      teamBId: 'team-c',
    });
  });

  it('rotates both teams when winnerStays is false', () => {
    const sessionId = createMultiTeamSession(false);
    const firstMiniMatchId = useTrainingStore.getState().startSuggestedNextMiniMatch(sessionId);

    makeTeamWin(sessionId, firstMiniMatchId, 'team-a', 'p1');

    expect(useTrainingStore.getState().finishMiniMatch(sessionId, firstMiniMatchId)).toBe(true);
    expect(getSession(sessionId).teamQueue).toEqual(['team-c', 'team-d', 'team-a', 'team-b']);
  });

  it('keeps manual override and updates later suggestions from that result', () => {
    const sessionId = createMultiTeamSession();

    useTrainingStore.getState().startTrainingSession(sessionId);
    const overrideMiniMatchId = useTrainingStore.getState().startMiniMatch(sessionId, 'team-a', 'team-d');

    makeTeamWin(sessionId, overrideMiniMatchId, 'team-d', 'p10');

    expect(useTrainingStore.getState().finishMiniMatch(sessionId, overrideMiniMatchId)).toBe(true);
    expect(getSession(sessionId).teamQueue).toEqual(['team-d', 'team-b', 'team-c', 'team-a']);

    const nextMiniMatchId = useTrainingStore.getState().startSuggestedNextMiniMatch(sessionId);

    expect(getMiniMatch(sessionId, nextMiniMatchId)).toMatchObject({
      teamAId: 'team-d',
      teamBId: 'team-b',
    });
  });

  it('does not start suggested next in closed session', () => {
    const sessionId = createMultiTeamSession();

    expect(useTrainingStore.getState().finishTrainingSession(sessionId)).toBe(true);
    expect(useTrainingStore.getState().startSuggestedNextMiniMatch(sessionId)).toBe('');
  });

  it('records point and updates score', () => {
    const { sessionId, miniMatchId } = createLiveMiniMatch();

    expect(useTrainingStore.getState().recordTrainingEvent(sessionId, miniMatchId, { type: 'point', teamId: 'team-a', playerId: 'p1' })).toBe(true);

    const miniMatch = getMiniMatch(sessionId, miniMatchId);

    expect(miniMatch.scoreA).toBe(1);
    expect(miniMatch.scoreB).toBe(0);
    expect(miniMatch.events[0].scoreAfter).toEqual({ teamA: 1, teamB: 0 });
  });

  it('stores location for point and shot defended events', () => {
    const { sessionId, miniMatchId } = createLiveMiniMatch();

    expect(useTrainingStore.getState().recordTrainingEvent(sessionId, miniMatchId, {
      type: 'point',
      teamId: 'team-a',
      playerId: 'p1',
      location: { x: 0.7, y: 0.4 },
    })).toBe(true);
    expect(useTrainingStore.getState().recordTrainingEvent(sessionId, miniMatchId, {
      type: 'shot_defended',
      teamId: 'team-b',
      playerId: 'p4',
      location: { x: 0.2, y: 0.6 },
    })).toBe(true);

    expect(getMiniMatch(sessionId, miniMatchId).events.map((event) => event.location)).toEqual([
      { x: 0.7, y: 0.4 },
      { x: 0.2, y: 0.6 },
    ]);
    expect(getMiniMatch(sessionId, miniMatchId)).toMatchObject({ scoreA: 1, scoreB: 0 });
  });

  it('records own point against and updates opposite score', () => {
    const { sessionId, miniMatchId } = createLiveMiniMatch();

    expect(useTrainingStore.getState().recordTrainingEvent(sessionId, miniMatchId, { type: 'own_point_against', teamId: 'team-a', playerId: 'p2' })).toBe(true);

    expect(getMiniMatch(sessionId, miniMatchId)).toMatchObject({
      scoreA: 0,
      scoreB: 1,
    });
  });

  it('records defense, error and shot defended without changing score', () => {
    const { sessionId, miniMatchId } = createLiveMiniMatch();

    expect(useTrainingStore.getState().recordTrainingEvent(sessionId, miniMatchId, { type: 'defense', teamId: 'team-a', playerId: 'p1' })).toBe(true);
    expect(useTrainingStore.getState().recordTrainingEvent(sessionId, miniMatchId, { type: 'error', teamId: 'team-a', playerId: 'p2', errorType: 'turnover' })).toBe(true);
    expect(useTrainingStore.getState().recordTrainingEvent(sessionId, miniMatchId, { type: 'shot_defended', teamId: 'team-b', playerId: 'p4', location: { x: 0.6, y: 0.4 } })).toBe(true);

    expect(getMiniMatch(sessionId, miniMatchId)).toMatchObject({
      scoreA: 0,
      scoreB: 0,
    });
    expect(getMiniMatch(sessionId, miniMatchId).events).toHaveLength(3);
  });

  it('rejects event if player does not belong to the event team', () => {
    const { sessionId, miniMatchId } = createLiveMiniMatch();

    expect(useTrainingStore.getState().recordTrainingEvent(sessionId, miniMatchId, { type: 'point', teamId: 'team-a', playerId: 'p4' })).toBe(false);
    expect(getMiniMatch(sessionId, miniMatchId).events).toHaveLength(0);
  });

  it('target score determines winner and blocks extra events until undo or finish', () => {
    const { sessionId, miniMatchId } = createLiveMiniMatch();

    useTrainingStore.getState().recordTrainingEvent(sessionId, miniMatchId, { type: 'point', teamId: 'team-a', playerId: 'p1' });
    useTrainingStore.getState().recordTrainingEvent(sessionId, miniMatchId, { type: 'point', teamId: 'team-a', playerId: 'p2' });
    useTrainingStore.getState().recordTrainingEvent(sessionId, miniMatchId, { type: 'point', teamId: 'team-a', playerId: 'p3' });

    expect(getMiniMatch(sessionId, miniMatchId)).toMatchObject({
      scoreA: 3,
      winnerTeamId: 'team-a',
      loserTeamId: 'team-b',
      status: 'live',
    });
    expect(useTrainingStore.getState().recordTrainingEvent(sessionId, miniMatchId, { type: 'point', teamId: 'team-b', playerId: 'p4' })).toBe(false);
  });

  it('undo last event reverts score and winner', () => {
    const { sessionId, miniMatchId } = createLiveMiniMatch();

    useTrainingStore.getState().recordTrainingEvent(sessionId, miniMatchId, { type: 'point', teamId: 'team-a', playerId: 'p1' });
    useTrainingStore.getState().recordTrainingEvent(sessionId, miniMatchId, { type: 'point', teamId: 'team-a', playerId: 'p2' });
    useTrainingStore.getState().recordTrainingEvent(sessionId, miniMatchId, { type: 'point', teamId: 'team-a', playerId: 'p3' });

    expect(useTrainingStore.getState().undoLastTrainingEvent(sessionId, miniMatchId)).toBe(true);

    expect(getMiniMatch(sessionId, miniMatchId)).toMatchObject({
      scoreA: 2,
      scoreB: 0,
      winnerTeamId: undefined,
      loserTeamId: undefined,
    });
  });

  it('finish mini match marks it finished and prevents new events', () => {
    const { sessionId, miniMatchId } = createLiveMiniMatch();

    useTrainingStore.getState().recordTrainingEvent(sessionId, miniMatchId, { type: 'point', teamId: 'team-a', playerId: 'p1' });
    useTrainingStore.getState().recordTrainingEvent(sessionId, miniMatchId, { type: 'point', teamId: 'team-a', playerId: 'p2' });
    useTrainingStore.getState().recordTrainingEvent(sessionId, miniMatchId, { type: 'point', teamId: 'team-a', playerId: 'p3' });

    expect(useTrainingStore.getState().finishMiniMatch(sessionId, miniMatchId)).toBe(true);
    expect(getMiniMatch(sessionId, miniMatchId).status).toBe('finished');
    expect(useTrainingStore.getState().recordTrainingEvent(sessionId, miniMatchId, { type: 'point', teamId: 'team-b', playerId: 'p4' })).toBe(false);
  });

  it('cannot record in finished or cancelled sessions', () => {
    const { sessionId, miniMatchId } = createLiveMiniMatch();

    expect(useTrainingStore.getState().finishTrainingSession(sessionId)).toBe(true);
    expect(useTrainingStore.getState().recordTrainingEvent(sessionId, miniMatchId, { type: 'point', teamId: 'team-a', playerId: 'p1' })).toBe(false);

    const nextSessionId = createSession();

    useTrainingStore.getState().cancelTrainingSession(nextSessionId);
    expect(useTrainingStore.getState().startMiniMatch(nextSessionId, 'team-a', 'team-b')).toBe('');
  });

  it('cannot record in cancelled mini match', () => {
    const { sessionId, miniMatchId } = createLiveMiniMatch();

    expect(useTrainingStore.getState().cancelMiniMatch(sessionId, miniMatchId)).toBe(true);
    expect(useTrainingStore.getState().recordTrainingEvent(sessionId, miniMatchId, { type: 'point', teamId: 'team-a', playerId: 'p1' })).toBe(false);
  });

  it('getActiveTrainingSession follows activeTrainingSessionId', () => {
    const sessionId = createSession();

    expect(useTrainingStore.getState().getActiveTrainingSession()?.id).toBe(sessionId);
  });
});
