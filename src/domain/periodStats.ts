import {
  CourtZone,
  DefenseEvent,
  ErrorEvent,
  ErrorType,
  LineupSwapEvent,
  Match,
  MatchEvent,
  MatchPeriod,
  PointEvent,
  Score,
  SubstitutionEvent,
  TeamSide,
} from './types';
import { getMostFrequentLandingZones } from './court';

export type PlayerPeriodStat = {
  playerId: string;
  total: number;
};

export type PlayerErrorPeriodSummary = {
  playerId: string;
  faltas: number;
  puntosEnContra: number;
  total: number;
};

export type ZonePeriodStat = {
  zone: CourtZone;
  total: number;
};

export type PeriodInsight = {
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  suggestedAction: string;
};

export const PERIOD_DURATION_SECONDS = 15 * 60;

const isPointEvent = (event: MatchEvent): event is PointEvent => event.kind === 'point';
const isErrorEvent = (event: MatchEvent): event is ErrorEvent => event.kind === 'error';
const isDefenseEvent = (event: MatchEvent): event is DefenseEvent => event.kind === 'defense';
const isSubstitutionEvent = (event: MatchEvent): event is SubstitutionEvent => event.kind === 'substitution';
const isLineupSwapEvent = (event: MatchEvent): event is LineupSwapEvent => event.kind === 'lineup_swap';
const isOpponentOwnPointEvent = (event: MatchEvent): event is PointEvent =>
  isPointEvent(event) && event.scoringTeam === 'uruguay' && event.pointSource === 'opponent_own_point';

const isTrackedErrorType = (errorType: ErrorType | string | undefined): errorType is 'falta' | 'punto_en_contra' =>
  errorType === 'falta' || errorType === 'punto_en_contra';

const getEventPeriod = (event: MatchEvent): MatchPeriod => event.periodNumber ?? event.clock.period;

const emptyScore = (): Score => ({ uruguay: 0, opponent: 0 });

const scoringTeamForEvent = (event: MatchEvent): TeamSide | undefined => {
  if (isPointEvent(event)) {
    return event.scoringTeam;
  }

  if (isErrorEvent(event) && event.team === 'uruguay' && event.errorType === 'punto_en_contra') {
    return 'opponent';
  }

  return undefined;
};

const increment = <K extends string>(map: Map<K, number>, key: K | undefined) => {
  if (!key) {
    return;
  }

  map.set(key, (map.get(key) ?? 0) + 1);
};

const toSortedStats = <K extends string>(map: Map<K, number>) =>
  Array.from(map, ([key, total]) => ({ key, total })).sort((a, b) => b.total - a.total);

export function getEventsByPeriod(events: MatchEvent[], periodNumber: MatchPeriod) {
  return events.filter((event) => getEventPeriod(event) === periodNumber);
}

export function calculateTotalScore(events: MatchEvent[]): Score {
  return events.reduce((score, event) => {
    const scoringTeam = scoringTeamForEvent(event);

    if (!scoringTeam) {
      return score;
    }

    return {
      ...score,
      [scoringTeam]: score[scoringTeam] + 1,
    };
  }, emptyScore());
}

export function calculatePeriodScore(events: MatchEvent[], periodNumber: MatchPeriod): Score {
  return calculateTotalScore(getEventsByPeriod(events, periodNumber));
}

export function getScoreByPeriod(events: MatchEvent[]) {
  return ([1, 2, 3] as MatchPeriod[]).map((periodNumber) => ({
    periodNumber,
    score: calculatePeriodScore(events, periodNumber),
  }));
}

export function getTopScorersByPeriod(events: MatchEvent[], periodNumber: MatchPeriod): PlayerPeriodStat[] {
  return getPointsByPlayer(getEventsByPeriod(events, periodNumber));
}

export function getPointsByPlayer(events: MatchEvent[]): PlayerPeriodStat[] {
  const totals = new Map<string, number>();

  events.filter(isPointEvent).forEach((event) => {
    if (event.scoringTeam === 'uruguay' && event.pointSource !== 'opponent_own_point') {
      increment(totals, event.playerId);
    }
  });

  return toSortedStats(totals).map(({ key, total }) => ({ playerId: key, total }));
}

export function getErrorsByPlayerByPeriod(events: MatchEvent[], periodNumber: MatchPeriod): PlayerPeriodStat[] {
  return getErrorsByPlayer(getEventsByPeriod(events, periodNumber));
}

export function getErrorsByPlayer(events: MatchEvent[]): PlayerPeriodStat[] {
  const totals = new Map<string, number>();

  events.filter(isErrorEvent).forEach((event) => {
    if (event.team === 'uruguay' && isTrackedErrorType(event.errorType)) {
      increment(totals, event.playerId);
    }
  });

  return toSortedStats(totals).map(({ key, total }) => ({ playerId: key, total }));
}

