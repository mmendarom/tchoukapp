import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildMiniMatchEndTransition,
  buildPeriodEndTransition,
  buildPeriodStartTransition,
} from './phaseTransition';

describe('phase transition builders', () => {
  it('arma la transición de fin de mini partido con próximo cruce', () => {
    expect(buildMiniMatchEndTransition('Equipo 1', 'Equipo 1 vs Equipo 3')).toEqual({
      kicker: 'Práctica 3v3',
      title: 'Ganador: Equipo 1',
      subtitle: 'Ahora: Equipo 1 vs Equipo 3',
      detail: 'El próximo mini partido arranca solo',
    });
  });

  it('sin próximo cruce anuncia solo al ganador y sugiere elegir desde la sesión', () => {
    const content = buildMiniMatchEndTransition('Equipo 2');

    expect(content.title).toBe('Ganador: Equipo 2');
    expect(content.subtitle).toBeUndefined();
    expect(content.detail).toBe('Elegí el próximo cruce desde la sesión');
  });

  it('arma la transición de fin de tiempo con marcador', () => {
    expect(buildPeriodEndTransition(1, 'Uruguay', 12, 'Argentina', 9)).toEqual({
      kicker: 'Partido vs rival',
      title: 'Fin del 1er tiempo',
      subtitle: 'Uruguay 12 - 9 Argentina',
      detail: 'Vamos al resumen del tiempo',
    });
  });

  it('arma la transición de inicio de tiempo', () => {
    expect(buildPeriodStartTransition(2)).toEqual({
      kicker: 'Partido vs rival',
      title: '2do tiempo',
      subtitle: '¡A jugar!',
    });
    expect(buildPeriodStartTransition(3).title).toBe('3er tiempo');
  });
});

describe('phase transition wiring (source checks)', () => {
  const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

  it('el 3v3 encadena el próximo mini partido tras la animación, sin tocar Iniciar próximo', () => {
    const source = read('src/screens/LiveTrainingMiniMatchScreen.tsx');

    expect(source).toContain('PhaseTransitionOverlay');
    expect(source).toContain('buildMiniMatchEndTransition');
    expect(source).toContain('handlePhaseTransitionFinished');
    expect(source).toContain('startSuggestedNextMiniMatch(session.id)');
  });

  it('el partido formal anima fin de tiempo e inicio de nuevo tiempo', () => {
    const liveSource = read('src/screens/LiveMatchScreen.tsx');
    const summarySource = read('src/screens/PeriodSummaryScreen.tsx');

    expect(liveSource).toContain('PhaseTransitionOverlay');
    expect(liveSource).toContain('buildPeriodEndTransition');
    expect(liveSource).toContain('buildPeriodStartTransition');
    expect(summarySource).toContain('PhaseTransitionOverlay');
    expect(summarySource).toContain('buildPeriodStartTransition');
  });
});
