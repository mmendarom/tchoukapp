import { getMostFrequentOpponentDefenseSectors, getMostFrequentOpponentScoringSectors } from './court';
import { calculateScore, getCurrentLineup } from './stats';
import {
  DefenseEvent,
  ErrorEvent,
  LineupSnapshot,
  Match,
  MatchEvent,
  OpponentDefenseEvent,
  Player,
  PointEvent,
  TeamSide,
} from './types';

export type InsightSeverity = 'info' | 'warning' | 'critical';

export type InsightCard = {
  id: string;
  severity: InsightSeverity;
  title: string;
  description: string;
  suggestedAction: string;
};

export type TacticalInsightInput = {
  events: MatchEvent[];
  lineupSnapshots: LineupSnapshot[];
  players?: Player[];
  team?: TeamSide;
  opponentName?: string;
};

export type TacticalInsightRules = {
  recentEventLimit: number;
  frequentScorerPoints: number;
  warningRecentErrors: number;
  criticalRecentErrors: number;
  repeatedOpponentZoneWarning: number;
  repeatedOpponentZoneCritical: number;
  positiveLineupPlusMinus: number;
  negativeLineupPlusMinusWarning: number;
  negativeLineupPlusMinusCritical: number;
  lowInvolvementTeamPoints: number;
  lowInvolvementTouches: number;
  opponentOwnPointWarning: number;
  opponentDefenseZoneWarning: number;
};

const defaultRules: TacticalInsightRules = {
  recentEventLimit: 12,
  frequentScorerPoints: 3,
  warningRecentErrors: 2,
  criticalRecentErrors: 3,
  repeatedOpponentZoneWarning: 2,
  repeatedOpponentZoneCritical: 3,
  positiveLineupPlusMinus: 3,
  negativeLineupPlusMinusWarning: -2,
  negativeLineupPlusMinusCritical: -4,
  lowInvolvementTeamPoints: 5,
  lowInvolvementTouches: 0,
  opponentOwnPointWarning: 2,
  opponentDefenseZoneWarning: 3,
};

const isPointEvent = (event: MatchEvent): event is PointEvent => event.kind === 'point';
const isOpponentOwnPointEvent = (event: MatchEvent): event is PointEvent =>
  isPointEvent(event) && event.scoringTeam === 'uruguay' && event.pointSource === 'opponent_own_point';

const isErrorEvent = (event: MatchEvent): event is ErrorEvent => event.kind === 'error';

const isDefenseEvent = (event: MatchEvent): event is DefenseEvent => event.kind === 'defense';

const isOpponentDefenseEvent = (event: MatchEvent): event is OpponentDefenseEvent => event.kind === 'opponent_defense';

const isTrackedErrorEvent = (event: MatchEvent): event is ErrorEvent =>
  isErrorEvent(event) && (event.errorType === 'falta' || event.errorType === 'punto_en_contra');

