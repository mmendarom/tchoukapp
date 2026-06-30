import {
  buildStatsMatchSettings,
  DEFAULT_STATS_MATCH_PERIOD_COUNT,
  DEFAULT_STATS_MATCH_PERIOD_DURATION_SECONDS,
  DEFAULT_STATS_MATCH_PLAYERS_PER_TEAM,
  StatsMatchSettings,
  StatsTeam,
  uniqueStatsIds,
  validateStatsMatchSetup,
} from './statsMatch';
import { Player, TeamPool } from './types';

export const DEFAULT_STATS_MATCH_PERIOD_MINUTES = DEFAULT_STATS_MATCH_PERIOD_DURATION_SECONDS / 60;

export type StatsMatchSetupSide = 'home' | 'away';

export function parseStatsSetupInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 0;
}

export function getStatsPoolPlayers(pool: TeamPool | undefined, players: Player[]): Player[] {
  if (!pool) {
    return [];
  }

  const playersById = new Map(players.map((player) => [player.id, player]));

  return pool.playerIds
    .map((playerId) => playersById.get(playerId))
    .filter((player): player is Player => Boolean(player));
}

export function buildStatsSetupTeam(
  pool: TeamPool | undefined,
  selectedPlayerIds: string[],
  category?: string,
): StatsTeam {
  const trimmedCategory = category?.trim();

  return {
    id: pool?.id ?? '',
    name: pool?.name ?? '',
    category: trimmedCategory || undefined,
    playerIds: uniqueStatsIds(selectedPlayerIds),
  };
}

export function buildStatsMatchSettingsFromInputs(input: {
  playersPerTeam?: number;
  periodCount?: number;
  periodMinutes?: number;
}): StatsMatchSettings {
  return buildStatsMatchSettings({
    playersPerTeam: input.playersPerTeam || DEFAULT_STATS_MATCH_PLAYERS_PER_TEAM,
    periodCount: input.periodCount || DEFAULT_STATS_MATCH_PERIOD_COUNT,
    periodDurationSeconds: input.periodMinutes
      ? Math.round(input.periodMinutes * 60)
      : DEFAULT_STATS_MATCH_PERIOD_DURATION_SECONDS,
  });
}

export function buildStatsMatchSetupValidation(input: {
  homePoolId?: string;
  awayPoolId?: string;
  homeTeam: StatsTeam;
  awayTeam: StatsTeam;
  settings: StatsMatchSettings;
}): string {
  if (!input.homePoolId || !input.awayPoolId) {
    return 'Elegi un cuadro local y uno visitante.';
  }

  if (input.homePoolId === input.awayPoolId) {
    return 'Elegi dos cuadros distintos.';
  }

  const validation = validateStatsMatchSetup(input.homeTeam, input.awayTeam, input.settings);

  return validation.valid ? '' : validation.errors[0] ?? 'No se pudo crear el partido.';
}
