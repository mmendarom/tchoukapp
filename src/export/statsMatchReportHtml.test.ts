import { describe, expect, it } from 'vitest';

import { buildStatsMatchSettings, createStatsMatchPeriods, StatsMatch, StatsMatchEvent } from '../domain/statsMatch';
import { buildStatsMatchReport } from '../domain/statsMatchReportData';
import { Player } from '../domain/types';
import { buildStatsMatchReportHtml } from './statsMatchReportHtml';

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

const players = [player('h1', 7, 'Silva'), player('a1', 9, 'Pérez')];
const settings = buildStatsMatchSettings();

const events: StatsMatchEvent[] = [
  {
    id: 'e1',
    matchId: 'match-1',
    periodNumber: 1,
    createdAt: '2026-06-29T00:00:00.000Z',
    teamId: 'home',
    playerId: 'h1',
    kind: 'point',
    location: { x: 0.2, y: 0.4 },
  },
  {
    id: 'e2',
    matchId: 'match-1',
    periodNumber: 1,
    createdAt: '2026-06-29T00:00:00.000Z',
    teamId: 'away',
    playerId: 'a1',
    kind: 'point',
  },
];

const match: StatsMatch = {
  id: 'match-1',
  createdAt: '2026-06-29T12:00:00.000Z',
  updatedAt: '2026-06-29T12:00:00.000Z',
  homeTeam: { id: 'home', name: 'Brasil', category: 'Mayores', playerIds: ['h1'] },
  awayTeam: { id: 'away', name: 'Argentina', playerIds: ['a1'] },
  settings,
  status: 'finished',
  currentPeriod: 1,
  periods: createStatsMatchPeriods(settings),
  events,
};

describe('buildStatsMatchReportHtml', () => {
  it('renders a self-contained document with both teams and the score', () => {
    const html = buildStatsMatchReportHtml(buildStatsMatchReport(match, players));

    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('Resumen final');
    expect(html).toContain('Brasil 1 - 1 Argentina');
    expect(html).toContain('Brasil');
    expect(html).toContain('Argentina');
    expect(html).toContain('Local');
    expect(html).toContain('Visitante');
    expect(html).toContain('Dónde tiró');
    expect(html).toContain('Dónde defendió');
  });

  it('plots located points and notes missing locations', () => {
    const html = buildStatsMatchReportHtml(buildStatsMatchReport(match, players));

    expect(html).toContain('class="map-dot dot-home"');
    expect(html).toContain('1 puntos sin ubicación registrada.');
  });

  it('escapes team names to keep the document safe', () => {
    const htmlMatch: StatsMatch = {
      ...match,
      homeTeam: { ...match.homeTeam, name: 'Brasil <b>' },
    };
    const html = buildStatsMatchReportHtml(buildStatsMatchReport(htmlMatch, players));

    expect(html).toContain('Brasil &lt;b&gt;');
    expect(html).not.toContain('Brasil <b>');
  });
});
