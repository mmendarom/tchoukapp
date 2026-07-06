import { MatchPeriod } from './types';
import { formatPeriodName } from './periodStats';

// Contenido del overlay animado de cambio de fase (spec 018). Los builders son
// puros para poder testearlos sin UI; el componente PhaseTransitionOverlay
// solo dibuja lo que recibe.
export type PhaseTransitionContent = {
  kicker: string;
  title: string;
  subtitle?: string;
  detail?: string;
};

export const buildMiniMatchEndTransition = (
  winnerName: string,
  nextMatchupLabel?: string,
): PhaseTransitionContent => ({
  kicker: 'Práctica 3v3',
  title: `Ganador: ${winnerName}`,
  subtitle: nextMatchupLabel ? `Ahora: ${nextMatchupLabel}` : undefined,
  detail: nextMatchupLabel ? 'El próximo mini partido arranca solo' : 'Elegí el próximo cruce desde la sesión',
});

export const buildPeriodEndTransition = (
  periodNumber: MatchPeriod,
  ownTeamName: string,
  ownScore: number,
  opponentName: string,
  opponentScore: number,
): PhaseTransitionContent => ({
  kicker: 'Partido vs rival',
  title: `Fin del ${formatPeriodName(periodNumber)}`,
  subtitle: `${ownTeamName} ${ownScore} - ${opponentScore} ${opponentName}`,
  detail: 'Vamos al resumen del tiempo',
});

export const buildPeriodStartTransition = (periodNumber: MatchPeriod): PhaseTransitionContent => ({
  kicker: 'Partido vs rival',
  title: formatPeriodName(periodNumber),
  subtitle: '¡A jugar!',
});