const sortNewestFirst = (events: MatchEvent[]) =>
  [...events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

const countBy = <T, K extends string>(items: T[], getKey: (item: T) => K | undefined) => {
  const counts = new Map<K, number>();

  items.forEach((item) => {
    const key = getKey(item);

    if (!key) {
      return;
    }

    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return counts;
};

const getPlayerLabel = (players: Player[] | undefined, playerId: string) => {
  const player = players?.find((item) => item.id === playerId);

  if (!player) {
    return playerId;
  }

  return `#${player.number} ${player.firstName} ${player.lastName}`.trim();
};

const buildSyntheticMatch = (events: MatchEvent[], lineupSnapshots: LineupSnapshot[]): Match => ({
  id: events[0]?.matchId ?? lineupSnapshots[0]?.matchId ?? 'insight-match',
  opponent: 'Rival',
  venue: '',
  startsAt: '',
  status: 'live',
  currentPeriod: events[0]?.periodNumber ?? events[0]?.clock.period ?? lineupSnapshots[0]?.clock.period ?? 1,
  periods: [
    { number: 1, status: 'not_started', durationSeconds: 900, remainingSeconds: 900, timerRunning: false },
    { number: 2, status: 'not_started', durationSeconds: 900, remainingSeconds: 900, timerRunning: false },
    { number: 3, status: 'not_started', durationSeconds: 900, remainingSeconds: 900, timerRunning: false },
  ],
  clock: events[0]?.clock ?? lineupSnapshots[0]?.clock ?? { period: 1, secondsElapsed: 0 },
  events,
  lineupSnapshots,
});

const getLineupScore = (events: MatchEvent[], lineupSnapshotId: string, team: TeamSide) => {
  const lineupEvents = events.filter((event) => event.lineupSnapshotId === lineupSnapshotId);
  const score = calculateScore(lineupEvents);
  const opponent: TeamSide = team === 'uruguay' ? 'opponent' : 'uruguay';

  return {
    pointsFor: score[team],
    pointsAgainst: score[opponent],
    plusMinus: score[team] - score[opponent],
  };
};

const createFrequentScorerInsights = (
  recentEvents: MatchEvent[],
  players: Player[] | undefined,
  team: TeamSide,
  rules: TacticalInsightRules,
): InsightCard[] => {
  const playerPointCounts = countBy(
    recentEvents.filter(isPointEvent).filter((event) => event.scoringTeam === team),
    (event) => event.playerId,
  );

  return Array.from(playerPointCounts)
    .filter(([, total]) => total >= rules.frequentScorerPoints)
    .map(([playerId, total]) => ({
      id: `frequent-scorer-${playerId}`,
      severity: 'info',
      title: `${getPlayerLabel(players, playerId)} está anotando seguido`,
      description: `${getPlayerLabel(players, playerId)} convirtió ${total} puntos en la secuencia reciente.`,
      suggestedAction: 'Mantenerlo como referencia ofensiva y repetir combinaciones de marco y zona que estén funcionando.',
    }));
};

const createRecentErrorInsights = (
  recentEvents: MatchEvent[],
  players: Player[] | undefined,
  team: TeamSide,
  rules: TacticalInsightRules,
): InsightCard[] => {
  const errorCounts = countBy(
    recentEvents.filter(isTrackedErrorEvent).filter((event) => event.team === team),
    (event) => event.playerId,
  );

  return Array.from(errorCounts)
    .filter(([, total]) => total >= rules.warningRecentErrors)
    .map(([playerId, total]) => ({
      id: `recent-errors-${playerId}`,
      severity: total >= rules.criticalRecentErrors ? 'critical' : 'warning',
      title: `${getPlayerLabel(players, playerId)} acumula errores recientes`,
      description: `${getPlayerLabel(players, playerId)} cometió ${total} errores en las últimas ${rules.recentEventLimit} acciones registradas.`,
      suggestedAction: 'Bajar el riesgo en las próximas posesiones, simplificar pases o considerar un cambio corto.',
    }));
};

const createDefenseInsights = (
  recentEvents: MatchEvent[],
  players: Player[] | undefined,
  team: TeamSide,
): InsightCard[] => {
  if (team !== 'uruguay') {
    return [];
  }

  const defenseCounts = countBy(recentEvents.filter(isDefenseEvent), (event) => event.playerId);

  return Array.from(defenseCounts)
    .filter(([, total]) => total >= 3)
    .map(([playerId, total]) => ({
      id: `key-defender-${playerId}`,
      severity: 'info',
      title: 'Defensor clave',
      description: `${getPlayerLabel(players, playerId)} sumo ${total} defensas en la secuencia reciente.`,
      suggestedAction: 'Mantenerlo como referencia defensiva si sostiene la cobertura.',
    }));
};

const createTypedErrorInsights = (
  recentEvents: MatchEvent[],
  players: Player[] | undefined,
  team: TeamSide,
): InsightCard[] => {
  const teamErrors = recentEvents.filter(isTrackedErrorEvent).filter((event) => event.team === team);
  const faltaCounts = countBy(teamErrors.filter((event) => event.errorType === 'falta'), (event) => event.playerId);
  const puntosEnContraCounts = countBy(teamErrors.filter((event) => event.errorType === 'punto_en_contra'), (event) => event.playerId);
  const puntosEnContraTotal = teamErrors.filter((event) => event.errorType === 'punto_en_contra').length;
  const insights: InsightCard[] = [];

  Array.from(faltaCounts)
    .filter(([, total]) => total >= 2)
    .forEach(([playerId, total]) => {
      insights.push({
        id: `faltas-${playerId}`,
        severity: total >= 3 ? 'critical' : 'warning',
        title: 'Atencion con faltas',
        description: `${getPlayerLabel(players, playerId)} acumulo ${total} faltas.`,
        suggestedAction: 'Revisar timing y toma de decisiones.',
      });
    });

  Array.from(puntosEnContraCounts)
    .filter(([, total]) => total >= 2)
    .forEach(([playerId, total]) => {
      insights.push({
        id: `puntos-en-contra-${playerId}`,
        severity: total >= 3 ? 'critical' : 'warning',
        title: 'Puntos en contra acumulados',
        description: `${getPlayerLabel(players, playerId)} acumula ${total} puntos en contra.`,
        suggestedAction: 'Considerar ajuste defensivo o cambio temporal.',
      });
    });

  if (puntosEnContraTotal >= 3) {
    insights.push({
      id: 'team-puntos-regalados',
      severity: puntosEnContraTotal >= 4 ? 'critical' : 'warning',
      title: 'Puntos regalados',
      description: `Uruguay entrego ${puntosEnContraTotal} puntos en contra en la secuencia reciente.`,
      suggestedAction: 'Bajar riesgo en los tiros y priorizar seguridad.',
    });
  }

  return insights;
};

const createOpponentZoneInsights = (
  recentEvents: MatchEvent[],
  opponentName: string,
  rules: TacticalInsightRules,
): InsightCard[] => {
  return getMostFrequentOpponentScoringSectors(recentEvents)
    .map((zone) => [zone.label, zone.total] as const)
    .filter(([, total]) => total >= rules.repeatedOpponentZoneWarning)
    .map(([label, total]) => ({
      id: `opponent-zone-${label}`,
      severity: total >= rules.repeatedOpponentZoneCritical ? 'critical' : 'warning',
      title: `${opponentName} repite puntos en ${label}`,
      description: `${opponentName} convirtió ${total} puntos recientes hacia ${label}.`,
      suggestedAction: 'Ajustar la cobertura de ese sector y presionar la línea de pase antes del lanzamiento al marco.',
    }));
};

const createOpponentOwnPointInsights = (
  recentEvents: MatchEvent[],
  rules: TacticalInsightRules,
): InsightCard[] => {
  const total = recentEvents.filter(isOpponentOwnPointEvent).length;

  if (total < rules.opponentOwnPointWarning) {
    return [];
  }

  return [
    {
      id: 'opponent-own-points',
      severity: 'info',
      title: 'Puntos regalados por el rival',
      description: `El rival entrego ${total} puntos en contra en este tiempo.`,
      suggestedAction: 'Aprovechar el momento y mantener presion.',
    },
  ];
};

const createOpponentDefenseZoneInsights = (
  recentEvents: MatchEvent[],
  rules: TacticalInsightRules,
): InsightCard[] => {
  return getMostFrequentOpponentDefenseSectors(recentEvents)
    .filter((zone) => zone.total >= rules.opponentDefenseZoneWarning)
    .map((zone) => ({
      id: `opponent-defense-zone-${zone.label}`,
      severity: 'warning',
      title: 'Nos defienden seguido en un sector',
      description: `El rival defendio ${zone.total} ataques en ${zone.label}.`,
      suggestedAction: 'Variar angulos de ataque o rotar el punto de lanzamiento.',
    }));
};

const createCurrentLineupInsight = (
  events: MatchEvent[],
  lineupSnapshots: LineupSnapshot[],
  team: TeamSide,
  rules: TacticalInsightRules,
): InsightCard[] => {
  const currentLineup = getCurrentLineup(buildSyntheticMatch(events, lineupSnapshots), team);

  if (!currentLineup) {
    return [];
  }

  const lineupScore = getLineupScore(events, currentLineup.id, team);

  if (lineupScore.plusMinus >= rules.positiveLineupPlusMinus) {
    return [
      {
        id: `lineup-plus-minus-${currentLineup.id}`,
        severity: 'info',
        title: 'La formación actual tiene plus/minus positivo',
        description: `Esta formación está ${lineupScore.plusMinus >= 0 ? '+' : ''}${lineupScore.plusMinus} en las acciones de punto registradas.`,
        suggestedAction: 'Mantener esta formación mientras sostenga la ventaja del emparejamiento.',
      },
    ];
  }

  if (lineupScore.plusMinus <= rules.negativeLineupPlusMinusWarning) {
    return [
      {
        id: `lineup-plus-minus-${currentLineup.id}`,
        severity: lineupScore.plusMinus <= rules.negativeLineupPlusMinusCritical ? 'critical' : 'warning',
        title: 'La formación actual tiene plus/minus negativo',
        description: `Esta formación está ${lineupScore.plusMinus} en las acciones de punto registradas.`,
        suggestedAction: 'Cambiar un jugador, ajustar la ocupación defensiva o pedir tiempo antes de que crezca la diferencia.',
      },
    ];
  }

  return [];
};

const createLowInvolvementInsights = (
  events: MatchEvent[],
  lineupSnapshots: LineupSnapshot[],
  players: Player[] | undefined,
  team: TeamSide,
  rules: TacticalInsightRules,
): InsightCard[] => {
  if (team !== 'uruguay') {
    return [];
  }

  const currentLineup = getCurrentLineup(buildSyntheticMatch(events, lineupSnapshots), team);

  if (!currentLineup) {
    return [];
  }

  const lineupPointEvents = events
    .filter(isPointEvent)
    .filter((event) => event.lineupSnapshotId === currentLineup.id && event.scoringTeam === team && event.pointSource !== 'opponent_own_point');

  if (lineupPointEvents.length < rules.lowInvolvementTeamPoints) {
    return [];
  }

  const involvementCounts = countBy(lineupPointEvents, (event) => event.playerId);
  events
    .filter(isOpponentDefenseEvent)
    .filter((event) => event.lineupSnapshotId === currentLineup.id)
    .forEach((event) => {
      if (event.playerId) {
        involvementCounts.set(event.playerId, (involvementCounts.get(event.playerId) ?? 0) + 1);
      }
    });
  events
    .filter(isDefenseEvent)
    .filter((event) => event.lineupSnapshotId === currentLineup.id)
    .forEach((event) => {
      involvementCounts.set(event.playerId, (involvementCounts.get(event.playerId) ?? 0) + 1);
    });

  return currentLineup.playerIds
    .filter((playerId) => (involvementCounts.get(playerId) ?? 0) <= rules.lowInvolvementTouches)
    .map((playerId) => ({
      id: `low-involvement-${playerId}`,
      severity: 'warning',
      title: `${getPlayerLabel(players, playerId)} participa poco en ataque`,
      description: `${getPlayerLabel(players, playerId)} no tiene tiros ni defensas registradas mientras esta formación convirtió ${lineupPointEvents.length} puntos.`,
      suggestedAction: 'Buscar una jugada por su zona o rotarlo si el rival está anulando su rol.',
    }));
};

export function createTacticalInsights(
  input: TacticalInsightInput,
  ruleOverrides: Partial<TacticalInsightRules> = {},
): InsightCard[] {
  const rules = { ...defaultRules, ...ruleOverrides };
  const team = input.team ?? 'uruguay';
  const opponentName = input.opponentName ?? 'Rival';
  const eventsNewestFirst = sortNewestFirst(input.events);
  const recentEvents = eventsNewestFirst.slice(0, rules.recentEventLimit);
  const insightGroups = [
    createFrequentScorerInsights(recentEvents, input.players, team, rules),
    createRecentErrorInsights(recentEvents, input.players, team, rules),
    createDefenseInsights(recentEvents, input.players, team),
    createTypedErrorInsights(recentEvents, input.players, team),
    createOpponentOwnPointInsights(recentEvents, rules),
    createOpponentDefenseZoneInsights(recentEvents, rules),
    createOpponentZoneInsights(recentEvents, opponentName, rules),
    createCurrentLineupInsight(input.events, input.lineupSnapshots, team, rules),
    createLowInvolvementInsights(input.events, input.lineupSnapshots, input.players, team, rules),
  ];
  const severityRank: Record<InsightSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };

  return insightGroups
    .flat()
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || a.title.localeCompare(b.title));
}
