import { describe, expect, it } from 'vitest';

import {
  buildTrainingSessionSettings,
  buildTrainingSetupValidation,
  buildTrainingTeamsFromAssignments,
  createTrainingSetupTeamIds,
  generateTrainingTeamName,
  getTrainingTeamCountOptions,
  parseTrainingTargetScore,
} from './trainingSetup';

describe('training setup helpers', () => {
  it('returns valid team count options from participant count', () => {
    expect(getTrainingTeamCountOptions(5)).toEqual([]);
    expect(getTrainingTeamCountOptions(6)).toEqual([2]);
    expect(getTrainingTeamCountOptions(9)).toEqual([2, 3]);
    expect(getTrainingTeamCountOptions(12)).toEqual([2, 3, 4]);
  });

  it('creates stable team ids between 2 and 4 teams', () => {
    expect(createTrainingSetupTeamIds(1)).toEqual(['team-1', 'team-2']);
    expect(createTrainingSetupTeamIds(3)).toEqual(['team-1', 'team-2', 'team-3']);
    expect(createTrainingSetupTeamIds(8)).toEqual(['team-1', 'team-2', 'team-3', 'team-4']);
  });

  it('builds teams from one-player-one-team assignments', () => {
    expect(buildTrainingTeamsFromAssignments(['team-1', 'team-2'], {
      p1: 'team-1',
      p2: 'team-1',
      p3: 'team-2',
      p4: undefined,
    })).toEqual([
      { id: 'team-1', name: 'equipo1', playerIds: ['p1', 'p2'], queueOrder: 0 },
      { id: 'team-2', name: 'equipo2', playerIds: ['p3'], queueOrder: 1 },
    ]);
  });

  it('generates team names from player name prefixes', () => {
    expect(generateTrainingTeamName([
      { firstName: 'Mauro', lastName: '' },
      { firstName: 'Vladi', lastName: '' },
      { firstName: 'Nicolas', lastName: '' },
    ])).toBe('mauvlanic');
    expect(generateTrainingTeamName([
      { firstName: 'Mathias', lastName: '' },
      { firstName: 'Errazquin', lastName: '' },
      { firstName: 'Juan', lastName: '' },
    ])).toBe('materrjua');
    expect(generateTrainingTeamName([
      { firstName: 'Nicolás', lastName: '' },
      { firstName: 'Ál', lastName: '' },
      { firstName: 'Fio', lastName: '' },
    ])).toBe('nicalfio');
    expect(generateTrainingTeamName([], 'equipo2')).toBe('equipo2');
  });

  it('uses generated team names when players are available', () => {
    const players = [
      { id: 'p1', firstName: 'Mauro', lastName: '' },
      { id: 'p2', firstName: 'Vladi', lastName: '' },
      { id: 'p3', firstName: 'Nicolas', lastName: '' },
      { id: 'p4', firstName: 'Mathias', lastName: '' },
      { id: 'p5', firstName: 'Errazquin', lastName: '' },
      { id: 'p6', firstName: 'Juan', lastName: '' },
    ];

    expect(buildTrainingTeamsFromAssignments(['team-1', 'team-2'], {
      p1: 'team-1',
      p2: 'team-1',
      p3: 'team-1',
      p4: 'team-2',
      p5: 'team-2',
      p6: 'team-2',
    }, players)).toMatchObject([
      { id: 'team-1', name: 'mauvlanic' },
      { id: 'team-2', name: 'materrjua' },
    ]);
  });

  it('validates setup state with Spanish messages', () => {
    expect(buildTrainingSetupValidation({
      participantCount: 5,
      teamIds: ['team-1', 'team-2'],
      assignments: {},
      targetScore: 3,
    })).toBe('Seleccioná al menos 6 jugadores.');

    expect(buildTrainingSetupValidation({
      participantCount: 6,
      teamIds: ['team-1', 'team-2'],
      assignments: { p1: 'team-1', p2: 'team-1', p3: 'team-2', p4: 'team-2', p5: 'team-2', p6: 'team-2' },
      targetScore: 3,
    })).toBe('Cada equipo necesita 3 o 4 jugadores.');

    expect(buildTrainingSetupValidation({
      participantCount: 6,
      teamIds: ['team-1', 'team-2'],
      assignments: { p1: 'team-1', p2: 'team-1', p3: 'team-1', p4: 'team-2', p5: 'team-2', p6: 'team-2' },
      targetScore: 0,
    })).toBe('Los puntos para ganar deben ser al menos 1.');

    expect(buildTrainingSetupValidation({
      participantCount: 6,
      teamIds: ['team-1', 'team-2'],
      assignments: { p1: 'team-1', p2: 'team-1', p3: 'team-1', p4: 'team-2', p5: 'team-2', p6: 'team-2' },
      targetScore: 3,
    })).toBe('');
  });

  it('parses target score and builds settings', () => {
    expect(parseTrainingTargetScore('3')).toBe(3);
    expect(parseTrainingTargetScore('0')).toBe(0);
    expect(parseTrainingTargetScore('abc')).toBe(0);
    expect(buildTrainingSessionSettings(5, false)).toEqual({ targetScore: 5, winnerStays: false });
  });
});
