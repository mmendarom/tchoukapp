import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { calculatePeriodScore, calculateTotalScore, getErrorsByPlayerByPeriod, getScoreByPeriod } from '../domain/periodStats';
import { useMatchStore } from './useMatchStore';

const landingLocation = { x: 0.72, y: 0.44 };

const getActiveMatch = () => {
  const state = useMatchStore.getState();
  const match = state.matches.find((item) => item.id === state.activeMatchId);

  if (!match) {
    throw new Error('Expected active match');
  }

  return match;
};

const createLivePeriodMatch = () => {
  const state = useMatchStore.getState();
  const matchId = state.createDemoMatch();
  state.startMatch(matchId);
  useMatchStore.getState().startCurrentPeriod();
  return matchId;
};

describe('useMatchStore period stability', () => {
  beforeEach(() => {
    vi.useRealTimers();
    useMatchStore.getState().resetDemoData();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('records events in the current live period', () => {
    createLivePeriodMatch();
    useMatchStore.getState().recordEvent({ type: 'goal', side: 'uruguay', playerId: 'uru-01', landingLocation });

    const match = getActiveMatch();
    expect(match.events[0].periodNumber).toBe(1);
    expect(calculatePeriodScore(match.events, 1)).toEqual({ uruguay: 1, opponent: 0 });
  });

  it('prevents events outside a live period', () => {
    const state = useMatchStore.getState();
    const matchId = state.createDemoMatch();
    state.startMatch(matchId);
    useMatchStore.getState().recordEvent({ type: 'goal', side: 'uruguay', playerId: 'uru-01', landingLocation });

    expect(getActiveMatch().events).toHaveLength(0);

    useMatchStore.getState().startCurrentPeriod();
    useMatchStore.getState().endCurrentPeriod();
    useMatchStore.getState().recordEvent({ type: 'goal', side: 'uruguay', playerId: 'uru-01', landingLocation });

    expect(getActiveMatch().events).toHaveLength(0);
  });

  it('undo after point updates score from events', () => {
    createLivePeriodMatch();
    useMatchStore.getState().recordEvent({ type: 'goal', side: 'uruguay', playerId: 'uru-01', landingLocation });
    useMatchStore.getState().undoLastEvent();

    expect(calculateTotalScore(getActiveMatch().events)).toEqual({ uruguay: 0, opponent: 0 });
  });

  it('undo after error updates period error stats', () => {
    createLivePeriodMatch();
    useMatchStore.getState().recordEvent({ type: 'fault', side: 'uruguay', playerId: 'uru-01' });
    useMatchStore.getState().undoLastEvent();

    expect(getErrorsByPlayerByPeriod(getActiveMatch().events, 1)).toEqual([]);
  });

  it('cancelling a draft match discards it and clears active state', () => {
    const state = useMatchStore.getState();
    const matchId = state.createDemoMatch();
    useMatchStore.getState().cancelMatch(matchId);

    const nextState = useMatchStore.getState();
    expect(nextState.activeMatchId).toBeUndefined();
    expect(nextState.matches.some((match) => match.id === matchId)).toBe(false);
  });

  it('cancelling a live match marks it cancelled, clears events and active state', () => {
    const matchId = createLivePeriodMatch();
    useMatchStore.getState().recordEvent({ type: 'goal', side: 'uruguay', playerId: 'uru-01', landingLocation });
    useMatchStore.getState().cancelMatch(matchId);

    const nextState = useMatchStore.getState();
    const cancelledMatch = nextState.matches.find((match) => match.id === matchId);
    expect(nextState.activeMatchId).toBeUndefined();
    expect(cancelledMatch?.status).toBe('cancelled');
    expect(cancelledMatch?.events).toEqual([]);
  });

  it('calculates final score by periods from events', () => {
    createLivePeriodMatch();
    useMatchStore.getState().recordEvent({ type: 'goal', side: 'uruguay', playerId: 'uru-01', landingLocation });
    useMatchStore.getState().recordEvent({ type: 'goal', side: 'opponent', landingLocation: { x: 0.5, y: 0.5 } });
    useMatchStore.getState().endCurrentPeriod();
    useMatchStore.getState().advancePeriod();
    useMatchStore.getState().startCurrentPeriod();
    useMatchStore.getState().recordEvent({ type: 'goal', side: 'uruguay', playerId: 'uru-02', landingLocation: { x: 0.2, y: 0.5 } });

    const periodScores = getScoreByPeriod(getActiveMatch().events);
    expect(periodScores[0].score).toEqual({ uruguay: 1, opponent: 1 });
    expect(periodScores[1].score).toEqual({ uruguay: 1, opponent: 0 });
  });

  it('prevents saving points without landingLocation', () => {
    createLivePeriodMatch();
    useMatchStore.getState().recordEvent({ type: 'goal', side: 'uruguay', playerId: 'uru-01' });
    useMatchStore.getState().recordEvent({ type: 'goal', side: 'opponent' });

    expect(getActiveMatch().events).toHaveLength(0);
  });

  it('records opponent points with landingLocation', () => {
    createLivePeriodMatch();
    useMatchStore.getState().recordEvent({ type: 'goal', side: 'opponent', landingLocation: { x: 0.5, y: 0.5 } });

    const match = getActiveMatch();
    expect(match.events[0]).toMatchObject({ kind: 'point', scoringTeam: 'opponent', landingLocation: { x: 0.5, y: 0.5 } });
  });

  it('reset demo data restores the real Uruguay player list', () => {
    useMatchStore.setState({ players: [] });
    useMatchStore.getState().resetDemoData();

    expect(useMatchStore.getState().players.map((player) => player.id)).toContain('mauro');
    expect(useMatchStore.getState().players).toHaveLength(14);
  });

  it('does not use player usual position as point landingLocation', () => {
    createLivePeriodMatch();
    useMatchStore.getState().recordEvent({
      type: 'goal',
      side: 'uruguay',
      playerId: 'mauro',
      landingLocation: { x: 0.86, y: 0.22 },
    });

    expect(getActiveMatch().events[0]).toMatchObject({
      kind: 'point',
      playerId: 'mauro',
      landingLocation: { x: 0.86, y: 0.22 },
    });
  });

  it('timer does not decrement faster than elapsed real time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    createLivePeriodMatch();

    vi.setSystemTime(new Date('2026-01-01T00:00:10.000Z'));
    useMatchStore.getState().tickTimer();

    const period = getActiveMatch().periods[0];
    expect(period.remainingSeconds).toBe(890);

    useMatchStore.getState().tickTimer();
    expect(getActiveMatch().periods[0].remainingSeconds).toBe(890);
  });

  it('pause and resume preserve remaining time correctly', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    createLivePeriodMatch();

    vi.setSystemTime(new Date('2026-01-01T00:00:10.000Z'));
    useMatchStore.getState().pauseTimer();
    expect(getActiveMatch().periods[0].remainingSeconds).toBe(890);

    vi.setSystemTime(new Date('2026-01-01T00:00:20.000Z'));
    useMatchStore.getState().tickTimer();
    expect(getActiveMatch().periods[0].remainingSeconds).toBe(890);

    useMatchStore.getState().resumeTimer();
    vi.setSystemTime(new Date('2026-01-01T00:00:25.000Z'));
    useMatchStore.getState().tickTimer();
    expect(getActiveMatch().periods[0].remainingSeconds).toBe(885);
  });

  it('ending period stops timer', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    createLivePeriodMatch();

    vi.setSystemTime(new Date('2026-01-01T00:00:08.000Z'));
    useMatchStore.getState().endCurrentPeriod();
    const period = getActiveMatch().periods[0];

    expect(period.timerRunning).toBe(false);
    expect(period.timerStatus).toBe('stopped');
    expect(period.remainingSeconds).toBe(892);
  });

  it('cancelling match stops timer', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const matchId = createLivePeriodMatch();

    vi.setSystemTime(new Date('2026-01-01T00:00:06.000Z'));
    useMatchStore.getState().cancelMatch(matchId);
    const cancelledMatch = useMatchStore.getState().matches.find((match) => match.id === matchId);

    expect(cancelledMatch?.periods[0].timerRunning).toBe(false);
    expect(cancelledMatch?.periods[0].timerStatus).toBe('stopped');
    expect(cancelledMatch?.periods[0].remainingSeconds).toBe(894);
  });

  it('finishing match stops timer', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const matchId = createLivePeriodMatch();

    vi.setSystemTime(new Date('2026-01-01T00:00:07.000Z'));
    useMatchStore.getState().completeActiveMatch();
    const finishedMatch = useMatchStore.getState().matches.find((match) => match.id === matchId);

    expect(finishedMatch?.periods[0].timerRunning).toBe(false);
    expect(finishedMatch?.periods[0].timerStatus).toBe('stopped');
    expect(finishedMatch?.periods[0].remainingSeconds).toBe(893);
  });
});
