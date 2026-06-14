import { describe, expect, it } from 'vitest';

import { buildMatchReportData } from './reportData';
import { Match, MatchEvent, Player } from './types';

const players: Player[] = [
  { id: 'p1', firstName: 'Mauro', lastName: '', number: 1, position: 'Wing', usualPlayingZone: 'izquierda', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'p2', firstName: 'Marcelo', lastName: '', number: 2, position: 'Center', usualPlayingZone: 'central', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
  { id: 'p3', firstName: 'Nicolas', lastName: '', number: 3, position: 'Wing', usualPlayingZone: 'derecha', dominantHand: 'Right', caps: 0, goals: 0, blocks: 0 },
];

const point = (overrides: Partial<MatchEvent>): MatchEvent => ({
  id: `event-${Math.random()}`,
  matchId: 'match-1',
  kind: 'point',
  periodNumber: 1,
  timestamp: '2026-01-01T00:00:00.000Z',
  clock: { period: 1, secondsElapsed: 12 },
  scoringTeam: 'uruguay',
  playerId: 'p1',
  landingLocation: { x: 0.75, y: 0.3 },
  zone: 'center',
  frame: 'right-frame',
  pointSource: 'attack',
  ...overrides,
} as MatchEvent);

const match = (events: MatchEvent[] = []): Match => ({
  id: 'match-1',
  opponent: 'Argentina',
  venue: 'Montevideo',
  startsAt: '2026-01-01T20:00:00.000Z',
  status: 'finished',
  currentPeriod: 3,
  periods: [
    { number: 1, status: 'finished', durationSeconds: 900, remainingSeconds: 0, timerRunning: false },
    { number: 2, status: 'finished', durationSeconds: 900, remainingSeconds: 0, timerRunning: false },
    { number: 3, status: 'finished', durationSeconds: 900, remainingSeconds: 0, timerRunning: false },
  ],
  clock: { period: 3, secondsElapsed: 0 },
  lineupSnapshots: [
    {
      id: 'lineup-start',
      matchId: 'match-1',
      team: 'uruguay',
      playerIds: ['p1', 'p2'],
      capturedAt: '2026-01-01T20:00:00.000Z',
      clock: { period: 1, secondsElapsed: 0 },
    },
    {
      id: 'lineup-final',
      matchId: 'match-1',
      team: 'uruguay',
      playerIds: ['p1', 'p3'],
      capturedAt: '2026-01-01T20:05:00.000Z',
      clock: { period: 1, secondsElapsed: 300 },
    },
  ],
  events,
  notes: 'Cerrar mejor el centro.',
});

describe('buildMatchReportData', () => {
  it('includes score, period score, own points, opponent own points and core stats', () => {
    const report = buildMatchReportData(
      match([
        point({ id: 'u-1', scoringTeam: 'uruguay', playerId: 'p1' }),
        point({ id: 'rival-own-1', scoringTeam: 'uruguay', playerId: undefined, landingLocation: undefined, pointSource: 'opponent_own_point' }),
        point({ id: 'o-1', scoringTeam: 'opponent', playerId: undefined, landingLocation: { x: 0.25, y: 0.4 } }),
        point({ id: 'own-1', kind: 'error', team: 'uruguay', playerId: 'p2', errorType: 'punto_en_contra' } as Partial<MatchEvent>),
        point({ id: 'f-1', kind: 'error', team: 'uruguay', playerId: 'p2', errorType: 'falta' } as Partial<MatchEvent>),
        point({ id: 'd-1', kind: 'defense', team: 'uruguay', playerId: 'p1' } as Partial<MatchEvent>),
        point({ id: 'rd-1', kind: 'opponent_defense', team: 'opponent', playerId: undefined, defenseLocation: { x: 0.52, y: 0.3 } } as Partial<MatchEvent>),
        point({ id: 'rd-2', kind: 'opponent_defense', team: 'opponent', playerId: undefined, defenseLocation: { x: 0.48, y: 0.4 } } as Partial<MatchEvent>),
        point({ id: 's-1', kind: 'substitution', team: 'uruguay', playerOutId: 'p2', playerInId: 'p3', lineupSnapshotId: 'lineup-final' } as Partial<MatchEvent>),
        point({ id: 'swap-1', kind: 'lineup_swap', team: 'uruguay', playerAId: 'p1', playerBId: 'p3', fromSlotIndex: 0, toSlotIndex: 1, lineupSnapshotId: 'lineup-final' } as Partial<MatchEvent>),
      ]),
      players,
    );

    expect(report.finalScore).toEqual({ uruguay: 2, opponent: 2 });
    expect(report.scoreByPeriod[0].score).toEqual({ uruguay: 2, opponent: 2 });
    expect(report.periods[0]).toMatchObject({
      uruguayPoints: 2,
      opponentPoints: 2,
      ownPoints: 1,
      opponentOwnPoints: 1,
      opponentDefenses: 2,
    });
    expect(report.totals.topScorers).toEqual([{ label: '#1 Mauro', total: 1 }]);
    expect(report.totals.defenses).toEqual([{ label: '#1 Mauro', total: 1 }]);
    expect(report.totals.opponentDefenses).toBe(2);
    expect(report.totals.faltas).toEqual([{ label: '#2 Marcelo', total: 1 }]);
    expect(report.totals.ownPointsByPlayer).toEqual([{ label: '#2 Marcelo', total: 1 }]);
    expect(report.totals.totalErrors).toEqual([{ label: '#2 Marcelo', total: 2 }]);
    expect(report.totals.opponentOwnPoints).toBe(1);
    expect(report.totals.substitutions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'substitution', playerOut: '#2 Marcelo', playerIn: '#3 Nicolas' }),
        expect.objectContaining({ kind: 'lineup_swap', playerA: '#1 Mauro', playerB: '#3 Nicolas' }),
      ]),
    );
    expect(report.lineups.initial).toEqual(['#1 Mauro', '#2 Marcelo']);
    expect(report.lineups.final).toEqual(['#1 Mauro', '#3 Nicolas']);
    expect(report.zones.attack[0]).toMatchObject({ label: 'Zona derecha', total: 1 });
    expect(report.zones.against[0]).toMatchObject({ label: 'Zona izquierda', total: 1 });
    expect(report.zones.defended[0]).toMatchObject({ label: 'Zona central', total: 2 });
    expect(report.executiveSummary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Resultado final', value: 'Uruguay 2 - 2 Argentina' }),
        expect.objectContaining({ label: 'Puntos en contra del rival', value: '1' }),
      ]),
    );
    expect(report.periods).toHaveLength(3);
    expect(report.periods[0].maps.uruguayPoints).toEqual([{ x: 0.75, y: 0.3 }]);
    expect(report.periods[0].maps.opponentPoints).toEqual([{ x: 0.25, y: 0.4 }]);
    expect(report.periods[0].maps.opponentDefenses).toEqual([
      { x: 0.52, y: 0.3 },
      { x: 0.48, y: 0.4 },
    ]);
    expect(report.totalMaps.uruguayPoints).toEqual([{ x: 0.75, y: 0.3 }]);
    expect(report.totalMaps.opponentPoints).toEqual([{ x: 0.25, y: 0.4 }]);
    expect(report.totalMaps.opponentDefenses).toHaveLength(2);
  });

  it('uses safe fallbacks for missing data and old events', () => {
    const report = buildMatchReportData(
      {
        ...match([
          point({ id: 'old-error', kind: 'error', team: 'uruguay', playerId: 'p1', errorType: 'turnover' } as Partial<MatchEvent>),
          point({ id: 'old-point', scoringTeam: 'uruguay', landingLocation: undefined }),
        ]),
        venue: '',
        startsAt: 'not-a-date',
        lineupSnapshots: [],
        notes: '',
      },
      players,
    );

    expect(report.dateLabel).toBe('Sin fecha registrada');
    expect(report.venueLabel).toBe('Sin sede registrada');
    expect(report.lineups.initial).toEqual(['Sin datos registrados']);
    expect(report.lineups.final).toEqual(['Sin datos registrados']);
    expect(report.notes).toBe('Sin notas registradas.');
    expect(report.zones.attack).toEqual([]);
    expect(report.zones.defended).toEqual([]);
    expect(report.totalMaps.uruguayPoints).toEqual([]);
    expect(report.totalMaps.opponentPoints).toEqual([]);
    expect(report.totalMaps.opponentDefenses).toEqual([]);
  });

  it('uses custom rival name in report labels', () => {
    const report = buildMatchReportData({ ...match(), opponent: 'Brasil' }, players);

    expect(report.matchLabel).toBe('Uruguay vs Brasil');
    expect(report.opponent).toBe('Brasil');
    expect(report.executiveSummary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Resultado final', value: 'Uruguay 0 - 0 Brasil' }),
      ]),
    );
  });

  it('includes stored team pool name when available', () => {
    const report = buildMatchReportData({ ...match(), teamPoolName: '+40' }, players);

    expect(report.teamPoolName).toBe('+40');
    expect(report.executiveSummary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Plantel', value: '+40' }),
      ]),
    );
  });

  it('uses Rival fallback when old matches have no opponent', () => {
    const report = buildMatchReportData({ ...match(), opponent: undefined } as unknown as Match, players);

    expect(report.matchLabel).toBe('Uruguay vs Rival');
    expect(report.opponent).toBe('Rival');
    expect(report.executiveSummary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Resultado final', value: 'Uruguay 0 - 0 Rival' }),
      ]),
    );
  });
});
