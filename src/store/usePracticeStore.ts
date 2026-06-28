import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  BuildTrainingBlockInput,
  PRACTICE_STORE_DATA_VERSION,
  TrainingBlock,
  TrainingBlockStatus,
  TrainingPracticeEvent,
  TrainingPracticeEventType,
  TrainingPracticeMetric,
  TrainingPracticeMetricUnit,
  TrainingPracticeSession,
  buildTrainingBlock,
  hasLivePracticeBlock,
  normalizeTrainingPracticeSession,
  uniquePracticeIds,
  validateTrainingPracticeSessionInput,
} from '../domain/practice';
import { appStorage, STORAGE_KEYS } from '../storage/asyncStorage';

type CreatePracticeBlockInput = Omit<BuildTrainingBlockInput, 'sessionId' | 'id' | 'order' | 'status'> & {
  id?: string;
  order?: number;
  status?: TrainingBlockStatus;
};

type CreatePracticeSessionInput = {
  date?: string;
  teamPoolId?: string;
  teamPoolName?: string;
  participantPlayerIds: string[];
  objective: string;
  blocks: CreatePracticeBlockInput[];
  notes?: string;
};

type UpdatePracticeSessionInput = Partial<Pick<
  TrainingPracticeSession,
  'date' | 'teamPoolId' | 'teamPoolName' | 'participantPlayerIds' | 'objective' | 'notes'
>>;

type UpdatePracticeBlockInput = Partial<Pick<
  TrainingBlock,
  'title' | 'type' | 'durationMinutes' | 'objective' | 'participantPlayerIds' | 'notes' | 'linkedTrainingSessionId'
>>;

type PracticeEventInput = {
  type: TrainingPracticeEventType;
  playerId?: string;
  label?: string;
  value?: number;
  note?: string;
};

type PracticeMetricInput = {
  playerId?: string;
  label: string;
  value: number;
  unit?: TrainingPracticeMetricUnit;
};

type PracticeState = {
  hasHydrated: boolean;
  practiceSessions: TrainingPracticeSession[];
  activePracticeSessionId?: string;
  setHasHydrated: (hasHydrated: boolean) => void;
  createPracticeSession: (input: CreatePracticeSessionInput) => string;
  updatePracticeSession: (id: string, patch: UpdatePracticeSessionInput) => boolean;
  startPracticeSession: (id: string) => boolean;
  finishPracticeSession: (id: string) => boolean;
  cancelPracticeSession: (id: string) => boolean;
  archivePracticeSession: (id: string) => boolean;
  unarchivePracticeSession: (id: string) => boolean;
  deletePracticeSession: (id: string) => boolean;
  addPracticeBlock: (sessionId: string, input: CreatePracticeBlockInput) => string;
  updatePracticeBlock: (sessionId: string, blockId: string, patch: UpdatePracticeBlockInput) => boolean;
  reorderPracticeBlocks: (sessionId: string, blockIds: string[]) => boolean;
  startPracticeBlock: (sessionId: string, blockId: string) => boolean;
  completePracticeBlock: (sessionId: string, blockId: string) => boolean;
  skipPracticeBlock: (sessionId: string, blockId: string) => boolean;
  addPracticeNote: (sessionId: string, note: string) => boolean;
  addPracticeEvent: (sessionId: string, blockId: string, input: PracticeEventInput) => boolean;
  addPracticeMetric: (sessionId: string, blockId: string, input: PracticeMetricInput) => boolean;
  getActivePracticeSession: () => TrainingPracticeSession | undefined;
  restorePracticeSessions: (practiceSessions: TrainingPracticeSession[]) => boolean;
  resetPracticeData: () => void;
};

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const nowIso = () => new Date().toISOString();

const findSession = (sessions: TrainingPracticeSession[], sessionId: string) =>
  sessions.find((session) => session.id === sessionId);

