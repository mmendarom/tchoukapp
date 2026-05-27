import {
  CourtZone,
  ErrorEvent,
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

const getScoringTeam = (event: MatchEvent): TeamSide | undefined => {
  if (isPointEvent(event)) {
    return event.scoringTeam;
  }

  if (isErrorEvent(event)) {
    return event.pointAwardedTo;
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
    if (event.team !== 'uruguay' || !event.playerId) {
      return;
    }

    totals.set(event.playerId, (totals.get(event.playerId) ?? 0) + 1);
  });

  return sortByTotalDesc(Array.from(totals, ([playerId, total]) => ({ playerId, total })));
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
