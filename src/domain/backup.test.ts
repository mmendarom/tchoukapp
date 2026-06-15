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

describe('backup', () => {
  const sourceState = {
    players: uruguayPlayers,
    teamPools,
    matches: initialMatches,
    fixtures: upcomingFixtures,
    activeMatchId: 'transient-match',
  };

  it('builds a backup with metadata and persisted domain data', () => {
    const backup = buildBackupData(sourceState, {
      exportedAt: '2026-06-15T12:00:00.000Z',
      dataVersion: 8,
    });

    expect(backup).toMatchObject({
      backupVersion: 1,
      exportedAt: '2026-06-15T12:00:00.000Z',
      appName: 'Tchoukball Uruguay',
      dataVersion: 8,
    });
    expect(backup.data.players).toEqual(uruguayPlayers);
    expect(backup.data.teamPools).toEqual(teamPools);
    expect(backup.data.matches).toEqual(initialMatches);
    expect(backup.data.fixtures).toEqual(upcomingFixtures);
  });

  it('excludes transient UI/runtime state', () => {
    const backup = buildBackupData(sourceState);

    expect('activeMatchId' in backup.data).toBe(false);
  });

  it('can be JSON stringified safely', () => {
    const backup = buildBackupData(sourceState, {
      exportedAt: '2026-06-15T12:00:00.000Z',
      dataVersion: 8,
    });
    const json = buildBackupJson(backup);
    const parsed = JSON.parse(json);

    expect(parsed.backupVersion).toBe(1);
    expect(parsed.data.players.length).toBeGreaterThan(0);
    expect(json).toContain('\n');
  });

  it('builds an empty state backup without crashing', () => {
    const backup = buildBackupData({
      players: [],
      teamPools: [],
      matches: [],
      fixtures: [],
    });

    expect(backup.data).toEqual({
      players: [],
      teamPools: [],
      matches: [],
      fixtures: [],
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
    }
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
