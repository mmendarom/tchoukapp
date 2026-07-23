import { describe, expect, it } from 'vitest';

import {
  applyStatsSubstitution,
  buildStatsMatchSettings,
  createStatsMatchPeriods,
  DEFAULT_STATS_MATCH_PERIOD_DURATION_SECONDS,
  filterStatsMatches,
  getOpposingStatsTeamId,
  getStatsEventScoringTeamId,
  getStatsMatchScore,
  getStatsMatchStats,
  getStatsTeamOnCourt,
  rankStatsAttackers,
  rankStatsDefenders,
  rankStatsErrors,
  resolveStatsMatchLineups,
  resolveStatsStarters,
  StatsMatch,
  StatsMatchEvent,
  validateStatsMatchSetup,
} from './statsMatch';

const homeTeam = {
  id: 'home',
  name: 'Brasil',
  category: 'Mayores',
  playerIds: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7'],
};
const awayTeam = {
  id: 'away',
  name: 'Argentina',
  category: 'Mayores',
  playerIds: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7'],
};

const settings = buildStatsMatchSettings();

const event = (overrides: Partial<StatsMatchEvent> = {}): StatsMatchEvent => ({
  id: `e-${Math.random().toString(36).slice(2, 8)}`,
  matchId: 'match-1',
  periodNumber: 1,
  createdAt: '2026-06-29T00:00:00.000Z',
  teamId: 'home',
  kind: 'point',
  ...overrides,
});

const match = (overrides: Partial<StatsMatch> = {}): StatsMatch => ({
  id: 'match-1',
  createdAt: '2026-06-29T00:00:00.000Z',
  updatedAt: '2026-06-29T00:00:00.000Z',
  homeTeam,
  awayTeam,
  settings,
  status: 'live',
  currentPeriod: 1,
  periods: createStatsMatchPeriods(settings),
  events: [],
  ...overrides,
});

