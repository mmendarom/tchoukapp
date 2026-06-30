import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getStatsMatchStats } from '../domain/statsMatch';
import { STORAGE_KEYS } from '../storage/asyncStorage';
import { useStatsMatchStore } from './useStatsMatchStore';

const homeTeam = {
  id: 'home',
  name: 'Brasil',
  category: 'Mayores',
  playerIds: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7'],
};
const awayTeam = {
  id: 'away',
  name: 'Argentina',
  category: 'Mayores',
  playerIds: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7'],
};

const createMatch = () => useStatsMatchStore.getState().createStatsMatch({ homeTeam, awayTeam });

const createLiveMatch = () => {
  const matchId = createMatch();

  useStatsMatchStore.getState().startStatsMatch(matchId);

  return matchId;
};

const getMatch = (matchId: string) => {
  const match = useStatsMatchStore.getState().statsMatches.find((item) => item.id === matchId);

  if (!match) {
    throw new Error('Expected stats match');
  }

  return match;
};

const flushPersist = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('useStatsMatchStore', () => {
  beforeEach(async () => {
    vi.useRealTimers();
    await AsyncStorage.clear();
    useStatsMatchStore.getState().resetStatsMatchData();
    useStatsMatchStore.getState().setHasHydrated(false);
  });

  it('creates a draft stats match with default 7/3x15 format', () => {
    const matchId = createMatch();
    const match = getMatch(matchId);

    expect(match).toMatchObject({
      status: 'draft',
      currentPeriod: 1,
      settings: { playersPerTeam: 7, periodCount: 3, periodDurationSeconds: 900 },
    });
    expect(match.homeTeam).toMatchObject({ id: 'home', name: 'Brasil', category: 'Mayores' });
    expect(match.awayTeam).toMatchObject({ id: 'away', name: 'Argentina' });
    expect(match.periods).toHaveLength(3);
    expect(useStatsMatchStore.getState().activeStatsMatchId).toBe(matchId);
  });

  it('rejects invalid setup (same team, short roster, shared players)', () => {
    expect(useStatsMatchStore.getState().createStatsMatch({ homeTeam, awayTeam: { ...awayTeam, id: 'home' } })).toBe('');
    expect(
      useStatsMatchStore.getState().createStatsMatch({ homeTeam: { ...homeTeam, playerIds: ['h1', 'h2'] }, awayTeam }),
    ).toBe('');
    expect(useStatsMatchStore.getState().statsMatches).toHaveLength(0);
  });

  it('updates setup only while in draft', () => {
    const matchId = createMatch();

    expect(
      useStatsMatchStore.getState().updateStatsMatchSetup(matchId, {
        homeTeam: { ...homeTeam, name: 'Brasil A' },
        awayTeam,
        settings: { playersPerTeam: 7, periodCount: 2, periodDurationSeconds: 600 },
      }),
    ).toBe(true);
    expect(getMatch(matchId)).toMatchObject({
      settings: { periodCount: 2, periodDurationSeconds: 600 },
    });
    expect(getMatch(matchId).homeTeam.name).toBe('Brasil A');
    expect(getMatch(matchId).periods).toHaveLength(2);

    useStatsMatchStore.getState().startStatsMatch(matchId);
    expect(
      useStatsMatchStore.getState().updateStatsMatchSetup(matchId, { homeTeam, awayTeam }),
    ).toBe(false);
  });

  it('starts the match and the first period', () => {
    const matchId = createMatch();

    expect(useStatsMatchStore.getState().startStatsMatch(matchId)).toBe(true);

    const match = getMatch(matchId);

    expect(match.status).toBe('live');
    expect(match.currentPeriod).toBe(1);
    expect(match.periods[0].status).toBe('live');
    expect(match.periods[0].startedAt).toBeTruthy();
  });

  it('records points for both teams and derives a symmetric score', () => {
    const matchId = createLiveMatch();

    expect(useStatsMatchStore.getState().recordStatsEvent(matchId, { kind: 'point', teamId: 'home', playerId: 'h1' })).toBe(true);
    expect(useStatsMatchStore.getState().recordStatsEvent(matchId, { kind: 'point', teamId: 'away', playerId: 'a1' })).toBe(true);
    expect(useStatsMatchStore.getState().recordStatsEvent(matchId, { kind: 'point', teamId: 'away', playerId: 'a2' })).toBe(true);

    const match = getMatch(matchId);

    expect(getStatsMatchStats(match).score).toEqual({ home: 1, away: 2 });
    expect(match.events[2].scoreAfter).toEqual({ home: 1, away: 2 });
    expect(match.events.every((event) => event.periodNumber === 1)).toBe(true);
  });

  it('records own point against for the opposite team', () => {
    const matchId = createLiveMatch();

    expect(useStatsMatchStore.getState().recordStatsEvent(matchId, { kind: 'own_point_against', teamId: 'home', playerId: 'h1' })).toBe(true);

    expect(getStatsMatchStats(getMatch(matchId)).score).toEqual({ home: 0, away: 1 });
  });

  it('requires the rival defender on shot_defended events', () => {
    const matchId = createLiveMatch();

    expect(
      useStatsMatchStore.getState().recordStatsEvent(matchId, {
        kind: 'shot_defended',
        teamId: 'home',
        playerId: 'h1',
        location: { x: 0.7, y: 0.4 },
      }),
    ).toBe(false);
    expect(
      useStatsMatchStore.getState().recordStatsEvent(matchId, {
        kind: 'shot_defended',
        teamId: 'home',
        playerId: 'h1',
        defendingTeamId: 'away',
        defenderPlayerId: 'h2',
        location: { x: 0.7, y: 0.4 },
      }),
    ).toBe(false);
    expect(
      useStatsMatchStore.getState().recordStatsEvent(matchId, {
        kind: 'shot_defended',
        teamId: 'home',
        playerId: 'h1',
        defendingTeamId: 'away',
        defenderPlayerId: 'a1',
        location: { x: 0.7, y: 0.4 },
      }),
    ).toBe(true);

    const match = getMatch(matchId);
    const stats = getStatsMatchStats(match);

    expect(match.events).toHaveLength(1);
    expect(match.events[0]).toMatchObject({ defendingTeamId: 'away', defenderPlayerId: 'a1' });
    expect(stats.score).toEqual({ home: 0, away: 0 });
    expect(stats.playerStats.find((item) => item.playerId === 'h1')).toMatchObject({ attempts: 1, shotsDefended: 1 });
    expect(stats.playerStats.find((item) => item.playerId === 'a1')).toMatchObject({ defenses: 1 });
  });

  it('rejects events for players outside the event team', () => {
    const matchId = createLiveMatch();

    expect(useStatsMatchStore.getState().recordStatsEvent(matchId, { kind: 'point', teamId: 'home', playerId: 'a1' })).toBe(false);
    expect(getMatch(matchId).events).toHaveLength(0);
  });

  it('stores location and error subtype', () => {
    const matchId = createLiveMatch();

    useStatsMatchStore.getState().recordStatsEvent(matchId, { kind: 'point', teamId: 'home', playerId: 'h1', location: { x: 0.7, y: 0.4 } });
    useStatsMatchStore.getState().recordStatsEvent(matchId, { kind: 'error', teamId: 'away', playerId: 'a1', errorSubtype: 'line_step' });

    const match = getMatch(matchId);

    expect(match.events[0].location).toEqual({ x: 0.7, y: 0.4 });
    expect(match.events[1].errorSubtype).toBe('line_step');
    expect(getStatsMatchStats(match).score).toEqual({ home: 1, away: 0 });
  });

  it('undoes the last event and recalculates the score', () => {
    const matchId = createLiveMatch();

    useStatsMatchStore.getState().recordStatsEvent(matchId, { kind: 'point', teamId: 'home', playerId: 'h1' });
    useStatsMatchStore.getState().recordStatsEvent(matchId, { kind: 'point', teamId: 'home', playerId: 'h2' });

    expect(useStatsMatchStore.getState().undoLastStatsEvent(matchId)).toBe(true);

    const match = getMatch(matchId);

    expect(match.events).toHaveLength(1);
    expect(getStatsMatchStats(match).score).toEqual({ home: 1, away: 0 });
  });

  it('runs the period lifecycle and tags events with the active period', () => {
    const matchId = createLiveMatch();

    useStatsMatchStore.getState().recordStatsEvent(matchId, { kind: 'point', teamId: 'home', playerId: 'h1' });

    expect(useStatsMatchStore.getState().finishStatsPeriod(matchId)).toBe(true);
    expect(getMatch(matchId).status).toBe('period_break');
    expect(getMatch(matchId).periods[0].status).toBe('finished');
    expect(useStatsMatchStore.getState().recordStatsEvent(matchId, { kind: 'point', teamId: 'home', playerId: 'h2' })).toBe(false);

    expect(useStatsMatchStore.getState().startNextStatsPeriod(matchId)).toBe(true);
    expect(getMatch(matchId).currentPeriod).toBe(2);

    useStatsMatchStore.getState().recordStatsEvent(matchId, { kind: 'point', teamId: 'away', playerId: 'a1' });

    const match = getMatch(matchId);

    expect(match.events.map((event) => event.periodNumber)).toEqual([1, 2]);
    expect(getStatsMatchStats(match, { periodNumber: 1 }).score).toEqual({ home: 1, away: 0 });
    expect(getStatsMatchStats(match, { periodNumber: 2 }).score).toEqual({ home: 0, away: 1 });
  });

  it('finishes the match and blocks further events', () => {
    const matchId = createLiveMatch();

    useStatsMatchStore.getState().recordStatsEvent(matchId, { kind: 'point', teamId: 'home', playerId: 'h1' });

    expect(useStatsMatchStore.getState().finishStatsMatch(matchId)).toBe(true);
    expect(getMatch(matchId).status).toBe('finished');
    expect(useStatsMatchStore.getState().activeStatsMatchId).toBeUndefined();
    expect(useStatsMatchStore.getState().recordStatsEvent(matchId, { kind: 'point', teamId: 'home', playerId: 'h2' })).toBe(false);
  });

  it('cancels a match and clears active state', () => {
    const matchId = createLiveMatch();

    expect(useStatsMatchStore.getState().cancelStatsMatch(matchId)).toBe(true);
    expect(getMatch(matchId).status).toBe('cancelled');
    expect(useStatsMatchStore.getState().activeStatsMatchId).toBeUndefined();
    expect(useStatsMatchStore.getState().recordStatsEvent(matchId, { kind: 'point', teamId: 'home', playerId: 'h1' })).toBe(false);
  });

  it('archives, blocks tracking and unarchives without reactivating', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-29T12:00:00.000Z'));
    const matchId = createLiveMatch();

    expect(useStatsMatchStore.getState().archiveStatsMatch(matchId)).toBe(true);
    expect(getMatch(matchId).archivedAt).toBe('2026-06-29T12:00:00.000Z');
    expect(useStatsMatchStore.getState().activeStatsMatchId).toBeUndefined();
    expect(useStatsMatchStore.getState().recordStatsEvent(matchId, { kind: 'point', teamId: 'home', playerId: 'h1' })).toBe(false);

    expect(useStatsMatchStore.getState().unarchiveStatsMatch(matchId)).toBe(true);
    expect(getMatch(matchId).archivedAt).toBeUndefined();
    expect(useStatsMatchStore.getState().activeStatsMatchId).toBeUndefined();
  });

  it('deletes only the requested match and persists the removal', async () => {
    const preservedId = createMatch();
    const deletedId = createMatch();

    expect(useStatsMatchStore.getState().deleteStatsMatch(deletedId)).toBe(true);
    expect(useStatsMatchStore.getState().statsMatches.map((match) => match.id)).toContain(preservedId);
    expect(useStatsMatchStore.getState().statsMatches.map((match) => match.id)).not.toContain(deletedId);

    await flushPersist();
    const persisted = await AsyncStorage.getItem(STORAGE_KEYS.statsMatchState);

    expect(persisted).toContain(preservedId);
    expect(persisted).not.toContain(deletedId);
  });

  it('persists under its own key without touching match or training state', async () => {
    const matchId = createMatch();

    await flushPersist();
    const persisted = await AsyncStorage.getItem(STORAGE_KEYS.statsMatchState);

    expect(persisted).toContain(matchId);
    expect(persisted).toContain('statsMatches');
    expect(persisted).not.toContain('trainingSessions');
  });

  it('restores and normalizes matches while clearing runtime active state', () => {
    const matchId = createLiveMatch();

    useStatsMatchStore.getState().recordStatsEvent(matchId, { kind: 'point', teamId: 'home', playerId: 'h1' });
    const backedUp = JSON.parse(JSON.stringify(useStatsMatchStore.getState().statsMatches));

    useStatsMatchStore.getState().resetStatsMatchData();
    expect(useStatsMatchStore.getState().restoreStatsMatches(backedUp)).toBe(true);

    const restored = useStatsMatchStore.getState();
    const restoredMatch = restored.statsMatches[0];

    expect(restored.activeStatsMatchId).toBeUndefined();
    expect(restoredMatch.events).toHaveLength(1);
    expect(getStatsMatchStats(restoredMatch).score).toEqual({ home: 1, away: 0 });
  });

  it('does not mutate state when restore input is invalid', () => {
    const matchId = createMatch();
    const before = useStatsMatchStore.getState().statsMatches;

    expect(useStatsMatchStore.getState().restoreStatsMatches(undefined as unknown as typeof before)).toBe(false);
    expect(useStatsMatchStore.getState().statsMatches).toBe(before);
    expect(useStatsMatchStore.getState().activeStatsMatchId).toBe(matchId);
  });
});
