import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  buildStatsMatchSettings,
  createStatsMatchPeriods,
  getOpposingStatsTeamId,
  getStatsMatchScore,
  isPlayerInStatsTeam,
  isStatsMatchClosed,
  normalizeStatsTeam,
  STATS_MATCH_STORE_DATA_VERSION,
  StatsMatch,
  StatsMatchEvent,
  StatsMatchEventKind,
  StatsMatchSettings,
  StatsTeam,
  statsEventRequiresPlayer,
  validateStatsMatchSetup,
} from '../domain/statsMatch';
import { CourtLocation } from '../domain/types';
import { appStorage, STORAGE_KEYS } from '../storage/asyncStorage';

type CreateStatsTeamInput = {
  id?: string;
  name: string;
  category?: string;
  playerIds: string[];
};

type CreateStatsMatchInput = {
  homeTeam: CreateStatsTeamInput;
  awayTeam: CreateStatsTeamInput;
  settings?: Partial<StatsMatchSettings>;
};

type UpdateStatsMatchSetupInput = {
  homeTeam: CreateStatsTeamInput;
  awayTeam: CreateStatsTeamInput;
  settings?: Partial<StatsMatchSettings>;
};

type StatsMatchEventInput = {
  kind: StatsMatchEventKind;
  teamId: string;
  playerId?: string;
  location?: CourtLocation;
  defenderPlayerId?: string;
  defendingTeamId?: string;
  errorSubtype?: StatsMatchEvent['errorSubtype'];
};

type StatsMatchState = {
  hasHydrated: boolean;
  statsMatches: StatsMatch[];
  activeStatsMatchId?: string;
  setHasHydrated: (hasHydrated: boolean) => void;
  createStatsMatch: (input: CreateStatsMatchInput) => string;
  updateStatsMatchSetup: (id: string, input: UpdateStatsMatchSetupInput) => boolean;
  startStatsMatch: (id: string) => boolean;
  startNextStatsPeriod: (id: string) => boolean;
  finishStatsPeriod: (id: string) => boolean;
  recordStatsEvent: (id: string, input: StatsMatchEventInput) => boolean;
  undoLastStatsEvent: (id: string) => boolean;
  finishStatsMatch: (id: string) => boolean;
  cancelStatsMatch: (id: string) => boolean;
  archiveStatsMatch: (id: string) => boolean;
  unarchiveStatsMatch: (id: string) => boolean;
  deleteStatsMatch: (id: string) => boolean;
  getActiveStatsMatch: () => StatsMatch | undefined;
  restoreStatsMatches: (statsMatches: StatsMatch[]) => boolean;
  resetStatsMatchData: () => void;
};

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const nowIso = () => new Date().toISOString();

const createTeam = (input: CreateStatsTeamInput, fallbackName: string): StatsTeam =>
  normalizeStatsTeam(
    {
      id: input.id?.trim() || `stats-team-${createId()}`,
      name: input.name,
      category: input.category,
      playerIds: input.playerIds,
    },
    fallbackName,
  );

export const normalizeStatsMatch = (match: StatsMatch): StatsMatch => {
  const settings = buildStatsMatchSettings(match.settings);
  const homeTeam = normalizeStatsTeam(match.homeTeam, 'Local');
  const awayTeam = normalizeStatsTeam(match.awayTeam, 'Visitante');
  const periods = Array.isArray(match.periods) && match.periods.length === settings.periodCount
    ? match.periods
    : createStatsMatchPeriods(settings);
  const currentPeriod = Number.isFinite(match.currentPeriod) && match.currentPeriod >= 1
    ? Math.min(Math.floor(match.currentPeriod), settings.periodCount)
    : 1;

  return {
    ...match,
    homeTeam,
    awayTeam,
    settings,
    periods,
    currentPeriod,
    events: Array.isArray(match.events) ? match.events : [],
    archivedAt: typeof match.archivedAt === 'string' && match.archivedAt.trim() ? match.archivedAt : undefined,
  };
};

const findMatch = (matches: StatsMatch[], id: string) => matches.find((match) => match.id === id);

const getDefendingTeamIdForShot = (
  match: Pick<StatsMatch, 'homeTeam' | 'awayTeam'>,
  attackingTeamId: string,
  requestedDefendingTeamId?: string,
) => {
  const opposingTeamId = getOpposingStatsTeamId(match, attackingTeamId);

  if (!opposingTeamId) {
    return undefined;
  }

  if (requestedDefendingTeamId && requestedDefendingTeamId !== opposingTeamId) {
    return undefined;
  }

  return opposingTeamId;
};

const replaceMatch = (matches: StatsMatch[], id: string, updater: (match: StatsMatch) => StatsMatch) =>
  matches.map((match) => (match.id === id ? updater(match) : match));

