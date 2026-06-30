import { describe, expect, it } from 'vitest';

import { buildStatsMatchSettings } from './statsMatch';
import {
  buildStatsMatchSettingsFromInputs,
  buildStatsMatchSetupValidation,
  buildStatsSetupTeam,
  getStatsPoolPlayers,
  parseStatsSetupInteger,
} from './statsMatchSetup';
import { Player, TeamPool } from './types';

const player = (id: string, number: number): Player => ({
  id,
  firstName: `Nombre ${id}`,
  lastName: `Apellido ${id}`,
  number,
  position: 'Center',
  usualPlayingZone: 'central',
  dominantHand: 'Right',
  caps: 0,
  goals: 0,
  blocks: 0,
});

const players: Player[] = Array.from({ length: 8 }, (_, index) => player(`p${index + 1}`, index + 1));
const homePool: TeamPool = { id: 'brasil', name: 'Brasil', playerIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'] };

const sevenHome = buildStatsSetupTeam(homePool, ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'], 'Mayores');
const sevenAway = buildStatsSetupTeam(
  { id: 'argentina', name: 'Argentina', playerIds: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'] },
  ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'],
);
const defaultSettings = buildStatsMatchSettings();

describe('statsMatchSetup', () => {
  it('parses positive integers and rejects junk', () => {
    expect(parseStatsSetupInteger('7')).toBe(7);
    expect(parseStatsSetupInteger('0')).toBe(0);
    expect(parseStatsSetupInteger('')).toBe(0);
    expect(parseStatsSetupInteger('abc')).toBe(0);
  });

  it('resolves pool players preserving pool order and dropping unknown ids', () => {
    const pool: TeamPool = { id: 'brasil', name: 'Brasil', playerIds: ['p3', 'p1', 'ghost'] };

    expect(getStatsPoolPlayers(pool, players).map((item) => item.id)).toEqual(['p3', 'p1']);
    expect(getStatsPoolPlayers(undefined, players)).toEqual([]);
  });

  it('builds a stats team from a pool with trimmed category and unique convocados', () => {
    const team = buildStatsSetupTeam(homePool, ['p1', 'p1', 'p2'], '  Mayores  ');

    expect(team).toEqual({ id: 'brasil', name: 'Brasil', category: 'Mayores', playerIds: ['p1', 'p2'] });
    expect(buildStatsSetupTeam(homePool, ['p1'], '   ').category).toBeUndefined();
  });

  it('converts format inputs to settings and applies defaults for blanks', () => {
    expect(buildStatsMatchSettingsFromInputs({ playersPerTeam: 7, periodCount: 3, periodMinutes: 15 })).toEqual({
      playersPerTeam: 7,
      periodCount: 3,
      periodDurationSeconds: 900,
    });
    expect(buildStatsMatchSettingsFromInputs({ playersPerTeam: 0, periodCount: 0, periodMinutes: 0 })).toEqual({
      playersPerTeam: 7,
      periodCount: 3,
      periodDurationSeconds: 900,
    });
    expect(buildStatsMatchSettingsFromInputs({ playersPerTeam: 3, periodCount: 2, periodMinutes: 10 })).toEqual({
      playersPerTeam: 3,
      periodCount: 2,
      periodDurationSeconds: 600,
    });
  });

  it('returns an empty message when the setup is valid', () => {
    expect(
      buildStatsMatchSetupValidation({
        homePoolId: 'brasil',
        awayPoolId: 'argentina',
        homeTeam: sevenHome,
        awayTeam: sevenAway,
        settings: defaultSettings,
      }),
    ).toBe('');
  });

  it('requires both pools selected and distinct', () => {
    expect(
      buildStatsMatchSetupValidation({
        homePoolId: 'brasil',
        awayPoolId: undefined,
        homeTeam: sevenHome,
        awayTeam: sevenAway,
        settings: defaultSettings,
      }),
    ).toContain('cuadro local y uno visitante');
    expect(
      buildStatsMatchSetupValidation({
        homePoolId: 'brasil',
        awayPoolId: 'brasil',
        homeTeam: sevenHome,
        awayTeam: { ...sevenAway, id: 'brasil' },
        settings: defaultSettings,
      }),
    ).toContain('dos cuadros distintos');
  });

  it('surfaces roster validation for short convocados', () => {
    const message = buildStatsMatchSetupValidation({
      homePoolId: 'brasil',
      awayPoolId: 'argentina',
      homeTeam: buildStatsSetupTeam(homePool, ['p1', 'p2']),
      awayTeam: sevenAway,
      settings: defaultSettings,
    });

    expect(message).toContain('cuadro local necesita al menos 7');
  });
});
