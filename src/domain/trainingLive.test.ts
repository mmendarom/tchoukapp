import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { formatTrainingEventLabel, formatTrainingMiniMatchScore, getTrainingTeamPlayers, trainingStatusLabel } from './trainingLive';
import { Player } from './types';
import { TrainingSession } from './training';

const players: Player[] = [
  { id: 'p1', firstName: 'Mauro', lastName: 'Mendaro', number: 3, position: 'Wing', usualPlayingZone: 'izquierda', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'p2', firstName: 'Tadeo', lastName: '', number: 8, position: 'Center', usualPlayingZone: 'central', dominantHand: 'Left', caps: 0, goals: 0, blocks: 0 },
];

const session: TrainingSession = {
  id: 'session-1',
  createdAt: 'now',
  updatedAt: 'now',
  participantPlayerIds: ['p1', 'p2'],
  teams: [
    { id: 'team-a', name: 'Equipo 1', playerIds: ['p1'], queueOrder: 0 },
    { id: 'team-b', name: 'Equipo 2', playerIds: ['p2'], queueOrder: 1 },
  ],
  miniMatches: [],
  settings: { targetScore: 3, winnerStays: true },
  status: 'live',
};

describe('training live helpers', () => {
  it('uses Spanish status labels', () => {
    expect(trainingStatusLabel.live).toBe('En vivo');
    expect(trainingStatusLabel.finished).toBe('Finalizado');
  });

  it('formats mini-match score with team names', () => {
    expect(formatTrainingMiniMatchScore(session, {
      id: 'mini-1',
      sessionId: 'session-1',
      teamAId: 'team-a',
      teamBId: 'team-b',
      scoreA: 2,
      scoreB: 1,
      targetScore: 3,
      status: 'live',
      events: [],
    })).toBe('Equipo 1 2 - 1 Equipo 2');
  });

  it('filters selectable players by team', () => {
    expect(getTrainingTeamPlayers(session.teams[0], players).map((player) => player.id)).toEqual(['p1']);
  });

  it('formats training event labels without raw event names', () => {
    expect(formatTrainingEventLabel({
      id: 'event-1',
      sessionId: 'session-1',
      miniMatchId: 'mini-1',
      createdAt: 'now',
      teamId: 'team-a',
      playerId: 'p1',
      type: 'point',
    }, session, players)).toBe('#3 Mendaro punto para Equipo 1');
    expect(formatTrainingEventLabel({
      id: 'event-2',
      sessionId: 'session-1',
      miniMatchId: 'mini-1',
      createdAt: 'now',
      teamId: 'team-b',
      playerId: 'p2',
      type: 'shot_defended',
      defendingTeamId: 'team-a',
      defenderPlayerId: 'p1',
    }, session, players)).toBe('#8 Tadeo tiro atajado por #3 Mendaro');
    expect(formatTrainingEventLabel({
      id: 'event-3',
      sessionId: 'session-1',
      miniMatchId: 'mini-1',
      createdAt: 'now',
      teamId: 'team-b',
      playerId: 'p2',
      type: 'error',
      errorSubtype: 'line_step',
    }, session, players)).toBe('#8 Tadeo pisa la línea');
    expect(formatTrainingEventLabel({
      id: 'event-4',
      sessionId: 'session-1',
      miniMatchId: 'mini-1',
      createdAt: 'now',
      teamId: 'team-b',
      playerId: 'p2',
      type: 'shot_defended',
    }, session, players)).toBe('#8 Tadeo tiro defendido');
  });

  it('keeps live training UI player-centric and stops creating standalone defense events', () => {
    const source = readFileSync(join(process.cwd(), 'src/screens/LiveTrainingMiniMatchScreen.tsx'), 'utf8');

    expect(source).toContain('Lo atajaron');
    expect(source).toContain('¿Quién lo atajó?');
    expect(source).toContain("type: 'shot_defended'");
    expect(source).not.toContain("type: 'defense'");
  });

  it('keeps legacy location events without scope compatible', () => {
    expect(formatTrainingEventLabel({
      id: 'legacy-event',
      sessionId: 'session-1',
      miniMatchId: 'mini-1',
      createdAt: 'now',
      teamId: 'team-a',
      playerId: 'p1',
      type: 'point',
      location: { x: 0.25, y: 0.75 },
    }, session, players)).toBe('#3 Mendaro punto para Equipo 1');
  });
});
