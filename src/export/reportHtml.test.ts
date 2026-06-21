import { describe, expect, it } from 'vitest';

import { MatchReportData } from '../domain/reportData';
import { buildMatchReportHtml, buildMatchReportText } from './reportHtml';

const performance = {
  rows: [
    { playerId: 'p1', playerName: '#1 Mauro', goals: 3, rivalDefendedShots: 1, ownPointsAgainst: 1, shotAttempts: 5, effectiveness: 0.6, defenses: 0, attackShare: 1, defenseShare: 0 },
    { playerId: 'p2', playerName: '#2 Marcelo', goals: 0, rivalDefendedShots: 1, ownPointsAgainst: 0, shotAttempts: 1, effectiveness: 0, defenses: 2, attackShare: 0, defenseShare: 1 },
  ],
  totalGoals: 3,
  totalShotAttempts: 6,
  totalDefenses: 2,
  topAttack: [{ playerId: 'p1', playerName: '#1 Mauro', goals: 3, rivalDefendedShots: 1, ownPointsAgainst: 1, shotAttempts: 5, effectiveness: 0.6, defenses: 0, attackShare: 1, defenseShare: 0 }],
  topDefense: [{ playerId: 'p2', playerName: '#2 Marcelo', goals: 0, rivalDefendedShots: 1, ownPointsAgainst: 0, shotAttempts: 1, effectiveness: 0, defenses: 2, attackShare: 0, defenseShare: 1 }],
};

const emptyPerformance = {
  rows: [],
  totalGoals: 0,
  totalShotAttempts: 0,
  totalDefenses: 0,
  topAttack: [],
  topDefense: [],
};

