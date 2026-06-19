import { CourtLocation, FrameSide, MatchEvent, OpponentDefenseEvent, PointEvent, PointFrame, TeamSide } from './types';

export type DerivedCourtZone = 'izquierda' | 'central' | 'derecha';
export type DerivedCourtHalf = 'marco_izquierdo' | 'marco_derecho' | 'centro';
export type TacticalCourtSide = 'marco_izquierdo' | 'marco_derecho';
export type TacticalAngleBand = '0°-30°' | '30°-60°' | '60°-120°' | '120°-150°' | '150°-180°';

export type LandingZoneStat = {
  label: string;
  total: number;
};

export type TacticalCourtSector = {
  sideLabel: string;
  angleDegrees: number;
  angleBand: TacticalAngleBand;
  shortLabel: string;
  description: string;
};

export const isPointEvent = (event: MatchEvent): event is PointEvent => event.kind === 'point';
export const isOpponentDefenseEvent = (event: MatchEvent): event is OpponentDefenseEvent => event.kind === 'opponent_defense';

export const hasLandingLocation = (event: MatchEvent): event is PointEvent & { landingLocation: CourtLocation } =>
  isPointEvent(event) && event.pointSource !== 'opponent_own_point' && Boolean(event.landingLocation);

export const hasOpponentDefenseLocation = (
  event: MatchEvent,
): event is OpponentDefenseEvent & { defenseLocation: CourtLocation } =>
  isOpponentDefenseEvent(event) && Boolean(event.defenseLocation);

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

const getTacticalSide = (location: CourtLocation, frameOrSide?: FrameSide | PointFrame): TacticalCourtSide => {
  if (frameOrSide === 'left-frame' || frameOrSide === 'left') {
    return 'marco_izquierdo';
  }

  if (frameOrSide === 'right-frame' || frameOrSide === 'right') {
    return 'marco_derecho';
  }

  return clampLocation(location).x < 0.5 ? 'marco_izquierdo' : 'marco_derecho';
};

const getAngleBand = (angleDegrees: number): TacticalAngleBand => {
  if (angleDegrees <= 30) {
    return '0°-30°';
  }

  if (angleDegrees <= 60) {
    return '30°-60°';
  }

  if (angleDegrees < 120) {
    return '60°-120°';
  }

  if (angleDegrees < 150) {
    return '120°-150°';
  }

  return '150°-180°';
};

const tacticalSideLabel: Record<TacticalCourtSide, string> = {
  marco_izquierdo: 'marco izquierdo',
  marco_derecho: 'marco derecho',
};

const tacticalBandDescription: Record<TacticalAngleBand, string> = {
  '0°-30°': 'sector de fondo',
  '30°-60°': 'sector bajo/intermedio',
  '60°-120°': 'zona media cerca de 90°',
  '120°-150°': 'sector alto/intermedio',
  '150°-180°': 'fondo opuesto',
};

export function deriveTacticalCourtSector(location: CourtLocation, frameOrSide?: FrameSide | PointFrame): TacticalCourtSector {
  const clamped = clampLocation(location);
  const side = getTacticalSide(clamped, frameOrSide);
  const angleDegrees = Math.round(clamped.y * 180);
  const angleBand = getAngleBand(angleDegrees);
  const sideLabel = tacticalSideLabel[side];
  const shortLabel = `${sideLabel} · ${angleBand}`;

  return {
    sideLabel,
    angleDegrees,
    angleBand,
    shortLabel,
    description: `${sideLabel}, ${tacticalBandDescription[angleBand]}`,
  };
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

export function getOpponentDefenseEventsWithLocation(events: MatchEvent[]) {
  return events.filter(hasOpponentDefenseLocation);
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

export function groupOpponentDefensesByZone(events: MatchEvent[]): LandingZoneStat[] {
  const totals = new Map<string, number>();

  getOpponentDefenseEventsWithLocation(events).forEach((event) => {
    increment(totals, zoneLabel[getCourtZone(event.defenseLocation)]);
    increment(totals, halfLabel[getCourtHalf(event.defenseLocation)]);
  });

  return sortStats(totals);
}

export function groupPointsByTacticalSector(events: MatchEvent[], team?: TeamSide): LandingZoneStat[] {
  const totals = new Map<string, number>();

  getPointEventsWithLocation(events, team).forEach((event) => {
    increment(totals, deriveTacticalCourtSector(event.landingLocation, event.frame).shortLabel);
  });

  return sortStats(totals);
}

export function groupOpponentPointsByTacticalSector(events: MatchEvent[]): LandingZoneStat[] {
  return groupPointsByTacticalSector(events, 'opponent');
}

export function groupOpponentDefensesByTacticalSector(events: MatchEvent[]): LandingZoneStat[] {
  const totals = new Map<string, number>();

  getOpponentDefenseEventsWithLocation(events).forEach((event) => {
    increment(totals, deriveTacticalCourtSector(event.defenseLocation).shortLabel);
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

export function getMostFrequentOpponentDefenseZones(events: MatchEvent[], limit = 3): LandingZoneStat[] {
  const totals = new Map<string, number>();

  getOpponentDefenseEventsWithLocation(events).forEach((event) => {
    increment(totals, zoneLabel[getCourtZone(event.defenseLocation)]);
  });

  return sortStats(totals).slice(0, limit);
}

export function getMostFrequentOpponentScoringSectors(events: MatchEvent[], limit = 3): LandingZoneStat[] {
  return groupOpponentPointsByTacticalSector(events).slice(0, limit);
}

export function getMostFrequentOpponentDefenseSectors(events: MatchEvent[], limit = 3): LandingZoneStat[] {
  return groupOpponentDefensesByTacticalSector(events).slice(0, limit);
}
