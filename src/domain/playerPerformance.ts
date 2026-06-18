import { DefenseEvent, MatchEvent, MatchPeriod, OpponentDefenseEvent, Player, PointEvent } from './types';

export type PlayerPerformanceRow = {
  playerId: string;
  playerName: string;
  points: number;
  pointShare: number;
  rivalDefensesAgainst: number;
  shotAttempts: number;
  effectiveness: number | undefined;
  defenses: number;
  defenseShare: number;
};

export type PlayerPerformanceData = {
  rows: PlayerPerformanceRow[];
  totalTeamPoints: number;
  totalTeamDefenses: number;
};

const isPointEvent = (event: MatchEvent): event is PointEvent => event.kind === 'point';
const isDefenseEvent = (event: MatchEvent): event is DefenseEvent => event.kind === 'defense';
const isOpponentDefenseEvent = (event: MatchEvent): event is OpponentDefenseEvent => event.kind === 'opponent_defense';
const getEventPeriod = (event: MatchEvent): MatchPeriod => event.periodNumber ?? event.clock.period;

const getPlayerLabel = (players: Player[], playerId: string) => {
  const player = players.find((item) => item.id === playerId);

  if (!player) {
    return playerId;
  }

  return `#${player.number} ${player.lastName || player.firstName}`.trim();
};

const getNormalUruguayPointPlayerId = (event: MatchEvent) => {
  if (!isPointEvent(event) || event.scoringTeam !== 'uruguay' || event.pointSource === 'opponent_own_point') {
    return undefined;
  }

  return event.playerId;
};

const getUruguayDefensePlayerId = (event: MatchEvent) => {
  if (!isDefenseEvent(event) || event.team !== 'uruguay') {
    return undefined;
  }

  return event.playerId;
};

const getOpponentDefenseShooterId = (event: MatchEvent) => {
  if (!isOpponentDefenseEvent(event) || event.team !== 'opponent') {
    return undefined;
  }

  return event.playerId;
};

const increment = (totals: Map<string, number>, playerId: string | undefined) => {
  if (!playerId) {
    return;
  }

  totals.set(playerId, (totals.get(playerId) ?? 0) + 1);
};

const uniqueIds = (ids: Array<string | undefined>) => {
  const seen = new Set<string>();
  const result: string[] = [];

  ids.forEach((id) => {
    if (!id || seen.has(id)) {
      return;
    }

    seen.add(id);
    result.push(id);
  });

  return result;
};

export function buildPlayerPerformance(
  events: MatchEvent[],
  players: Player[],
  includedPlayerIds: string[] = [],
): PlayerPerformanceData {
  const pointsByPlayer = new Map<string, number>();
  const defensesByPlayer = new Map<string, number>();
  const rivalDefensesByPlayer = new Map<string, number>();

  events.forEach((event) => {
    increment(pointsByPlayer, getNormalUruguayPointPlayerId(event));
    increment(defensesByPlayer, getUruguayDefensePlayerId(event));
    increment(rivalDefensesByPlayer, getOpponentDefenseShooterId(event));
  });

  const totalTeamPoints = Array.from(pointsByPlayer.values()).reduce((sum, total) => sum + total, 0);
  const totalTeamDefenses = Array.from(defensesByPlayer.values()).reduce((sum, total) => sum + total, 0);
  const statPlayerIds = uniqueIds([
    ...players.map((player) => player.id).filter((playerId) => pointsByPlayer.has(playerId) || defensesByPlayer.has(playerId) || rivalDefensesByPlayer.has(playerId)),
    ...Array.from(pointsByPlayer.keys()),
    ...Array.from(defensesByPlayer.keys()),
    ...Array.from(rivalDefensesByPlayer.keys()),
  ]);
  const rowPlayerIds = uniqueIds([...includedPlayerIds, ...statPlayerIds]);

  return {
    totalTeamPoints,
    totalTeamDefenses,
    rows: rowPlayerIds.map((playerId) => {
      const points = pointsByPlayer.get(playerId) ?? 0;
      const defenses = defensesByPlayer.get(playerId) ?? 0;
      const rivalDefensesAgainst = rivalDefensesByPlayer.get(playerId) ?? 0;
      const shotAttempts = points + rivalDefensesAgainst;

      return {
        playerId,
        playerName: getPlayerLabel(players, playerId),
        points,
        pointShare: totalTeamPoints > 0 ? points / totalTeamPoints : 0,
        rivalDefensesAgainst,
        shotAttempts,
        effectiveness: shotAttempts > 0 ? points / shotAttempts : undefined,
        defenses,
        defenseShare: totalTeamDefenses > 0 ? defenses / totalTeamDefenses : 0,
      };
    }),
  };
}

export function buildPlayerPerformanceForPeriod(
  events: MatchEvent[],
  players: Player[],
  lineupPlayerIds: string[] = [],
  periodNumber: MatchPeriod,
) {
  return buildPlayerPerformance(
    events.filter((event) => getEventPeriod(event) === periodNumber),
    players,
    lineupPlayerIds,
  );
}

export function buildLivePlayerPerformance(
  events: MatchEvent[],
  players: Player[],
  currentLineupPlayerIds: string[],
  currentPeriod: MatchPeriod,
) {
  return buildPlayerPerformanceForPeriod(events, players, currentLineupPlayerIds, currentPeriod);
}
