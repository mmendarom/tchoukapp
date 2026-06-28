import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  advanceTrainingQueueAfterMiniMatch,
  buildTrainingSettings,
  getTrainingSessionEditPermissions,
  getSuggestedNextMiniMatch,
  getTrainingQueue,
  recalculateTrainingMiniMatch,
  TRAINING_STORE_DATA_VERSION,
  TrainingEvent,
  TrainingEventType,
  TrainingMiniMatch,
  TrainingSession,
  TrainingSessionSettings,
  TrainingTeam,
  uniqueTrainingIds,
  validateTrainingTeams,
} from '../domain/training';
import { CourtLocation } from '../domain/types';
import { appStorage, STORAGE_KEYS } from '../storage/asyncStorage';

type CreateTrainingTeamInput = {
  id?: string;
  name: string;
  playerIds: string[];
  queueOrder?: number;
  color?: string;
};

type CreateTrainingSessionInput = {
  teamPoolId?: string;
  teamPoolName?: string;
  participantPlayerIds: string[];
  teams: CreateTrainingTeamInput[];
  settings?: Partial<TrainingSessionSettings>;
};

type UpdateTrainingSessionSetupInput = {
  teamPoolId?: string;
  teamPoolName?: string;
  participantPlayerIds: string[];
  teams: CreateTrainingTeamInput[];
  settings?: Partial<TrainingSessionSettings>;
};

type UpdateTrainingTeamDetailsInput = {
  teamId: string;
  name?: string;
  color?: string;
};

type TrainingEventInput = {
  type: TrainingEventType;
  teamId: string;
  playerId?: string;
  location?: CourtLocation;
  defenderPlayerId?: string;
  defendingTeamId?: string;
  errorSubtype?: TrainingEvent['errorSubtype'];
  errorType?: TrainingEvent['errorType'];
};

type TrainingState = {
  hasHydrated: boolean;
  trainingSessions: TrainingSession[];
  activeTrainingSessionId?: string;
  setHasHydrated: (hasHydrated: boolean) => void;
  createTrainingSession: (input: CreateTrainingSessionInput) => string;
  updateTrainingSession: (id: string, patch: Partial<Pick<TrainingSession, 'teamPoolId' | 'teamPoolName' | 'participantPlayerIds' | 'settings'>>) => boolean;
  cancelTrainingSession: (id: string) => boolean;
  finishTrainingSession: (id: string) => boolean;
  archiveTrainingSession: (id: string) => boolean;
  unarchiveTrainingSession: (id: string) => boolean;
  deleteTrainingSession: (id: string) => boolean;
  updateTrainingSessionSetup: (id: string, input: UpdateTrainingSessionSetupInput) => boolean;
  updateTrainingTeamDetails: (id: string, teams: UpdateTrainingTeamDetailsInput[]) => boolean;
  startTrainingSession: (id: string) => boolean;
  startMiniMatch: (sessionId: string, teamAId: string, teamBId: string) => string;
  startSuggestedNextMiniMatch: (sessionId: string) => string;
  finishMiniMatch: (sessionId: string, miniMatchId: string) => boolean;
  cancelMiniMatch: (sessionId: string, miniMatchId: string) => boolean;
  recordTrainingEvent: (sessionId: string, miniMatchId: string, input: TrainingEventInput) => boolean;
  undoLastTrainingEvent: (sessionId: string, miniMatchId: string) => boolean;
  getActiveTrainingSession: () => TrainingSession | undefined;
  restoreTrainingSessions: (trainingSessions: TrainingSession[]) => boolean;
  resetTrainingData: () => void;
};

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const nowIso = () => new Date().toISOString();

