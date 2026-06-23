import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  deriveTrainingGoalSector,
  getTrainingGoalAngleBand,
  getTrainingGoalAngleDegrees,
  normalizeTrainingGoalTapLocation,
} from './trainingGoalMap';

describe('training goal map', () => {
  it('normalizes one-frame taps to 0-1 coordinates', () => {
    expect(normalizeTrainingGoalTapLocation(100, 50, 200, 100)).toEqual({ x: 0.5, y: 0.5 });
  });

  it('clamps taps outside the one-frame area', () => {
    expect(normalizeTrainingGoalTapLocation(-20, 140, 200, 100)).toEqual({ x: 0, y: 1 });
    expect(normalizeTrainingGoalTapLocation(240, -10, 200, 100)).toEqual({ x: 1, y: 0 });
  });

  it('rejects invalid map dimensions', () => {
    expect(() => normalizeTrainingGoalTapLocation(10, 10, 0, 100)).toThrow('Invalid court layout dimensions');
  });

  it('derives simple one-frame bands without exceeding 90 degrees', () => {
    expect(getTrainingGoalAngleDegrees({ x: 0.5, y: -1 })).toBe(90);
    expect(getTrainingGoalAngleDegrees({ x: 0.5, y: 0.5 })).toBe(45);
    expect(getTrainingGoalAngleDegrees({ x: 0.5, y: 2 })).toBe(0);
    expect(getTrainingGoalAngleBand({ x: 0.5, y: 0.95 })).toBe('0°-30°');
    expect(getTrainingGoalAngleBand({ x: 0.5, y: 0.5 })).toBe('30°-60°');
    expect(getTrainingGoalAngleBand({ x: 0.5, y: 0.05 })).toBe('60°-90°');
  });

  it('derives one-goal tactical labels for both sides and the center', () => {
    expect(deriveTrainingGoalSector({ x: 0.2, y: 0.95 })).toMatchObject({
      sideLabel: 'lado izquierdo',
      angleBand: '0°-30°',
      shortLabel: 'lado izquierdo · 0°-30°',
      key: 'lado izquierdo:0°-30°',
    });
    expect(deriveTrainingGoalSector({ x: 0.2, y: 0.5 })).toMatchObject({
      sideLabel: 'lado izquierdo',
      angleBand: '30°-60°',
      shortLabel: 'lado izquierdo · 30°-60°',
    });
    expect(deriveTrainingGoalSector({ x: 0.5, y: 0.05 })).toMatchObject({
      sideLabel: 'centro',
      angleBand: '60°-90°',
      shortLabel: 'centro · 60°-90°',
    });
    expect(deriveTrainingGoalSector({ x: 0.8, y: 0.5 })).toMatchObject({
      sideLabel: 'lado derecho',
      angleBand: '30°-60°',
      shortLabel: 'lado derecho · 30°-60°',
    });
    expect(deriveTrainingGoalSector({ x: 0.8, y: 0.95 })).toMatchObject({
      sideLabel: 'lado derecho',
      angleBand: '0°-30°',
      shortLabel: 'lado derecho · 0°-30°',
    });
  });

  it('returns null without a location and clamps legacy coordinates safely', () => {
    expect(deriveTrainingGoalSector()).toBeNull();
    expect(deriveTrainingGoalSector(null)).toBeNull();
    expect(deriveTrainingGoalSector({ x: -2, y: 4 })).toMatchObject({
      sideLabel: 'lado izquierdo',
      angleBand: '0°-30°',
      shortLabel: 'lado izquierdo · 0°-30°',
    });
  });

  it('never emits formal full-court training sector labels', () => {
    const labels = [
      deriveTrainingGoalSector({ x: 0.2, y: 0.95 })?.shortLabel,
      deriveTrainingGoalSector({ x: 0.2, y: 0.5 })?.shortLabel,
      deriveTrainingGoalSector({ x: 0.5, y: 0.05 })?.shortLabel,
      deriveTrainingGoalSector({ x: 0.8, y: 0.5 })?.shortLabel,
      deriveTrainingGoalSector({ x: 0.8, y: 0.95 })?.shortLabel,
    ].join(' ');

    expect(labels).not.toMatch(/marco izquierdo|marco derecho|zona izquierda|zona derecha|120°|150°|180°/i);
  });

  it('keeps one-frame training capture isolated from the formal full-court map', () => {
    const root = process.cwd();
    const trainingLiveSource = readFileSync(join(root, 'src/screens/LiveTrainingMiniMatchScreen.tsx'), 'utf8');
    const formalLiveSource = readFileSync(join(root, 'src/screens/LiveMatchScreen.tsx'), 'utf8');
    const formalMapSource = readFileSync(join(root, 'src/components/CourtMapInput.tsx'), 'utf8');

    expect(trainingLiveSource).toContain('TrainingGoalMapInput');
    expect(trainingLiveSource).not.toContain("from '../components/CourtMapInput'");
    expect(formalLiveSource).toContain('CourtMapInput');
    expect(formalMapSource).toContain('<CourtField');
    expect(formalMapSource).not.toContain('training_point');
    expect(formalMapSource).not.toContain('training_shot_defended');
  });
});
