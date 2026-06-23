import { clampLocation, normalizeTapLocation } from './court';
import { CourtLocation } from './types';

export type TrainingGoalAngleBand = '0°-30°' | '30°-60°' | '60°-90°';
export type TrainingGoalSideLabel = 'lado izquierdo' | 'centro' | 'lado derecho';

export interface TrainingGoalSector {
  sideLabel: TrainingGoalSideLabel;
  angleBand: TrainingGoalAngleBand;
  shortLabel: string;
  key: string;
}

export function normalizeTrainingGoalTapLocation(
  localX: number,
  localY: number,
  width: number,
  height: number,
): CourtLocation {
  return normalizeTapLocation(localX, localY, width, height);
}

export function getTrainingGoalAngleDegrees(location: CourtLocation) {
  const clamped = clampLocation(location);

  return Math.round((1 - clamped.y) * 90);
}

export function getTrainingGoalAngleBand(location: CourtLocation): TrainingGoalAngleBand {
  const angle = getTrainingGoalAngleDegrees(location);

  if (angle <= 30) {
    return '0°-30°';
  }

  if (angle <= 60) {
    return '30°-60°';
  }

  return '60°-90°';
}

export function deriveTrainingGoalSector(location?: CourtLocation | null): TrainingGoalSector | null {
  if (!location) {
    return null;
  }

  const clamped = clampLocation(location);
  const angleBand = getTrainingGoalAngleBand(clamped);
  const sideLabel: TrainingGoalSideLabel = angleBand === '60°-90°'
    ? 'centro'
    : clamped.x < 0.5 ? 'lado izquierdo' : 'lado derecho';

  return {
    sideLabel,
    angleBand,
    key: `${sideLabel}:${angleBand}`,
    shortLabel: `${sideLabel} · ${angleBand}`,
  };
}