export const normalizeTrainingSession = (session: TrainingSession): TrainingSession => {
  const teams = (session.teams ?? []).map((team, index) => ({
    ...team,
    name: team.name?.trim() || `Equipo ${index + 1}`,
    playerIds: uniqueTrainingIds(team.playerIds ?? []),
    queueOrder: team.queueOrder ?? index,
  }));
  const normalizedSession = {
    ...session,
    archivedAt: typeof session.archivedAt === 'string' && session.archivedAt.trim() ? session.archivedAt : undefined,
    participantPlayerIds: uniqueTrainingIds(session.participantPlayerIds ?? []),
    settings: buildTrainingSettings(session.settings),
    teams,
    miniMatches: (session.miniMatches ?? []).map((miniMatch) => recalculateTrainingMiniMatch({
      ...miniMatch,
      events: miniMatch.events ?? [],
      targetScore: miniMatch.targetScore ?? session.settings?.targetScore ?? 3,
    })),
  };

  return {
    ...normalizedSession,
    teamQueue: getTrainingQueue(normalizedSession).map((team) => team.id),
  };
};

const createTeams = (teams: CreateTrainingTeamInput[]): TrainingTeam[] =>
  teams.map((team, index) => ({
    id: team.id?.trim() || `training-team-${createId()}`,
    name: team.name.trim() || `Equipo ${index + 1}`,
    playerIds: uniqueTrainingIds(team.playerIds),
    queueOrder: team.queueOrder ?? index,
    color: team.color,
  }));

const updateTrainingTeamDetailsById = (
  teams: TrainingTeam[],
  updates: UpdateTrainingTeamDetailsInput[],
): TrainingTeam[] => {
  const updatesById = new Map(updates.map((team) => [team.teamId, team]));

  return teams.map((team) => {
    const update = updatesById.get(team.id);

    if (!update) {
      return team;
    }

    const name = update.name?.trim();

    return {
      ...team,
      name: name || team.name,
      color: update.color ?? team.color,
    };
  });
};

const isSessionClosed = (session: TrainingSession) =>
  session.status === 'finished' || session.status === 'cancelled' || Boolean(session.archivedAt);

const isMiniMatchClosed = (miniMatch: TrainingMiniMatch) =>
  miniMatch.status === 'finished' || miniMatch.status === 'cancelled';

const findSession = (sessions: TrainingSession[], sessionId: string) =>
  sessions.find((session) => session.id === sessionId);

const findMiniMatch = (session: TrainingSession, miniMatchId: string) =>
  session.miniMatches.find((miniMatch) => miniMatch.id === miniMatchId);

const findTeam = (session: TrainingSession, teamId: string) =>
  session.teams.find((team) => team.id === teamId);

const isPlayerInTeam = (session: TrainingSession, teamId: string, playerId?: string) => {
  if (!playerId) {
    return false;
  }

  return Boolean(findTeam(session, teamId)?.playerIds.includes(playerId));
};

const eventRequiresPlayer = (type: TrainingEventType) =>
  ['point', 'defense', 'shot_defended', 'error', 'own_point_against'].includes(type);

const getDefendingTeamIdForShot = (
  miniMatch: Pick<TrainingMiniMatch, 'teamAId' | 'teamBId'>,
  attackingTeamId: string,
  requestedDefendingTeamId?: string,
) => {
  const oppositeTeamId = attackingTeamId === miniMatch.teamAId
    ? miniMatch.teamBId
    : attackingTeamId === miniMatch.teamBId ? miniMatch.teamAId : undefined;

  if (!oppositeTeamId) {
    return undefined;
  }

  if (requestedDefendingTeamId && requestedDefendingTeamId !== oppositeTeamId) {
    return undefined;
  }

  return requestedDefendingTeamId ?? oppositeTeamId;
};

