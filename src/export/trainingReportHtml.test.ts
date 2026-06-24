import { describe, expect, it } from 'vitest';

import { TrainingEvent, TrainingMiniMatch, TrainingSession, TrainingTeam } from '../domain/training';
import { buildTrainingReportData } from '../domain/trainingReportData';
import { CourtLocation, Player } from '../domain/types';
import { buildTrainingReportHtml, TRAINING_REPORT_GOAL_MAP_GEOMETRY } from './trainingReportHtml';

const players: Player[] = [
  { id: 'p1', firstName: 'Mauro', lastName: 'Mauro', number: 3, position: 'Wing', usualPlayingZone: 'izquierda', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'p2', firstName: 'Nico', lastName: 'Nico', number: 7, position: 'Wing', usualPlayingZone: 'derecha', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'p3', firstName: 'Vladi', lastName: 'Vladi', number: 4, position: 'Center', usualPlayingZone: 'central', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'p4', firstName: 'Fede', lastName: 'Fede', number: 11, position: 'Wing', usualPlayingZone: 'izquierda', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'p5', firstName: 'Tadeo', lastName: 'Tadeo', number: 8, position: 'Center', usualPlayingZone: 'central', dominantHand: 'Left', caps: 0, goals: 0, blocks: 0 },
  { id: 'p6', firstName: 'Enano', lastName: 'Enano', number: 9, position: 'Wing', usualPlayingZone: 'derecha', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
];

const teams: TrainingTeam[] = [
  { id: 'team-a', name: 'Equipo 1', playerIds: ['p1', 'p2', 'p3'], queueOrder: 0 },
  { id: 'team-b', name: 'Equipo 2', playerIds: ['p4', 'p5', 'p6'], queueOrder: 1 },
];

let eventCounter = 0;
const event = (
  miniMatchId: string,
  teamId: string,
  playerId: string,
  type: TrainingEvent['type'],
  location?: CourtLocation,
  overrides: Partial<TrainingEvent> = {},
): TrainingEvent => ({
  id: `event-${eventCounter += 1}`,
  sessionId: 'session-1',
  miniMatchId,
  createdAt: '2026-06-23T18:00:00.000Z',
  teamId,
  playerId,
  type,
  location,
  ...overrides,
});

const miniMatch = (events: TrainingEvent[], status: TrainingMiniMatch['status'] = 'finished'): TrainingMiniMatch => ({
  id: `mini-${status}`,
  sessionId: 'session-1',
  teamAId: 'team-a',
  teamBId: 'team-b',
  scoreA: 0,
  scoreB: 0,
  targetScore: 3,
  status,
  events,
});

const buildSession = (miniMatches: TrainingMiniMatch[] = []): TrainingSession => ({
  id: 'session-1',
  createdAt: '2026-06-23T18:00:00.000Z',
  updatedAt: '2026-06-23T19:00:00.000Z',
  teamPoolName: 'Mayores',
  participantPlayerIds: players.map((player) => player.id),
  teams,
  miniMatches,
  settings: { targetScore: 3, winnerStays: true },
  status: 'finished',
});

const richHtml = () => {
  const miniMatchId = 'mini-rich';
  const report = buildTrainingReportData(buildSession([
    {
      ...miniMatch([
        event(miniMatchId, 'team-a', 'p1', 'point', { x: 0.8, y: 0.5 }),
        event(miniMatchId, 'team-a', 'p2', 'shot_defended', { x: 0.5, y: 0.05 }, { defenderPlayerId: 'p4', defendingTeamId: 'team-b' }),
        event(miniMatchId, 'team-b', 'p4', 'shot_defended', { x: 0.2, y: 0.95 }, { defenderPlayerId: 'p2', defendingTeamId: 'team-a' }),
        event(miniMatchId, 'team-a', 'p3', 'error', undefined, { errorSubtype: 'invasion' }),
        event(miniMatchId, 'team-b', 'p5', 'own_point_against'),
      ]),
      id: miniMatchId,
    },
  ]), players);

  return buildTrainingReportHtml(report);
};

describe('training report html', () => {
  it('contains required PDF sections and team player names', () => {
    const html = richHtml();

    expect(html).toContain('Práctica 3v3');
    expect(html).toContain('Equipos');
    expect(html).toContain('Equipo 1');
    expect(html).toContain('#3 Mauro');
    expect(html).toContain('Tabla de equipos');
    expect(html).toContain('Rendimiento jugadores');
    expect(html).toContain('Mini partidos');
  });

  it('contains one-frame maps for converted and defended shots', () => {
    const html = richHtml();

    expect(html).toContain('Dónde convertimos');
    expect(html).toContain('Dónde nos defendieron');
    expect(html).toContain('training-goal-map');
    expect(html).toContain('0° fondo');
    expect(html).toContain('90° centro del área');
    expect(html).toContain('forbidden-semicircle');
    expect(html).toContain('band-guide-thirty');
  });

  it('uses one shared one-frame geometry for every training PDF map', () => {
    const html = richHtml();

    expect(TRAINING_REPORT_GOAL_MAP_GEOMETRY).toMatchObject({
      frameLeft: '33%',
      frameBottom: '0',
      frameWidth: '34%',
      semicircleBottom: '-38%',
      lowerBandTop: '66.66%',
      upperBandTop: '33.33%',
      topLabel: '90° centro del área',
    });
    expect(html).toContain(`left: ${TRAINING_REPORT_GOAL_MAP_GEOMETRY.frameLeft}`);
    expect(html).toContain(`bottom: ${TRAINING_REPORT_GOAL_MAP_GEOMETRY.semicircleBottom}`);
    expect(html).toContain('Guía: 0° fondo · 45° intermedio · 90° centro del área');
    expect(html).not.toMatch(/120°|150°|180°/i);
  });

  it('keeps marker coordinates as normalized data attributes', () => {
    const html = richHtml();

    expect(html).toContain('data-x="0.800"');
    expect(html).toContain('data-y="0.500"');
    expect(html).toContain('data-x="0.500"');
    expect(html).toContain('data-y="0.050"');
  });

  it('uses only training one-goal labels in tactical sectors', () => {
    const html = richHtml();

    expect(html).toContain('Zonas donde más convertimos');
    expect(html).toContain('Zonas donde más nos defendieron');
    expect(html).toContain('lado derecho · 30°-60°');
    expect(html).toContain('centro · 60°-90°');
    expect(html).not.toMatch(/marco izquierdo|marco derecho|zona izquierda|zona derecha|120°|150°|180°/i);
  });

  it('shows empty map states safely', () => {
    const html = buildTrainingReportHtml(buildTrainingReportData(buildSession(), players));

    expect(html).toContain('Sin ubicaciones registradas.');
    expect(html).toContain('training-goal-map');
  });

  it('includes player detail pages with shot and defense maps', () => {
    const html = richHtml();

    expect(html).toContain('Detalle por jugador');
    expect(html).toContain('#3 Mauro');
    expect(html).toContain('Mapa de tiros');
    expect(html).toContain('Mapa de defensas');
    expect(html).toContain('Mini partidos');
    expect(html).toContain('Efectividad');
    expect(html).toContain('map-dot-point');
    expect(html).toContain('map-dot-defended-shot');
    expect(html).toContain('map-dot-defense');
    expect(html).toContain('Sin defensas registradas.');
  });
});