describe('statsMatch domain', () => {
  it('defaults format to 7 players and 3 periods of 15 minutes', () => {
    expect(buildStatsMatchSettings()).toEqual({
      playersPerTeam: 7,
      periodCount: 3,
      periodDurationSeconds: DEFAULT_STATS_MATCH_PERIOD_DURATION_SECONDS,
    });
    expect(buildStatsMatchSettings({ playersPerTeam: 0, periodCount: 0, periodDurationSeconds: 0 })).toEqual({
      playersPerTeam: 7,
      periodCount: 3,
      periodDurationSeconds: 900,
    });
    expect(buildStatsMatchSettings({ playersPerTeam: 6.7, periodCount: 2.9, periodDurationSeconds: 600.5 })).toEqual({
      playersPerTeam: 6,
      periodCount: 2,
      periodDurationSeconds: 600,
    });
  });

  it('creates one period per configured period count', () => {
    const periods = createStatsMatchPeriods(buildStatsMatchSettings({ periodCount: 3, periodDurationSeconds: 600 }));

    expect(periods).toEqual([
      { number: 1, status: 'not_started', durationSeconds: 600 },
      { number: 2, status: 'not_started', durationSeconds: 600 },
      { number: 3, status: 'not_started', durationSeconds: 600 },
    ]);
  });

  it('validates two distinct teams with enough players', () => {
    expect(validateStatsMatchSetup(homeTeam, awayTeam, settings)).toEqual({ valid: true, errors: [] });
  });

  it('rejects identical teams, short rosters and shared players', () => {
    const sameId = validateStatsMatchSetup(homeTeam, { ...awayTeam, id: 'home' }, settings);
    expect(sameId.valid).toBe(false);
    expect(sameId.errors.join(' ')).toContain('Elegi dos cuadros distintos');

    const shortRoster = validateStatsMatchSetup({ ...homeTeam, playerIds: ['h1', 'h2'] }, awayTeam, settings);
    expect(shortRoster.valid).toBe(false);
    expect(shortRoster.errors.join(' ')).toContain('cuadro local necesita al menos 7');

    const shared = validateStatsMatchSetup(
      homeTeam,
      { ...awayTeam, playerIds: ['h1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7'] },
      settings,
    );
    expect(shared.valid).toBe(false);
    expect(shared.errors.join(' ')).toContain('no puede estar en los dos cuadros');
  });

  it('honors a configurable smaller format', () => {
    const smallSettings = buildStatsMatchSettings({ playersPerTeam: 3 });

    expect(
      validateStatsMatchSetup(
        { id: 'home', name: 'A', playerIds: ['h1', 'h2', 'h3'] },
        { id: 'away', name: 'B', playerIds: ['a1', 'a2', 'a3'] },
        smallSettings,
      ),
    ).toEqual({ valid: true, errors: [] });
  });

  it('finds the opposing team and the scoring team for each event kind', () => {
    expect(getOpposingStatsTeamId(match(), 'home')).toBe('away');
    expect(getOpposingStatsTeamId(match(), 'away')).toBe('home');
    expect(getOpposingStatsTeamId(match(), 'other')).toBeUndefined();

    expect(getStatsEventScoringTeamId(match(), { teamId: 'home', kind: 'point' })).toBe('home');
    expect(getStatsEventScoringTeamId(match(), { teamId: 'home', kind: 'own_point_against' })).toBe('away');
    expect(getStatsEventScoringTeamId(match(), { teamId: 'home', kind: 'defense' })).toBeUndefined();
  });

  it('derives a symmetric score from points and own points against', () => {
    const score = getStatsMatchScore(
      match({
        events: [
          event({ teamId: 'home', playerId: 'h1', kind: 'point' }),
          event({ teamId: 'home', playerId: 'h2', kind: 'own_point_against' }),
          event({ teamId: 'away', playerId: 'a1', kind: 'point' }),
          event({ teamId: 'away', playerId: 'a2', kind: 'defense' }),
        ],
      }),
    );

    expect(score).toEqual({ home: 1, away: 2 });
  });

  it('aggregates attempts as points + defended shots + own points against and safe effectiveness', () => {
    const stats = getStatsMatchStats(
      match({
        events: [
          event({ teamId: 'home', playerId: 'h1', kind: 'point' }),
          event({
            teamId: 'home',
            playerId: 'h1',
            kind: 'shot_defended',
            defendingTeamId: 'away',
            defenderPlayerId: 'a1',
          }),
          event({ teamId: 'home', playerId: 'h1', kind: 'own_point_against' }),
          event({ teamId: 'home', playerId: 'h2', kind: 'defense' }),
          event({ teamId: 'away', playerId: 'a2', kind: 'error', errorSubtype: 'turnover' }),
        ],
      }),
    );

    const h1 = stats.playerStats.find((item) => item.playerId === 'h1');
    const a1 = stats.playerStats.find((item) => item.playerId === 'a1');
    const a2 = stats.playerStats.find((item) => item.playerId === 'a2');

    expect(h1).toMatchObject({ points: 1, shotsDefended: 1, ownPointsAgainst: 1, attempts: 3 });
    expect(h1?.effectiveness).toBeCloseTo(1 / 3);
    expect(a1).toMatchObject({ defenses: 1, attempts: 0, effectiveness: 0 });
    expect(a2).toMatchObject({ errors: 1 });
    expect(stats.score).toEqual({ home: 1, away: 1 });
  });

  it('builds symmetric team stats with points for and against', () => {
    const stats = getStatsMatchStats(
      match({
        events: [
          event({ teamId: 'home', playerId: 'h1', kind: 'point' }),
          event({ teamId: 'home', playerId: 'h2', kind: 'point' }),
          event({ teamId: 'away', playerId: 'a1', kind: 'point' }),
          event({
            teamId: 'away',
            playerId: 'a2',
            kind: 'shot_defended',
            defendingTeamId: 'home',
            defenderPlayerId: 'h3',
          }),
        ],
      }),
    );

    const home = stats.teamStats.find((item) => item.teamId === 'home');
    const away = stats.teamStats.find((item) => item.teamId === 'away');

    expect(home).toMatchObject({ points: 2, pointsAgainst: 1, defenses: 1, attempts: 2 });
    expect(away).toMatchObject({ points: 1, pointsAgainst: 2, shotsDefendedByRival: 1, attempts: 2 });
  });

  it('filters stats by period when requested', () => {
    const currentMatch = match({
      events: [
        event({ periodNumber: 1, teamId: 'home', playerId: 'h1', kind: 'point' }),
        event({ periodNumber: 2, teamId: 'home', playerId: 'h2', kind: 'point' }),
        event({ periodNumber: 2, teamId: 'away', playerId: 'a1', kind: 'point' }),
      ],
    });

    expect(getStatsMatchStats(currentMatch, { periodNumber: 1 }).score).toEqual({ home: 1, away: 0 });
    expect(getStatsMatchStats(currentMatch, { periodNumber: 2 }).score).toEqual({ home: 1, away: 1 });
    expect(getStatsMatchStats(currentMatch).score).toEqual({ home: 2, away: 1 });
  });

  it('ranks attackers, defenders and errors per team', () => {
    const stats = getStatsMatchStats(
      match({
        events: [
          event({ teamId: 'home', playerId: 'h1', kind: 'point' }),
          event({ teamId: 'home', playerId: 'h1', kind: 'point' }),
          event({ teamId: 'home', playerId: 'h2', kind: 'defense' }),
          event({ teamId: 'home', playerId: 'h3', kind: 'error', errorSubtype: 'line_step' }),
          event({ teamId: 'away', playerId: 'a1', kind: 'point' }),
        ],
      }),
    );

    expect(rankStatsAttackers(stats.playerStats, 'home')[0]).toMatchObject({ playerId: 'h1', points: 2 });
    expect(rankStatsAttackers(stats.playerStats, 'away').map((item) => item.playerId)).toEqual(['a1']);
    expect(rankStatsDefenders(stats.playerStats, 'home')[0]).toMatchObject({ playerId: 'h2', defenses: 1 });
    expect(rankStatsErrors(stats.playerStats, 'home')[0]).toMatchObject({ playerId: 'h3', errors: 1 });
  });

  it('does not credit defenders without a shot_defended player attribution to attempts', () => {
    const stats = getStatsMatchStats(
      match({
        events: [
          event({
            teamId: 'home',
            playerId: 'h1',
            kind: 'shot_defended',
            defendingTeamId: 'away',
            defenderPlayerId: 'a1',
          }),
        ],
      }),
    );

    expect(stats.playerStats.find((item) => item.playerId === 'h1')).toMatchObject({ attempts: 1, shotsDefended: 1, points: 0 });
    expect(stats.playerStats.find((item) => item.playerId === 'a1')).toMatchObject({ defenses: 1, attempts: 0 });
    expect(stats.score).toEqual({ home: 0, away: 0 });
  });

  it('filters matches by lifecycle bucket', () => {
    const matches = [
      match({ id: 'draft', status: 'draft' }),
      match({ id: 'live', status: 'live' }),
      match({ id: 'break', status: 'period_break' }),
      match({ id: 'finished', status: 'finished' }),
      match({ id: 'cancelled', status: 'cancelled' }),
      match({ id: 'archived', status: 'finished', archivedAt: '2026-06-29T10:00:00.000Z' }),
    ];

    expect(filterStatsMatches(matches, 'active').map((item) => item.id)).toEqual(['draft', 'live', 'break']);
    expect(filterStatsMatches(matches, 'finished').map((item) => item.id)).toEqual(['finished', 'cancelled']);
    expect(filterStatsMatches(matches, 'archived').map((item) => item.id)).toEqual(['archived']);
    expect(filterStatsMatches(matches, 'all')).toHaveLength(6);
  });
});

