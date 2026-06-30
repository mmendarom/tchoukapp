import { describe, expect, it } from 'vitest';

import { buildStatsMatchSettings, createStatsMatchPeriods, StatsMatch, StatsMatchEvent } from './statsMatch';
import { buildStatsMatchReport } from './statsMatchReportData';
import { Player } from './types';

const player = (id: string, number: number, lastName: string): Player => ({
  id,
  firstName: `Nombre ${id}`,
  lastName,
  number,
  position: 'Center',
  usualPlayingZone: 'central',
  dominantHand: 'Right',
  caps: 0,
  goals: 0,
  blocks: 0,
});

const players = [
  player('h1', 7, 'Silva'),
  player('h2', 8, 'Costa'),
  player('a1', 9, 'Pérez'),
  player('a2', 10, 'Gómez'),
];
const settings = buildStatsMatchSettings();

const event = (overrides: Partial<StatsMatchEvent> & { id: string }): StatsMatchEvent => ({
  matchId: 'match-1',
  periodNumber: 1,
  createdAt: '2026-06-29T00:00:00.000Z',
  teamId: 'home',
  kind: 'point',
  ...overrides,
});

const match = (events: StatsMatchEvent[]): StatsMatch => ({
  id: 'match-1',
  createdAt: '2026-06-29T00:00:00.000Z',
  updatedAt: '2026-06-29T00:00:00.000Z',
  homeTeam: { id: 'home', name: 'Brasil', category: 'Mayores', playerIds: ['h1', 'h2'] },
  awayTeam: { id: 'away', name: 'Argentina', playerIds: ['a1', 'a2'] },
  settings,
  status: 'finished',
  currentPeriod: 1,
  periods: createStatsMatchPeriods(settings),
  events,
});

describe('statsMatchReportData', () => {
  const events: StatsMatchEvent[] = [
    event({ id: 'e1', teamId: 'home', playerId: 'h1', kind: 'point', location: { x: 0.2, y: 0.4 } }),
    event({ id: 'e2', teamId: 'home', playerId: 'h1', kind: 'point' }),
    event({ id: 'e3', teamId: 'home', playerId: 'h2', kind: 'error', errorSubtype: 'turnover' }),
    event({
      id: 'e4',
      teamId: 'away',
      playerId: 'a1',
      kind: 'shot_defended',
      defendingTeamId: 'home',
      defenderPlayerId: 'h2',
      location: { x: 0.25, y: 0.5 },
    }),
    event({ id: 'e5', teamId: 'away', playerId: 'a1', kind: 'point', location: { x: 0.8, y: 0.6 }, periodNumber: 2 }),
    event({ id: 'e6', teamId: 'away', playerId: 'a2', kind: 'own_point_against', periodNumber: 2 }),
  ];

  it('builds a final report with symmetric team sections', () => {
    const report = buildStatsMatchReport(match(events), players);

    expect(report.scope).toBe('final');
    expect(report.title).toBe('Resumen final');
    expect(report.scoreLabel).toBe('Brasil 3 - 1 Argentina');
    expect(report.hasEvents).toBe(true);
    expect(report.home.teamName).toBe('Brasil');
    expect(report.home.category).toBe('Mayores');
  });

  it('maps shot and defense locations per team', () => {
    const report = buildStatsMatchReport(match(events), players);

    expect(report.home.shotLocations).toHaveLength(1);
    expect(report.home.shotLocations[0]).toMatchObject({ markerKind: 'point' });
    expect(report.home.shotsWithoutLocation).toBe(1);
    expect(report.home.defenseLocations).toHaveLength(1);
    expect(report.home.defenseLocations[0].label).toContain('atajó');
  });

  it('ranks attackers and defenders per team', () => {
    const report = buildStatsMatchReport(match(events), players);

    expect(report.home.topAttackers[0]).toMatchObject({ playerId: 'h1', points: 2 });
    expect(report.home.topDefenders[0]).toMatchObject({ playerId: 'h2', defenses: 1 });
  });

  it('summarizes weak zones: errors and conceded sectors', () => {
    const report = buildStatsMatchReport(match(events), players);

    expect(report.home.errorBreakdown).toEqual([{ subtype: 'turnover', label: 'Perdió la pelota', total: 1 }]);
    expect(report.home.scoringSectors[0].total).toBe(1);
    expect(report.away.errorBreakdown.some((row) => row.subtype === 'own_point_against')).toBe(true);
  });

  it('filters the report by period', () => {
    const periodOne = buildStatsMatchReport(match(events), players, { periodNumber: 1 });
    const periodTwo = buildStatsMatchReport(match(events), players, { periodNumber: 2 });

    expect(periodOne.scope).toBe('period');
    expect(periodOne.title).toBe('Resumen del tiempo 1');
    expect(periodOne.scoreLabel).toBe('Brasil 2 - 0 Argentina');
    expect(periodTwo.scoreLabel).toBe('Brasil 1 - 1 Argentina');
    expect(periodTwo.away.topAttackers[0]).toMatchObject({ playerId: 'a1', points: 1 });
  });

  it('reports empty scope cleanly', () => {
    const report = buildStatsMatchReport(match([]), players);

    expect(report.hasEvents).toBe(false);
    expect(report.scoreLabel).toBe('Brasil 0 - 0 Argentina');
    expect(report.home.shotLocations).toEqual([]);
    expect(report.home.topAttackers).toEqual([]);
  });
});