export function getDefensesByPlayerByPeriod(events: MatchEvent[], periodNumber: MatchPeriod): PlayerPeriodStat[] {
  return getDefensesByPlayer(getEventsByPeriod(events, periodNumber));
}

export function getDefensesByPlayer(events: MatchEvent[]): PlayerPeriodStat[] {
  const totals = new Map<string, number>();

  events.filter(isDefenseEvent).forEach((event) => {
    increment(totals, event.playerId);
  });

  return toSortedStats(totals).map(({ key, total }) => ({ playerId: key, total }));
}

export function getErrorsByTypeByPlayerByPeriod(events: MatchEvent[], periodNumber: MatchPeriod): PlayerErrorPeriodSummary[] {
  return getErrorsByTypeByPlayer(getEventsByPeriod(events, periodNumber));
}

export function getErrorsByTypeByPlayer(events: MatchEvent[]): PlayerErrorPeriodSummary[] {
  const totals = new Map<string, PlayerErrorPeriodSummary>();

  events.filter(isErrorEvent).forEach((event) => {
    if (event.team !== 'uruguay' || !event.playerId || !isTrackedErrorType(event.errorType)) {
      return;
    }

    const summary = totals.get(event.playerId) ?? {
      playerId: event.playerId,
      faltas: 0,
      puntosEnContra: 0,
      total: 0,
    };

    if (event.errorType === 'falta') {
      summary.faltas += 1;
    }

    if (event.errorType === 'punto_en_contra') {
      summary.puntosEnContra += 1;
    }

    summary.total += 1;
    totals.set(event.playerId, summary);
  });

  return Array.from(totals.values()).sort((a, b) => b.total - a.total);
}

export function getPlayerErrorSummary(events: MatchEvent[]) {
  return getErrorsByTypeByPlayer(events);
}

export function getPointsByZoneForEvents(events: MatchEvent[], team: TeamSide = 'uruguay'): ZonePeriodStat[] {
  const totals = new Map<CourtZone, number>();

  events.filter(isPointEvent).forEach((event) => {
    if (event.scoringTeam === team && event.pointSource !== 'opponent_own_point' && event.landingLocation) {
      increment(totals, event.zone);
    }
  });

  return toSortedStats(totals).map(({ key, total }) => ({ zone: key as CourtZone, total }));
}

export function getPointsByZoneByPeriod(events: MatchEvent[], periodNumber: MatchPeriod) {
  return getPointsByZoneForEvents(getEventsByPeriod(events, periodNumber), 'uruguay');
}

export function getOpponentPointsByZoneByPeriod(events: MatchEvent[], periodNumber: MatchPeriod) {
  return getPointsByZoneForEvents(getEventsByPeriod(events, periodNumber), 'opponent');
}

export function getSubstitutions(events: MatchEvent[]) {
  return events.filter(isSubstitutionEvent);
}

export function getSubstitutionsByPeriod(events: MatchEvent[], periodNumber: MatchPeriod) {
  return getSubstitutions(getEventsByPeriod(events, periodNumber));
}

export function getLineupSwaps(events: MatchEvent[]) {
  return events.filter(isLineupSwapEvent);
}

export function getLineupSwapsByPeriod(events: MatchEvent[], periodNumber: MatchPeriod) {
  return getLineupSwaps(getEventsByPeriod(events, periodNumber));
}

export function getOpponentOwnPoints(events: MatchEvent[]) {
  return events.filter(isOpponentOwnPointEvent).length;
}

export function getOpponentOwnPointsByPeriod(events: MatchEvent[], periodNumber: MatchPeriod) {
  return getOpponentOwnPoints(getEventsByPeriod(events, periodNumber));
}

export function formatPeriodName(periodNumber: MatchPeriod) {
  if (periodNumber === 1) {
    return '1er tiempo';
  }

  if (periodNumber === 2) {
    return '2do tiempo';
  }

  return '3er tiempo';
}

