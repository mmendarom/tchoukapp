import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  calculatePeriodScore,
  calculateTotalScore,
  getDefensesByPlayerByPeriod,
  getErrorsByPlayerByPeriod,
  getErrorsByTypeByPlayer,
  getOpponentDefenses,
  getOpponentOwnPoints,
  getScoreByPeriod,
} from '../domain/periodStats';
import { getCurrentLineup } from '../domain/stats';
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
    useMatchStore.getState().recordEvent({ type: 'goal', side: 'uruguay', playerId: 'mauro', landingLocation });

    const match = getActiveMatch();
    expect(match.events[0].periodNumber).toBe(1);
    expect(calculatePeriodScore(match.events, 1)).toEqual({ uruguay: 1, opponent: 0 });
  });

  it('creates a draft match with a custom rival name', () => {
    const matchId = useMatchStore.getState().createMatch({ opponent: 'Brasil' });
    const match = useMatchStore.getState().matches.find((item) => item.id === matchId);

    expect(match).toMatchObject({
      opponent: 'Brasil',
      status: 'draft',
      venue: 'Partido',
    });
    expect(useMatchStore.getState().activeMatchId).toBe(matchId);
  });

  it('falls back to Rival when creating a match without rival name', () => {
    const matchId = useMatchStore.getState().createMatch({ opponent: '   ' });
    const match = useMatchStore.getState().matches.find((item) => item.id === matchId);

    expect(match?.opponent).toBe('Rival');
  });

  it('keeps demo match creation using Argentina', () => {
    const matchId = useMatchStore.getState().createDemoMatch();
    const match = useMatchStore.getState().matches.find((item) => item.id === matchId);

    expect(match?.opponent).toBe('Argentina');
    expect(match?.venue).toBe('Partido demo');
  });

  it('normalizes old matches without opponent when starting them', () => {
    const matchId = useMatchStore.getState().createMatch({ opponent: 'Chile' });
    useMatchStore.setState((state) => ({
      matches: state.matches.map((match) =>
        match.id === matchId ? ({ ...match, opponent: undefined } as unknown as typeof match) : match,
      ),
    }));

    useMatchStore.getState().startMatch(matchId);

    const match = useMatchStore.getState().matches.find((item) => item.id === matchId);
    expect(match?.opponent).toBe('Rival');
  });

  it('prevents events outside a live period', () => {
    const state = useMatchStore.getState();
    const matchId = state.createDemoMatch();
    state.startMatch(matchId);
    useMatchStore.getState().recordEvent({ type: 'goal', side: 'uruguay', playerId: 'mauro', landingLocation });

    expect(getActiveMatch().events).toHaveLength(0);

    useMatchStore.getState().startCurrentPeriod();
    useMatchStore.getState().endCurrentPeriod();
    useMatchStore.getState().recordEvent({ type: 'goal', side: 'uruguay', playerId: 'mauro', landingLocation });

    expect(getActiveMatch().events).toHaveLength(0);
  });

  it('undo after point updates score from events', () => {
    createLivePeriodMatch();
    useMatchStore.getState().recordEvent({ type: 'goal', side: 'uruguay', playerId: 'mauro', landingLocation });
    useMatchStore.getState().undoLastEvent();

    expect(calculateTotalScore(getActiveMatch().events)).toEqual({ uruguay: 0, opponent: 0 });
  });

  it('undo after error updates period error stats', () => {
    createLivePeriodMatch();
    useMatchStore.getState().recordError('mauro', 'falta');
    useMatchStore.getState().undoLastEvent();

    expect(getErrorsByPlayerByPeriod(getActiveMatch().events, 1)).toEqual([]);
  });

  it('records defense events for on-court players and undo removes them', () => {
    createLivePeriodMatch();
    useMatchStore.getState().recordDefense('mauro');

    expect(getActiveMatch().events[0]).toMatchObject({ kind: 'defense', playerId: 'mauro', team: 'uruguay' });
    expect(getDefensesByPlayerByPeriod(getActiveMatch().events, 1)).toEqual([{ playerId: 'mauro', total: 1 }]);

    useMatchStore.getState().undoLastEvent();
    expect(getDefensesByPlayerByPeriod(getActiveMatch().events, 1)).toEqual([]);
  });

  it('records rival defense with location without requiring a player or changing score', () => {
    createLivePeriodMatch();
    useMatchStore.getState().recordOpponentDefense({ x: 0.42, y: 0.36 });

    const match = getActiveMatch();
    expect(match.events[0]).toMatchObject({
      kind: 'opponent_defense',
      team: 'opponent',
      defenseLocation: { x: 0.42, y: 0.36 },
    });
    expect('playerId' in match.events[0]).toBe(false);
    expect(calculateTotalScore(match.events)).toEqual({ uruguay: 0, opponent: 0 });
    expect(getOpponentDefenses(match.events)).toHaveLength(1);
  });

  it('does not record rival defense without location', () => {
    createLivePeriodMatch();
    useMatchStore.getState().recordOpponentDefense();

    expect(getActiveMatch().events).toHaveLength(0);
  });

  it('undo after rival defense removes the event', () => {
    createLivePeriodMatch();
    useMatchStore.getState().recordOpponentDefense({ x: 0.42, y: 0.36 });
    useMatchStore.getState().undoLastEvent();

    expect(getOpponentDefenses(getActiveMatch().events)).toHaveLength(0);
    expect(calculateTotalScore(getActiveMatch().events)).toEqual({ uruguay: 0, opponent: 0 });
  });

  it('records falta without changing score', () => {
    createLivePeriodMatch();
    useMatchStore.getState().recordError('mauro', 'falta');

    expect(getActiveMatch().events[0]).toMatchObject({ kind: 'error', playerId: 'mauro', errorType: 'falta' });
    expect(calculateTotalScore(getActiveMatch().events)).toEqual({ uruguay: 0, opponent: 0 });
    expect(getErrorsByTypeByPlayer(getActiveMatch().events)).toEqual([
      { playerId: 'mauro', faltas: 1, puntosEnContra: 0, total: 1 },
    ]);
  });

  it('records punto en contra without landingLocation and adds one rival point', () => {
    createLivePeriodMatch();
    useMatchStore.getState().recordError('mauro', 'punto_en_contra');

    const event = getActiveMatch().events[0];
    expect(event).toMatchObject({ kind: 'error', playerId: 'mauro', errorType: 'punto_en_contra', pointAwardedTo: 'opponent' });
    expect('landingLocation' in event).toBe(false);
    expect(calculateTotalScore(getActiveMatch().events)).toEqual({ uruguay: 0, opponent: 1 });
  });

  it('undo after punto en contra subtracts the rival point', () => {
    createLivePeriodMatch();
    useMatchStore.getState().recordError('mauro', 'punto_en_contra');
    useMatchStore.getState().undoLastEvent();

    expect(calculateTotalScore(getActiveMatch().events)).toEqual({ uruguay: 0, opponent: 0 });
  });

  it('records punto en contra rival without landingLocation and adds one Uruguay point', () => {
    createLivePeriodMatch();
    useMatchStore.getState().recordOpponentOwnPoint();

    const event = getActiveMatch().events[0];
    expect(event).toMatchObject({ kind: 'point', scoringTeam: 'uruguay', pointSource: 'opponent_own_point' });
    expect('playerId' in event).toBe(false);
    expect('landingLocation' in event).toBe(false);
    expect(calculateTotalScore(getActiveMatch().events)).toEqual({ uruguay: 1, opponent: 0 });
    expect(getOpponentOwnPoints(getActiveMatch().events)).toBe(1);
  });

  it('does not record punto en contra rival outside a live period', () => {
    const state = useMatchStore.getState();
    const matchId = state.createDemoMatch();
    state.startMatch(matchId);

    useMatchStore.getState().recordOpponentOwnPoint();
    expect(getActiveMatch().events).toHaveLength(0);
  });

  it('undo after punto en contra rival subtracts the Uruguay point', () => {
    createLivePeriodMatch();
    useMatchStore.getState().recordOpponentOwnPoint();
    useMatchStore.getState().undoLastEvent();

    expect(calculateTotalScore(getActiveMatch().events)).toEqual({ uruguay: 0, opponent: 0 });
    expect(getOpponentOwnPoints(getActiveMatch().events)).toBe(0);
  });

  it('does not record defense or errors for bench players', () => {
    createLivePeriodMatch();
    useMatchStore.getState().recordDefense('tadeo');
    useMatchStore.getState().recordError('tadeo', 'falta');
    useMatchStore.getState().recordError('tadeo', 'punto_en_contra');

    expect(getActiveMatch().events).toHaveLength(0);
  });

  it('substitution creates an event and a new lineup snapshot for the selected neutral slot', () => {
    createLivePeriodMatch();
    const initialMatch = getActiveMatch();
    const initialLineup = getCurrentLineup(initialMatch, 'uruguay');

    useMatchStore.getState().substitutePlayer({ playerOutId: 'nicolas', playerInId: 'tadeo', slotIndex: 2 });

    const match = getActiveMatch();
    const currentLineup = getCurrentLineup(match, 'uruguay');
    const event = match.events[0];

    expect(match.lineupSnapshots).toHaveLength(initialMatch.lineupSnapshots.length + 1);
    expect(currentLineup?.id).not.toBe(initialLineup?.id);
    expect(currentLineup?.playerIds).toEqual(['mauro', 'marcelo', 'tadeo', 'vladi', 'errazquin', 'leon', 'mathias']);
    expect(event).toMatchObject({
      kind: 'substitution',
      playerOutId: 'nicolas',
      playerInId: 'tadeo',
      lineupSnapshotId: currentLineup?.id,
      periodNumber: 1,
    });
  });

  it('substitution moves the outgoing player to the bench and undo restores the previous lineup', () => {
    createLivePeriodMatch();

    useMatchStore.getState().substitutePlayer({ playerOutId: 'nicolas', playerInId: 'tadeo', slotIndex: 2 });
    expect(getCurrentLineup(getActiveMatch(), 'uruguay')?.playerIds).toContain('tadeo');
    expect(getCurrentLineup(getActiveMatch(), 'uruguay')?.playerIds).not.toContain('nicolas');

    useMatchStore.getState().undoLastEvent();

    const match = getActiveMatch();
    expect(match.events).toHaveLength(0);
    expect(getCurrentLineup(match, 'uruguay')?.playerIds).toEqual([
      'mauro',
      'marcelo',
      'nicolas',
      'vladi',
      'errazquin',
      'leon',
      'mathias',
    ]);
  });

  it('swaps two on-court players and records a lineup swap event', () => {
    createLivePeriodMatch();
    const initialMatch = getActiveMatch();

    useMatchStore.getState().swapLineupPlayers({ fromSlotIndex: 0, toSlotIndex: 2 });

    const match = getActiveMatch();
    const currentLineup = getCurrentLineup(match, 'uruguay');

    expect(match.lineupSnapshots).toHaveLength(initialMatch.lineupSnapshots.length + 1);
    expect(currentLineup?.playerIds).toEqual(['nicolas', 'marcelo', 'mauro', 'vladi', 'errazquin', 'leon', 'mathias']);
    expect(match.events[0]).toMatchObject({
      kind: 'lineup_swap',
      playerAId: 'mauro',
      playerBId: 'nicolas',
      fromSlotIndex: 0,
      toSlotIndex: 2,
      lineupSnapshotId: currentLineup?.id,
    });
  });

  it('undo after court swap restores previous lineup', () => {
    createLivePeriodMatch();

    useMatchStore.getState().swapLineupPlayers({ fromSlotIndex: 0, toSlotIndex: 2 });
    useMatchStore.getState().undoLastEvent();

    const match = getActiveMatch();
    expect(match.events).toHaveLength(0);
    expect(getCurrentLineup(match, 'uruguay')?.playerIds).toEqual([
      'mauro',
      'marcelo',
      'nicolas',
      'vladi',
      'errazquin',
      'leon',
      'mathias',
    ]);
  });

  it('supports confirmed slot substitution from visual change mode', () => {
    createLivePeriodMatch();

    useMatchStore.getState().substitutePlayer({ playerInId: 'tadeo', slotIndex: 4 });

    const match = getActiveMatch();
    const currentLineup = getCurrentLineup(match, 'uruguay');

    expect(currentLineup?.playerIds[4]).toBe('tadeo');
    expect(currentLineup?.playerIds).not.toContain('errazquin');
    expect(match.events[0]).toMatchObject({
      kind: 'substitution',
      playerOutId: 'errazquin',
      playerInId: 'tadeo',
      lineupSnapshotId: currentLineup?.id,
    });
  });

  it('allows any bench player to enter any neutral slot regardless of preferred position', () => {
    createLivePeriodMatch();
    const player = useMatchStore.getState().players.find((item) => item.id === 'juan');

    expect(player?.usualPlayingZone).toBe('derecha');

    useMatchStore.getState().substitutePlayer({ playerOutId: 'mauro', playerInId: 'juan', slotIndex: 0 });

    expect(getCurrentLineup(getActiveMatch(), 'uruguay')?.playerIds[0]).toBe('juan');
  });

  it('does not change lineup when substitution is cancelled before store action', () => {
    createLivePeriodMatch();
    const before = getCurrentLineup(getActiveMatch(), 'uruguay')?.playerIds;

    const after = getCurrentLineup(getActiveMatch(), 'uruguay')?.playerIds;
    expect(after).toEqual(before);
    expect(getActiveMatch().events).toHaveLength(0);
  });

  it('prevents defense and error events outside a live period', () => {
    const state = useMatchStore.getState();
    const matchId = state.createDemoMatch();
    state.startMatch(matchId);

    useMatchStore.getState().recordDefense('mauro');
    useMatchStore.getState().recordOpponentDefense({ x: 0.2, y: 0.2 });
    useMatchStore.getState().recordError('mauro', 'falta');

    expect(getActiveMatch().events).toHaveLength(0);
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
    useMatchStore.getState().recordEvent({ type: 'goal', side: 'uruguay', playerId: 'mauro', landingLocation });
    useMatchStore.getState().cancelMatch(matchId);

    const nextState = useMatchStore.getState();
    const cancelledMatch = nextState.matches.find((match) => match.id === matchId);
    expect(nextState.activeMatchId).toBeUndefined();
    expect(cancelledMatch?.status).toBe('cancelled');
    expect(cancelledMatch?.events).toEqual([]);
  });

  it('calculates final score by periods from events', () => {
    createLivePeriodMatch();
    useMatchStore.getState().recordEvent({ type: 'goal', side: 'uruguay', playerId: 'mauro', landingLocation });
    useMatchStore.getState().recordOpponentOwnPoint();
    useMatchStore.getState().recordEvent({ type: 'goal', side: 'opponent', landingLocation: { x: 0.5, y: 0.5 } });
    useMatchStore.getState().endCurrentPeriod();
    useMatchStore.getState().advancePeriod();
    useMatchStore.getState().startCurrentPeriod();
    useMatchStore.getState().recordEvent({ type: 'goal', side: 'uruguay', playerId: 'marcelo', landingLocation: { x: 0.2, y: 0.5 } });

    const periodScores = getScoreByPeriod(getActiveMatch().events);
    expect(periodScores[0].score).toEqual({ uruguay: 2, opponent: 1 });
    expect(periodScores[1].score).toEqual({ uruguay: 1, opponent: 0 });
  });

  it('prevents saving points without landingLocation', () => {
    createLivePeriodMatch();
    useMatchStore.getState().recordEvent({ type: 'goal', side: 'uruguay', playerId: 'mauro' });
    useMatchStore.getState().recordEvent({ type: 'goal', side: 'opponent' });

    expect(getActiveMatch().events).toHaveLength(0);
  });

  it('prevents Uruguay points without selected scorer', () => {
    createLivePeriodMatch();

    useMatchStore.getState().recordEvent({ type: 'goal', side: 'uruguay', landingLocation });

    expect(getActiveMatch().events).toHaveLength(0);
  });

  it('prevents Uruguay points for players off court', () => {
    createLivePeriodMatch();

    useMatchStore.getState().recordEvent({ type: 'goal', side: 'uruguay', playerId: 'tadeo', landingLocation });

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
