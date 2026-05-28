import {
  CourtZone,
  DefenseEvent,
  ErrorEvent,
  ErrorType,
  LineupSnapshot,
  Match,
  MatchEvent,
  PointEvent,
  Score,
  TeamSide,
} from './types';

export type PlayerStat = {
  playerId: string;
  total: number;
};

export type PlayerErrorSummary = {
  playerId: string;
  faltas: number;
  puntosEnContra: number;
  total: number;
};

export type ZoneStat = {
  zone: CourtZone;
  total: number;
};

export type LineupPlusMinus = {
  lineupSnapshotId: string;
  playerIds: string[];
  pointsFor: number;
  pointsAgainst: number;
  plusMinus: number;
};

const isPointEvent = (event: MatchEvent): event is PointEvent => event.kind === 'point';

const isErrorEvent = (event: MatchEvent): event is ErrorEvent => event.kind === 'error';

const isDefenseEvent = (event: MatchEvent): event is DefenseEvent => event.kind === 'defense';

export const isTrackedErrorType = (errorType: ErrorType | string | undefined): errorType is 'falta' | 'punto_en_contra' =>
  errorType === 'falta' || errorType === 'punto_en_contra';

const getScoringTeam = (event: MatchEvent): TeamSide | undefined => {
  if (isPointEvent(event)) {
    return event.scoringTeam;
  }

  if (isErrorEvent(event) && event.team === 'uruguay' && event.errorType === 'punto_en_contra') {
    return 'opponent';
  }

  return undefined;
};

const emptyScore = (): Score => ({
  uruguay: 0,
  opponent: 0,
});

const sortByTotalDesc = <T extends { total: number }>(items: T[]) =>
  [...items].sort((a, b) => b.total - a.total);

export function calculateScore(events: MatchEvent[]): Score {
  return events.reduce((score, event) => {
    const scoringTeam = getScoringTeam(event);

    if (scoringTeam) {
      return {
        ...score,
        [scoringTeam]: score[scoringTeam] + 1,
      };
    }

    return score;
  }, emptyScore());
}

export function getTopScorers(events: MatchEvent[], limit = 5): PlayerStat[] {
  const totals = new Map<string, number>();

  events.filter(isPointEvent).forEach((event) => {
    if (event.scoringTeam !== 'uruguay' || !event.playerId) {
      return;
    }

    totals.set(event.playerId, (totals.get(event.playerId) ?? 0) + 1);
  });

  return sortByTotalDesc(
    Array.from(totals, ([playerId, total]) => ({ playerId, total })),
  ).slice(0, limit);
}

export function getErrorsByPlayer(events: MatchEvent[]): PlayerStat[] {
  const totals = new Map<string, number>();

  events.filter(isErrorEvent).forEach((event) => {
    if (event.team !== 'uruguay' || !event.playerId || !isTrackedErrorType(event.errorType)) {
      return;
    }

    totals.set(event.playerId, (totals.get(event.playerId) ?? 0) + 1);
  });

  return sortByTotalDesc(Array.from(totals, ([playerId, total]) => ({ playerId, total })));
}

export function getDefensesByPlayer(events: MatchEvent[]): PlayerStat[] {
  const totals = new Map<string, number>();

  events.filter(isDefenseEvent).forEach((event) => {
    totals.set(event.playerId, (totals.get(event.playerId) ?? 0) + 1);
  });

  return sortByTotalDesc(Array.from(totals, ([playerId, total]) => ({ playerId, total })));
}

export function getErrorsByTypeByPlayer(events: MatchEvent[]): PlayerErrorSummary[] {
  const totals = new Map<string, PlayerErrorSummary>();

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

  return sortByTotalDesc(Array.from(totals.values()));
}

export function getPlayerErrorSummary(events: MatchEvent[]) {
  return getErrorsByTypeByPlayer(events);
}

export function getPointsByZone(events: MatchEvent[], team: TeamSide = 'uruguay'): ZoneStat[] {
  const totals = new Map<CourtZone, number>();

  events.filter(isPointEvent).forEach((event) => {
    if (event.scoringTeam !== team) {
      return;
    }

    totals.set(event.zone, (totals.get(event.zone) ?? 0) + 1);
  });

  return sortByTotalDesc(Array.from(totals, ([zone, total]) => ({ zone, total })));
}

export function getOpponentPointsByZone(events: MatchEvent[]): ZoneStat[] {
  return getPointsByZone(events, 'opponent');
}

export function getPlusMinusByLineup(match: Match, team: TeamSide = 'uruguay'): LineupPlusMinus[] {
  const lineups = match.lineupSnapshots.filter((lineup) => lineup.team === team);

  return lineups.map((lineup) => {
    const scoringEvents = match.events.filter((event) => getScoringTeam(event) && event.lineupSnapshotId === lineup.id);
    const pointsFor = scoringEvents.filter((event) => getScoringTeam(event) === team).length;
    const pointsAgainst = scoringEvents.filter((event) => getScoringTeam(event) !== team).length;

    return {
      lineupSnapshotId: lineup.id,
      playerIds: lineup.playerIds,
      pointsFor,
      pointsAgainst,
      plusMinus: pointsFor - pointsAgainst,
    };
  });
}

export function getCurrentLineup(match: Match, team: TeamSide = 'uruguay'): LineupSnapshot | undefined {
  return [...match.lineupSnapshots].reverse().find((lineup) => lineup.team === team);
}
