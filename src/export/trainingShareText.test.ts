import { describe, expect, it } from 'vitest';

import { TrainingEvent, TrainingMiniMatch, TrainingSession, TrainingTeam } from '../domain/training';
import { CourtLocation, Player } from '../domain/types';
import { buildTrainingShareText } from './trainingShareText';

const players: Player[] = [
  { id: 'p1', firstName: 'Nicolas', lastName: 'Nico', number: 3, position: 'Wing', usualPlayingZone: 'izquierda', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'p2', firstName: 'Federico', lastName: 'Fede', number: 11, position: 'Center', usualPlayingZone: 'central', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'p3', firstName: 'Mateo', lastName: 'Mateo', number: 7, position: 'Wing', usualPlayingZone: 'derecha', dominantHand: 'Left', caps: 0, goals: 0, blocks: 0 },
  { id: 'p4', firstName: 'Vladimir', lastName: 'Vladi', number: 4, position: 'Center', usualPlayingZone: 'central', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'p5', firstName: 'Bajo', lastName: 'Volumen', number: 9, position: 'Wing', usualPlayingZone: 'izquierda', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'p6', firstName: 'Leon', lastName: 'Leon', number: 6, position: 'Wing', usualPlayingZone: 'derecha', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
];

const teams: TrainingTeam[] = [
  { id: 'team-a', name: 'Equipo 1', playerIds: ['p1', 'p2'], queueOrder: 0 },
  { id: 'team-b', name: 'Equipo 2', playerIds: ['p3', 'p4'], queueOrder: 1 },
  { id: 'team-c', name: 'Equipo 3', playerIds: ['p5', 'p6'], queueOrder: 2 },
];

let eventCounter = 0;
const event = (
  miniMatchId: string,
  teamId: string,
  playerId: string,
  type: TrainingEvent['type'],
  location?: CourtLocation,
): TrainingEvent => ({
  id: `event-${eventCounter += 1}`,
  sessionId: 'session-1',
  miniMatchId,
  createdAt: '2026-06-22T18:00:00.000Z',
  teamId,
  playerId,
  type,
  location,
});

const miniMatch = (
  id: string,
  teamAId: string,
  teamBId: string,
  status: TrainingMiniMatch['status'],
  events: TrainingEvent[],
): TrainingMiniMatch => ({
  id,
  sessionId: 'session-1',
  teamAId,
  teamBId,
  scoreA: 0,
  scoreB: 0,
  targetScore: 3,
  status,
  events,
});

const buildSession = (miniMatches: TrainingMiniMatch[] = []): TrainingSession => ({
  id: 'session-1',
  createdAt: '2026-06-22T18:00:00.000Z',
  updatedAt: '2026-06-22T18:30:00.000Z',
  teamPoolName: 'Mayores',
  participantPlayerIds: players.map((player) => player.id),
  teams,
  miniMatches,
  settings: { targetScore: 3, winnerStays: true },
  status: 'finished',
});

const richSession = () => {
  const firstId = 'mini-1';
  const secondId = 'mini-2';
  const cancelledId = 'mini-cancelled';

  return buildSession([
    miniMatch(firstId, 'team-a', 'team-b', 'finished', [
      event(firstId, 'team-a', 'p1', 'point'),
      event(firstId, 'team-a', 'p1', 'point', { x: 0.8, y: 0.5 }),
      event(firstId, 'team-a', 'p1', 'point', { x: 0.8, y: 0.95 }),
      event(firstId, 'team-a', 'p1', 'shot_defended', { x: 0.5, y: 0.05 }),
      event(firstId, 'team-b', 'p3', 'point', { x: 0.2, y: 0.5 }),
      event(firstId, 'team-b', 'p3', 'point', { x: 0.2, y: 0.95 }),
      event(firstId, 'team-b', 'p4', 'defense'),
      event(firstId, 'team-b', 'p4', 'defense'),
      event(firstId, 'team-a', 'p2', 'error'),
      event(firstId, 'team-a', 'p2', 'error'),
    ]),
    miniMatch(secondId, 'team-a', 'team-c', 'finished', [
      event(secondId, 'team-a', 'p1', 'point', { x: 0.8, y: 0.5 }),
      event(secondId, 'team-a', 'p1', 'point', { x: 0.5, y: 0.05 }),
      event(secondId, 'team-c', 'p5', 'point', { x: 0.8, y: 0.5 }),
      event(secondId, 'team-c', 'p6', 'own_point_against'),
    ]),
    miniMatch(cancelledId, 'team-b', 'team-c', 'cancelled', [
      event(cancelledId, 'team-c', 'p5', 'point'),
      event(cancelledId, 'team-c', 'p5', 'point'),
      event(cancelledId, 'team-c', 'p5', 'point'),
    ]),
  ]);
};

describe('training share text', () => {
  it('includes title, team pool, date, target and mini-match count', () => {
    const text = buildTrainingShareText(richSession(), players);

    expect(text).toContain('Práctica 3v3 · Mayores');
    expect(text).toContain('Fecha:');
    expect(text).toContain('Mini partidos: 2 · A 3 puntos');
  });

  it('includes team standings ordered by wins, point diff and points for', () => {
    const text = buildTrainingShareText(richSession(), players);

    expect(text).toContain('Equipos\n1. Equipo 1 — 2G / 0P · +3');
    expect(text.indexOf('Equipo 1 —')).toBeLessThan(text.indexOf('Equipo 2 —'));
  });

  it('includes top attack with high scorer ahead of low-volume 100 percent shooter', () => {
    const text = buildTrainingShareText(richSession(), players);

    expect(text).toContain('Top ataque\n#3 Nico · 5/6 tiros · 83%');
    expect(text.indexOf('#3 Nico · 5/6')).toBeLessThan(text.indexOf('#9 Volumen · 1/1 tiros · 100%'));
  });

  it('includes top defense and problem alerts', () => {
    const text = buildTrainingShareText(richSession(), players);

    expect(text).toContain('Top defensa\n#4 Vladi · 2 defensas');
    expect(text).toContain('Alertas\n#11 Fede · 2 errores');
    expect(text).toContain('#6 Leon · 1 punto en contra');
  });

  it('includes compact mini-match history and excludes cancelled matches', () => {
    const text = buildTrainingShareText(richSession(), players);

    expect(text).toContain('Mini partidos\nEquipo 1 3 - 2 Equipo 2');
    expect(text).toContain('Equipo 1 3 - 1 Equipo 3');
    expect(text).not.toContain('Equipo 2 0 - 3 Equipo 3');
  });

  it('uses one-goal tactical labels for training location summaries', () => {
    const text = buildTrainingShareText(richSession(), players);

    expect(text).toContain('Zonas donde más convertimos\nlado derecho · 30°-60° (3)');
    expect(text).toContain('centro · 60°-90° (1)');
    expect(text).toContain('Zonas donde más nos defendieron\ncentro · 60°-90° (1)');
    expect(text).not.toMatch(/marco izquierdo|marco derecho|zona izquierda|zona derecha|120°|150°|180°/i);
  });

  it('builds a safe useful summary for an empty archived session', () => {
    const text = buildTrainingShareText({
      ...buildSession(),
      archivedAt: '2026-06-22T20:00:00.000Z',
    }, players);

    expect(text).toContain('Mini partidos: 0 · A 3 puntos');
    expect(text).toContain('Sin tiros registrados.');
    expect(text).toContain('Sin defensas registradas.');
    expect(text).toContain('Sin mini partidos registrados.');
  });

  it('handles an active-only session and marks the match as live', () => {
    const active = miniMatch('mini-live', 'team-a', 'team-b', 'live', []);
    const text = buildTrainingShareText(buildSession([active]), players);

    expect(text).toContain('Mini partidos: 1 · A 3 puntos');
    expect(text).toContain('Equipo 1 0 - 0 Equipo 2 · En vivo');
  });

  it('limits history to ten rows and reports hidden mini matches', () => {
    const miniMatches = Array.from({ length: 12 }, (_, index) =>
      miniMatch(`mini-${index + 1}`, 'team-a', 'team-b', 'finished', []),
    );
    const text = buildTrainingShareText(buildSession(miniMatches), players);
    const history = text.split('Mini partidos\n')[1];

    expect(history.split('\n')).toHaveLength(11);
    expect(history).toContain('+2 mini partidos más');
  });
});
