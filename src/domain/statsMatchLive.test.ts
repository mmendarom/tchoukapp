import { describe, expect, it } from 'vitest';

import { buildStatsMatchSettings, createStatsMatchPeriods, StatsMatch, StatsMatchEvent } from './statsMatch';
import {
  canRecordStatsEvent,
  formatStatsEventLabel,
  formatStatsMatchScore,
  getCurrentStatsPeriod,
  getNextStatsPeriodNumber,
  getStatsPlayerLabel,
  getStatsTeamPlayers,
  STATS_ERROR_SUBTYPE_OPTIONS,
} from './statsMatchLive';
import { Player } from './types';

const player = (id: string, number: number, lastName: string): Player => ({
  id,
  firstName: `Nombre ${id}`,
  lastName,
  number,
  position: 'Center',
  usualPlayingZone: 'central',
  dominantHand: 'Right',
  caps: 0,
  goals: 0,
  blocks: 0,
});

const players = [player('h1', 7, 'Silva'), player('a1', 9, 'Pérez')];
const settings = buildStatsMatchSettings();

const match = (overrides: Partial<StatsMatch> = {}): StatsMatch => ({
  id: 'match-1',
  createdAt: '2026-06-29T00:00:00.000Z',
  updatedAt: '2026-06-29T00:00:00.000Z',
  homeTeam: { id: 'home', name: 'Brasil', playerIds: ['h1'] },
  awayTeam: { id: 'away', name: 'Argentina', playerIds: ['a1'] },
  settings,
  status: 'live',
  currentPeriod: 1,
  periods: createStatsMatchPeriods(settings),
  events: [],
  ...overrides,
});

const event = (overrides: Partial<StatsMatchEvent> = {}): StatsMatchEvent => ({
  id: 'e1',
  matchId: 'match-1',
  periodNumber: 1,
  createdAt: '2026-06-29T00:00:00.000Z',
  teamId: 'home',
  playerId: 'h1',
  kind: 'point',
  ...overrides,
});

describe('statsMatchLive', () => {
  it('resolves team players in roster order', () => {
    expect(getStatsTeamPlayers({ id: 'home', name: 'Brasil', playerIds: ['h1', 'ghost'] }, players).map((p) => p.id)).toEqual(['h1']);
    expect(getStatsTeamPlayers(undefined, players)).toEqual([]);
  });

  it('labels players with number and last name', () => {
    expect(getStatsPlayerLabel(players, 'h1')).toBe('#7 Silva');
    expect(getStatsPlayerLabel(players, undefined)).toBe('Jugador');
    expect(getStatsPlayerLabel(players, 'ghost')).toBe('ghost');
  });

  it('formats the live score from events', () => {
    expect(
      formatStatsMatchScore(
        match({
          events: [
            event({ teamId: 'home', kind: 'point' }),
            event({ id: 'e2', teamId: 'away', playerId: 'a1', kind: 'point' }),
            event({ id: 'e3', teamId: 'away', playerId: 'a1', kind: 'point' }),
          ],
        }),
      ),
    ).toBe('Brasil 1 - 2 Argentina');
  });

  it('reads the current and next period', () => {
    const inBreak = match({
      currentPeriod: 1,
      periods: [
        { number: 1, status: 'finished', durationSeconds: 900 },
        { number: 2, status: 'not_started', durationSeconds: 900 },
        { number: 3, status: 'not_started', durationSeconds: 900 },
      ],
    });

    expect(getCurrentStatsPeriod(inBreak)?.number).toBe(1);
    expect(getNextStatsPeriodNumber(inBreak)).toBe(2);
  });

  it('gates recording on live, non-archived state', () => {
    expect(canRecordStatsEvent(match({ status: 'live' }))).toBe(true);
    expect(canRecordStatsEvent(match({ status: 'period_break' }))).toBe(false);
    expect(canRecordStatsEvent(match({ status: 'live', archivedAt: '2026-06-29T10:00:00.000Z' }))).toBe(false);
  });

  it('exposes the full tchoukball error set', () => {
    expect(STATS_ERROR_SUBTYPE_OPTIONS.map((option) => option.id)).toEqual([
      'turnover',
      'missed_frame',
      'bad_rebound',
      'forbidden_zone',
      'line_step',
    ]);
  });

  it('formats event labels for each kind', () => {
    const currentMatch = match();

    expect(formatStatsEventLabel(event({ kind: 'point' }), currentMatch, players)).toBe('#7 Silva punto para Brasil');
    expect(formatStatsEventLabel(event({ kind: 'own_point_against' }), currentMatch, players)).toBe('#7 Silva punto en contra (Brasil)');
    expect(formatStatsEventLabel(event({ kind: 'defense' }), currentMatch, players)).toBe('#7 Silva defensa (Brasil)');
    expect(
      formatStatsEventLabel(
        event({ kind: 'shot_defended', defendingTeamId: 'away', defenderPlayerId: 'a1' }),
        currentMatch,
        players,
      ),
    ).toBe('#7 Silva (Brasil) tiro atajado por #9 Pérez');
    expect(formatStatsEventLabel(event({ kind: 'error', errorSubtype: 'line_step' }), currentMatch, players)).toBe(
      '#7 Silva (Brasil) pisa la línea',
    );
  });
});