export const useStatsMatchStore = create<StatsMatchState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      statsMatches: [],
      activeStatsMatchId: undefined,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      createStatsMatch: (input) => {
        const settings = buildStatsMatchSettings(input.settings);
        const homeTeam = createTeam(input.homeTeam, 'Local');
        const awayTeam = createTeam(input.awayTeam, 'Visitante');
        const validation = validateStatsMatchSetup(homeTeam, awayTeam, settings);

        if (!validation.valid) {
          return '';
        }

        const createdAt = nowIso();
        const match: StatsMatch = {
          id: `stats-match-${createId()}`,
          createdAt,
          updatedAt: createdAt,
          homeTeam,
          awayTeam,
          settings,
          status: 'draft',
          currentPeriod: 1,
          periods: createStatsMatchPeriods(settings),
          events: [],
        };

        set((state) => ({
          activeStatsMatchId: match.id,
          statsMatches: [match, ...state.statsMatches],
        }));

        return match.id;
      },
      updateStatsMatchSetup: (id, input) => {
        const match = findMatch(get().statsMatches, id);

        if (!match || match.status !== 'draft' || match.archivedAt) {
          return false;
        }

        const settings = buildStatsMatchSettings(input.settings);
        const homeTeam = createTeam({ ...input.homeTeam, id: input.homeTeam.id ?? match.homeTeam.id }, 'Local');
        const awayTeam = createTeam({ ...input.awayTeam, id: input.awayTeam.id ?? match.awayTeam.id }, 'Visitante');
        const validation = validateStatsMatchSetup(homeTeam, awayTeam, settings);

        if (!validation.valid) {
          return false;
        }

        set((state) => ({
          statsMatches: replaceMatch(state.statsMatches, id, (item) => ({
            ...item,
            homeTeam,
            awayTeam,
            settings,
            periods: createStatsMatchPeriods(settings),
            currentPeriod: 1,
            updatedAt: nowIso(),
          })),
        }));

        return true;
      },
      startStatsMatch: (id) => {
        const match = findMatch(get().statsMatches, id);

        if (!match || match.status !== 'draft') {
          return false;
        }

        const startedAt = nowIso();

        set((state) => ({
          activeStatsMatchId: id,
          statsMatches: replaceMatch(state.statsMatches, id, (item) => ({
            ...item,
            status: 'live',
            currentPeriod: 1,
            updatedAt: startedAt,
            periods: item.periods.map((period) =>
              period.number === 1 ? { ...period, status: 'live', startedAt } : period,
            ),
          })),
        }));

        return true;
      },
      finishStatsPeriod: (id) => {
        const match = findMatch(get().statsMatches, id);

        if (!match || match.status !== 'live') {
          return false;
        }

        const finishedAt = nowIso();

        set((state) => ({
          statsMatches: replaceMatch(state.statsMatches, id, (item) => ({
            ...item,
            status: 'period_break',
            updatedAt: finishedAt,
            periods: item.periods.map((period) =>
              period.number === item.currentPeriod && period.status === 'live'
                ? { ...period, status: 'finished', finishedAt }
                : period,
            ),
          })),
        }));

        return true;
      },
      startNextStatsPeriod: (id) => {
        const match = findMatch(get().statsMatches, id);

        if (!match || match.status !== 'period_break') {
          return false;
        }

        const nextPeriod = match.periods.find((period) => period.status === 'not_started');

        if (!nextPeriod) {
          return false;
        }

        const startedAt = nowIso();

        set((state) => ({
          activeStatsMatchId: id,
          statsMatches: replaceMatch(state.statsMatches, id, (item) => ({
            ...item,
            status: 'live',
            currentPeriod: nextPeriod.number,
            updatedAt: startedAt,
            periods: item.periods.map((period) =>
              period.number === nextPeriod.number ? { ...period, status: 'live', startedAt } : period,
            ),
          })),
        }));

        return true;
      },
      recordStatsEvent: (id, input) => {
        const match = findMatch(get().statsMatches, id);

        if (
          !match ||
          match.status !== 'live' ||
          Boolean(match.archivedAt) ||
          ![match.homeTeam.id, match.awayTeam.id].includes(input.teamId) ||
          (statsEventRequiresPlayer(input.kind) && !isPlayerInStatsTeam(match, input.teamId, input.playerId))
        ) {
          return false;
        }

        if (input.kind === 'shot_defended') {
          const defendingTeamId = getDefendingTeamIdForShot(match, input.teamId, input.defendingTeamId);

          if (
            !defendingTeamId ||
            !input.defenderPlayerId ||
            !isPlayerInStatsTeam(match, defendingTeamId, input.defenderPlayerId)
          ) {
            return false;
          }
        }

        const defendingTeamId =
          input.kind === 'shot_defended'
            ? getDefendingTeamIdForShot(match, input.teamId, input.defendingTeamId)
            : undefined;

        const baseEvent: StatsMatchEvent = {
          id: `stats-event-${createId()}`,
          matchId: id,
          periodNumber: match.currentPeriod,
          createdAt: nowIso(),
          teamId: input.teamId,
          playerId: input.playerId,
          kind: input.kind,
          location: input.location,
          defenderPlayerId: input.kind === 'shot_defended' ? input.defenderPlayerId : undefined,
          defendingTeamId,
          errorSubtype: input.kind === 'error' ? input.errorSubtype : undefined,
        };
        const scoreAfter = getStatsMatchScore(match, [...match.events, baseEvent]);
        const event: StatsMatchEvent = { ...baseEvent, scoreAfter };

        set((state) => ({
          statsMatches: replaceMatch(state.statsMatches, id, (item) => ({
            ...item,
            updatedAt: nowIso(),
            events: [...item.events, event],
          })),
        }));

        return true;
      },
      undoLastStatsEvent: (id) => {
        const match = findMatch(get().statsMatches, id);

        if (!match || isStatsMatchClosed(match) || match.events.length === 0) {
          return false;
        }

        set((state) => ({
          statsMatches: replaceMatch(state.statsMatches, id, (item) => ({
            ...item,
            updatedAt: nowIso(),
            events: item.events.slice(0, -1),
          })),
        }));

        return true;
      },
      finishStatsMatch: (id) => {
        const match = findMatch(get().statsMatches, id);

        if (!match || match.status === 'cancelled' || match.archivedAt) {
          return false;
        }

        const finishedAt = nowIso();

        set((state) => ({
          activeStatsMatchId: state.activeStatsMatchId === id ? undefined : state.activeStatsMatchId,
          statsMatches: replaceMatch(state.statsMatches, id, (item) => ({
            ...item,
            status: 'finished',
            updatedAt: finishedAt,
            periods: item.periods.map((period) =>
              period.status === 'live' ? { ...period, status: 'finished', finishedAt } : period,
            ),
          })),
        }));

        return true;
      },
      cancelStatsMatch: (id) => {
        const match = findMatch(get().statsMatches, id);

        if (!match || match.status === 'finished' || match.archivedAt) {
          return false;
        }

        set((state) => ({
          activeStatsMatchId: state.activeStatsMatchId === id ? undefined : state.activeStatsMatchId,
          statsMatches: replaceMatch(state.statsMatches, id, (item) => ({
            ...item,
            status: 'cancelled',
            updatedAt: nowIso(),
          })),
        }));

        return true;
      },
      archiveStatsMatch: (id) => {
        const match = findMatch(get().statsMatches, id);

        if (!match) {
          return false;
        }

        if (match.archivedAt) {
          return true;
        }

        const archivedAt = nowIso();

        set((state) => ({
          activeStatsMatchId: state.activeStatsMatchId === id ? undefined : state.activeStatsMatchId,
          statsMatches: replaceMatch(state.statsMatches, id, (item) => ({
            ...item,
            archivedAt,
            updatedAt: archivedAt,
          })),
        }));

        return true;
      },
      unarchiveStatsMatch: (id) => {
        const match = findMatch(get().statsMatches, id);

        if (!match) {
          return false;
        }

        if (!match.archivedAt) {
          return true;
        }

        const updatedAt = nowIso();

        set((state) => ({
          statsMatches: replaceMatch(state.statsMatches, id, (item) => {
            const { archivedAt: _archivedAt, ...restoredMatch } = item;

            return { ...restoredMatch, updatedAt };
          }),
        }));

        return true;
      },
      deleteStatsMatch: (id) => {
        if (!findMatch(get().statsMatches, id)) {
          return false;
        }

        set((state) => ({
          activeStatsMatchId: state.activeStatsMatchId === id ? undefined : state.activeStatsMatchId,
          statsMatches: state.statsMatches.filter((match) => match.id !== id),
        }));

        return true;
      },
      getActiveStatsMatch: () => {
        const { activeStatsMatchId, statsMatches } = get();

        return activeStatsMatchId ? statsMatches.find((match) => match.id === activeStatsMatchId) : undefined;
      },
      restoreStatsMatches: (statsMatches) => {
        if (!Array.isArray(statsMatches)) {
          return false;
        }

        try {
          const normalizedMatches = statsMatches.map(normalizeStatsMatch);

          set({
            activeStatsMatchId: undefined,
            statsMatches: normalizedMatches,
          });

          return true;
        } catch {
          return false;
        }
      },
      resetStatsMatchData: () => set({ activeStatsMatchId: undefined, statsMatches: [] }),
    }),
    {
      name: STORAGE_KEYS.statsMatchState,
      version: STATS_MATCH_STORE_DATA_VERSION,
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      migrate: (persistedState) => {
        const state = persistedState as Partial<StatsMatchState> | undefined;

        return {
          ...state,
          hasHydrated: false,
          statsMatches: (state?.statsMatches ?? []).map(normalizeStatsMatch),
          activeStatsMatchId: state?.activeStatsMatchId,
        };
      },
      partialize: (state) => ({
        statsMatches: state.statsMatches,
        activeStatsMatchId: state.activeStatsMatchId,
      }),
      storage: createJSONStorage(() => appStorage),
    },
  ),
);
