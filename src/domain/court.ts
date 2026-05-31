import { CourtLocation, MatchEvent, PointEvent, TeamSide } from './types';

export type DerivedCourtZone = 'izquierda' | 'central' | 'derecha';
export type DerivedCourtHalf = 'marco_izquierdo' | 'marco_derecho' | 'centro';

export type LandingZoneStat = {
  label: string;
  total: number;
};

export const isPointEvent = (event: MatchEvent): event is PointEvent => event.kind === 'point';

export const hasLandingLocation = (event: MatchEvent): event is PointEvent & { landingLocation: CourtLocation } =>
  isPointEvent(event) && event.pointSource !== 'opponent_own_point' && Boolean(event.landingLocation);

export function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

export function clampLocation(location: CourtLocation): CourtLocation {
  return {
    x: clamp01(location.x),
    y: clamp01(location.y),
  };
}

export function isValidCourtLayout(width: number, height: number): boolean {
  return Number.isFinite(width) && Number.isFinite(height) && width >= 40 && height >= 40;
}

export function normalizeTapLocation(localX: number, localY: number, width: number, height: number): CourtLocation {
  if (!isValidCourtLayout(width, height)) {
    throw new Error('Invalid court layout dimensions');
  }

  return clampLocation({
    x: localX / width,
    y: localY / height,
  });
}

export function denormalizeLocation(location: CourtLocation, width: number, height: number): CourtLocation {
  if (!isValidCourtLayout(width, height)) {
    throw new Error('Invalid court layout dimensions');
  }

  const clamped = clampLocation(location);

  return {
    x: clamped.x * width,
    y: clamped.y * height,
  };
}

export function getCourtZone(location: CourtLocation): DerivedCourtZone {
  if (location.x < 1 / 3) {
    return 'izquierda';
  }

  if (location.x > 2 / 3) {
    return 'derecha';
  }

  return 'central';
}

export function getCourtHalf(location: CourtLocation): DerivedCourtHalf {
  if (location.x < 0.42) {
    return 'marco_izquierdo';
  }

  if (location.x > 0.58) {
    return 'marco_derecho';
  }

  return 'centro';
}

const zoneLabel: Record<DerivedCourtZone, string> = {
  izquierda: 'Zona izquierda',
  central: 'Zona central',
  derecha: 'Zona derecha',
};

const halfLabel: Record<DerivedCourtHalf, string> = {
  marco_izquierdo: 'Marco izquierdo',
  marco_derecho: 'Marco derecho',
  centro: 'Centro',
};

const increment = (map: Map<string, number>, key: string) => {
  map.set(key, (map.get(key) ?? 0) + 1);
};

const sortStats = (map: Map<string, number>): LandingZoneStat[] =>
  Array.from(map, ([label, total]) => ({ label, total })).sort((a, b) => b.total - a.total);

export function getPointEventsWithLocation(events: MatchEvent[], team?: TeamSide) {
  return events.filter(hasLandingLocation).filter((event) => !team || event.scoringTeam === team);
}

export function groupPointsByZone(events: MatchEvent[]): LandingZoneStat[] {
  const totals = new Map<string, number>();

  getPointEventsWithLocation(events, 'uruguay').forEach((event) => {
    increment(totals, zoneLabel[getCourtZone(event.landingLocation)]);
    increment(totals, halfLabel[getCourtHalf(event.landingLocation)]);
  });

  return sortStats(totals);
}

export function groupOpponentPointsByZone(events: MatchEvent[]): LandingZoneStat[] {
  const totals = new Map<string, number>();

  getPointEventsWithLocation(events, 'opponent').forEach((event) => {
    increment(totals, zoneLabel[getCourtZone(event.landingLocation)]);
    increment(totals, halfLabel[getCourtHalf(event.landingLocation)]);
  });

  return sortStats(totals);
}

export function getMostFrequentLandingZones(events: MatchEvent[], team?: TeamSide, limit = 3): LandingZoneStat[] {
  const totals = new Map<string, number>();

  getPointEventsWithLocation(events, team).forEach((event) => {
    increment(totals, zoneLabel[getCourtZone(event.landingLocation)]);
  });

  return sortStats(totals).slice(0, limit);
}