export const useTrainingStore = create<TrainingState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      trainingSessions: [],
      activeTrainingSessionId: undefined,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      createTrainingSession: (input) => {
        const createdAt = nowIso();
        const participantPlayerIds = uniqueTrainingIds(input.participantPlayerIds);
        const teams = createTeams(input.teams);
        const validation = validateTrainingTeams(participantPlayerIds, teams);

        if (!validation.valid) {
          return '';
        }

        const session: TrainingSession = {
          id: `training-session-${createId()}`,
          createdAt,
          updatedAt: createdAt,
          teamPoolId: input.teamPoolId,
          teamPoolName: input.teamPoolName,
          participantPlayerIds,
          teams,
          teamQueue: teams
            .slice()
            .sort((a, b) => a.queueOrder - b.queueOrder)
            .map((team) => team.id),
          miniMatches: [],
          activeMiniMatchId: undefined,
          settings: buildTrainingSettings(input.settings),
          status: 'draft',
        };

        set((state) => ({
          activeTrainingSessionId: session.id,
          trainingSessions: [session, ...state.trainingSessions],
        }));

        return session.id;
      },
      updateTrainingSession: (id, patch) => {
        const session = findSession(get().trainingSessions, id);

        if (!session || isSessionClosed(session)) {
          return false;
        }

        const nextParticipantPlayerIds = patch.participantPlayerIds
          ? uniqueTrainingIds(patch.participantPlayerIds)
          : session.participantPlayerIds;
        const validation = validateTrainingTeams(nextParticipantPlayerIds, session.teams);

        if (!validation.valid) {
          return false;
        }

        set((state) => ({
          trainingSessions: state.trainingSessions.map((item) =>
            item.id === id
              ? {
                  ...item,
                  ...patch,
                  participantPlayerIds: nextParticipantPlayerIds,
                  settings: buildTrainingSettings({ ...item.settings, ...patch.settings }),
                  updatedAt: nowIso(),
                }
              : item,
          ),
        }));

        return true;
      },
      cancelTrainingSession: (id) => {
        const session = findSession(get().trainingSessions, id);

        if (!session || session.status === 'finished' || session.archivedAt) {
          return false;
        }

        set((state) => ({
          activeTrainingSessionId: state.activeTrainingSessionId === id ? undefined : state.activeTrainingSessionId,
          trainingSessions: state.trainingSessions.map((item) =>
            item.id === id
              ? {
                  ...item,
                  activeMiniMatchId: undefined,
                  status: 'cancelled',
                  updatedAt: nowIso(),
                  miniMatches: item.miniMatches.map((miniMatch) =>
                    miniMatch.status === 'finished'
                      ? miniMatch
                      : { ...miniMatch, status: 'cancelled', endedAt: miniMatch.endedAt ?? nowIso() },
                  ),
                }
              : item,
          ),
        }));

        return true;
      },
      finishTrainingSession: (id) => {
        const session = findSession(get().trainingSessions, id);

        if (!session || session.status === 'cancelled' || session.archivedAt) {
          return false;
        }

        set((state) => ({
          activeTrainingSessionId: state.activeTrainingSessionId === id ? undefined : state.activeTrainingSessionId,
          trainingSessions: state.trainingSessions.map((item) =>
            item.id === id
              ? {
                  ...item,
                  activeMiniMatchId: undefined,
                  status: 'finished',
                  updatedAt: nowIso(),
                  miniMatches: item.miniMatches.map((miniMatch) =>
                    miniMatch.status === 'live'
                      ? { ...miniMatch, status: 'finished', endedAt: miniMatch.endedAt ?? nowIso() }
                      : miniMatch,
                  ),
                }
              : item,
          ),
        }));

        return true;
      },
      archiveTrainingSession: (id) => {
        const session = findSession(get().trainingSessions, id);

        if (!session) {
          return false;
        }

        if (session.archivedAt) {
          return true;
        }

        const archivedAt = nowIso();

        set((state) => ({
          activeTrainingSessionId: state.activeTrainingSessionId === id ? undefined : state.activeTrainingSessionId,
          trainingSessions: state.trainingSessions.map((item) =>
            item.id === id ? { ...item, archivedAt, updatedAt: archivedAt } : item,
          ),
        }));
        return true;
      },
      unarchiveTrainingSession: (id) => {
        const session = findSession(get().trainingSessions, id);

        if (!session) {
          return false;
        }

        if (!session.archivedAt) {
          return true;
        }

        const updatedAt = nowIso();

        set((state) => ({
          trainingSessions: state.trainingSessions.map((item) => {
            if (item.id !== id) {
              return item;
            }

            const { archivedAt: _archivedAt, ...restoredSession } = item;

            return { ...restoredSession, updatedAt };
          }),
        }));
        return true;
      },
      deleteTrainingSession: (id) => {
        if (!findSession(get().trainingSessions, id)) {
          return false;
        }

        set((state) => ({
          activeTrainingSessionId: state.activeTrainingSessionId === id ? undefined : state.activeTrainingSessionId,
          trainingSessions: state.trainingSessions.filter((session) => session.id !== id),
        }));
        return true;
      },
      updateTrainingSessionSetup: (id, input) => {
        const session = findSession(get().trainingSessions, id);

        if (!session || !getTrainingSessionEditPermissions(session).canEditSetup) {
          return false;
        }

        const participantPlayerIds = uniqueTrainingIds(input.participantPlayerIds);
        const teams = createTeams(input.teams);
        const validation = validateTrainingTeams(participantPlayerIds, teams);

        if (!validation.valid) {
          return false;
        }

        const updatedAt = nowIso();

        set((state) => ({
          trainingSessions: state.trainingSessions.map((item) =>
            item.id === id
              ? {
                  ...item,
                  teamPoolId: input.teamPoolId,
                  teamPoolName: input.teamPoolName,
                  participantPlayerIds,
                  teams,
                  teamQueue: teams
                    .slice()
                    .sort((a, b) => a.queueOrder - b.queueOrder)
                    .map((team) => team.id),
                  settings: buildTrainingSettings({ ...item.settings, ...input.settings }),
                  updatedAt,
                }
              : item,
          ),
        }));

        return true;
      },
      updateTrainingTeamDetails: (id, teamUpdates) => {
        const session = findSession(get().trainingSessions, id);

        if (!session || !getTrainingSessionEditPermissions(session).canEditTeamDetails) {
          return false;
        }

        const knownTeamIds = new Set(session.teams.map((team) => team.id));

        if (teamUpdates.some((team) => !knownTeamIds.has(team.teamId))) {
          return false;
        }

        const updatedAt = nowIso();

        set((state) => ({
          trainingSessions: state.trainingSessions.map((item) =>
            item.id === id
              ? {
                  ...item,
                  teams: updateTrainingTeamDetailsById(item.teams, teamUpdates),
                  updatedAt,
                }
              : item,
          ),
        }));

        return true;
      },
      startTrainingSession: (id) => {
        const session = findSession(get().trainingSessions, id);

        if (!session || isSessionClosed(session)) {
          return false;
        }

        set((state) => ({
          activeTrainingSessionId: id,
          trainingSessions: state.trainingSessions.map((item) =>
            item.id === id ? { ...item, status: 'live', updatedAt: nowIso() } : item,
          ),
        }));

        return true;
      },
      startMiniMatch: (sessionId, teamAId, teamBId) => {
        const session = findSession(get().trainingSessions, sessionId);

        const hasActiveMiniMatch = session?.miniMatches.some((miniMatch) => miniMatch.status === 'live');

        if (!session || isSessionClosed(session) || hasActiveMiniMatch || teamAId === teamBId || !findTeam(session, teamAId) || !findTeam(session, teamBId)) {
          return '';
        }

        const miniMatch: TrainingMiniMatch = {
          id: `training-mini-match-${createId()}`,
          sessionId,
          teamAId,
          teamBId,
          scoreA: 0,
          scoreB: 0,
          targetScore: session.settings.targetScore,
          status: 'live',
          startedAt: nowIso(),
          events: [],
        };

        set((state) => ({
          activeTrainingSessionId: sessionId,
          trainingSessions: state.trainingSessions.map((item) =>
            item.id === sessionId
              ? {
                  ...item,
                  activeMiniMatchId: miniMatch.id,
                  status: 'live',
                  updatedAt: nowIso(),
                  miniMatches: [miniMatch, ...item.miniMatches],
                }
              : item,
          ),
        }));

        return miniMatch.id;
      },
      startSuggestedNextMiniMatch: (sessionId) => {
        const session = findSession(get().trainingSessions, sessionId);
        const suggestion = session ? getSuggestedNextMiniMatch(session) : undefined;

        if (!session || !suggestion) {
          return '';
        }

        if (session.status === 'draft') {
          get().startTrainingSession(sessionId);
        }

        return get().startMiniMatch(sessionId, suggestion.teamAId, suggestion.teamBId);
      },
      finishMiniMatch: (sessionId, miniMatchId) => {
        const session = findSession(get().trainingSessions, sessionId);
        const miniMatch = session ? findMiniMatch(session, miniMatchId) : undefined;

        if (!session || !miniMatch || isSessionClosed(session) || miniMatch.status === 'cancelled' || miniMatch.status === 'finished') {
          return false;
        }

        const recalculated = recalculateTrainingMiniMatch(miniMatch);

        if (!recalculated.winnerTeamId) {
          return false;
        }

        const finishedMiniMatch: TrainingMiniMatch = {
          ...recalculated,
          status: 'finished',
          endedAt: recalculated.endedAt ?? nowIso(),
        };

        set((state) => ({
          trainingSessions: state.trainingSessions.map((item) => {
            if (item.id !== sessionId) {
              return item;
            }

            const nextSession = {
              ...item,
              activeMiniMatchId: item.activeMiniMatchId === miniMatchId ? undefined : item.activeMiniMatchId,
              updatedAt: nowIso(),
              miniMatches: item.miniMatches.map((match) =>
                match.id === miniMatchId ? finishedMiniMatch : match,
              ),
            };

            return {
              ...nextSession,
              teamQueue: advanceTrainingQueueAfterMiniMatch(nextSession, finishedMiniMatch),
            };
          }),
        }));

        return true;
      },
      cancelMiniMatch: (sessionId, miniMatchId) => {
        const session = findSession(get().trainingSessions, sessionId);
        const miniMatch = session ? findMiniMatch(session, miniMatchId) : undefined;

        if (!session || !miniMatch || isSessionClosed(session) || miniMatch.status === 'finished') {
          return false;
        }

        set((state) => ({
          trainingSessions: state.trainingSessions.map((item) =>
            item.id === sessionId
              ? {
                  ...item,
                  activeMiniMatchId: item.activeMiniMatchId === miniMatchId ? undefined : item.activeMiniMatchId,
                  updatedAt: nowIso(),
                  miniMatches: item.miniMatches.map((match) =>
                    match.id === miniMatchId ? { ...match, status: 'cancelled', endedAt: match.endedAt ?? nowIso() } : match,
                  ),
                }
              : item,
          ),
        }));

        return true;
      },
      recordTrainingEvent: (sessionId, miniMatchId, input) => {
        const session = findSession(get().trainingSessions, sessionId);
        const miniMatch = session ? findMiniMatch(session, miniMatchId) : undefined;

        if (
          !session ||
          !miniMatch ||
          session.status !== 'live' ||
          Boolean(session.archivedAt) ||
          miniMatch.status !== 'live' ||
          miniMatch.winnerTeamId ||
          ![miniMatch.teamAId, miniMatch.teamBId].includes(input.teamId) ||
          (eventRequiresPlayer(input.type) && !isPlayerInTeam(session, input.teamId, input.playerId))
        ) {
          return false;
        }

        const defendingTeamId = input.type === 'shot_defended'
          ? getDefendingTeamIdForShot(miniMatch, input.teamId, input.defendingTeamId)
          : undefined;

        if (
          input.type === 'shot_defended' &&
          ((Boolean(input.defendingTeamId) && !defendingTeamId) ||
            (Boolean(input.defenderPlayerId) &&
              (!defendingTeamId || !isPlayerInTeam(session, defendingTeamId, input.defenderPlayerId))))
        ) {
          return false;
        }

        const baseEvent: TrainingEvent = {
          id: `training-event-${createId()}`,
          sessionId,
          miniMatchId,
          createdAt: nowIso(),
          teamId: input.teamId,
          playerId: input.playerId,
          type: input.type,
          location: input.location,
          defenderPlayerId: input.defenderPlayerId,
          defendingTeamId,
          errorSubtype: input.errorSubtype,
          errorType: input.errorType,
        };
        const withEvent = recalculateTrainingMiniMatch({
          ...miniMatch,
          events: [...miniMatch.events, baseEvent],
        });
        const event: TrainingEvent = {
          ...baseEvent,
          scoreAfter: {
            teamA: withEvent.scoreA,
            teamB: withEvent.scoreB,
          },
        };
        const recalculated = recalculateTrainingMiniMatch({
          ...miniMatch,
          events: [...miniMatch.events, event],
        });

        set((state) => ({
          trainingSessions: state.trainingSessions.map((item) =>
            item.id === sessionId
              ? {
                  ...item,
                  updatedAt: nowIso(),
                  miniMatches: item.miniMatches.map((match) =>
                    match.id === miniMatchId ? recalculated : match,
                  ),
                }
              : item,
          ),
        }));

        return true;
      },
      undoLastTrainingEvent: (sessionId, miniMatchId) => {
        const session = findSession(get().trainingSessions, sessionId);
        const miniMatch = session ? findMiniMatch(session, miniMatchId) : undefined;

        if (!session || !miniMatch || isSessionClosed(session) || isMiniMatchClosed(miniMatch) || miniMatch.events.length === 0) {
          return false;
        }

        const recalculated = recalculateTrainingMiniMatch({
          ...miniMatch,
          events: miniMatch.events.slice(0, -1),
        });

        set((state) => ({
          trainingSessions: state.trainingSessions.map((item) =>
            item.id === sessionId
              ? {
                  ...item,
                  updatedAt: nowIso(),
                  miniMatches: item.miniMatches.map((match) =>
                    match.id === miniMatchId ? recalculated : match,
                  ),
                }
              : item,
          ),
        }));

        return true;
      },
      getActiveTrainingSession: () => {
        const { activeTrainingSessionId, trainingSessions } = get();

        return activeTrainingSessionId
          ? trainingSessions.find((session) => session.id === activeTrainingSessionId)
          : undefined;
      },
      restoreTrainingSessions: (trainingSessions) => {
        if (!Array.isArray(trainingSessions)) {
          return false;
        }

        try {
          const normalizedSessions = trainingSessions.map(normalizeTrainingSession);

          set({
            activeTrainingSessionId: undefined,
            trainingSessions: normalizedSessions,
          });
          return true;
        } catch {
          return false;
        }
      },
      resetTrainingData: () => set({ activeTrainingSessionId: undefined, trainingSessions: [] }),
    }),
    {
      name: STORAGE_KEYS.trainingState,
      version: TRAINING_STORE_DATA_VERSION,
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      migrate: (persistedState) => {
        const state = persistedState as Partial<TrainingState> | undefined;

        return {
          ...state,
          hasHydrated: false,
          trainingSessions: (state?.trainingSessions ?? []).map(normalizeTrainingSession),
          activeTrainingSessionId: state?.activeTrainingSessionId,
        };
      },
      partialize: (state) => ({
        trainingSessions: state.trainingSessions,
        activeTrainingSessionId: state.activeTrainingSessionId,
      }),
      storage: createJSONStorage(() => appStorage),
    },
  ),
);
