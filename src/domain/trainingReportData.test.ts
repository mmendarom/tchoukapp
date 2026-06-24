import { describe, expect, it } from 'vitest';

import { TrainingEvent, TrainingMiniMatch, TrainingSession, TrainingTeam } from './training';
import { buildTrainingReportData } from './trainingReportData';
import { CourtLocation, Player } from './types';

const players: Player[] = [
  { id: 'p1', firstName: 'Mauro', lastName: 'Mauro', number: 3, position: 'Wing', usualPlayingZone: 'izquierda', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'p2', firstName: 'Nico', lastName: 'Nico', number: 7, position: 'Wing', usualPlayingZone: 'derecha', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'p3', firstName: 'Vladi', lastName: 'Vladi', number: 4, position: 'Center', usualPlayingZone: 'central', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'p4', firstName: 'Fede', lastName: 'Fede', number: 11, position: 'Wing', usualPlayingZone: 'izquierda', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'p5', firstName: 'Tadeo', lastName: 'Tadeo', number: 8, position: 'Center', usualPlayingZone: 'central', dominantHand: 'Left', caps: 0, goals: 0, blocks: 0 },
  { id: 'p6', firstName: 'Enano', lastName: 'Enano', number: 9, position: 'Wing', usualPlayingZone: 'derecha', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'p7', firstName: 'Leon', lastName: 'Leon', number: 6, position: 'Wing', usualPlayingZone: 'derecha', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'p8', firstName: 'Bauti', lastName: 'Bauti', number: 13, position: 'Wing', usualPlayingZone: 'izquierda', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'p9', firstName: 'Fran', lastName: 'Fran', number: 15, position: 'Center', usualPlayingZone: 'central', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
];

const teams: TrainingTeam[] = [
  { id: 'team-a', name: 'Equipo 1', playerIds: ['p1', 'p2', 'p3'], queueOrder: 0 },
  { id: 'team-b', name: 'Equipo 2', playerIds: ['p4', 'p5', 'p6'], queueOrder: 1 },
  { id: 'team-c', name: 'Equipo 3', playerIds: ['p7', 'p8', 'p9'], queueOrder: 2 },
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

const buildSession = (): TrainingSession => {
  const firstId = 'mini-1';
  const secondId = 'mini-2';
  const cancelledId = 'mini-cancelled';

  return {
    id: 'session-1',
    createdAt: '2026-06-23T18:00:00.000Z',
    updatedAt: '2026-06-23T19:00:00.000Z',
    teamPoolName: 'Mayores',
    participantPlayerIds: players.map((player) => player.id),
    teams,
    miniMatches: [
      miniMatch(firstId, 'team-a', 'team-b', 'finished', [
        event(firstId, 'team-a', 'p1', 'point', { x: 0.8, y: 0.5 }),
        event(firstId, 'team-a', 'p1', 'point', { x: 0.5, y: 0.05 }),
        event(firstId, 'team-a', 'p2', 'shot_defended', { x: 0.2, y: 0.95 }, { defenderPlayerId: 'p4', defendingTeamId: 'team-b' }),
        event(firstId, 'team-b', 'p5', 'point', { x: 0.2, y: 0.5 }),
        event(firstId, 'team-a', 'p3', 'error', undefined, { errorSubtype: 'line_step' }),
      ]),
      miniMatch(secondId, 'team-a', 'team-c', 'finished', [
        event(secondId, 'team-a', 'p1', 'point', { x: 0.8, y: 0.95 }),
        event(secondId, 'team-c', 'p7', 'point', { x: 0.5, y: 0.05 }),
        event(secondId, 'team-c', 'p7', 'shot_defended', { x: 0.8, y: 0.5 }, { defenderPlayerId: 'p2', defendingTeamId: 'team-a' }),
        event(secondId, 'team-c', 'p8', 'own_point_against'),
      ]),
      miniMatch(cancelledId, 'team-b', 'team-c', 'cancelled', [
        event(cancelledId, 'team-c', 'p7', 'point', { x: 0.8, y: 0.95 }),
        event(cancelledId, 'team-c', 'p7', 'point', { x: 0.8, y: 0.95 }),
        event(cancelledId, 'team-c', 'p7', 'point', { x: 0.8, y: 0.95 }),
      ]),
    ],
    settings: { targetScore: 3, winnerStays: true },
    status: 'finished',
  };
};

describe('training report data', () => {
  it('includes teams and player composition', () => {
    const report = buildTrainingReportData(buildSession(), players);

    expect(report.title).toBe('Práctica 3v3 · Mayores');
    expect(report.teams).toHaveLength(3);
    expect(report.teams[0]).toMatchObject({
      name: 'Equipo 1',
      players: ['#3 Mauro', '#7 Nico', '#4 Vladi'],
    });
  });

  it('includes standings sorted by training ranking rules and excludes cancelled mini matches', () => {
    const report = buildTrainingReportData(buildSession(), players);

    expect(report.standings[0]).toMatchObject({
      teamName: 'Equipo 1',
      played: 2,
      wins: 0,
      pointsFor: 4,
      pointsAgainst: 2,
    });
    expect(report.standings.find((team) => team.teamId === 'team-c')).toMatchObject({
      played: 1,
      pointsFor: 1,
    });
  });

  it('includes top attack, top defense, errors and own points against', () => {
    const report = buildTrainingReportData(buildSession(), players);

    expect(report.topAttack[0]).toMatchObject({ playerId: 'p1', points: 3, attempts: 3 });
    expect(report.topDefense[0]).toMatchObject({ playerId: 'p2', defenses: 1 });
    expect(report.errors).toContainEqual({ playerId: 'p3', playerName: '#4 Vladi', value: 1 });
    expect(report.ownPointsAgainst).toContainEqual({ playerId: 'p8', playerName: '#13 Bauti', value: 1 });
  });

  it('includes mini match history and location rows for points and defended shots', () => {
    const report = buildTrainingReportData(buildSession(), players);

    expect(report.miniMatches).toHaveLength(3);
    expect(report.miniMatches[0]).toMatchObject({
      scoreLabel: 'Equipo 1 2 - 1 Equipo 2',
      winnerLabel: undefined,
      eventCount: 5,
    });
    expect(report.pointLocations).toHaveLength(5);
    expect(report.shotDefendedLocations).toHaveLength(2);
    expect(report.shotDefendedLocations[0]).toMatchObject({
      playerName: '#7 Nico',
      defenderName: '#11 Fede',
      teamName: 'Equipo 1',
    });
  });

  it('includes player detail maps for shots and defenses', () => {
    const report = buildTrainingReportData(buildSession(), players);
    const nico = report.playerDetails.find((player) => player.playerId === 'p2');
    const fede = report.playerDetails.find((player) => player.playerId === 'p4');

    expect(report.playerDetails[0]).toMatchObject({
      playerId: 'p1',
      playerName: '#3 Mauro',
      points: 3,
      attempts: 3,
      defenses: 0,
    });
    expect(nico?.shotLocations).toHaveLength(1);
    expect(nico?.shotLocations[0]).toMatchObject({
      markerKind: 'shot_defended',
      defenderName: '#11 Fede',
    });
    expect(nico?.defenseLocations).toHaveLength(1);
    expect(nico?.defenseLocations[0]).toMatchObject({
      markerKind: 'defense',
      playerName: '#6 Leon',
    });
    expect(fede?.defenseLocations).toHaveLength(1);
    expect(fede?.defenseLocations[0].label).toContain('defendió tiro de #7 Nico');
  });

  it('keeps player maps safe for players without shots or explicit defense locations', () => {
    const report = buildTrainingReportData(buildSession(), players);
    const enano = report.playerDetails.find((player) => player.playerId === 'p6');

    expect(enano).toMatchObject({
      attempts: 0,
      defenses: 0,
      shotLocations: [],
      defenseLocations: [],
    });
  });

  it('uses one-frame tactical labels for sector tables', () => {
    const report = buildTrainingReportData(buildSession(), players);
    const labels = [...report.scoringSectors, ...report.defendedSectors].map((sector) => sector.label).join(' ');

    expect(labels).toContain('lado derecho · 30°-60°');
    expect(labels).toContain('centro · 60°-90°');
    expect(labels).not.toMatch(/marco izquierdo|marco derecho|zona izquierda|zona derecha|120°|150°|180°/i);
  });
});
