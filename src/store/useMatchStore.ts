import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { initialMatches, teamPools, upcomingFixtures, uruguayPlayers } from '../domain/mockData';
import { AppBackupData } from '../domain/backup';
import { getTeamPoolById, resolveMatchAvailablePlayers, uniquePlayerIds, validateMatchSetup } from '../domain/matchSetup';
import { normalizeOpponentName } from '../domain/opponent';
import { PERIOD_DURATION_SECONDS } from '../domain/periodStats';
import { applyPlayerUpdates, buildPlayer, CreatePlayerInput, UpdatePlayerInput } from '../domain/players';
import { replaceLineupSlotPlayer, swapLineupSlotPlayers } from '../domain/lineupSlots';
import { buildTeamPool, ensureDefaultTeamPool } from '../domain/teamPools';
import {
  CourtZone,
  ErrorType,
  Fixture,
  FrameSide,
  Match,
  MatchEvent,
  MatchPeriod,
  MatchPeriodState,
  Player,
  CourtLocation,
  TeamSide,
  TeamPool,
} from '../domain/types';
import { getCurrentLineup } from '../domain/stats';
import { appStorage, STORAGE_KEYS } from '../storage/asyncStorage';

type LiveEventAction = 'goal' | 'miss' | 'block' | 'fault' | 'turnover';
type TrackableErrorType = 'falta' | 'punto_en_contra';

export const STORE_DATA_VERSION = 8;

type MatchState = {
  players: Player[];
  teamPools: TeamPool[];
  matches: Match[];
  fixtures: Fixture[];
  activeMatchId?: string;
  createPlayer: (input: CreatePlayerInput) => string;
  updatePlayer: (playerId: string, updates: UpdatePlayerInput) => boolean;
  restoreBackupData: (backup: AppBackupData) => boolean;
  startMatch: (matchId: string) => void;
  createTeamPool: (name: string, playerIds: string[]) => string;
  updateTeamPool: (poolId: string, updates: { name?: string; playerIds?: string[] }) => boolean;
  createMatch: (input: {
    opponent?: string;
    venue?: string;
    startsAt?: string;
    teamPoolId?: string;
    teamPoolName?: string;
    availablePlayerIds?: string[];
    initialPlayerIds?: string[];
  }) => string;
  createDemoMatch: () => string;
  startCurrentPeriod: () => void;
  endCurrentPeriod: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  tickTimer: () => void;
  recordEvent: (input: {
    type: LiveEventAction;
    side: TeamSide;
    playerId?: string;
    zone?: CourtZone;
    frame?: FrameSide;
    landingLocation?: CourtLocation;
  }) => void;
  recordOpponentOwnPoint: () => void;
  recordDefense: (playerId: string) => void;
  recordOpponentDefense: (defenseLocation?: CourtLocation) => void;
  recordError: (playerId: string, errorType: TrackableErrorType) => void;
  substitutePlayer: (input: { playerInId: string; playerOutId?: string; slotIndex?: number }) => void;
  swapLineupPlayers: (input: { fromSlotIndex: number; toSlotIndex: number }) => void;
  undoLastEvent: () => void;
  advancePeriod: () => void;
  completeActiveMatch: () => void;
  cancelMatch: (matchId: string) => void;
  updateMatchNotes: (matchId: string, notes: string) => void;
  resetDemoData: () => void;
};

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const defaultZone: CourtZone = 'center';
const defaultFrame: FrameSide = 'right-frame';

const mergeDefaultPlayers = (players: Player[] | undefined) => {
  const playersById = new Map((players ?? []).map((player) => [player.id, player]));

  uruguayPlayers.forEach((player) => {
    if (!playersById.has(player.id)) {
      playersById.set(player.id, player);
    }
  });

  return Array.from(playersById.values());
};

