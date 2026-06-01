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
    insights: [{ id: 'i-1', severity: 'info', title: 'Puntos regalados por el rival', description: 'El rival entrego 1 punto.', suggestedAction: 'Mantener presion.' }],
  },
  zones: {
    attack: [{ label: 'Zona derecha', total: 1 }],
    against: [{ label: 'Zona izquierda', total: 1 }],
    defended: [{ label: 'Zona central', total: 3 }],
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
    expect(html).toContain('Resultado por tiempos');
    expect(html).toContain('Goleadores');
    expect(html).toContain('Puntos en contra del rival');
    expect(html).toContain('Defensas del rival');
    expect(html).toContain('Zonas donde nos defendieron');
    expect(html).toContain('Formacion inicial');
    expect(html).toContain('Mapa visual exportable pendiente');
    expect(html).not.toContain('opponent_own_point');
    expect(html).not.toContain('punto_en_contra');
  });

  it('builds shareable text fallback', () => {
    const text = buildMatchReportText(report);

    expect(text).toContain('Uruguay vs Argentina');
    expect(text).toContain('Uruguay 2 - 1 Argentina');
    expect(text).toContain('Puntos en contra del rival: 1');
    expect(text).toContain('Defensas del rival: 3');
    expect(text).toContain('Formacion final');
    expect(text).not.toContain('opponent_own_point');
  });
});
