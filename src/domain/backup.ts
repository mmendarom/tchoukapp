import { Fixture, Match, Player, TeamPool } from './types';

export const BACKUP_VERSION = 1;
export const BACKUP_APP_NAME = 'Tchoukball Uruguay';
export const UNSUPPORTED_BACKUP_ERROR = 'Este backup no es compatible con esta versión de la app.';
export const INVALID_BACKUP_ERROR = 'No se pudo importar el backup.';

export type BackupSourceState = {
  players: Player[];
  teamPools: TeamPool[];
  matches: Match[];
  fixtures: Fixture[];
};

export type AppBackupData = {
  backupVersion: number;
  exportedAt: string;
  appName: string;
  dataVersion: number;
  data: BackupSourceState;
};

export type BackupValidationResult =
  | { valid: true; backup: AppBackupData; warnings: string[] }
  | { valid: false; error: string };

const cloneDomainData = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const hasStringField = (value: unknown, field: string) =>
  isRecord(value) && typeof value[field] === 'string' && value[field].trim().length > 0;

const hasNumberField = (value: unknown, field: string) =>
  isRecord(value) && typeof value[field] === 'number' && Number.isFinite(value[field]);

const isPlayerLike = (value: unknown) =>
  hasStringField(value, 'id') &&
  hasStringField(value, 'firstName') &&
  hasNumberField(value, 'number') &&
  hasStringField(value, 'position') &&
  hasStringField(value, 'usualPlayingZone') &&
  hasStringField(value, 'dominantHand');

const isTeamPoolLike = (value: unknown) =>
  hasStringField(value, 'id') && hasStringField(value, 'name') && isRecord(value) && Array.isArray(value.playerIds);

const isMatchLike = (value: unknown) =>
  hasStringField(value, 'id') &&
  hasStringField(value, 'opponent') &&
  hasStringField(value, 'venue') &&
  hasStringField(value, 'startsAt') &&
  hasStringField(value, 'status') &&
  isRecord(value) &&
  Array.isArray(value.periods) &&
  Array.isArray(value.lineupSnapshots) &&
  Array.isArray(value.events);

const isFixtureLike = (value: unknown) =>
  hasStringField(value, 'id') &&
  hasStringField(value, 'opponent') &&
  hasStringField(value, 'competition') &&
  hasStringField(value, 'venue') &&
  hasStringField(value, 'startsAt');

export function buildBackupData(
  state: BackupSourceState,
  options: { exportedAt?: string; dataVersion?: number; appName?: string } = {},
): AppBackupData {
  return {
    backupVersion: BACKUP_VERSION,
    exportedAt: options.exportedAt ?? new Date().toISOString(),
    appName: options.appName ?? BACKUP_APP_NAME,
    dataVersion: options.dataVersion ?? 1,
    data: {
      players: cloneDomainData(state.players ?? []),
      teamPools: cloneDomainData(state.teamPools ?? []),
      matches: cloneDomainData(state.matches ?? []),
      fixtures: cloneDomainData(state.fixtures ?? []),
    },
  };
}

export function buildBackupJson(backup: AppBackupData) {
  return `${JSON.stringify(backup, null, 2)}\n`;
}

export function createBackupFileName(exportedAt: string) {
  const date = exportedAt.slice(0, 10) || new Date().toISOString().slice(0, 10);

  return `tchoukball-uruguay-backup-${date}.json`;
}

export function isSupportedBackupVersion(version: unknown) {
  return version === BACKUP_VERSION;
}

export function validateBackupData(value: unknown): BackupValidationResult {
  if (!isRecord(value)) {
    return { valid: false, error: INVALID_BACKUP_ERROR };
  }

  if (!('backupVersion' in value)) {
    return { valid: false, error: INVALID_BACKUP_ERROR };
  }

  if (!isSupportedBackupVersion(value.backupVersion)) {
    return { valid: false, error: UNSUPPORTED_BACKUP_ERROR };
  }

  if (!isRecord(value.data)) {
    return { valid: false, error: INVALID_BACKUP_ERROR };
  }

  const { players, teamPools, matches, fixtures } = value.data;

  if (!Array.isArray(players) || !Array.isArray(teamPools) || !Array.isArray(matches) || !Array.isArray(fixtures)) {
    return { valid: false, error: INVALID_BACKUP_ERROR };
  }

  if (!players.every(isPlayerLike) || !teamPools.every(isTeamPoolLike) || !matches.every(isMatchLike) || !fixtures.every(isFixtureLike)) {
    return { valid: false, error: INVALID_BACKUP_ERROR };
  }

  const warnings =
    value.appName && value.appName !== BACKUP_APP_NAME ? ['El backup fue generado por otra app o variante.'] : [];

  return {
    valid: true,
    warnings,
    backup: {
      backupVersion: value.backupVersion,
      exportedAt: typeof value.exportedAt === 'string' ? value.exportedAt : '',
      appName: typeof value.appName === 'string' ? value.appName : BACKUP_APP_NAME,
      dataVersion: typeof value.dataVersion === 'number' ? value.dataVersion : 1,
      data: {
        players: cloneDomainData(players as Player[]),
        teamPools: cloneDomainData(teamPools as TeamPool[]),
        matches: cloneDomainData(matches as Match[]),
        fixtures: cloneDomainData(fixtures as Fixture[]),
      },
    },
  };
}

export function parseBackupJson(json: string): BackupValidationResult {
  try {
    return validateBackupData(JSON.parse(json));
  } catch {
    return { valid: false, error: INVALID_BACKUP_ERROR };
  }
}