export function formatTimer(seconds: number) {
  const safeSeconds = Math.max(seconds, 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function generatePeriodInsights(match: Match, periodNumber: MatchPeriod, getPlayerName: (playerId: string) => string): PeriodInsight[] {
  const periodEvents = getEventsByPeriod(match.events, periodNumber);
  const periodScore = calculatePeriodScore(match.events, periodNumber);
  const topScorer = getTopScorersByPeriod(match.events, periodNumber)[0];
  const topError = getErrorsByPlayerByPeriod(match.events, periodNumber)[0];
  const topDefense = getDefensesByPlayerByPeriod(match.events, periodNumber)[0];
  const errorBreakdown = getErrorsByTypeByPlayerByPeriod(match.events, periodNumber);
  const topFalta = [...errorBreakdown].sort((a, b) => b.faltas - a.faltas)[0];
  const topPuntoEnContra = [...errorBreakdown].sort((a, b) => b.puntosEnContra - a.puntosEnContra)[0];
  const puntosEnContraTotal = errorBreakdown.reduce((sum, stat) => sum + stat.puntosEnContra, 0);
  const opponentOwnPoints = getOpponentOwnPoints(periodEvents);
  const opponentZone = getMostFrequentLandingZones(periodEvents, 'opponent')[0];
  const uruguayZone = getMostFrequentLandingZones(periodEvents, 'uruguay')[0];
  const insights: PeriodInsight[] = [];

  if (topScorer && topScorer.total >= 3) {
    insights.push({
      severity: 'info',
      title: 'Jugador en racha',
      description: `${getPlayerName(topScorer.playerId)} hizo ${topScorer.total} puntos en este tiempo.`,
      suggestedAction: 'Mantenerlo como opcion ofensiva principal.',
    });
  }

  if (topError && topError.total >= 2) {
    insights.push({
      severity: topError.total >= 4 ? 'critical' : 'warning',
      title: 'Atencion con errores',
      description: `${getPlayerName(topError.playerId)} acumulo ${topError.total} errores en este tiempo.`,
      suggestedAction: 'Considerar bajarle carga o hacer un cambio temporal.',
    });
  }

  if (topDefense && topDefense.total >= 3) {
    insights.push({
      severity: 'info',
      title: 'Defensor clave',
      description: `${getPlayerName(topDefense.playerId)} sumo ${topDefense.total} defensas en este tiempo.`,
      suggestedAction: 'Mantenerlo como referencia defensiva si sostiene la cobertura.',
    });
  }

  if (topFalta && topFalta.faltas >= 2) {
    insights.push({
      severity: topFalta.faltas >= 3 ? 'critical' : 'warning',
      title: 'Atencion con faltas',
      description: `${getPlayerName(topFalta.playerId)} acumulo ${topFalta.faltas} faltas.`,
      suggestedAction: 'Revisar timing y toma de decisiones.',
    });
  }

  if (topPuntoEnContra && topPuntoEnContra.puntosEnContra >= 2) {
    insights.push({
      severity: topPuntoEnContra.puntosEnContra >= 3 ? 'critical' : 'warning',
      title: 'Puntos en contra acumulados',
      description: `${getPlayerName(topPuntoEnContra.playerId)} acumula ${topPuntoEnContra.puntosEnContra} puntos en contra.`,
      suggestedAction: 'Considerar ajuste defensivo o cambio temporal.',
    });
  }

  if (puntosEnContraTotal >= 3) {
    insights.push({
      severity: puntosEnContraTotal >= 4 ? 'critical' : 'warning',
      title: 'Puntos regalados',
      description: `Uruguay entrego ${puntosEnContraTotal} puntos en contra en este tiempo.`,
      suggestedAction: 'Bajar riesgo en los tiros y priorizar seguridad.',
    });
  }

  if (opponentOwnPoints >= 2) {
    insights.push({
      severity: 'info',
      title: 'Puntos regalados por el rival',
      description: `El rival entrego ${opponentOwnPoints} puntos en contra en este tiempo.`,
      suggestedAction: 'Aprovechar el momento y mantener presion.',
    });
  }

  if (opponentZone && opponentZone.total >= 3) {
    insights.push({
      severity: 'warning',
      title: 'Zona vulnerable',
      description: `El rival nos hizo ${opponentZone.total} puntos en ${opponentZone.label.toLowerCase()}.`,
      suggestedAction: 'Ajustar cobertura defensiva en esa zona.',
    });
  }

  if (uruguayZone && uruguayZone.total >= 3) {
    insights.push({
      severity: 'info',
      title: 'Zona efectiva',
      description: `Uruguay convirtio ${uruguayZone.total} puntos hacia ${uruguayZone.label.toLowerCase()}.`,
      suggestedAction: 'Seguir explotando esa zona si el rival no ajusta.',
    });
  }

  const difference = periodScore.uruguay - periodScore.opponent;

  if (periodEvents.length > 0 && difference < 0) {
    insights.push({
      severity: difference <= -4 ? 'critical' : 'warning',
      title: 'Tiempo desfavorable',
      description: `Uruguay perdio este tiempo por ${Math.abs(difference)} puntos.`,
      suggestedAction: 'Revisar errores propios, zonas vulnerables y formacion inicial del proximo tiempo.',
    });
  }

  if (periodEvents.length > 0 && difference > 0) {
    insights.push({
      severity: 'info',
      title: 'Tiempo positivo',
      description: `Uruguay gano este tiempo por ${difference} puntos.`,
      suggestedAction: 'Mantener las decisiones que funcionaron y controlar la fatiga.',
    });
  }

  return insights;
}
