import { Fixture, Match, Player, TeamPool } from './types';

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
  { id: 'plus40-ana-canteras', firstName: 'Ana', lastName: 'Canteras', number: 15, position: 'Wing', usualPlayingZone: 'izquierda', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'plus40-andres-pela', firstName: 'Andres', lastName: 'Pela', number: 16, position: 'Center', usualPlayingZone: 'central', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'plus40-hairo', firstName: 'Hairo', lastName: '', number: 17, position: 'Wing', usualPlayingZone: 'derecha', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'plus40-canario', firstName: 'Canario', lastName: '', number: 18, position: 'Wing', usualPlayingZone: 'izquierda', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'plus40-cecilia', firstName: 'Cecilia', lastName: '', number: 19, position: 'Center', usualPlayingZone: 'central', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'plus40-cabeza', firstName: 'Cabeza', lastName: '', number: 20, position: 'Wing', usualPlayingZone: 'derecha', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'plus40-ileana', firstName: 'Ileana', lastName: '', number: 21, position: 'Wing', usualPlayingZone: 'izquierda', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'plus40-jose-fuentes', firstName: 'Jose', lastName: 'Fuentes', number: 22, position: 'Center', usualPlayingZone: 'central', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'plus40-karny', firstName: 'Karny', lastName: '', number: 23, position: 'Wing', usualPlayingZone: 'derecha', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'plus40-maikel', firstName: 'Maikel', lastName: '', number: 24, position: 'Wing', usualPlayingZone: 'izquierda', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'plus40-mono', firstName: 'Mono', lastName: '', number: 25, position: 'Center', usualPlayingZone: 'central', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'plus40-nestor', firstName: 'Nestor', lastName: '', number: 26, position: 'Wing', usualPlayingZone: 'derecha', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'plus40-pablo', firstName: 'Pablo', lastName: '', number: 27, position: 'Wing', usualPlayingZone: 'izquierda', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'plus40-rodolfo', firstName: 'Rodolfo', lastName: '', number: 28, position: 'Center', usualPlayingZone: 'central', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'plus40-alejandra', firstName: 'Alejandra', lastName: '', number: 29, position: 'Wing', usualPlayingZone: 'derecha', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'plus40-ana-helena', firstName: 'Ana', lastName: 'Helena', number: 30, position: 'Wing', usualPlayingZone: 'izquierda', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'plus40-andrea', firstName: 'Andrea', lastName: '', number: 31, position: 'Center', usualPlayingZone: 'central', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'plus40-clau-correa', firstName: 'Clau', lastName: 'Correa', number: 32, position: 'Wing', usualPlayingZone: 'derecha', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'plus40-florencia', firstName: 'Florencia', lastName: '', number: 33, position: 'Wing', usualPlayingZone: 'izquierda', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'plus40-gustavo', firstName: 'Gustavo', lastName: '', number: 34, position: 'Center', usualPlayingZone: 'central', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'plus40-jonathan', firstName: 'Jonathan', lastName: '', number: 35, position: 'Wing', usualPlayingZone: 'derecha', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'plus40-milena', firstName: 'Milena', lastName: '', number: 36, position: 'Wing', usualPlayingZone: 'izquierda', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
];

export const teamPools: TeamPool[] = [
  {
    id: 'mayores',
    name: 'Mayores',
    playerIds: uruguayPlayers.map((player) => player.id),
  },
];

export const initialMatches: Match[] = [
  {
    id: 'match-001',
    opponent: 'Argentina',
    teamPoolId: 'mayores',
    teamPoolName: 'Mayores',
    availablePlayerIds: teamPools[0].playerIds,
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
    teamPoolId: 'mayores',
    teamPoolName: 'Mayores',
    availablePlayerIds: teamPools[0].playerIds,
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