const report: MatchReportData = {
  title: 'Reporte del partido',
  matchLabel: 'Equipo vs Argentina',
  ownTeamName: 'Equipo',
  opponent: 'Argentina',
  dateLabel: '1 ene 2026, 20:00',
  venueLabel: 'Montevideo',
  competitionLabel: 'Sin competencia registrada',
  executiveSummary: [
    { label: 'Resultado final', value: 'Equipo 2 - 1 Argentina' },
    { label: 'Mejor goleador', value: '#1 Mauro (1)' },
    { label: 'Más defensas Equipo', value: '#2 Marcelo (2)' },
    { label: 'Top ataque', value: '#1 Mauro 3/5 (60%)' },
    { label: 'Top defensa', value: '#2 Marcelo (2)' },
    { label: 'Efectividad ofensiva total', value: '3/6 (50%)' },
    { label: 'Errores totales', value: '2' },
    { label: 'Puntos en contra', value: '1' },
    { label: 'Puntos en contra del rival', value: '1' },
    { label: 'Zona mas efectiva', value: 'marco derecho · lado izquierdo · 30°-60° (1)' },
    { label: 'Sector vulnerable', value: 'marco derecho · lado izquierdo · 30°-60° (1)' },
    { label: 'Sector donde mas nos defendieron', value: 'marco derecho · lado derecho · 60°-90° (3)' },
  ],
  finalScore: { uruguay: 2, opponent: 1 },
  scoreByPeriod: [
    { periodLabel: '1er tiempo', score: { uruguay: 2, opponent: 1 } },
    { periodLabel: '2do tiempo', score: { uruguay: 0, opponent: 0 } },
    { periodLabel: '3er tiempo', score: { uruguay: 0, opponent: 0 } },
  ],
  periods: [
    {
      periodNumber: 1,
      periodLabel: '1er tiempo',
      score: { uruguay: 2, opponent: 1 },
      uruguayPoints: 2,
      opponentPoints: 1,
      ownPoints: 1,
      opponentOwnPoints: 1,
      topScorers: [{ label: '#1 Mauro', total: 1 }],
      defenses: [{ label: '#2 Marcelo', total: 2 }],
      opponentDefenses: 3,
      opponentScoringZones: [{ label: 'marco derecho · lado izquierdo · 30°-60°', total: 1 }],
      opponentDefenseZones: [{ label: 'marco derecho · lado derecho · 60°-90°', total: 3 }],
      faltas: [{ label: '#3 Nicolas', total: 1 }],
      ownPointsByPlayer: [{ label: '#3 Nicolas', total: 1 }],
      totalErrors: [{ label: '#3 Nicolas', total: 2 }],
      effectiveness: [
        { playerId: 'p1', playerName: '#1 Mauro', goals: 3, rivalDefendedShots: 1, ownPointsAgainst: 1, shotAttempts: 5, effectiveness: 0.6 },
        { playerId: 'p2', playerName: '#2 Marcelo', goals: 0, rivalDefendedShots: 1, ownPointsAgainst: 0, shotAttempts: 1, effectiveness: 0 },
      ],
      performance,
      legacyOpponentDefensesWithoutPlayer: 1,
      substitutions: [{ periodLabel: '1er tiempo', clockLabel: '3:20', kind: 'substitution', playerOut: '#2 Marcelo', playerIn: '#4 Vladi' }],
      insights: [{ severity: 'info', title: 'Tiempo positivo', description: 'El equipo ganó este tiempo por 1 punto.', suggestedAction: 'Mantener decisiones.' }],
      maps: {
        uruguayPoints: [{ x: 0.75, y: 0.3 }],
        opponentPoints: [{ x: 0.2, y: 0.4 }],
        opponentDefenses: [
          { x: 0.5, y: 0.3 },
          { x: 0.52, y: 0.32 },
        ],
      },
    },
    {
      periodNumber: 2,
      periodLabel: '2do tiempo',
      score: { uruguay: 0, opponent: 0 },
      uruguayPoints: 0,
      opponentPoints: 0,
      ownPoints: 0,
      opponentOwnPoints: 0,
      topScorers: [],
      defenses: [],
      opponentDefenses: 0,
      opponentScoringZones: [],
      opponentDefenseZones: [],
      faltas: [],
      ownPointsByPlayer: [],
      totalErrors: [],
      effectiveness: [],
      performance: emptyPerformance,
      legacyOpponentDefensesWithoutPlayer: 0,
      substitutions: [],
      insights: [],
      maps: {
        uruguayPoints: [],
        opponentPoints: [],
        opponentDefenses: [],
      },
    },
    {
      periodNumber: 3,
      periodLabel: '3er tiempo',
      score: { uruguay: 0, opponent: 0 },
      uruguayPoints: 0,
      opponentPoints: 0,
      ownPoints: 0,
      opponentOwnPoints: 0,
      topScorers: [],
      defenses: [],
      opponentDefenses: 0,
      opponentScoringZones: [],
      opponentDefenseZones: [],
      faltas: [],
      ownPointsByPlayer: [],
      totalErrors: [],
      effectiveness: [],
      performance: emptyPerformance,
      legacyOpponentDefensesWithoutPlayer: 0,
      substitutions: [],
      insights: [],
      maps: {
        uruguayPoints: [],
        opponentPoints: [],
        opponentDefenses: [],
      },
    },
  ],
  totals: {
    topScorers: [{ label: '#1 Mauro', total: 1 }],
    defenses: [{ label: '#2 Marcelo', total: 2 }],
    opponentDefenses: 3,
    faltas: [{ label: '#3 Nicolas', total: 1 }],
    ownPointsByPlayer: [{ label: '#3 Nicolas', total: 1 }],
    totalErrors: [{ label: '#3 Nicolas', total: 2 }],
    effectiveness: [
      { playerId: 'p1', playerName: '#1 Mauro', goals: 3, rivalDefendedShots: 1, ownPointsAgainst: 1, shotAttempts: 5, effectiveness: 0.6 },
      { playerId: 'p2', playerName: '#2 Marcelo', goals: 0, rivalDefendedShots: 1, ownPointsAgainst: 0, shotAttempts: 1, effectiveness: 0 },
    ],
    performance,
    legacyOpponentDefensesWithoutPlayer: 1,
    opponentOwnPoints: 1,
    substitutions: [
      { periodLabel: '1er tiempo', clockLabel: '3:20', kind: 'substitution', playerOut: '#2 Marcelo', playerIn: '#4 Vladi' },
      { periodLabel: '1er tiempo', clockLabel: '5:10', kind: 'lineup_swap', playerOut: '#1 Mauro', playerIn: '#4 Vladi', playerA: '#1 Mauro', playerB: '#4 Vladi' },
    ],
    insights: [
      {
        id: 'i-own-points',
        severity: 'warning',
        title: 'Puntos regalados',
        description: 'Ya hubo 2 puntos en contra.',
        suggestedAction: 'Corregirlo en el proximo ajuste tactico.',
      },
      {
        id: 'i-errors',
        severity: 'warning',
        title: 'Errores repetidos',
        description: '#2 Marcelo acumula 3 errores.',
        suggestedAction: 'Corregirlo en el proximo ajuste tactico.',
      },
      {
        id: 'i-blocked',
        severity: 'warning',
        title: 'Lo están anulando',
        description: 'A #4 Vladi le defendieron 4 tiros y lleva 0/4.',
        suggestedAction: 'Probar rotacion, cambio de angulo o variar el punto de lanzamiento.',
      },
      {
        id: 'i-low-effectiveness',
        severity: 'warning',
        title: 'Baja efectividad',
        description: '#1 Mauro: 3/5 en tiros (60%).',
        suggestedAction: 'Probar rotacion, cambio de angulo o variar el punto de lanzamiento.',
      },
      {
        id: 'i-vulnerable',
        severity: 'warning',
        title: 'Zona vulnerable',
        description: 'Nos están entrando seguido por marco derecho · lado izquierdo · 30°-60°.',
        suggestedAction: 'Corregirlo en el proximo ajuste tactico.',
      },
      {
        id: 'i-blocked-zone',
        severity: 'warning',
        title: 'Zona bloqueada',
        description: 'El rival nos está defendiendo seguido en marco derecho · lado derecho · 60°-90°.',
        suggestedAction: 'Probar rotacion, cambio de angulo o variar el punto de lanzamiento.',
      },
      {
        id: 'i-defense',
        severity: 'info',
        title: 'Aporte defensivo',
        description: '#2 Marcelo sostiene defensa con 3 defensas.',
        suggestedAction: 'Mantenerlo como dato de lectura para el siguiente ajuste.',
      },
      {
        id: 'i-low-involvement',
        severity: 'info',
        title: 'Baja participación',
        description: '#5 Nico todavía no registra tiros ni defensas.',
        suggestedAction: 'Mantenerlo como dato de lectura para el siguiente ajuste.',
      },
    ],
  },
  zones: {
    attack: [{ label: 'marco derecho · lado izquierdo · 30°-60°', total: 1 }],
    against: [{ label: 'marco derecho · lado izquierdo · 30°-60°', total: 1 }],
    defended: [{ label: 'marco derecho · lado derecho · 60°-90°', total: 3 }],
  },
  totalMaps: {
    uruguayPoints: [{ x: 0.75, y: 0.3 }],
    opponentPoints: [{ x: 0.2, y: 0.4 }],
    opponentDefenses: [
      { x: 0.5, y: 0.3 },
      { x: 0.52, y: 0.32 },
    ],
  },
  lineups: {
    initial: ['#1 Mauro', '#2 Marcelo'],
    final: ['#1 Mauro', '#4 Vladi'],
  },
  notes: 'Cerrar mejor el centro.',
};

