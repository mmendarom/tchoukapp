import { describe, expect, it } from 'vitest';

import { MatchReportData } from '../domain/reportData';
import { buildMatchReportHtml, buildMatchReportText } from './reportHtml';

const report: MatchReportData = {
  title: 'Reporte del partido',
  matchLabel: 'Uruguay vs Argentina',
  opponent: 'Argentina',
  dateLabel: '1 ene 2026, 20:00',
  venueLabel: 'Montevideo',
  competitionLabel: 'Sin competencia registrada',
  executiveSummary: [
    { label: 'Resultado final', value: 'Uruguay 2 - 1 Argentina' },
    { label: 'Mejor goleador', value: '#1 Mauro (1)' },
    { label: 'Mas defensas Uruguay', value: '#2 Marcelo (2)' },
    { label: 'Errores totales', value: '2' },
    { label: 'Puntos en contra', value: '1' },
    { label: 'Puntos en contra del rival', value: '1' },
    { label: 'Zona mas efectiva', value: 'Zona derecha (1)' },
    { label: 'Zona vulnerable', value: 'Zona izquierda (1)' },
    { label: 'Zona donde mas nos defendieron', value: 'Zona central (3)' },
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
      opponentDefenseZones: [{ label: 'Zona central', total: 3 }],
      faltas: [{ label: '#3 Nicolas', total: 1 }],
      ownPointsByPlayer: [{ label: '#3 Nicolas', total: 1 }],
      totalErrors: [{ label: '#3 Nicolas', total: 2 }],
      substitutions: [{ periodLabel: '1er tiempo', clockLabel: '3:20', kind: 'substitution', playerOut: '#2 Marcelo', playerIn: '#4 Vladi' }],
      insights: [{ severity: 'info', title: 'Tiempo positivo', description: 'Uruguay gano este tiempo por 1 puntos.', suggestedAction: 'Mantener decisiones.' }],
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
      opponentDefenseZones: [],
      faltas: [],
      ownPointsByPlayer: [],
      totalErrors: [],
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
      opponentDefenseZones: [],
      faltas: [],
      ownPointsByPlayer: [],
      totalErrors: [],
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
    opponentOwnPoints: 1,
    substitutions: [
      { periodLabel: '1er tiempo', clockLabel: '3:20', kind: 'substitution', playerOut: '#2 Marcelo', playerIn: '#4 Vladi' },
      { periodLabel: '1er tiempo', clockLabel: '5:10', kind: 'lineup_swap', playerOut: '#1 Mauro', playerIn: '#4 Vladi', playerA: '#1 Mauro', playerB: '#4 Vladi' },
    ],
    insights: [
      {
        id: 'i-1',
        severity: 'info',
        title: 'La formación actual tiene plus/minus positivo',
        description: 'Esta formación está +3 y convirtió puntos importantes.',
        suggestedAction: 'Mantener presión táctica.',
      },
    ],
  },
  zones: {
    attack: [{ label: 'Zona derecha', total: 1 }],
    against: [{ label: 'Zona izquierda', total: 1 }],
    defended: [{ label: 'Zona central', total: 3 }],
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
    expect(html).toContain('Resumen ejecutivo');
    expect(html).toContain('Resultado por tiempos');
    expect(html).toContain('Goleadores');
    expect(html).toContain('Puntos en contra del rival');
    expect(html).toContain('Defensas del rival');
    expect(html).toContain('Donde nos defendieron');
    expect(html).toContain('<meta charset="UTF-8"');
    expect(html).toContain('Formación inicial');
    expect(html).toContain('Alertas tácticas');
    expect(html).toContain('La formación actual tiene plus/minus positivo');
    expect(html).toContain('Esta formación está +3');
    expect(html).toContain('Mapas del tiempo');
    expect(html).toContain('Mapas totales');
    expect(html).toContain('<svg');
    expect(html).toContain('data-map-point="0"');
    expect(html).toContain('Sin ubicaciones registradas');
    expect(html).not.toContain('opponent_own_point');
    expect(html).not.toContain('punto_en_contra');
    expect(html).not.toContain('lineup_swap');
    expect(html).not.toContain('Ã');
    expect(html).not.toContain('Â');
    expect(html).not.toContain('�');
  });

  it('builds shareable text fallback', () => {
    const text = buildMatchReportText(report);

    expect(text).toContain('Uruguay vs Argentina');
    expect(text).toContain('Uruguay 2 - 1 Argentina');
    expect(text).toContain('Puntos en contra del rival: 1');
    expect(text).toContain('Defensas del rival: 3');
    expect(text).toContain('Top 3 goleadores');
    expect(text).toContain('Zonas principales');
    expect(text).toContain('Donde hicimos puntos: Zona derecha (1)');
    expect(text).toContain('Alertas tácticas');
    expect(text).toContain('La formación actual tiene plus/minus positivo');
    expect(text).not.toContain('opponent_own_point');
    expect(text).not.toContain('punto_en_contra');
    expect(text).not.toContain('Ã');
    expect(text).not.toContain('Â');
    expect(text).not.toContain('�');
  });
});
