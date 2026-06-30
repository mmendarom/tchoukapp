import { describe, expect, it } from 'vitest';

import {
  INVALID_BACKUP_ERROR,
  UNSUPPORTED_BACKUP_ERROR,
  buildBackupData,
  buildBackupJson,
  createBackupFileName,
  parseBackupJson,
  validateBackupData,
} from './backup';
import { initialMatches, teamPools, upcomingFixtures, uruguayPlayers } from './mockData';
import { TrainingPracticeSession } from './practice';
import { buildStatsMatchSettings, createStatsMatchPeriods, StatsMatch } from './statsMatch';
import { TrainingSession } from './training';

describe('backup', () => {
  const trainingSession: TrainingSession = {
    id: 'training-session-1',
    createdAt: '2026-06-21T18:00:00.000Z',
    updatedAt: '2026-06-21T18:15:00.000Z',
    participantPlayerIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
    teams: [
      { id: 'team-a', name: 'Equipo A', playerIds: ['p1', 'p2', 'p3'], queueOrder: 0 },
      { id: 'team-b', name: 'Equipo B', playerIds: ['p4', 'p5', 'p6'], queueOrder: 1 },
    ],
    teamQueue: ['team-b', 'team-a'],
    miniMatches: [{
      id: 'mini-match-1',
      sessionId: 'training-session-1',
      teamAId: 'team-a',
      teamBId: 'team-b',
      scoreA: 1,
      scoreB: 0,
      targetScore: 3,
      status: 'live',
      events: [{
        id: 'event-1',
        sessionId: 'training-session-1',
        miniMatchId: 'mini-match-1',
        createdAt: '2026-06-21T18:05:00.000Z',
        teamId: 'team-a',
        playerId: 'p1',
        type: 'point',
        scoreAfter: { teamA: 1, teamB: 0 },
      }],
    }],
    activeMiniMatchId: 'mini-match-1',
    settings: { targetScore: 3, winnerStays: true },
    status: 'live',
    archivedAt: '2026-06-22T12:00:00.000Z',
  };
  const practiceSession: TrainingPracticeSession = {
    id: 'practice-session-1',
    date: '2026-06-27T18:00:00.000Z',
    createdAt: '2026-06-27T18:00:00.000Z',
    updatedAt: '2026-06-27T18:15:00.000Z',
    teamPoolId: 'mayores',
    teamPoolName: 'Mayores',
    participantPlayerIds: ['p1', 'p2'],
    objective: 'Mejorar defensa/recepcion',
    notes: 'Buen ritmo general.',
    status: 'live',
    blocks: [{
      id: 'practice-block-1',
      sessionId: 'practice-session-1',
      title: 'Defensa/recepcion',
      type: 'defense',
      durationMinutes: 25,
      objective: 'Leer rebotes y ordenar coberturas',
      participantPlayerIds: ['p1', 'p2'],
      notes: 'Subir intensidad.',
      order: 0,
      status: 'completed',
      startedAt: '2026-06-27T18:05:00.000Z',
      endedAt: '2026-06-27T18:30:00.000Z',
      events: [{
        id: 'practice-event-1',
        blockId: 'practice-block-1',
        createdAt: '2026-06-27T18:12:00.000Z',
        type: 'player_highlight',
        playerId: 'p1',
        note: 'Buena lectura defensiva.',
      }],
      metrics: [{
        id: 'practice-metric-1',
        playerId: 'p1',
        label: 'Recepciones limpias',
        value: 8,
        unit: 'successes',
      }],
    }],
  };
  const statsSettings = buildStatsMatchSettings();
  const statsMatch: StatsMatch = {
    id: 'stats-match-1',
    createdAt: '2026-06-29T10:00:00.000Z',
    updatedAt: '2026-06-29T10:00:00.000Z',
    homeTeam: { id: 'home', name: 'Brasil', playerIds: ['p1'] },
    awayTeam: { id: 'away', name: 'Argentina', playerIds: ['p2'] },
    settings: statsSettings,
    status: 'finished',
    currentPeriod: 1,
    periods: createStatsMatchPeriods(statsSettings),
    events: [],
  };
  const sourceState = {
    players: uruguayPlayers,
    teamPools,
    matches: initialMatches,
    fixtures: upcomingFixtures,
    trainingSessions: [trainingSession],
    practiceSessions: [practiceSession],
    statsMatches: [statsMatch],
    activeMatchId: 'transient-match',
    activeTrainingSessionId: 'transient-training-session',
    activePracticeSessionId: 'transient-practice-session',
  };

  it('builds a backup with metadata and persisted domain data', () => {
    const backup = buildBackupData(sourceState, {
      exportedAt: '2026-06-15T12:00:00.000Z',
      dataVersion: 8,
    });

    expect(backup).toMatchObject({
      backupVersion: 3,
      exportedAt: '2026-06-15T12:00:00.000Z',
      appName: 'Tchoukball Uruguay',
      dataVersion: 8,
    });
    expect(backup.data.players).toEqual(uruguayPlayers);
    expect(backup.data.teamPools).toEqual(teamPools);
    expect(backup.data.matches).toEqual(initialMatches);
    expect(backup.data.fixtures).toEqual(upcomingFixtures);
    expect(backup.data.trainingSessions).toEqual([trainingSession]);
    expect(backup.data.practiceSessions).toEqual([practiceSession]);
    expect(backup.data.statsMatches).toEqual([statsMatch]);
    expect(backup.data.trainingSessions[0]).not.toBe(trainingSession);
    expect(backup.data.practiceSessions[0]).not.toBe(practiceSession);
    expect(backup.data.statsMatches[0]).not.toBe(statsMatch);
  });

  it('excludes transient UI/runtime state', () => {
    const backup = buildBackupData(sourceState);

    expect('activeMatchId' in backup.data).toBe(false);
    expect('activeTrainingSessionId' in backup.data).toBe(false);
    expect('activePracticeSessionId' in backup.data).toBe(false);
  });

  it('can be JSON stringified safely', () => {
    const backup = buildBackupData(sourceState, {
      exportedAt: '2026-06-15T12:00:00.000Z',
      dataVersion: 8,
    });
    const json = buildBackupJson(backup);
    const parsed = JSON.parse(json);

    expect(parsed.backupVersion).toBe(3);
    expect(parsed.data.players.length).toBeGreaterThan(0);
    expect(json).toContain('\n');
  });

  it('builds an empty state backup without crashing', () => {
    const backup = buildBackupData({
      players: [],
      teamPools: [],
      matches: [],
      fixtures: [],
      trainingSessions: [],
      practiceSessions: [],
      statsMatches: [],
    });

    expect(backup.data).toEqual({
      players: [],
      teamPools: [],
      matches: [],
      fixtures: [],
      trainingSessions: [],
      practiceSessions: [],
      statsMatches: [],
    });
  });

  it('uses a dated JSON backup filename', () => {
    expect(createBackupFileName('2026-06-15T12:00:00.000Z')).toBe('tchoukball-uruguay-backup-2026-06-15.json');
  });

  it('validates a supported backup', () => {
    const backup = buildBackupData(sourceState, {
      exportedAt: '2026-06-15T12:00:00.000Z',
      dataVersion: 8,
    });
    const validation = validateBackupData({ ...backup, unknownExtraField: true });

    expect(validation.valid).toBe(true);
    if (validation.valid) {
      expect(validation.backup.data.players).toEqual(uruguayPlayers);
      expect(validation.backup.data.practiceSessions).toEqual([practiceSession]);
    }
  });

  it('preserves training teams, mini matches, events, queue, settings and status', () => {
    const backup = buildBackupData(sourceState);
    const restoredSession = backup.data.trainingSessions[0];

    expect(restoredSession).toMatchObject({
      teams: trainingSession.teams,
      miniMatches: trainingSession.miniMatches,
      teamQueue: trainingSession.teamQueue,
      settings: trainingSession.settings,
      status: trainingSession.status,
      archivedAt: trainingSession.archivedAt,
    });
  });

  it('exports and validates archived training sessions', () => {
    const backup = buildBackupData(sourceState);
    const validation = validateBackupData(backup);

    expect(backup.data.trainingSessions[0].archivedAt).toBe('2026-06-22T12:00:00.000Z');
    expect(validation.valid).toBe(true);
    if (validation.valid) {
      expect(validation.backup.data.trainingSessions[0].archivedAt).toBe('2026-06-22T12:00:00.000Z');
    }
  });

  it('preserves practice sessions, blocks, events, metrics and status', () => {
    const backup = buildBackupData(sourceState);
    const validation = validateBackupData(backup);

    expect(backup.data.practiceSessions[0]).toMatchObject({
      id: practiceSession.id,
      blocks: practiceSession.blocks,
      status: practiceSession.status,
    });
    expect(validation.valid).toBe(true);
    if (validation.valid) {
      expect(validation.backup.data.practiceSessions[0].blocks[0].events[0]).toEqual(practiceSession.blocks[0].events[0]);
      expect(validation.backup.data.practiceSessions[0].blocks[0].metrics[0]).toEqual(practiceSession.blocks[0].metrics[0]);
    }
  });

  it('accepts a version 1 backup without trainingSessions/practiceSessions/statsMatches and defaults to empty arrays', () => {
    const currentBackup = buildBackupData(sourceState);
    const { trainingSessions: _ts, practiceSessions: _ps, statsMatches: _sm, ...legacyData } = currentBackup.data;
    const validation = validateBackupData({ ...currentBackup, backupVersion: 1, data: legacyData });

    expect(validation.valid).toBe(true);
    if (validation.valid) {
      expect(validation.backup.data.trainingSessions).toEqual([]);
      expect(validation.backup.data.practiceSessions).toEqual([]);
      expect(validation.backup.data.statsMatches).toEqual([]);
    }
  });

  it('accepts a version 2 backup without statsMatches and defaults to empty array', () => {
    const currentBackup = buildBackupData(sourceState);
    const { statsMatches: _sm, ...legacyData } = currentBackup.data;
    const validation = validateBackupData({ ...currentBackup, backupVersion: 2, data: legacyData });

    expect(validation.valid).toBe(true);
    if (validation.valid) {
      expect(validation.backup.data.statsMatches).toEqual([]);
    }
  });

  it('defaults malformed non-array trainingSessions/practiceSessions/statsMatches safely', () => {
    const backup = buildBackupData(sourceState);
    const validation = validateBackupData({
      ...backup,
      data: { ...backup.data, trainingSessions: 'invalid', practiceSessions: 'invalid', statsMatches: 'invalid' },
    });

    expect(validation.valid).toBe(true);
    if (validation.valid) {
      expect(validation.backup.data.trainingSessions).toEqual([]);
      expect(validation.backup.data.practiceSessions).toEqual([]);
      expect(validation.backup.data.statsMatches).toEqual([]);
    }
  });

  it('rejects malformed sessions inside trainingSessions', () => {
    const backup = buildBackupData(sourceState);

    expect(validateBackupData({ ...backup, data: { ...backup.data, trainingSessions: [{ id: 'bad' }] } })).toEqual({
      valid: false,
      error: INVALID_BACKUP_ERROR,
    });
  });

  it('rejects malformed sessions inside practiceSessions', () => {
    const backup = buildBackupData(sourceState);

    expect(validateBackupData({ ...backup, data: { ...backup.data, practiceSessions: [{ id: 'bad' }] } })).toEqual({
      valid: false,
      error: INVALID_BACKUP_ERROR,
    });
  });

  it('includes and roundtrips statsMatches', () => {
    const backup = buildBackupData(sourceState);
    const validation = validateBackupData(backup);

    expect(backup.data.statsMatches).toEqual([statsMatch]);
    expect(validation.valid).toBe(true);
    if (validation.valid) {
      expect(validation.backup.data.statsMatches).toEqual([statsMatch]);
      expect(validation.backup.data.statsMatches[0]).not.toBe(statsMatch);
    }
  });

  it('rejects malformed objects inside statsMatches', () => {
    const backup = buildBackupData(sourceState);

    expect(validateBackupData({ ...backup, data: { ...backup.data, statsMatches: [{ id: 'bad' }] } })).toEqual({
      valid: false,
      error: INVALID_BACKUP_ERROR,
    });
  });

  it('rejects invalid JSON', () => {
    expect(parseBackupJson('{nope')).toEqual({
      valid: false,
      error: INVALID_BACKUP_ERROR,
    });
  });

  it('rejects missing backupVersion', () => {
    const validation = validateBackupData({
      exportedAt: '2026-06-15T12:00:00.000Z',
      appName: 'Tchoukball Uruguay',
      data: {
        players: [],
        teamPools: [],
        matches: [],
        fixtures: [],
      },
    });

    expect(validation).toEqual({
      valid: false,
      error: INVALID_BACKUP_ERROR,
    });
  });

  it('rejects unsupported backupVersion', () => {
    const backup = buildBackupData(sourceState);

    expect(validateBackupData({ ...backup, backupVersion: 99 })).toEqual({
      valid: false,
      error: UNSUPPORTED_BACKUP_ERROR,
    });
  });

  it('rejects missing data', () => {
    const backup = buildBackupData(sourceState);

    expect(validateBackupData({ ...backup, data: undefined })).toEqual({
      valid: false,
      error: INVALID_BACKUP_ERROR,
    });
  });

  it('rejects missing required data arrays', () => {
    const backup = buildBackupData(sourceState);

    expect(validateBackupData({ ...backup, data: { players: [], teamPools: [], matches: [] } })).toEqual({
      valid: false,
      error: INVALID_BACKUP_ERROR,
    });
  });

  it('rejects invalid required entity fields', () => {
    const backup = buildBackupData(sourceState);

    expect(validateBackupData({ ...backup, data: { ...backup.data, players: [{ id: 'bad' }] } })).toEqual({
      valid: false,
      error: INVALID_BACKUP_ERROR,
    });
  });

  it('warns but accepts backups from another app name', () => {
    const backup = buildBackupData(sourceState, { appName: 'Otra app' });
    const validation = validateBackupData(backup);

    expect(validation.valid).toBe(true);
    if (validation.valid) {
      expect(validation.warnings).toEqual(['El backup fue generado por otra app o variante.']);
    }
  });
});
