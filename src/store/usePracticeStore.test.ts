import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getTrainingPracticeSummary } from '../domain/practice';
import { STORAGE_KEYS } from '../storage/asyncStorage';
import { usePracticeStore } from './usePracticeStore';

const baseBlocks = [
  { title: 'Defensa/recepcion', type: 'defense' as const, durationMinutes: 25 },
  { title: 'Ataque por zona', type: 'attack' as const, durationMinutes: 30 },
];

const createPractice = () => usePracticeStore.getState().createPracticeSession({
  teamPoolId: 'mayores',
  teamPoolName: 'Mayores',
  participantPlayerIds: ['p1', 'p2', 'p1'],
  objective: 'Mejorar lectura defensiva',
  blocks: baseBlocks,
  notes: 'Primer corte',
});

const getSession = (sessionId: string) => {
  const session = usePracticeStore.getState().practiceSessions.find((item) => item.id === sessionId);

  if (!session) {
    throw new Error('Expected practice session');
  }

  return session;
};

const flushPersist = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('usePracticeStore', () => {
  beforeEach(async () => {
    vi.useRealTimers();
    await AsyncStorage.clear();
    usePracticeStore.getState().resetPracticeData();
    usePracticeStore.getState().setHasHydrated(false);
  });

  it('creates a draft practice session with normalized participants and blocks', () => {
    const sessionId = createPractice();
    const session = getSession(sessionId);

    expect(session).toMatchObject({
      teamPoolId: 'mayores',
      teamPoolName: 'Mayores',
      participantPlayerIds: ['p1', 'p2'],
      objective: 'Mejorar lectura defensiva',
      status: 'draft',
      notes: 'Primer corte',
    });
    expect(session.blocks.map((block) => [block.title, block.order, block.status])).toEqual([
      ['Defensa/recepcion', 0, 'planned'],
      ['Ataque por zona', 1, 'planned'],
    ]);
    expect(usePracticeStore.getState().activePracticeSessionId).toBe(sessionId);
  });

  it('rejects invalid setup without mutating state', () => {
    const sessionId = usePracticeStore.getState().createPracticeSession({
      teamPoolId: 'mayores',
      teamPoolName: 'Mayores',
      participantPlayerIds: [],
      objective: ' ',
      blocks: [{ title: 'Defensa' }],
    });

    expect(sessionId).toBe('');
    expect(usePracticeStore.getState().practiceSessions).toHaveLength(0);
  });

  it('persists practice sessions under their own storage key', async () => {
    const sessionId = createPractice();

    await flushPersist();

    const persisted = await AsyncStorage.getItem(STORAGE_KEYS.practiceState);

    expect(persisted).toContain(sessionId);
    expect(persisted).toContain('practiceSessions');
    expect(persisted).not.toContain('matches');
  });

  it('starts and finishes a practice session', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-27T18:00:00.000Z'));
    const sessionId = createPractice();

    expect(usePracticeStore.getState().startPracticeSession(sessionId)).toBe(true);
    expect(getSession(sessionId)).toMatchObject({
      status: 'live',
      startedAt: '2026-06-27T18:00:00.000Z',
    });

    vi.setSystemTime(new Date('2026-06-27T19:30:00.000Z'));
    expect(usePracticeStore.getState().finishPracticeSession(sessionId)).toBe(true);
    expect(getSession(sessionId)).toMatchObject({
      status: 'finished',
      finishedAt: '2026-06-27T19:30:00.000Z',
    });
    expect(usePracticeStore.getState().activePracticeSessionId).toBeUndefined();
  });

  it('allows only one live block at a time and completes it', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-27T18:10:00.000Z'));
    const sessionId = createPractice();
    const [firstBlock, secondBlock] = getSession(sessionId).blocks;

    expect(usePracticeStore.getState().startPracticeBlock(sessionId, firstBlock.id)).toBe(true);
    expect(usePracticeStore.getState().startPracticeBlock(sessionId, secondBlock.id)).toBe(false);
    expect(getSession(sessionId).blocks[0]).toMatchObject({
      status: 'live',
      startedAt: '2026-06-27T18:10:00.000Z',
    });

    vi.setSystemTime(new Date('2026-06-27T18:35:00.000Z'));
    expect(usePracticeStore.getState().completePracticeBlock(sessionId, firstBlock.id)).toBe(true);
    expect(getSession(sessionId).blocks[0]).toMatchObject({
      status: 'completed',
      endedAt: '2026-06-27T18:35:00.000Z',
    });
  });

  it('adds notes, highlights and metrics to derive a useful summary', () => {
    const sessionId = createPractice();
    const blockId = getSession(sessionId).blocks[0].id;

    expect(usePracticeStore.getState().addPracticeNote(sessionId, 'Buena energia defensiva')).toBe(true);
    expect(usePracticeStore.getState().addPracticeEvent(sessionId, blockId, {
      type: 'player_highlight',
      playerId: 'p1',
      note: 'Muy buena lectura de rebote',
    })).toBe(true);
    expect(usePracticeStore.getState().addPracticeMetric(sessionId, blockId, {
      playerId: 'p1',
      label: 'Recepciones limpias',
      value: 8,
      unit: 'successes',
    })).toBe(true);

    const session = getSession(sessionId);

    expect(session.notes).toContain('Primer corte');
    expect(session.notes).toContain('Buena energia defensiva');
    expect(session.blocks[0].events).toHaveLength(2);
    expect(session.blocks[0].metrics).toHaveLength(1);
    expect(getTrainingPracticeSummary(session).highlightCount).toBe(1);
  });

  it('archives, restores and deletes practice sessions', () => {
    const sessionId = createPractice();

    expect(usePracticeStore.getState().archivePracticeSession(sessionId)).toBe(true);
    expect(getSession(sessionId).archivedAt).toBeTruthy();
    expect(usePracticeStore.getState().addPracticeNote(sessionId, 'No entra')).toBe(false);

    expect(usePracticeStore.getState().unarchivePracticeSession(sessionId)).toBe(true);
    expect(getSession(sessionId).archivedAt).toBeUndefined();

    expect(usePracticeStore.getState().deletePracticeSession(sessionId)).toBe(true);
    expect(usePracticeStore.getState().practiceSessions).toHaveLength(0);
  });

  it('restores and normalizes backed up practice sessions while clearing active state', () => {
    const sessionId = createPractice();
    const backedUpSessions = JSON.parse(JSON.stringify(usePracticeStore.getState().practiceSessions));

    backedUpSessions[0].participantPlayerIds = ['p2', 'p2', 'p1'];
    backedUpSessions[0].blocks.reverse();

    usePracticeStore.getState().resetPracticeData();
    expect(usePracticeStore.getState().restorePracticeSessions(backedUpSessions)).toBe(true);

    expect(usePracticeStore.getState().activePracticeSessionId).toBeUndefined();
    expect(getSession(sessionId).participantPlayerIds).toEqual(['p2', 'p1']);
    expect(getSession(sessionId).blocks.map((block) => block.order)).toEqual([0, 1]);
  });

  it('does not mutate practice state when restore input is invalid', () => {
    const sessionId = createPractice();
    const before = usePracticeStore.getState().practiceSessions;

    expect(usePracticeStore.getState().restorePracticeSessions(undefined as unknown as typeof before)).toBe(false);
    expect(usePracticeStore.getState().practiceSessions).toBe(before);
    expect(usePracticeStore.getState().activePracticeSessionId).toBe(sessionId);
  });
});
