import { Fixture, Match, Player, TeamPool } from './types';
import { TrainingPracticeSession } from './practice';
import { TrainingSession } from './training';

export const BACKUP_VERSION = 2;
export const BACKUP_APP_NAME = 'Tchoukball Uruguay';
export const UNSUPPORTED_BACKUP_ERROR = 'Este backup no es compatible con esta versión de la app.';
export const INVALID_BACKUP_ERROR = 'No se pudo importar el backup.';

export type BackupSourceState = {
  players: Player[];
  teamPools: TeamPool[];
  matches: Match[];
  fixtures: Fixture[];
  trainingSessions: TrainingSession[];
  practiceSessions: TrainingPracticeSession[];
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

const trainingSessionStatuses = new Set(['draft', 'live', 'finished', 'cancelled']);
const trainingMiniMatchStatuses = new Set(['scheduled', 'live', 'finished', 'cancelled']);
const trainingEventTypes = new Set(['point', 'defense', 'shot_defended', 'error', 'own_point_against']);
const trainingPracticeStatuses = new Set(['draft', 'live', 'finished', 'cancelled']);
const trainingPracticeBlockTypes = new Set(['attack', 'defense', 'mixed', 'physical', 'tactical', 'scrimmage', 'free']);
const trainingPracticeBlockStatuses = new Set(['planned', 'live', 'completed', 'skipped']);
const trainingPracticeEventTypes = new Set(['note', 'player_highlight', 'player_follow_up', 'metric']);
const trainingPracticeMetricUnits = new Set(['reps', 'minutes', 'shots', 'successes', 'errors', 'custom']);

const isTrainingTeamLike = (value: unknown) =>
  hasStringField(value, 'id') &&
  hasStringField(value, 'name') &&
  isRecord(value) &&
  Array.isArray(value.playerIds) &&
  value.playerIds.every((playerId) => typeof playerId === 'string') &&
  (value.queueOrder === undefined || (typeof value.queueOrder === 'number' && Number.isFinite(value.queueOrder)));

const isTrainingEventLike = (value: unknown) =>
  hasStringField(value, 'id') &&
  hasStringField(value, 'sessionId') &&
  hasStringField(value, 'miniMatchId') &&
  hasStringField(value, 'createdAt') &&
  hasStringField(value, 'teamId') &&
  isRecord(value) &&
  typeof value.type === 'string' &&
  trainingEventTypes.has(value.type);

const isTrainingMiniMatchLike = (value: unknown) =>
  hasStringField(value, 'id') &&
  hasStringField(value, 'sessionId') &&
  hasStringField(value, 'teamAId') &&
  hasStringField(value, 'teamBId') &&
  hasStringField(value, 'status') &&
  isRecord(value) &&
  trainingMiniMatchStatuses.has(value.status as string) &&
  Array.isArray(value.events) &&
  value.events.every(isTrainingEventLike);

const isTrainingSessionLike = (value: unknown) =>
  hasStringField(value, 'id') &&
  hasStringField(value, 'createdAt') &&
  hasStringField(value, 'updatedAt') &&
  hasStringField(value, 'status') &&
  isRecord(value) &&
  trainingSessionStatuses.has(value.status as string) &&
  Array.isArray(value.participantPlayerIds) &&
  value.participantPlayerIds.every((playerId) => typeof playerId === 'string') &&
  Array.isArray(value.teams) &&
  value.teams.every(isTrainingTeamLike) &&
  Array.isArray(value.miniMatches) &&
  value.miniMatches.every(isTrainingMiniMatchLike) &&
  (value.archivedAt === undefined || typeof value.archivedAt === 'string') &&
  (value.teamQueue === undefined || (Array.isArray(value.teamQueue) && value.teamQueue.every((teamId) => typeof teamId === 'string'))) &&
  (value.settings === undefined || isRecord(value.settings));

const isTrainingPracticeMetricLike = (value: unknown) =>
  hasStringField(value, 'id') &&
  hasStringField(value, 'label') &&
  hasNumberField(value, 'value') &&
  isRecord(value) &&
  (value.playerId === undefined || typeof value.playerId === 'string') &&
  (value.unit === undefined || (typeof value.unit === 'string' && trainingPracticeMetricUnits.has(value.unit)));

const isTrainingPracticeEventLike = (value: unknown) =>
  hasStringField(value, 'id') &&
  hasStringField(value, 'blockId') &&
  hasStringField(value, 'createdAt') &&
  isRecord(value) &&
  typeof value.type === 'string' &&
  trainingPracticeEventTypes.has(value.type) &&
  (value.playerId === undefined || typeof value.playerId === 'string') &&
  (value.label === undefined || typeof value.label === 'string') &&
  (value.value === undefined || (typeof value.value === 'number' && Number.isFinite(value.value))) &&
  (value.note === undefined || typeof value.note === 'string');

const isTrainingPracticeBlockLike = (value: unknown) =>
  hasStringField(value, 'id') &&
  hasStringField(value, 'sessionId') &&
  hasStringField(value, 'title') &&
  hasNumberField(value, 'order') &&
  isRecord(value) &&
  typeof value.type === 'string' &&
  trainingPracticeBlockTypes.has(value.type) &&
  typeof value.status === 'string' &&
  trainingPracticeBlockStatuses.has(value.status) &&
  (value.durationMinutes === undefined || (typeof value.durationMinutes === 'number' && Number.isFinite(value.durationMinutes))) &&
  (value.objective === undefined || typeof value.objective === 'string') &&
  (value.notes === undefined || typeof value.notes === 'string') &&
  (value.startedAt === undefined || typeof value.startedAt === 'string') &&
  (value.endedAt === undefined || typeof value.endedAt === 'string') &&
  (value.linkedTrainingSessionId === undefined || typeof value.linkedTrainingSessionId === 'string') &&
  (value.participantPlayerIds === undefined ||
    (Array.isArray(value.participantPlayerIds) && value.participantPlayerIds.every((playerId) => typeof playerId === 'string'))) &&
  Array.isArray(value.events) &&
  value.events.every(isTrainingPracticeEventLike) &&
  Array.isArray(value.metrics) &&
  value.metrics.every(isTrainingPracticeMetricLike);

const isTrainingPracticeSessionLike = (value: unknown) =>
  hasStringField(value, 'id') &&
  hasStringField(value, 'date') &&
  hasStringField(value, 'createdAt') &&
  hasStringField(value, 'updatedAt') &&
  hasStringField(value, 'objective') &&
  isRecord(value) &&
  typeof value.status === 'string' &&
  trainingPracticeStatuses.has(value.status) &&
  (value.teamPoolId === undefined || typeof value.teamPoolId === 'string') &&
  (value.teamPoolName === undefined || typeof value.teamPoolName === 'string') &&
  (value.notes === undefined || typeof value.notes === 'string') &&
  (value.startedAt === undefined || typeof value.startedAt === 'string') &&
  (value.finishedAt === undefined || typeof value.finishedAt === 'string') &&
  (value.archivedAt === undefined || typeof value.archivedAt === 'string') &&
  Array.isArray(value.participantPlayerIds) &&
  value.participantPlayerIds.every((playerId) => typeof playerId === 'string') &&
  Array.isArray(value.blocks) &&
  value.blocks.every(isTrainingPracticeBlockLike);

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
      trainingSessions: cloneDomainData(state.trainingSessions ?? []),
      practiceSessions: cloneDomainData(state.practiceSessions ?? []),
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
  return version === 1 || version === BACKUP_VERSION;
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
  const trainingSessions = Array.isArray(value.data.trainingSessions) ? value.data.trainingSessions : [];
  const practiceSessions = Array.isArray(value.data.practiceSessions) ? value.data.practiceSessions : [];

  if (!Array.isArray(players) || !Array.isArray(teamPools) || !Array.isArray(matches) || !Array.isArray(fixtures)) {
    return { valid: false, error: INVALID_BACKUP_ERROR };
  }

  if (!players.every(isPlayerLike) || !teamPools.every(isTeamPoolLike) || !matches.every(isMatchLike) || !fixtures.every(isFixtureLike)) {
    return { valid: false, error: INVALID_BACKUP_ERROR };
  }

  if (!trainingSessions.every(isTrainingSessionLike)) {
    return { valid: false, error: INVALID_BACKUP_ERROR };
  }

  if (!practiceSessions.every(isTrainingPracticeSessionLike)) {
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
        trainingSessions: cloneDomainData(trainingSessions as TrainingSession[]),
        practiceSessions: cloneDomainData(practiceSessions as TrainingPracticeSession[]),
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