describe('titulares, lineup y cambios (spec 022)', () => {
  const rosterHome = { id: 'home', name: 'Brasil', playerIds: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8', 'h9'] };
  const rosterAway = { id: 'away', name: 'Argentina', playerIds: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8'] };

  it('derives starters from starterIds, filling from the roster when short', () => {
    expect(resolveStatsStarters({ ...rosterHome, starterIds: ['h9', 'h8'] }, 7)).toEqual([
      'h9',
      'h8',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
    ]);
    // Sin titulares definidos: primeros N del plantel.
    expect(resolveStatsStarters(rosterHome, 7)).toEqual(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7']);
    // Plantel más chico que N: todos en cancha.
    expect(resolveStatsStarters({ id: 'x', name: 'X', playerIds: ['x1', 'x2'] }, 7)).toEqual(['x1', 'x2']);
    // Ignora ids que no están en el plantel.
    expect(resolveStatsStarters({ ...rosterAway, starterIds: ['ghost', 'a3'] }, 3)).toEqual(['a3', 'a1', 'a2']);
  });

  it('initializes lineups from starters and keeps a valid saved lineup', () => {
    const lineups = resolveStatsMatchLineups({
      homeTeam: { ...rosterHome, starterIds: ['h2', 'h4', 'h6', 'h1', 'h3', 'h5', 'h7'] },
      awayTeam: rosterAway,
      settings,
    });

    expect(lineups.home).toEqual(['h2', 'h4', 'h6', 'h1', 'h3', 'h5', 'h7']);
    expect(lineups.away).toEqual(['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7']);

    const kept = resolveStatsMatchLineups({
      homeTeam: rosterHome,
      awayTeam: rosterAway,
      settings,
      lineups: { home: ['h8', 'h9', 'ghost', 'h1', 'h2', 'h3', 'h4'], away: [] },
    });

    // Filtra ids inválidos del lineup guardado; el vacío cae a titulares.
    expect(kept.home).toEqual(['h8', 'h9', 'h1', 'h2', 'h3', 'h4']);
    expect(kept.away).toEqual(['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7']);
  });

  it('reads the on-court lineup for a team', () => {
    const current = match({ lineups: { home: ['h1', 'h2'], away: ['a1'] } });

    expect(getStatsTeamOnCourt(current, 'home')).toEqual(['h1', 'h2']);
    expect(getStatsTeamOnCourt(current, 'ghost')).toEqual([]);
  });

  it('applies a substitution keeping the slot, rejecting invalid swaps', () => {
    expect(applyStatsSubstitution(['h1', 'h2', 'h3'], 'h2', 'h9')).toEqual(['h1', 'h9', 'h3']);
    // El que entra ya está en cancha.
    expect(applyStatsSubstitution(['h1', 'h2', 'h3'], 'h2', 'h1')).toBeUndefined();
    // El que sale no está en cancha.
    expect(applyStatsSubstitution(['h1', 'h2', 'h3'], 'h8', 'h9')).toBeUndefined();
    // Mismo jugador.
    expect(applyStatsSubstitution(['h1', 'h2', 'h3'], 'h2', 'h2')).toBeUndefined();
  });

  it('validates starters when provided (count, subset, duplicates)', () => {
    const okStarters = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7'];

    expect(
      validateStatsMatchSetup(
        { ...rosterHome, starterIds: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7'] },
        { ...rosterAway, starterIds: okStarters },
        settings,
      ).valid,
    ).toBe(true);

    const fewStarters = validateStatsMatchSetup(
      { ...rosterHome, starterIds: ['h1', 'h2'] },
      { ...rosterAway, starterIds: okStarters },
      settings,
    );
    expect(fewStarters.valid).toBe(false);
    expect(fewStarters.errors.join(' ')).toContain('7 titulares');

    const outsideRoster = validateStatsMatchSetup(
      { ...rosterHome, starterIds: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ghost'] },
      { ...rosterAway, starterIds: okStarters },
      settings,
    );
    expect(outsideRoster.valid).toBe(false);
    expect(outsideRoster.errors.join(' ')).toContain('entre los convocados');
  });
});
