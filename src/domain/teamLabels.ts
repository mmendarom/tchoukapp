import { normalizeOpponentName } from './opponent';
import { Match } from './types';

export const DEFAULT_OWN_TEAM_NAME = 'Equipo';

export function getOwnTeamDisplayName(match: Pick<Match, 'teamPoolName'>): string {
  const teamPoolName = match.teamPoolName?.trim();
  return teamPoolName || DEFAULT_OWN_TEAM_NAME;
}

export function getMatchupDisplayName(match: Pick<Match, 'teamPoolName' | 'opponent'>): string {
  return `${getOwnTeamDisplayName(match)} vs ${normalizeOpponentName(match.opponent)}`;
}