const isSessionClosed = (session: TrainingPracticeSession) =>
  session.status === 'finished' || session.status === 'cancelled' || Boolean(session.archivedAt);

const createPracticeBlocks = (sessionId: string, blocks: CreatePracticeBlockInput[]) =>
  blocks
    .map((block, index) => buildTrainingBlock({
      ...block,
      id: block.id ?? `practice-block-${createId()}`,
      sessionId,
      order: block.order ?? index,
    }))
    .filter((block): block is TrainingBlock => Boolean(block))
    .sort((a, b) => a.order - b.order)
    .map((block, index) => ({ ...block, order: index }));

const normalizePracticeSessionForState = (session: TrainingPracticeSession) =>
  normalizeTrainingPracticeSession(session);

const appendNote = (current: string | undefined, note: string) =>
  [current?.trim(), note.trim()].filter(Boolean).join('\n');

export const usePracticeStore = create<PracticeState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      practiceSessions: [],
      activePracticeSessionId: undefined,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      createPracticeSession: (input) => {
        const createdAt = nowIso();
        const sessionId = `practice-session-${createId()}`;
        const participantPlayerIds = uniquePracticeIds(input.participantPlayerIds);
        const blocks = createPracticeBlocks(sessionId, input.blocks);
        const validation = validateTrainingPracticeSessionInput({
          teamPoolId: input.teamPoolId,
          teamPoolName: input.teamPoolName,
          participantPlayerIds,
          objective: input.objective,
          blocks,
        });

        if (!validation.valid || blocks.length !== input.blocks.length) {
          return '';
        }

        const session: TrainingPracticeSession = {
          id: sessionId,
          date: input.date ?? createdAt,
          teamPoolId: input.teamPoolId,
          teamPoolName: input.teamPoolName,
          participantPlayerIds,
          objective: input.objective.trim(),
          blocks,
          notes: input.notes?.trim() || undefined,
          status: 'draft',
          createdAt,
          updatedAt: createdAt,
        };

        set((state) => ({
          activePracticeSessionId: session.id,
          practiceSessions: [session, ...state.practiceSessions],
        }));

        return session.id;
      },
      updatePracticeSession: (id, patch) => {
        const session = findSession(get().practiceSessions, id);

        if (!session || isSessionClosed(session)) {
          return false;
        }

        const participantPlayerIds = patch.participantPlayerIds
          ? uniquePracticeIds(patch.participantPlayerIds)
          : session.participantPlayerIds;
        const objective = patch.objective ?? session.objective;
        const validation = validateTrainingPracticeSessionInput({
          teamPoolId: patch.teamPoolId ?? session.teamPoolId,
          teamPoolName: patch.teamPoolName ?? session.teamPoolName,
          participantPlayerIds,
          objective,
          blocks: session.blocks,
        });

        if (!validation.valid) {
          return false;
        }

        set((state) => ({
          practiceSessions: state.practiceSessions.map((item) =>
            item.id === id
              ? normalizePracticeSessionForState({
                  ...item,
                  ...patch,
                  participantPlayerIds,
                  objective: objective.trim(),
                  updatedAt: nowIso(),
                })
              : item,
          ),
        }));

        return true;
      },
      startPracticeSession: (id) => {
        const session = findSession(get().practiceSessions, id);

        if (!session || isSessionClosed(session)) {
          return false;
        }

        const updatedAt = nowIso();

        set((state) => ({
          activePracticeSessionId: id,
          practiceSessions: state.practiceSessions.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: 'live',
                  startedAt: item.startedAt ?? updatedAt,
                  updatedAt,
                }
              : item,
          ),
        }));

        return true;
      },
      finishPracticeSession: (id) => {
        const session = findSession(get().practiceSessions, id);

        if (!session || session.status === 'cancelled' || session.archivedAt) {
          return false;
        }

        const updatedAt = nowIso();

        set((state) => ({
          activePracticeSessionId: state.activePracticeSessionId === id ? undefined : state.activePracticeSessionId,
          practiceSessions: state.practiceSessions.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: 'finished',
                  finishedAt: item.finishedAt ?? updatedAt,
                  updatedAt,
                  blocks: item.blocks.map((block) =>
                    block.status === 'live'
                      ? { ...block, status: 'completed', endedAt: block.endedAt ?? updatedAt }
                      : block,
                  ),
                }
              : item,
          ),
        }));

        return true;
      },
      cancelPracticeSession: (id) => {
        const session = findSession(get().practiceSessions, id);

        if (!session || session.status === 'finished' || session.archivedAt) {
          return false;
        }

        const updatedAt = nowIso();

        set((state) => ({
          activePracticeSessionId: state.activePracticeSessionId === id ? undefined : state.activePracticeSessionId,
          practiceSessions: state.practiceSessions.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: 'cancelled',
                  finishedAt: item.finishedAt ?? updatedAt,
                  updatedAt,
                  blocks: item.blocks.map((block) =>
                    block.status === 'live'
                      ? { ...block, status: 'skipped', endedAt: block.endedAt ?? updatedAt }
                      : block,
                  ),
                }
              : item,
          ),
        }));

        return true;
      },
      archivePracticeSession: (id) => {
        const session = findSession(get().practiceSessions, id);

        if (!session) {
          return false;
        }

        if (session.archivedAt) {
          return true;
        }

        const archivedAt = nowIso();

        set((state) => ({
          activePracticeSessionId: state.activePracticeSessionId === id ? undefined : state.activePracticeSessionId,
          practiceSessions: state.practiceSessions.map((item) =>
            item.id === id ? { ...item, archivedAt, updatedAt: archivedAt } : item,
          ),
        }));

        return true;
      },
      unarchivePracticeSession: (id) => {
        const session = findSession(get().practiceSessions, id);

        if (!session) {
          return false;
        }

        if (!session.archivedAt) {
          return true;
        }

        const updatedAt = nowIso();

        set((state) => ({
          practiceSessions: state.practiceSessions.map((item) => {
            if (item.id !== id) {
              return item;
            }

            const { archivedAt: _archivedAt, ...restoredSession } = item;

            return { ...restoredSession, updatedAt };
          }),
        }));

        return true;
      },
      deletePracticeSession: (id) => {
        if (!findSession(get().practiceSessions, id)) {
          return false;
        }

        set((state) => ({
          activePracticeSessionId: state.activePracticeSessionId === id ? undefined : state.activePracticeSessionId,
          practiceSessions: state.practiceSessions.filter((session) => session.id !== id),
        }));

        return true;
      },
      addPracticeBlock: (sessionId, input) => {
        const session = findSession(get().practiceSessions, sessionId);

        if (!session || isSessionClosed(session)) {
          return '';
        }

        const block = buildTrainingBlock({
          ...input,
          id: input.id ?? `practice-block-${createId()}`,
          sessionId,
          order: session.blocks.length,
        });

        if (!block) {
          return '';
        }

        set((state) => ({
          practiceSessions: state.practiceSessions.map((item) =>
            item.id === sessionId
              ? { ...item, blocks: [...item.blocks, block], updatedAt: nowIso() }
              : item,
          ),
        }));

        return block.id;
      },
      updatePracticeBlock: (sessionId, blockId, patch) => {
        const session = findSession(get().practiceSessions, sessionId);
        const block = session?.blocks.find((item) => item.id === blockId);

        if (!session || !block || isSessionClosed(session)) {
          return false;
        }

        const nextBlock = buildTrainingBlock({
          ...block,
          ...patch,
          sessionId,
          id: block.id,
          order: block.order,
          status: block.status,
          events: block.events,
          metrics: block.metrics,
        });

        if (!nextBlock) {
          return false;
        }

        set((state) => ({
          practiceSessions: state.practiceSessions.map((item) =>
            item.id === sessionId
              ? {
                  ...item,
                  blocks: item.blocks.map((currentBlock) => currentBlock.id === blockId ? nextBlock : currentBlock),
                  updatedAt: nowIso(),
                }
              : item,
          ),
        }));

        return true;
      },
      reorderPracticeBlocks: (sessionId, blockIds) => {
        const session = findSession(get().practiceSessions, sessionId);

        if (!session || isSessionClosed(session) || blockIds.length !== session.blocks.length) {
          return false;
        }

        const currentIds = new Set(session.blocks.map((block) => block.id));
        const requestedIds = new Set(blockIds);

        if (currentIds.size !== requestedIds.size || blockIds.some((blockId) => !currentIds.has(blockId))) {
          return false;
        }

        const blocksById = new Map(session.blocks.map((block) => [block.id, block]));

        set((state) => ({
          practiceSessions: state.practiceSessions.map((item) =>
            item.id === sessionId
              ? {
                  ...item,
                  blocks: blockIds.map((blockId, index) => ({ ...blocksById.get(blockId)!, order: index })),
                  updatedAt: nowIso(),
                }
              : item,
          ),
        }));

        return true;
      },
      startPracticeBlock: (sessionId, blockId) => {
        const session = findSession(get().practiceSessions, sessionId);
        const block = session?.blocks.find((item) => item.id === blockId);

        if (!session || !block || isSessionClosed(session) || hasLivePracticeBlock(session) || block.status !== 'planned') {
          return false;
        }

        const updatedAt = nowIso();

        set((state) => ({
          activePracticeSessionId: sessionId,
          practiceSessions: state.practiceSessions.map((item) =>
            item.id === sessionId
              ? {
                  ...item,
                  status: 'live',
                  startedAt: item.startedAt ?? updatedAt,
                  updatedAt,
                  blocks: item.blocks.map((currentBlock) =>
                    currentBlock.id === blockId
                      ? { ...currentBlock, status: 'live', startedAt: currentBlock.startedAt ?? updatedAt }
                      : currentBlock,
                  ),
                }
              : item,
          ),
        }));

        return true;
      },
      completePracticeBlock: (sessionId, blockId) => {
        const session = findSession(get().practiceSessions, sessionId);
        const block = session?.blocks.find((item) => item.id === blockId);

        if (!session || !block || isSessionClosed(session) || block.status === 'completed' || block.status === 'skipped') {
          return false;
        }

        const updatedAt = nowIso();

        set((state) => ({
          practiceSessions: state.practiceSessions.map((item) =>
            item.id === sessionId
              ? {
                  ...item,
                  updatedAt,
                  blocks: item.blocks.map((currentBlock) =>
                    currentBlock.id === blockId
                      ? { ...currentBlock, status: 'completed', endedAt: currentBlock.endedAt ?? updatedAt }
                      : currentBlock,
                  ),
                }
              : item,
          ),
        }));

        return true;
      },
      skipPracticeBlock: (sessionId, blockId) => {
        const session = findSession(get().practiceSessions, sessionId);
        const block = session?.blocks.find((item) => item.id === blockId);

        if (!session || !block || isSessionClosed(session) || block.status === 'completed' || block.status === 'skipped') {
          return false;
        }

        const updatedAt = nowIso();

        set((state) => ({
          practiceSessions: state.practiceSessions.map((item) =>
            item.id === sessionId
              ? {
                  ...item,
                  updatedAt,
                  blocks: item.blocks.map((currentBlock) =>
                    currentBlock.id === blockId
                      ? { ...currentBlock, status: 'skipped', endedAt: currentBlock.endedAt ?? updatedAt }
                      : currentBlock,
                  ),
                }
              : item,
          ),
        }));

        return true;
      },
      addPracticeNote: (sessionId, note) => {
        const session = findSession(get().practiceSessions, sessionId);
        const trimmedNote = note.trim();

        if (!session || isSessionClosed(session) || !trimmedNote) {
          return false;
        }

        set((state) => ({
          practiceSessions: state.practiceSessions.map((item) =>
            item.id === sessionId
              ? { ...item, notes: appendNote(item.notes, trimmedNote), updatedAt: nowIso() }
              : item,
          ),
        }));

        return true;
      },
      addPracticeEvent: (sessionId, blockId, input) => {
        const session = findSession(get().practiceSessions, sessionId);
        const block = session?.blocks.find((item) => item.id === blockId);

        if (!session || !block || isSessionClosed(session)) {
          return false;
        }

        const event: TrainingPracticeEvent = {
          id: `practice-event-${createId()}`,
          blockId,
          createdAt: nowIso(),
          type: input.type,
          playerId: input.playerId,
          label: input.label?.trim() || undefined,
          value: typeof input.value === 'number' && Number.isFinite(input.value) ? input.value : undefined,
          note: input.note?.trim() || undefined,
        };

        set((state) => ({
          practiceSessions: state.practiceSessions.map((item) =>
            item.id === sessionId
              ? {
                  ...item,
                  updatedAt: nowIso(),
                  blocks: item.blocks.map((currentBlock) =>
                    currentBlock.id === blockId
                      ? { ...currentBlock, events: [...currentBlock.events, event] }
                      : currentBlock,
                  ),
                }
              : item,
          ),
        }));

        return true;
      },
      addPracticeMetric: (sessionId, blockId, input) => {
        const session = findSession(get().practiceSessions, sessionId);
        const block = session?.blocks.find((item) => item.id === blockId);
        const label = input.label.trim();

        if (!session || !block || isSessionClosed(session) || !label || !Number.isFinite(input.value)) {
          return false;
        }

        const metric: TrainingPracticeMetric = {
          id: `practice-metric-${createId()}`,
          playerId: input.playerId,
          label,
          value: input.value,
          unit: input.unit,
        };

        const event: TrainingPracticeEvent = {
          id: `practice-event-${createId()}`,
          blockId,
          createdAt: nowIso(),
          type: 'metric',
          playerId: input.playerId,
          label,
          value: input.value,
        };

        set((state) => ({
          practiceSessions: state.practiceSessions.map((item) =>
            item.id === sessionId
              ? {
                  ...item,
                  updatedAt: nowIso(),
                  blocks: item.blocks.map((currentBlock) =>
                    currentBlock.id === blockId
                      ? {
                          ...currentBlock,
                          metrics: [...currentBlock.metrics, metric],
                          events: [...currentBlock.events, event],
                        }
                      : currentBlock,
                  ),
                }
              : item,
          ),
        }));

        return true;
      },
      getActivePracticeSession: () => {
        const { activePracticeSessionId, practiceSessions } = get();

        return activePracticeSessionId
          ? practiceSessions.find((session) => session.id === activePracticeSessionId)
          : undefined;
      },
      restorePracticeSessions: (practiceSessions) => {
        if (!Array.isArray(practiceSessions)) {
          return false;
        }

        try {
          set({
            activePracticeSessionId: undefined,
            practiceSessions: practiceSessions.map(normalizePracticeSessionForState),
          });
          return true;
        } catch {
          return false;
        }
      },
      resetPracticeData: () => set({ activePracticeSessionId: undefined, practiceSessions: [] }),
    }),
    {
      name: STORAGE_KEYS.practiceState,
      version: PRACTICE_STORE_DATA_VERSION,
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      migrate: (persistedState) => {
        const state = persistedState as Partial<PracticeState> | undefined;

        return {
          ...state,
          hasHydrated: false,
          practiceSessions: (state?.practiceSessions ?? []).map(normalizePracticeSessionForState),
          activePracticeSessionId: state?.activePracticeSessionId,
        };
      },
      partialize: (state) => ({
        practiceSessions: state.practiceSessions,
        activePracticeSessionId: state.activePracticeSessionId,
      }),
      storage: createJSONStorage(() => appStorage),
    },
  ),
);
