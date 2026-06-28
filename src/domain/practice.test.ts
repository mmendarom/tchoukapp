import { describe, expect, it } from 'vitest';

import {
  buildTrainingBlock,
  filterTrainingPracticeSessions,
  getTrainingPracticeSummary,
  normalizePracticeDurationMinutes,
  normalizeTrainingPracticeSession,
  trainingBlockTypeLabels,
  validateTrainingPracticeSessionInput,
} from './practice';

describe('practice domain', () => {
  it('validates the minimum training practice setup', () => {
    expect(validateTrainingPracticeSessionInput({
      teamPoolId: 'mayores',
      participantPlayerIds: ['p1', 'p2'],
      objective: 'Mejorar recepcion',
      blocks: [{ title: 'Defensa/recepcion' }],
    })).toEqual({ valid: true });

    expect(validateTrainingPracticeSessionInput({
      teamPoolId: 'mayores',
      participantPlayerIds: [],
      objective: 'Mejorar recepcion',
      blocks: [{ title: 'Defensa/recepcion' }],
    })).toMatchObject({ valid: false, reason: 'participants_required' });

    expect(validateTrainingPracticeSessionInput({
      teamPoolId: 'mayores',
      participantPlayerIds: ['p1'],
      objective: '',
      blocks: [{ title: 'Defensa/recepcion' }],
    })).toMatchObject({ valid: false, reason: 'objective_required' });
  });

  it('normalizes duplicate participants, block order and optional arrays', () => {
    const session = normalizeTrainingPracticeSession({
      id: 'practice-1',
      date: '2026-06-27T18:00:00.000Z',
      createdAt: '2026-06-27T18:00:00.000Z',
      updatedAt: '2026-06-27T18:00:00.000Z',
      participantPlayerIds: ['p1', 'p2', 'p1', ''],
      objective: 'Ataque por zona',
      status: 'live',
      blocks: [
        {
          id: 'block-2',
          sessionId: 'practice-1',
          title: 'Cierre',
          type: 'free',
          events: [],
          metrics: [],
          order: 2,
          status: 'planned',
        },
        {
          id: 'block-1',
          sessionId: 'practice-1',
          title: 'Ataque',
          type: 'attack',
          durationMinutes: 18.6,
          events: [],
          metrics: [],
          order: 0,
          status: 'completed',
        },
      ],
    });

    expect(session.participantPlayerIds).toEqual(['p1', 'p2']);
    expect(session.blocks.map((block) => [block.id, block.order])).toEqual([
      ['block-1', 0],
      ['block-2', 1],
    ]);
    expect(session.blocks[0]).toMatchObject({
      durationMinutes: 19,
      events: [],
      metrics: [],
    });
  });

  it('builds a safe block and rejects a blank title', () => {
    expect(buildTrainingBlock({
      sessionId: 'practice-1',
      title: 'Transicion ataque-defensa',
      type: 'mixed',
      durationMinutes: 20,
    })).toMatchObject({
      sessionId: 'practice-1',
      title: 'Transicion ataque-defensa',
      type: 'mixed',
      durationMinutes: 20,
      status: 'planned',
    });
    expect(buildTrainingBlock({ sessionId: 'practice-1', title: '   ' })).toBeUndefined();
  });

  it('clamps practice duration to a useful coaching range', () => {
    expect(normalizePracticeDurationMinutes(0)).toBeUndefined();
    expect(normalizePracticeDurationMinutes(12.4)).toBe(12);
    expect(normalizePracticeDurationMinutes(999)).toBe(240);
  });

  it('summarizes attendance, blocks, minutes and player events', () => {
    const session = normalizeTrainingPracticeSession({
      id: 'practice-1',
      date: '2026-06-27T18:00:00.000Z',
      createdAt: '2026-06-27T18:00:00.000Z',
      updatedAt: '2026-06-27T18:00:00.000Z',
      participantPlayerIds: ['p1', 'p2', 'p1'],
      objective: 'Defensa',
      blocks: [
        {
          id: 'block-1',
          sessionId: 'practice-1',
          title: 'Defensa',
          type: 'defense',
          durationMinutes: 30,
          order: 0,
          status: 'completed',
          events: [{ id: 'event-1', blockId: 'block-1', createdAt: '2026-06-27T18:10:00.000Z', type: 'player_highlight', playerId: 'p1' }],
          metrics: [],
        },
        {
          id: 'block-2',
          sessionId: 'practice-1',
          title: 'Seguimiento',
          type: 'tactical',
          durationMinutes: 20,
          order: 1,
          status: 'skipped',
          events: [{ id: 'event-2', blockId: 'block-2', createdAt: '2026-06-27T18:20:00.000Z', type: 'player_follow_up', playerId: 'p2' }],
          metrics: [],
        },
      ],
    });

    expect(getTrainingPracticeSummary(session)).toEqual({
      attendanceCount: 2,
      totalBlocks: 2,
      plannedBlocks: 0,
      liveBlocks: 0,
      completedBlocks: 1,
      skippedBlocks: 1,
      plannedMinutes: 50,
      completedMinutes: 30,
      highlightCount: 1,
      followUpCount: 1,
    });
  });

  it('filters active, finished and archived practices', () => {
    const base = {
      date: '2026-06-27T18:00:00.000Z',
      createdAt: '2026-06-27T18:00:00.000Z',
      updatedAt: '2026-06-27T18:00:00.000Z',
      participantPlayerIds: ['p1'],
      objective: 'Objetivo',
      blocks: [{ id: 'block-1', sessionId: 'practice-1', title: 'Bloque', type: 'free' as const, events: [], metrics: [], order: 0, status: 'planned' as const }],
    };
    const sessions = [
      normalizeTrainingPracticeSession({ ...base, id: 'draft', status: 'draft' }),
      normalizeTrainingPracticeSession({ ...base, id: 'finished', status: 'finished' }),
      normalizeTrainingPracticeSession({ ...base, id: 'cancelled', status: 'cancelled' }),
      normalizeTrainingPracticeSession({ ...base, id: 'archived', status: 'draft', archivedAt: '2026-06-28T12:00:00.000Z' }),
    ];

    expect(filterTrainingPracticeSessions(sessions, 'active').map((session) => session.id)).toEqual(['draft']);
    expect(filterTrainingPracticeSessions(sessions, 'finished').map((session) => session.id)).toEqual(['finished', 'cancelled']);
    expect(filterTrainingPracticeSessions(sessions, 'archived').map((session) => session.id)).toEqual(['archived']);
    expect(trainingBlockTypeLabels.scrimmage).toBe('Juego aplicado');
  });
});