const createInitialPeriods = (): MatchPeriodState[] => [
  {
    number: 1,
    status: 'not_started',
    durationSeconds: PERIOD_DURATION_SECONDS,
    remainingSeconds: PERIOD_DURATION_SECONDS,
    timerRunning: false,
    timerStatus: 'stopped',
    totalPausedMs: 0,
  },
  {
    number: 2,
    status: 'not_started',
    durationSeconds: PERIOD_DURATION_SECONDS,
    remainingSeconds: PERIOD_DURATION_SECONDS,
    timerRunning: false,
    timerStatus: 'stopped',
    totalPausedMs: 0,
  },
  {
    number: 3,
    status: 'not_started',
    durationSeconds: PERIOD_DURATION_SECONDS,
    remainingSeconds: PERIOD_DURATION_SECONDS,
    timerRunning: false,
    timerStatus: 'stopped',
    totalPausedMs: 0,
  },
];

const createDraftMatch = (input: {
  opponent?: string;
  players: Player[];
  startsAt?: string;
  venue?: string;
  teamPoolId?: string;
  teamPoolName?: string;
  availablePlayerIds?: string[];
  initialPlayerIds?: string[];
}): Match => {
  const matchId = `match-${createId()}`;
  const lineupId = `lineup-${createId()}`;
  const startsAt = input.startsAt ?? new Date().toISOString();
  const availablePlayerIds = uniquePlayerIds(input.availablePlayerIds ?? input.players.map((player) => player.id));
  const initialPlayerIds = uniquePlayerIds(input.initialPlayerIds ?? availablePlayerIds).slice(0, 7);

  return {
    id: matchId,
    opponent: normalizeOpponentName(input.opponent),
    teamPoolId: input.teamPoolId,
    teamPoolName: input.teamPoolName,
    availablePlayerIds,
    venue: input.venue?.trim() || 'Partido',
    startsAt,
    status: 'draft',
    currentPeriod: 1,
    periods: createInitialPeriods(),
    clock: { period: 1, secondsElapsed: 0 },
    lineupSnapshots: [
      {
        id: lineupId,
        matchId,
        team: 'uruguay',
        playerIds: initialPlayerIds,
        capturedAt: startsAt,
        clock: { period: 1, secondsElapsed: 0 },
      },
    ],
    events: [],
  };
};

const normalizeMatch = (match: Match): Match => ({
  ...match,
  opponent: normalizeOpponentName(match.opponent),
  availablePlayerIds: match.availablePlayerIds ? uniquePlayerIds(match.availablePlayerIds) : undefined,
  status: match.status === ('scheduled' as Match['status']) ? 'draft' : match.status,
  currentPeriod: match.currentPeriod ?? match.clock.period ?? 1,
  periods: (match.periods ?? createInitialPeriods()).map((period) => ({
    ...period,
    timerStatus: period.timerStatus ?? (period.timerRunning ? 'running' : period.status === 'live' ? 'paused' : 'stopped'),
    totalPausedMs: period.totalPausedMs ?? 0,
  })),
  events: match.events.map((event) => ({
    ...event,
    periodNumber: event.periodNumber ?? event.clock.period,
  })),
});

const getCurrentPeriod = (match: Match) =>
  match.periods.find((period) => period.number === match.currentPeriod);

const canRecordInMatch = (match: Match) =>
  match.status === 'live' && getCurrentPeriod(match)?.status === 'live';

const isPlayerOnCourt = (match: Match, playerId?: string) => {
  if (!playerId) {
    return false;
  }

  return Boolean(getCurrentLineup(match, 'uruguay')?.playerIds.includes(playerId));
};

const getPeriodRemainingSeconds = (period: MatchPeriodState, nowMs = Date.now()) => {
  if (!period.periodStartedAt) {
    return Math.max(period.remainingSeconds, 0);
  }

  const startedMs = new Date(period.periodStartedAt).getTime();
  const pausedMs = period.pausedAt ? new Date(period.pausedAt).getTime() : nowMs;
  const effectiveNowMs = period.timerStatus === 'paused' ? pausedMs : nowMs;
  const elapsedActiveMs = Math.max(effectiveNowMs - startedMs - (period.totalPausedMs ?? 0), 0);
  const remainingSeconds = period.durationSeconds - Math.floor(elapsedActiveMs / 1000);

  return Math.max(remainingSeconds, 0);
};

