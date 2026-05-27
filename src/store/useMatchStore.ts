import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { initialMatches, upcomingFixtures, uruguayPlayers } from '../domain/mockData';
import { PERIOD_DURATION_SECONDS } from '../domain/periodStats';
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
} from '../domain/types';
import { getCurrentLineup } from '../domain/stats';
import { appStorage, STORAGE_KEYS } from '../storage/asyncStorage';

type LiveEventAction = 'goal' | 'miss' | 'block' | 'fault' | 'turnover';

type MatchState = {
  players: Player[];
  matches: Match[];
  fixtures: Fixture[];
  activeMatchId?: string;
  startMatch: (matchId: string) => void;
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
  substitutePlayer: (input: { playerOutId: string; playerInId: string }) => void;
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

const normalizeMatch = (match: Match): Match => ({
  ...match,
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
    case 'miss':
      return 'missed-frame';
    case 'block':
      return 'defensive-block';
    case 'turnover':
      return 'turnover';
    case 'fault':
    default:
      return 'other';
  }
};

export const useMatchStore = create<MatchState>()(
  persist(
    (set, get) => ({
      players: uruguayPlayers,
      matches: initialMatches.map(normalizeMatch),
      fixtures: upcomingFixtures,
      activeMatchId: undefined,
      startMatch: (matchId) =>
        set((state) => ({
          activeMatchId: matchId,
          matches: state.matches.map((match) =>
            match.id === matchId ? { ...normalizeMatch(match), status: 'live' } : match,
          ),
        })),
      createDemoMatch: () => {
        const matchId = `match-${createId()}`;
        const lineupId = `lineup-${createId()}`;
        const match: Match = {
          id: matchId,
          opponent: 'Argentina',
          venue: 'Partido demo',
          startsAt: new Date().toISOString(),
          status: 'draft',
          currentPeriod: 1,
          periods: createInitialPeriods(),
          clock: { period: 1, secondsElapsed: 0 },
          lineupSnapshots: [
            {
              id: lineupId,
              matchId,
              team: 'uruguay',
              playerIds: uruguayPlayers.slice(0, 7).map((player) => player.id),
              capturedAt: new Date().toISOString(),
              clock: { period: 1, secondsElapsed: 0 },
            },
          ],
          events: [],
        };

        set((state) => ({
          activeMatchId: matchId,
          matches: [match, ...state.matches],
        }));

        return matchId;
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
                    zone,
                    frame,
                    errorType: getErrorType(type),
                    pointAwardedTo: undefined,
                  };

            return {
              ...normalized,
              events: [event, ...normalized.events],
            };
          }),
        }));
      },
      substitutePlayer: ({ playerOutId, playerInId }) => {
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

            const nextLineupId = createId();
            const nextLineup = {
              ...currentLineup,
              id: nextLineupId,
              capturedAt: new Date().toISOString(),
              clock: { ...normalized.clock, period: normalized.currentPeriod },
              playerIds: currentLineup.playerIds.map((id) => (id === playerOutId ? playerInId : id)),
            };
            const event: MatchEvent = {
              id: createId(),
              matchId: normalized.id,
              periodNumber: normalized.currentPeriod,
              kind: 'substitution',
              team: 'uruguay',
              playerOutId,
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
              eventToUndo.kind === 'substitution'
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
        set({
          players: uruguayPlayers,
          matches: initialMatches.map(normalizeMatch),
          fixtures: upcomingFixtures,
          activeMatchId: undefined,
        }),
    }),
    {
      name: STORAGE_KEYS.appState,
      version: 3,
      migrate: (persistedState) => {
        const state = persistedState as MatchState;
        return {
          ...state,
          matches: state.matches?.map(normalizeMatch) ?? initialMatches.map(normalizeMatch),
        };
      },
      storage: createJSONStorage(() => appStorage),
    },
  ),
);
