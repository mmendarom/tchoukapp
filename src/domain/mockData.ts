import { Fixture, Match, Player } from './types';

const createInitialPeriods = () => [
  { number: 1 as const, status: 'not_started' as const, durationSeconds: 900, remainingSeconds: 900, timerRunning: false },
  { number: 2 as const, status: 'not_started' as const, durationSeconds: 900, remainingSeconds: 900, timerRunning: false },
  { number: 3 as const, status: 'not_started' as const, durationSeconds: 900, remainingSeconds: 900, timerRunning: false },
];

export const uruguayPlayers: Player[] = [
  { id: 'mauro', firstName: 'Mauro', lastName: '', number: 1, position: 'Wing', usualPlayingZone: 'izquierda', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'marcelo', firstName: 'Marcelo', lastName: '', number: 2, position: 'Center', usualPlayingZone: 'central', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'nicolas', firstName: 'Nicolas', lastName: '', number: 3, position: 'Wing', usualPlayingZone: 'derecha', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'vladi', firstName: 'Vladi', lastName: '', number: 4, position: 'Wing', usualPlayingZone: 'izquierda', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'errazquin', firstName: 'Errazquin', lastName: '', number: 5, position: 'Wing', usualPlayingZone: 'izquierda', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'leon', firstName: 'Leon', lastName: '', number: 6, position: 'Wing', usualPlayingZone: 'izquierda', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'mathias', firstName: 'Mathias', lastName: '', number: 7, position: 'Center', usualPlayingZone: 'central', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'tadeo', firstName: 'Tadeo', lastName: '', number: 8, position: 'Center', usualPlayingZone: 'central', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'enano', firstName: 'Enano', lastName: '', number: 9, position: 'Center', usualPlayingZone: 'central', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'juan', firstName: 'Juan', lastName: '', number: 10, position: 'Wing', usualPlayingZone: 'derecha', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'fede', firstName: 'Fede', lastName: '', number: 11, position: 'Wing', usualPlayingZone: 'derecha', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'leo', firstName: 'Leo', lastName: '', number: 12, position: 'Center', usualPlayingZone: 'central', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'pablito', firstName: 'Pablito', lastName: '', number: 13, position: 'Center', usualPlayingZone: 'central', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'juanse', firstName: 'Juanse', lastName: '', number: 14, position: 'Wing', usualPlayingZone: 'derecha', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
];

export const initialMatches: Match[] = [
  {
    id: 'match-001',
    opponent: 'Argentina',
    venue: 'Montevideo Training Center',
    startsAt: '2026-06-12T19:30:00.000Z',
    status: 'draft',
    currentPeriod: 1,
    periods: createInitialPeriods(),
    clock: { period: 1, secondsElapsed: 0 },
    lineupSnapshots: [
      {
        id: 'lineup-match-001-start',
        matchId: 'match-001',
        team: 'uruguay',
              playerIds: ['mauro', 'marcelo', 'nicolas', 'vladi', 'errazquin', 'leon', 'mathias'],
        capturedAt: '2026-06-12T19:30:00.000Z',
        clock: { period: 1, secondsElapsed: 0 },
      },
    ],
    events: [],
  },
  {
    id: 'match-002',
    opponent: 'Brazil',
    venue: 'Polideportivo Las Piedras',
    startsAt: '2026-06-14T17:00:00.000Z',
    status: 'draft',
    currentPeriod: 1,
    periods: createInitialPeriods(),
    clock: { period: 1, secondsElapsed: 0 },
    lineupSnapshots: [
      {
        id: 'lineup-match-002-start',
        matchId: 'match-002',
        team: 'uruguay',
              playerIds: ['mauro', 'marcelo', 'nicolas', 'vladi', 'errazquin', 'leon', 'tadeo'],
        capturedAt: '2026-06-14T17:00:00.000Z',
        clock: { period: 1, secondsElapsed: 0 },
      },
    ],
    events: [],
  },
];

export const upcomingFixtures: Fixture[] = [
  {
    id: 'fixture-001',
    opponent: 'Chile',
    competition: 'Serie amistosa sudamericana',
    venue: 'Montevideo',
    startsAt: '2026-07-04T20:00:00.000Z',
  },
  {
    id: 'fixture-002',
    opponent: 'Colombia',
    competition: 'Serie amistosa sudamericana',
    venue: 'Canelones',
    startsAt: '2026-07-06T18:30:00.000Z',
  },
];