const stopPeriodTimer = (period: MatchPeriodState, nowIso = new Date().toISOString()): MatchPeriodState => ({
  ...period,
  remainingSeconds: getPeriodRemainingSeconds(period, new Date(nowIso).getTime()),
  timerRunning: false,
  timerStatus: 'stopped',
  pausedAt: undefined,
});

const getErrorType = (type: LiveEventAction): ErrorType => {
  switch (type) {
    case 'fault':
    default:
      return 'falta';
  }
};

export const useMatchStore = create<MatchState>()(
  persist(
    (set, get) => ({
      players: uruguayPlayers,
      teamPools: ensureDefaultTeamPool(teamPools, uruguayPlayers, teamPools),
      matches: initialMatches.map(normalizeMatch),
      fixtures: upcomingFixtures,
      activeMatchId: undefined,
      createPlayer: (input) => {
        const player = buildPlayer(input, get().players);

        if (!player) {
          return '';
        }

        set((state) => ({
          players: [...state.players, player],
          teamPools: ensureDefaultTeamPool(state.teamPools, [...state.players, player], teamPools),
        }));

        return player.id;
      },
      updatePlayer: (playerId, updates) => {
        const existingPlayer = get().players.find((player) => player.id === playerId);

        if (!existingPlayer) {
          return false;
        }

        const nextPlayer = applyPlayerUpdates(existingPlayer, updates);

        if (!nextPlayer) {
          return false;
        }

        set((state) => {
          const players = state.players.map((player) => (player.id === playerId ? nextPlayer : player));

          return {
            players,
            teamPools: ensureDefaultTeamPool(state.teamPools, players, teamPools),
          };
        });

        return true;
      },
      restoreBackupData: (backup) => {
        if (
          !backup?.data ||
          !Array.isArray(backup.data.players) ||
          !Array.isArray(backup.data.teamPools) ||
          !Array.isArray(backup.data.matches) ||
          !Array.isArray(backup.data.fixtures)
        ) {
          return false;
        }

        set(() => {
          const players = mergeDefaultPlayers(backup.data.players);

          return {
            players,
            teamPools: ensureDefaultTeamPool(backup.data.teamPools, players, teamPools),
            matches: backup.data.matches.map(normalizeMatch),
            fixtures: backup.data.fixtures ?? [],
            activeMatchId: undefined,
          };
        });

        return true;
      },
      startMatch: (matchId) =>
        set((state) => ({
          activeMatchId: state.matches.some((match) => match.id === matchId && !['finished', 'cancelled'].includes(normalizeMatch(match).status))
            ? matchId
            : state.activeMatchId,
          matches: state.matches.map((match) => {
            if (match.id !== matchId) {
              return match;
            }

            const normalized = normalizeMatch(match);

            if (normalized.status === 'finished' || normalized.status === 'cancelled') {
              return normalized;
            }

            return { ...normalized, status: 'live' };
          }),
        })),
      createTeamPool: (name, playerIds) => {
        const pool = buildTeamPool({
          id: `team-pool-${createId()}`,
          name,
          playerIds,
          players: get().players,
        });

        if (!pool) {
          return '';
        }

        set((state) => ({
          teamPools: ensureDefaultTeamPool([...state.teamPools, pool], state.players, teamPools),
        }));

        return pool.id;
      },
      updateTeamPool: (poolId, updates) => {
        const existingPool = get().teamPools.find((pool) => pool.id === poolId);

        if (!existingPool) {
          return false;
        }

        const nextPool = buildTeamPool({
          id: existingPool.id,
          name: updates.name ?? existingPool.name,
          playerIds: updates.playerIds ?? existingPool.playerIds,
          players: get().players,
        });

        if (!nextPool) {
          return false;
        }

        set((state) => ({
          teamPools: ensureDefaultTeamPool(
            state.teamPools.map((pool) => (pool.id === poolId ? nextPool : pool)),
            state.players,
            teamPools,
          ),
        }));

        return true;
      },
      createMatch: (input) => {
        const teamPool = getTeamPoolById(get().teamPools, input.teamPoolId);
        const availablePlayerIds = uniquePlayerIds(input.availablePlayerIds ?? teamPool?.playerIds ?? get().players.map((player) => player.id));
        const initialPlayerIds = uniquePlayerIds(input.initialPlayerIds);
        const validation = validateMatchSetup({ availablePlayerIds, initialPlayerIds });

        if (!validation.valid) {
          return '';
        }

        const match = createDraftMatch({
          opponent: input.opponent,
          venue: input.venue,
          startsAt: input.startsAt,
          teamPoolId: input.teamPoolId ?? teamPool?.id,
          teamPoolName: input.teamPoolName ?? teamPool?.name,
          availablePlayerIds,
          initialPlayerIds,
          players: get().players,
        });

        set((state) => ({
          activeMatchId: match.id,
          matches: [match, ...state.matches],
        }));

        return match.id;
      },
      createDemoMatch: () => {
        const defaultPool = getTeamPoolById(ensureDefaultTeamPool(get().teamPools, get().players, teamPools), 'mayores');
        const match = createDraftMatch({
          opponent: 'Argentina',
          venue: 'Partido demo',
          teamPoolId: 'mayores',
          teamPoolName: 'Mayores',
          availablePlayerIds: defaultPool.playerIds,
          initialPlayerIds: defaultPool.playerIds.slice(0, 7),
          players: get().players,
        });

        set((state) => ({
          activeMatchId: match.id,
          matches: [match, ...state.matches],
        }));

        return match.id;
      },
      startCurrentPeriod: () => {
        const { activeMatchId } = get();
        const nowIso = new Date().toISOString();

        if (!activeMatchId) {
          return;
        }

        set((state) => ({
          matches: state.matches.map((match) => {
            if (match.id !== activeMatchId) {
              return match;
            }

            const normalized = normalizeMatch(match);

            if (normalized.status === 'finished' || normalized.status === 'cancelled') {
              return normalized;
            }

            return {
              ...normalized,
              status: 'live',
              clock: { ...normalized.clock, period: normalized.currentPeriod, secondsElapsed: 0 },
              periods: normalized.periods.map((period) =>
                period.number === normalized.currentPeriod
                  ? {
                      ...period,
                      status: 'live',
                      remainingSeconds: period.status === 'not_started' ? period.durationSeconds : period.remainingSeconds,
                      timerRunning: true,
                      timerStatus: 'running',
                      periodStartedAt: period.periodStartedAt ?? nowIso,
                      startedAt: period.startedAt ?? nowIso,
                      pausedAt: undefined,
                      totalPausedMs: period.status === 'not_started' ? 0 : period.totalPausedMs ?? 0,
                    }
                  : period,
              ),
            };
          }),
        }));
      },
      endCurrentPeriod: () => {
        const { activeMatchId } = get();
        const nowIso = new Date().toISOString();

        if (!activeMatchId) {
          return;
        }

        set((state) => ({
          matches: state.matches.map((match) => {
            if (match.id !== activeMatchId) {
              return match;
            }

            const normalized = normalizeMatch(match);

            if (normalized.status !== 'live' || getCurrentPeriod(normalized)?.status !== 'live') {
              return normalized;
            }

            return {
              ...normalized,
              status: 'period_break',
              periods: normalized.periods.map((period) =>
                period.number === normalized.currentPeriod
                  ? { ...stopPeriodTimer(period, nowIso), status: 'finished', finishedAt: nowIso }
                  : period,
              ),
            };
          }),
        }));
      },
      pauseTimer: () => {
        const { activeMatchId } = get();
        const nowIso = new Date().toISOString();
        const nowMs = new Date(nowIso).getTime();

        if (!activeMatchId) {
          return;
        }

        set((state) => ({
          matches: state.matches.map((match) =>
            match.id === activeMatchId && normalizeMatch(match).status === 'live'
              ? {
                  ...normalizeMatch(match),
                  periods: normalizeMatch(match).periods.map((period) =>
                    period.number === normalizeMatch(match).currentPeriod && period.status === 'live' && period.timerStatus === 'running'
                      ? {
                          ...period,
                          remainingSeconds: getPeriodRemainingSeconds(period, nowMs),
                          timerRunning: false,
                          timerStatus: 'paused',
                          pausedAt: nowIso,
                        }
                      : period,
                  ),
                }
              : match,
          ),
        }));
      },
      resumeTimer: () => {
        const { activeMatchId } = get();
        const nowIso = new Date().toISOString();
        const nowMs = new Date(nowIso).getTime();

        if (!activeMatchId) {
          return;
        }

        set((state) => ({
          matches: state.matches.map((match) =>
            match.id === activeMatchId && normalizeMatch(match).status === 'live'
              ? {
                  ...normalizeMatch(match),
                  periods: normalizeMatch(match).periods.map((period) =>
                    period.number === normalizeMatch(match).currentPeriod && period.status === 'live' && period.timerStatus === 'paused'
                      ? {
                          ...period,
                          timerRunning: true,
                          timerStatus: 'running',
                          totalPausedMs: (period.totalPausedMs ?? 0) + (period.pausedAt ? nowMs - new Date(period.pausedAt).getTime() : 0),
                          pausedAt: undefined,
                        }
                      : period,
                  ),
                }
              : match,
          ),
        }));
      },
      tickTimer: () => {
        const { activeMatchId } = get();
        const nowMs = Date.now();

        if (!activeMatchId) {
          return;
        }

        set((state) => ({
          matches: state.matches.map((match) => {
            if (match.id !== activeMatchId) {
              return match;
            }

            const normalized = normalizeMatch(match);

            if (normalized.status !== 'live') {
              return normalized;
            }

            return {
              ...normalized,
              periods: normalized.periods.map((period) =>
                period.number === normalized.currentPeriod && period.status === 'live' && period.timerStatus === 'running'
                  ? {
                      ...period,
                      remainingSeconds: getPeriodRemainingSeconds(period, nowMs),
                      timerRunning: getPeriodRemainingSeconds(period, nowMs) > 0,
                      timerStatus: getPeriodRemainingSeconds(period, nowMs) > 0 ? 'running' : 'stopped',
                    }
                  : period,
              ),
            };
          }),
        }));
      },
      recordEvent: ({ type, side, playerId, zone = defaultZone, frame = defaultFrame, landingLocation }) => {
        const { activeMatchId } = get();

        if (!activeMatchId) {
          return;
        }

        set((state) => ({
          matches: state.matches.map((match) => {
            const normalized = normalizeMatch(match);

            if (normalized.id !== activeMatchId || !canRecordInMatch(normalized)) {
              return match;
            }

            if (type === 'goal' && !landingLocation) {
              return match;
            }

            if (type === 'goal' && side === 'uruguay' && !isPlayerOnCourt(normalized, playerId)) {
              return match;
            }

            if (type !== 'goal' && !isPlayerOnCourt(normalized, playerId)) {
              return match;
            }

            const lineupSnapshotId = getCurrentLineup(normalized, 'uruguay')?.id;
            const baseEvent = {
              id: createId(),
              matchId: normalized.id,
              periodNumber: normalized.currentPeriod,
              timestamp: new Date().toISOString(),
              clock: { ...normalized.clock, period: normalized.currentPeriod },
              lineupSnapshotId,
            };
            const event: MatchEvent =
              type === 'goal'
                ? {
                    ...baseEvent,
                    kind: 'point',
                    scoringTeam: side,
                    playerId,
                    landingLocation,
                    zone,
                    frame,
                    pointSource: 'attack',
                  }
                : {
                    ...baseEvent,
                    kind: 'error',
                    team: side,
                    playerId,
                    errorType: getErrorType(type),
                    pointAwardedTo: getErrorType(type) === 'punto_en_contra' ? 'opponent' : undefined,
                  };

            return {
              ...normalized,
              events: [event, ...normalized.events],
            };
          }),
        }));
      },
      recordOpponentOwnPoint: () => {
        const { activeMatchId } = get();

        if (!activeMatchId) {
          return;
        }

        set((state) => ({
          matches: state.matches.map((match) => {
            const normalized = normalizeMatch(match);

            if (normalized.id !== activeMatchId || !canRecordInMatch(normalized)) {
              return match;
            }

            const event: MatchEvent = {
              id: createId(),
              matchId: normalized.id,
              periodNumber: normalized.currentPeriod,
              timestamp: new Date().toISOString(),
              clock: { ...normalized.clock, period: normalized.currentPeriod },
              lineupSnapshotId: getCurrentLineup(normalized, 'uruguay')?.id,
              kind: 'point',
              scoringTeam: 'uruguay',
              zone: defaultZone,
              frame: defaultFrame,
              pointSource: 'opponent_own_point',
            };

            return {
              ...normalized,
              events: [event, ...normalized.events],
            };
          }),
        }));
      },
      recordDefense: (playerId) => {
        const { activeMatchId } = get();

        if (!activeMatchId) {
          return;
        }

        set((state) => ({
          matches: state.matches.map((match) => {
            const normalized = normalizeMatch(match);

            if (normalized.id !== activeMatchId || !canRecordInMatch(normalized) || !isPlayerOnCourt(normalized, playerId)) {
              return match;
            }

            const event: MatchEvent = {
              id: createId(),
              matchId: normalized.id,
              periodNumber: normalized.currentPeriod,
              timestamp: new Date().toISOString(),
              clock: { ...normalized.clock, period: normalized.currentPeriod },
              lineupSnapshotId: getCurrentLineup(normalized, 'uruguay')?.id,
              kind: 'defense',
              team: 'uruguay',
              playerId,
            };

            return {
              ...normalized,
              events: [event, ...normalized.events],
            };
          }),
        }));
      },
      recordOpponentDefense: (defenseLocation) => {
        const { activeMatchId } = get();

        if (!activeMatchId || !defenseLocation) {
          return;
        }

        set((state) => ({
          matches: state.matches.map((match) => {
            const normalized = normalizeMatch(match);

            if (normalized.id !== activeMatchId || !canRecordInMatch(normalized)) {
              return match;
            }

            const event: MatchEvent = {
              id: createId(),
              matchId: normalized.id,
              periodNumber: normalized.currentPeriod,
              timestamp: new Date().toISOString(),
              clock: { ...normalized.clock, period: normalized.currentPeriod },
              lineupSnapshotId: getCurrentLineup(normalized, 'uruguay')?.id,
              kind: 'opponent_defense',
              team: 'opponent',
              defenseLocation,
            };

            return {
              ...normalized,
              events: [event, ...normalized.events],
            };
          }),
        }));
      },
      recordError: (playerId, errorType) => {
        const { activeMatchId } = get();

        if (!activeMatchId) {
          return;
        }

        set((state) => ({
          matches: state.matches.map((match) => {
            const normalized = normalizeMatch(match);

            if (normalized.id !== activeMatchId || !canRecordInMatch(normalized) || !isPlayerOnCourt(normalized, playerId)) {
              return match;
            }

            const event: MatchEvent = {
              id: createId(),
              matchId: normalized.id,
              periodNumber: normalized.currentPeriod,
              timestamp: new Date().toISOString(),
              clock: { ...normalized.clock, period: normalized.currentPeriod },
              lineupSnapshotId: getCurrentLineup(normalized, 'uruguay')?.id,
              kind: 'error',
              team: 'uruguay',
              playerId,
              errorType,
              pointAwardedTo: errorType === 'punto_en_contra' ? 'opponent' : undefined,
            };

            return {
              ...normalized,
              events: [event, ...normalized.events],
            };
          }),
        }));
      },
      substitutePlayer: ({ playerOutId, playerInId, slotIndex }) => {
        const { activeMatchId } = get();

        if (!activeMatchId) {
          return;
        }

        set((state) => ({
          matches: state.matches.map((match) => {
            const normalized = normalizeMatch(match);

            if (normalized.id !== activeMatchId || !canRecordInMatch(normalized)) {
              return match;
            }

            const currentLineup = getCurrentLineup(normalized, 'uruguay');

            if (!currentLineup) {
              return match;
            }

            const targetSlotIndex = slotIndex ?? currentLineup.playerIds.findIndex((id) => id === playerOutId);

            if (targetSlotIndex < 0 || targetSlotIndex >= 7) {
              return match;
            }

            const currentPlayerOutId = currentLineup.playerIds[targetSlotIndex];

            if (currentPlayerOutId === playerInId || currentLineup.playerIds.includes(playerInId)) {
              return match;
            }

            if (!resolveMatchAvailablePlayers(normalized, state.players).some((player) => player.id === playerInId)) {
              return match;
            }

            const nextLineupId = createId();
            const nextLineup = {
              ...currentLineup,
              id: nextLineupId,
              capturedAt: new Date().toISOString(),
              clock: { ...normalized.clock, period: normalized.currentPeriod },
              playerIds: replaceLineupSlotPlayer(currentLineup.playerIds, targetSlotIndex, playerInId),
            };
            const event: MatchEvent = {
              id: createId(),
              matchId: normalized.id,
              periodNumber: normalized.currentPeriod,
              kind: 'substitution',
              team: 'uruguay',
              playerOutId: currentPlayerOutId || playerOutId,
              playerInId,
              lineupSnapshotId: nextLineupId,
              timestamp: nextLineup.capturedAt,
              clock: { ...normalized.clock, period: normalized.currentPeriod },
            };

            return {
              ...normalized,
              lineupSnapshots: [...normalized.lineupSnapshots, nextLineup],
              events: [event, ...normalized.events],
            };
          }),
        }));
      },
      swapLineupPlayers: ({ fromSlotIndex, toSlotIndex }) => {
        const { activeMatchId } = get();

        if (!activeMatchId) {
          return;
        }

        set((state) => ({
          matches: state.matches.map((match) => {
            const normalized = normalizeMatch(match);

            if (normalized.id !== activeMatchId || !canRecordInMatch(normalized)) {
              return match;
            }

            const currentLineup = getCurrentLineup(normalized, 'uruguay');

            if (!currentLineup) {
              return match;
            }

            if (
              fromSlotIndex < 0 ||
              toSlotIndex < 0 ||
              fromSlotIndex >= 7 ||
              toSlotIndex >= 7 ||
              fromSlotIndex === toSlotIndex
            ) {
              return match;
            }

            const playerAId = currentLineup.playerIds[fromSlotIndex];
            const playerBId = currentLineup.playerIds[toSlotIndex];

            if (!playerAId || !playerBId) {
              return match;
            }

            const nextLineupId = createId();
            const capturedAt = new Date().toISOString();
            const nextLineup = {
              ...currentLineup,
              id: nextLineupId,
              capturedAt,
              clock: { ...normalized.clock, period: normalized.currentPeriod },
              playerIds: swapLineupSlotPlayers(currentLineup.playerIds, fromSlotIndex, toSlotIndex),
            };
            const event: MatchEvent = {
              id: createId(),
              matchId: normalized.id,
              periodNumber: normalized.currentPeriod,
              kind: 'lineup_swap',
              team: 'uruguay',
              playerAId,
              playerBId,
              fromSlotIndex,
              toSlotIndex,
              lineupSnapshotId: nextLineupId,
              timestamp: capturedAt,
              clock: { ...normalized.clock, period: normalized.currentPeriod },
            };

            return {
              ...normalized,
              lineupSnapshots: [...normalized.lineupSnapshots, nextLineup],
              events: [event, ...normalized.events],
            };
          }),
        }));
      },
      undoLastEvent: () => {
        const { activeMatchId } = get();

        if (!activeMatchId) {
          return;
        }

        set((state) => ({
          matches: state.matches.map((match) => {
            const normalized = normalizeMatch(match);

            if (normalized.id !== activeMatchId || normalized.events.length === 0) {
              return match;
            }

            const [eventToUndo, ...remainingEvents] = normalized.events;
            const lineupSnapshots =
              eventToUndo.kind === 'substitution' || eventToUndo.kind === 'lineup_swap'
                ? normalized.lineupSnapshots.filter((lineup) => lineup.id !== eventToUndo.lineupSnapshotId)
                : normalized.lineupSnapshots;

            return {
              ...normalized,
              events: remainingEvents,
              lineupSnapshots,
            };
          }),
        }));
      },
      advancePeriod: () => {
        const { activeMatchId } = get();

        if (!activeMatchId) {
          return;
        }

        set((state) => ({
          matches: state.matches.map((match) =>
            normalizeMatch(match).id === activeMatchId
              ? {
                  ...normalizeMatch(match),
                  status: 'period_break',
                  currentPeriod: Math.min(normalizeMatch(match).currentPeriod + 1, 3) as MatchPeriod,
                  clock: {
                    period: Math.min(normalizeMatch(match).currentPeriod + 1, 3) as 1 | 2 | 3,
                    secondsElapsed: 0,
                  },
                }
              : match,
          ),
        }));
      },
      completeActiveMatch: () => {
        const { activeMatchId } = get();
        const nowIso = new Date().toISOString();

        if (!activeMatchId) {
          return;
        }

        set((state) => ({
          activeMatchId: undefined,
          matches: state.matches.map((match) =>
            match.id === activeMatchId
              ? {
                  ...normalizeMatch(match),
                  status: 'finished',
                  periods: normalizeMatch(match).periods.map((period) => stopPeriodTimer(period, nowIso)),
                }
              : match,
          ),
        }));
      },
      cancelMatch: (matchId) =>
        set((state) => {
          const nowIso = new Date().toISOString();

          return {
            activeMatchId: state.activeMatchId === matchId ? undefined : state.activeMatchId,
            matches: state.matches
              .map((match) => {
                if (match.id !== matchId) {
                  return match;
                }

                const normalized = normalizeMatch(match);

                if (normalized.status === 'draft') {
                  return undefined;
                }

                return {
                  ...normalized,
                  status: 'cancelled' as const,
                  events: [],
                  periods: normalized.periods.map((period) => stopPeriodTimer(period, nowIso)),
                };
              })
              .filter((match): match is Match => Boolean(match)),
          };
        }),
      updateMatchNotes: (matchId, notes) =>
        set((state) => ({
          matches: state.matches.map((match) => (match.id === matchId ? { ...normalizeMatch(match), notes } : match)),
        })),
      resetDemoData: () =>
        set((state) => {
          const players = mergeDefaultPlayers(state.players);

          return {
            players,
            teamPools: ensureDefaultTeamPool(state.teamPools, players, teamPools),
            matches: initialMatches.map(normalizeMatch),
            fixtures: upcomingFixtures,
            activeMatchId: undefined,
          };
        }),
    }),
    {
      name: STORAGE_KEYS.appState,
      version: STORE_DATA_VERSION,
      migrate: (persistedState) => {
        const state = persistedState as MatchState;
        const players = mergeDefaultPlayers(state.players);

        return {
          ...state,
          players,
          teamPools: ensureDefaultTeamPool(state.teamPools, players, teamPools),
          fixtures: state.fixtures?.length ? state.fixtures : upcomingFixtures,
          matches: state.matches?.map(normalizeMatch) ?? initialMatches.map(normalizeMatch),
        };
      },
      storage: createJSONStorage(() => appStorage),
    },
  ),
);
