import { getMostFrequentLandingZones, getMostFrequentOpponentDefenseZones } from './court';
import { buildPlayerPerformance } from './playerPerformance';
import { ErrorEvent, MatchEvent, Player } from './types';

export type LiveRecommendationType = 'warning' | 'adjustment' | 'info';

export type LiveRecommendation = {
  id: string;
  type: LiveRecommendationType;
  title: string;
  detail?: string;
  priority: number;
};

type LiveRecommendationInput = {
  events: MatchEvent[];
  currentLineupPlayerIds: string[];
  players: Player[];
  maxRecommendations?: number;
};

const PLAYER_BLOCKED_THRESHOLD = 2;
const PLAYER_BLOCKED_ATTEMPTS_THRESHOLD = 3;
const LOW_EFFECTIVENESS_ATTEMPTS_THRESHOLD = 4;
const EFFECTIVENESS_WARNING_THRESHOLD = 0.75;
const REPEATED_ERRORS_THRESHOLD = 2;
const TEAM_OWN_POINTS_THRESHOLD = 2;
const OPPONENT_ZONE_THRESHOLD = 3;
const OPPONENT_DEFENSE_ZONE_THRESHOLD = 3;
const NO_INVOLVEMENT_EVENT_THRESHOLD = 8;
const STRONG_DEFENSE_THRESHOLD = 3;
const STRONG_OFFENSE_ATTEMPTS_THRESHOLD = 4;

const getPlayerLabel = (players: Player[], playerId: string) => {
  const player = players.find((item) => item.id === playerId);

  if (!player) {
    return playerId;
  }

  return `#${player.number} ${player.lastName || player.firstName}`.trim();
};

const isUruguayTrackedError = (event: MatchEvent): event is ErrorEvent =>
  event.kind === 'error' &&
  event.team === 'uruguay' &&
  Boolean(event.playerId) &&
  (event.errorType === 'falta' || event.errorType === 'punto_en_contra');

const increment = (totals: Map<string, number>, key: string | undefined) => {
  if (!key) {
    return;
  }

  totals.set(key, (totals.get(key) ?? 0) + 1);
};

const byPriority = (a: LiveRecommendation, b: LiveRecommendation) =>
  a.priority - b.priority || a.title.localeCompare(b.title) || (a.detail ?? '').localeCompare(b.detail ?? '');

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

