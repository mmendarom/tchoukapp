import { describe, expect, it } from 'vitest';

import {
  COURT_VISUAL_GEOMETRY,
  getCourtInputMapHeight,
  getCourtLiveMapHeight,
  getCourtSummaryMapHeight,
} from './courtVisual';

describe('court visual geometry', () => {
  it('keeps the tuned court area geometry in one shared source', () => {
    expect(COURT_VISUAL_GEOMETRY.frameAreaWidthPercent).toBe(18);
    expect(COURT_VISUAL_GEOMETRY.forbiddenAreaWidthPercent).toBe(52);
    expect(COURT_VISUAL_GEOMETRY.forbiddenAreaHeightPercent).toBe(80);
    expect(COURT_VISUAL_GEOMETRY.forbiddenAreaTopPercent).toBe(10);
    expect(COURT_VISUAL_GEOMETRY.forbiddenAreaOffsetPercent).toBe(-26);
  });

  it('derives input map height from shared geometry values', () => {
    expect(getCourtInputMapHeight({
      bottomInset: 0,
      isLandscape: false,
      isTablet: false,
      topInset: 0,
      windowHeight: 900,
      windowWidth: 390,
    })).toBe(241.8);

    expect(getCourtInputMapHeight({
      bottomInset: 0,
      isLandscape: true,
      isTablet: false,
      topInset: 0,
      windowHeight: 390,
      windowWidth: 900,
    })).toBe(COURT_VISUAL_GEOMETRY.inputLandscapeMinHeight);

    expect(getCourtInputMapHeight({
      bottomInset: 0,
      isLandscape: true,
      isTablet: true,
      topInset: 0,
      windowHeight: 680,
      windowWidth: 1100,
    })).toBe(360);
  });

  it('derives summary and live map heights from shared geometry values', () => {
    expect(getCourtSummaryMapHeight({ isLandscape: false, isTablet: false })).toBe(COURT_VISUAL_GEOMETRY.summaryMapPhonePortraitHeight);
    expect(getCourtSummaryMapHeight({ isLandscape: true, isTablet: false })).toBe(COURT_VISUAL_GEOMETRY.summaryMapPhoneLandscapeHeight);
    expect(getCourtSummaryMapHeight({ isLandscape: false, isTablet: true })).toBe(COURT_VISUAL_GEOMETRY.summaryMapTabletPortraitHeight);
    expect(getCourtSummaryMapHeight({ isLandscape: true, isTablet: true })).toBe(COURT_VISUAL_GEOMETRY.summaryMapTabletLandscapeHeight);

    expect(getCourtLiveMapHeight({ isTabletLandscape: false, windowWidth: 390 })).toBe(COURT_VISUAL_GEOMETRY.liveMapPhoneHeight);
    expect(getCourtLiveMapHeight({ isTabletLandscape: false, windowWidth: 820 })).toBe(COURT_VISUAL_GEOMETRY.liveMapTabletHeight);
    expect(getCourtLiveMapHeight({ isTabletLandscape: true, windowWidth: 1100 })).toBe(COURT_VISUAL_GEOMETRY.liveMapTabletLandscapeHeight);
  });
});