describe('reportHtml', () => {
  it('builds PDF HTML with Spanish labels and safe content', () => {
    const html = buildMatchReportHtml(report);

    expect(html).toContain('Reporte del partido');
    expect(html).toContain('Equipo vs Argentina');
    expect(html).toContain('Equipo 2 - 1 Argentina');
    expect(html).toContain('Puntos Equipo');
    expect(html).toContain('Sin puntos de Equipo');
    expect(html).toContain('Resumen ejecutivo');
    expect(html).toContain('Resultado por tiempos');
    expect(html).toContain('Goleadores');
    expect(html).toContain('Puntos en contra del rival');
    expect(html).toContain('Defensas del rival');
    expect(html).toContain('Rendimiento ofensivo');
    expect(html).toContain('Rendimiento del tiempo');
    expect(html).toContain('Rendimiento total');
    expect(html).toContain('Efectividad ofensiva');
    expect(html).toContain('Efectividad ofensiva total');
    expect(html).toContain('Tiros atajados');
    expect(html).toContain('Errados');
    expect(html).toContain('1 atajado · 1 errado');
    expect(html).toContain('Tiros generados');
    expect(html).toContain('Puntos convertidos');
    expect(html).toContain('60%');
    expect(html).toContain('Algunas defensas rivales antiguas no tienen jugador asociado');
    expect(html).toContain('Donde nos defendieron');
    expect(html).toContain('<meta charset="UTF-8"');
    expect(html).toContain('Formación inicial');
    expect(html).toContain('Lectura del tiempo');
    expect(html).toContain('Lectura final');
    expect(html).toContain('Puntos regalados');
    expect(html).toContain('2 puntos en contra');
    expect(html).toContain('Mapas del tiempo');
    expect(html).toContain('Mapas totales');
    expect(html).toContain('class="report-court-map"');
    expect(html).toContain('class="report-map-point"');
    expect(html).toContain('class="map-stack"');
    expect(html).toContain('class="report-map-section"');
    expect(html).toContain('.report-court-map { position: relative; width: 100%; height: 260px; min-height: 260px;');
    expect(html).toContain('print-color-adjust: exact');
    expect(html).toContain('background:#0b6bcb');
    expect(html).toContain('background:#e84f3d');
    expect(html).toContain('background:#7c3aed');
    expect(html).toContain('data-map-point="0"');
    expect(html).toContain('class="performance-grid"');
    expect(html).toContain('class="attempt-bar"');
    expect(html).toContain('class="converted-bar"');
    expect(html).toContain('class="defense-bar"');
    expect(html).toContain('style="width:100%;height:12px;background-color:#9dcff0;"');
    expect(html).toContain('style="width:60.0%;height:12px;background-color:#075ca8;"');
    expect(html).toContain('style="width:100.0%;height:12px;background-color:#0b6b61;"');
    expect(html).toContain('print-color-adjust: exact');
    expect(html).toContain('#4 Vladi · 0/4 tiros · 4 atajados');
    expect(html).toContain('#2 Marcelo · 3 errores');
    expect(html).toContain('marco derecho · lado izquierdo · 30°-60° · 1 punto');
    expect(html).toContain('class="sector-bar"');
    expect(html).toContain('marco derecho · lado izquierdo · 30°-60°');
    expect(html).toContain('Sin ubicaciones registradas');
    expect(html).toContain('data-normalized-x="0.750"');
    expect(html).toContain('data-normalized-y="0.300"');
    expect(html).toContain('left:73.00%; top:32.40%;');
    expect(html).toContain('Sin ubicaciones registradas.');
    expect(html).toContain('Donde hicimos los puntos');
    expect(html).toContain('Donde nos hicieron puntos');
    expect(html).toContain('Donde nos defendieron');
    expect(html).not.toContain('.map-grid { display: grid; grid-template-columns: repeat(3, 1fr)');
    expect(html).not.toContain('class="map-grid"');
    expect(html).not.toContain('<svg');
    expect(html).not.toContain('viewBox="0 0 640 360"');
    expect(html).not.toContain('data-angle-guide');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('opponent_own_point');
    expect(html).not.toContain('punto_en_contra');
    expect(html).not.toContain('lineup_swap');
    expect(html).not.toContain('opponent_defense');
    expect(html).not.toContain('Baja participación');
    expect(html).not.toContain('Probar rotacion, cambio de angulo o variar el punto de lanzamiento');
    expect(html).not.toContain('Mantenerlo como dato de lectura para el siguiente ajuste');
    expect(html).not.toContain('Corregirlo en el proximo ajuste tactico');
    expect(html).not.toMatch(/60°-120°|120°|150°|180°/);
    expect(html).not.toMatch(/zona (?:derecha|izquierda|central)/i);
    expect(html).not.toContain('Ã');
    expect(html).not.toContain('Â');
    expect(html).not.toContain('�');
  });

  it('builds shareable text fallback', () => {
    const text = buildMatchReportText(report);

    expect(text).toContain('Equipo vs Argentina');
    expect(text).toContain('Equipo 2 - 1 Argentina');
    expect(text).toContain('Top ataque: #1 Mauro · 3/5 tiros · 60% · 1 atajado · 1 errado.');
    expect(text).toContain('Top defensa: #2 Marcelo 2 defensas.');
    expect(text).toContain('Efectividad total: 3/6 tiros · 50%.');
    expect(text).toContain('Nota: algunas defensas rivales antiguas no tienen jugador asociado');
    expect(text).toContain('Zona vulnerable: marco derecho · lado izquierdo · 30°-60° (1)');
    expect(text).toContain('Zona bloqueada: marco derecho · lado derecho · 60°-90° (3)');
    expect(text).not.toContain('Lectura táctica');
    expect(text).not.toContain('Probar rotacion');
    expect(text).not.toContain('opponent_own_point');
    expect(text).not.toContain('punto_en_contra');
    expect(text).not.toMatch(/zona (?:derecha|izquierda|central)/i);
    expect(text).not.toContain('Ã');
    expect(text).not.toContain('Â');
    expect(text).not.toContain('�');
  });

  it('omits legacy effectiveness note when every rival defense has a player', () => {
    const cleanReport: MatchReportData = {
      ...report,
      periods: report.periods.map((period) => ({ ...period, legacyOpponentDefensesWithoutPlayer: 0 })),
      totals: { ...report.totals, legacyOpponentDefensesWithoutPlayer: 0 },
    };

    expect(buildMatchReportHtml(cleanReport)).not.toContain('Algunas defensas rivales antiguas no tienen jugador asociado');
    expect(buildMatchReportText(cleanReport)).not.toContain('Nota: algunas defensas rivales antiguas');
  });

  it('renders the team pool category throughout PDF and shared text labels', () => {
    const categorizedReport: MatchReportData = {
      ...report,
      teamPoolName: 'Mayores',
      ownTeamName: 'Mayores',
      matchLabel: 'Mayores vs Etsy',
      opponent: 'Etsy',
    };
    const html = buildMatchReportHtml(categorizedReport);

    expect(html).toContain('<p>Mayores vs Etsy</p>');
    expect(html).toContain('Mayores 2 - 1 Etsy');
    expect(html).toContain('Puntos Mayores');
    expect(html).toContain('Sin puntos de Mayores');
    expect(html).not.toContain('Puntos Uruguay');
    expect(html).not.toContain('Sin puntos de Uruguay');
    expect(buildMatchReportText(categorizedReport)).toContain('Mayores vs Etsy');
    expect(buildMatchReportText(categorizedReport)).toContain('Mayores 2 - 1 Etsy');
  });

  it('renders +40 as the own-team name', () => {
    const plus40Report: MatchReportData = {
      ...report,
      teamPoolName: '+40',
      ownTeamName: '+40',
      matchLabel: '+40 vs Etsy',
      opponent: 'Etsy',
    };
    const html = buildMatchReportHtml(plus40Report);

    expect(html).toContain('+40 vs Etsy');
    expect(html).toContain('+40 2 - 1 Etsy');
    expect(html).toContain('Puntos +40');
  });

  it('limits dense performance cards and reports remaining players', () => {
    const denseRows = Array.from({ length: 9 }, (_, index) => ({
      playerId: `dense-${index}`,
      playerName: `#${index + 10} Jugador ${index + 1}`,
      goals: 9 - index,
      rivalDefendedShots: 1,
      ownPointsAgainst: 0,
      shotAttempts: 10 - index,
      effectiveness: (9 - index) / (10 - index),
      defenses: 9 - index,
      attackShare: (9 - index) / 45,
      defenseShare: (9 - index) / 45,
    }));
    const densePerformance = {
      ...performance,
      rows: [...denseRows].reverse(),
      totalGoals: 45,
      totalShotAttempts: 54,
      totalDefenses: 45,
      topAttack: [denseRows[0]],
      topDefense: [denseRows[0]],
    };
    const denseReport: MatchReportData = {
      ...report,
      periods: report.periods.map((period, index) => index === 0 ? { ...period, performance: densePerformance } : period),
      totals: { ...report.totals, performance: densePerformance },
    };
    const html = buildMatchReportHtml(denseReport);

    expect(html).toContain('+2 jugadores más');
    expect(html).not.toContain('#18 Jugador 9');
    expect(html.indexOf('#10 Jugador 1')).toBeLessThan(html.indexOf('#16 Jugador 7'));
  });
});