export function buildLiveRecommendations({
  events,
  currentLineupPlayerIds,
  players,
  maxRecommendations = 6,
}: LiveRecommendationInput): LiveRecommendation[] {
  const recommendations: LiveRecommendation[] = [];
  const performance = buildPlayerPerformance(events, players, currentLineupPlayerIds);

  const teamOwnPoints = events.filter(
    (event) => event.kind === 'error' && event.team === 'uruguay' && event.errorType === 'punto_en_contra',
  ).length;

  if (teamOwnPoints >= TEAM_OWN_POINTS_THRESHOLD) {
    recommendations.push({
      id: 'team-own-points',
      type: 'warning',
      title: 'Puntos regalados',
      detail: `Ya hubo ${teamOwnPoints} puntos en contra.`,
      priority: 10,
    });
  }

  const errorsByPlayer = new Map<string, number>();
  events.filter(isUruguayTrackedError).forEach((event) => increment(errorsByPlayer, event.playerId));

  Array.from(errorsByPlayer)
    .filter(([, total]) => total >= REPEATED_ERRORS_THRESHOLD)
    .forEach(([playerId, total]) => {
      recommendations.push({
        id: `repeated-errors-${playerId}`,
        type: 'warning',
        title: 'Errores repetidos',
        detail: `${getPlayerLabel(players, playerId)} acumula ${total} errores.`,
        priority: 20,
      });
    });

  performance.rows
    .filter(
      (row) =>
        row.shotAttempts >= PLAYER_BLOCKED_ATTEMPTS_THRESHOLD &&
        row.rivalDefensesAgainst >= PLAYER_BLOCKED_THRESHOLD &&
        typeof row.effectiveness === 'number' &&
        row.effectiveness < EFFECTIVENESS_WARNING_THRESHOLD,
    )
    .forEach((row) => {
      recommendations.push({
        id: `blocked-${row.playerId}`,
        type: 'adjustment',
        title: 'Lo están anulando',
        detail: `A ${row.playerName} le defendieron ${row.rivalDefensesAgainst} tiros y lleva ${row.points}/${row.shotAttempts}.`,
        priority: 30,
      });
    });

  performance.rows
    .filter(
      (row) =>
        row.shotAttempts >= LOW_EFFECTIVENESS_ATTEMPTS_THRESHOLD &&
        typeof row.effectiveness === 'number' &&
        row.effectiveness < EFFECTIVENESS_WARNING_THRESHOLD,
    )
    .forEach((row) => {
      recommendations.push({
        id: `low-effectiveness-${row.playerId}`,
        type: 'adjustment',
        title: 'Baja efectividad',
        detail: `${row.playerName}: ${row.points}/${row.shotAttempts} en tiros (${formatPercent(row.effectiveness ?? 0)}).`,
        priority: 40,
      });
    });

  getMostFrequentLandingZones(events, 'opponent')
    .filter((zone) => zone.total >= OPPONENT_ZONE_THRESHOLD)
    .forEach((zone) => {
      recommendations.push({
        id: `opponent-zone-${zone.label}`,
        type: 'warning',
        title: 'Zona vulnerable',
        detail: `Nos están entrando seguido por ${zone.label.toLowerCase()}.`,
        priority: 50,
      });
    });

  getMostFrequentOpponentDefenseZones(events)
    .filter((zone) => zone.total >= OPPONENT_DEFENSE_ZONE_THRESHOLD)
    .forEach((zone) => {
      recommendations.push({
        id: `opponent-defense-zone-${zone.label}`,
        type: 'adjustment',
        title: 'Zona bloqueada',
        detail: `El rival nos está defendiendo seguido en ${zone.label.toLowerCase()}.`,
        priority: 60,
      });
    });

  if (events.length >= NO_INVOLVEMENT_EVENT_THRESHOLD) {
    performance.rows
      .filter((row) => currentLineupPlayerIds.includes(row.playerId))
      .filter((row) => row.points === 0 && row.shotAttempts === 0 && row.defenses === 0 && row.rivalDefensesAgainst === 0)
      .forEach((row) => {
        recommendations.push({
          id: `low-involvement-${row.playerId}`,
          type: 'info',
          title: 'Baja participación',
          detail: `${row.playerName} todavía no registra tiros ni defensas.`,
          priority: 70,
        });
      });
  }

  performance.rows
    .filter((row) => row.defenses >= STRONG_DEFENSE_THRESHOLD)
    .forEach((row) => {
      recommendations.push({
        id: `strong-defense-${row.playerId}`,
        type: 'info',
        title: 'Aporte defensivo',
        detail: `${row.playerName} sostiene defensa con ${row.defenses} defensas.`,
        priority: 80,
      });
    });

  performance.rows
    .filter(
      (row) =>
        row.rivalDefensesAgainst >= PLAYER_BLOCKED_THRESHOLD &&
        typeof row.effectiveness === 'number' &&
        row.effectiveness >= EFFECTIVENESS_WARNING_THRESHOLD,
    )
    .forEach((row) => {
      recommendations.push({
        id: `defended-shots-info-${row.playerId}`,
        type: 'info',
        title: 'Le están defendiendo tiros',
        detail: `A ${row.playerName} le defendieron ${row.rivalDefensesAgainst}, pero mantiene ${formatPercent(row.effectiveness ?? 0)} de efectividad.`,
        priority: 90,
      });
    });

  performance.rows
    .filter(
      (row) =>
        row.shotAttempts >= STRONG_OFFENSE_ATTEMPTS_THRESHOLD &&
        typeof row.effectiveness === 'number' &&
        row.effectiveness >= EFFECTIVENESS_WARNING_THRESHOLD,
    )
    .forEach((row) => {
      recommendations.push({
        id: `strong-offense-${row.playerId}`,
        type: 'info',
        title: 'Buen rendimiento ofensivo',
        detail: `${row.playerName}: ${row.points}/${row.shotAttempts} en tiros (${formatPercent(row.effectiveness ?? 0)}).`,
        priority: 100,
      });
    });

  return recommendations.sort(byPriority).slice(0, maxRecommendations);
}
