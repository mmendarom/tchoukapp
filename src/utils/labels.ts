import { CourtZone, ErrorType, FrameSide, MatchEvent, MatchStatus, PlayerPosition, PlayerUsualZone } from '../domain/types';

export const statusLabel: Record<MatchStatus, string> = {
  draft: 'Borrador',
  live: 'En vivo',
  period_break: 'Entretiempo',
  finished: 'Finalizado',
  cancelled: 'Cancelado',
};

export const positionLabel: Record<PlayerPosition, string> = {
  Wing: 'Ala',
  Center: 'Centro',
  Shooter: 'Atacante',
  Defender: 'Defensa',
  Pivot: 'Pivote',
};

export const usualZoneLabel: Record<PlayerUsualZone, string> = {
  izquierda: 'Izquierda',
  central: 'Central',
  derecha: 'Derecha',
};

export const zoneLabel: Record<CourtZone, string> = {
  'left-wing': 'Zona izquierda',
  'left-center': 'Zona izquierda',
  center: 'Zona central',
  'right-center': 'Zona derecha',
  'right-wing': 'Zona derecha',
  backcourt: 'Fondo',
};

export const frameLabel: Record<FrameSide, string> = {
  'left-frame': 'Marco izquierdo',
  'right-frame': 'Marco derecho',
};

export const errorLabel: Record<ErrorType, string> = {
  falta: 'Falta',
  punto_en_contra: 'Punto en contra',
  'missed-frame': 'No toca el marco',
  'forbidden-zone': 'Zona prohibida',
  'bad-rebound': 'Rebote inválido',
  'dropped-ball': 'Pelota caída',
  'third-pass': 'Tercer pase',
  turnover: 'Pérdida',
  'defensive-block': 'Bloqueo defensivo',
  other: 'Error propio',
};

export const safeErrorLabel = (errorType: ErrorType | string | undefined) => {
  if (errorType === 'falta') {
    return 'Falta';
  }

  if (errorType === 'punto_en_contra') {
    return 'Punto en contra';
  }

  return 'Error anterior';
};

export const eventKindLabel = (event: MatchEvent) => {
  switch (event.kind) {
    case 'point':
      if (event.pointSource === 'opponent_own_point') {
        return 'Punto en contra rival';
      }

      return event.scoringTeam === 'uruguay' ? 'Punto propio' : 'Punto rival';
    case 'error':
      return event.team === 'uruguay' ? safeErrorLabel(event.errorType) : 'Error rival';
    case 'defense':
      return 'Defensa propia';
    case 'opponent_defense':
      return 'Defensa rival';
    case 'substitution':
      return 'Cambio';
    case 'lineup_swap':
      return 'Intercambio en cancha';
    default:
      return 'Acción';
  }
};
