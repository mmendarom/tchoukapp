export const COURT_VISUAL_GEOMETRY = {
  // Shared visual source of truth for input, live, summary and PDF maps.
  // If these values change, app maps and PDF maps must keep deriving from this module.
  centerLaneLeftPercent: 33.33,
  centerLaneWidthPercent: 33.34,
  laneOneLeftPercent: 33.33,
  laneTwoLeftPercent: 66.66,
  frameAreaWidthPercent: 18,
  forbiddenAreaTopPercent: 10,
  forbiddenAreaWidthPercent: 52,
  forbiddenAreaHeightPercent: 80,
  forbiddenAreaOffsetPercent: -26,
  degreeGuideWidthPercent: 27,
  horizontalTopPercent: 25,
  horizontalMiddlePercent: 50,
  horizontalBottomPercent: 75,
  inputLandscapeMinHeight: 170,
  inputLandscapeAvailableHeightRatio: 0.58,
  inputLandscapeTabletReservedHeight: 320,
  inputLandscapePhoneReservedHeight: 280,
  inputPortraitMinHeight: 220,
  inputPortraitAvailableHeightRatio: 0.42,
  inputHeightToWindowWidthRatio: 0.62,
  summaryMapPhonePortraitHeight: 280,
  summaryMapPhoneLandscapeHeight: 250,
  summaryMapTabletPortraitHeight: 340,
  summaryMapTabletLandscapeHeight: 380,
  liveMapPhoneHeight: 220,
  liveMapTabletHeight: 260,
  liveMapTabletLandscapeHeight: 240,
  reportMapWidthPx: 640,
  reportMapHeightPx: 397,
} as const;

type CourtInputMapHeightParams = {
  bottomInset: number;
  isLandscape: boolean;
  isTablet: boolean;
  topInset: number;
  windowHeight: number;
  windowWidth: number;
};

type CourtResponsiveMapHeightParams = {
  isLandscape: boolean;
  isTablet: boolean;
};

type CourtLiveMapHeightParams = {
  isTabletLandscape: boolean;
  windowWidth: number;
};

export function getCourtInputMapHeight({
  bottomInset,
  isLandscape,
  isTablet,
  topInset,
  windowHeight,
  windowWidth,
}: CourtInputMapHeightParams) {
  const availableHeight = windowHeight - topInset - bottomInset;

  if (isLandscape) {
    const reservedHeight = isTablet
      ? COURT_VISUAL_GEOMETRY.inputLandscapeTabletReservedHeight
      : COURT_VISUAL_GEOMETRY.inputLandscapePhoneReservedHeight;

    return Math.max(
      COURT_VISUAL_GEOMETRY.inputLandscapeMinHeight,
      Math.min(
        availableHeight * COURT_VISUAL_GEOMETRY.inputLandscapeAvailableHeightRatio,
        availableHeight - reservedHeight,
      ),
    );
  }

  return Math.min(
    Math.max(
      windowWidth * COURT_VISUAL_GEOMETRY.inputHeightToWindowWidthRatio,
      COURT_VISUAL_GEOMETRY.inputPortraitMinHeight,
    ),
    availableHeight * COURT_VISUAL_GEOMETRY.inputPortraitAvailableHeightRatio,
  );
}

export function getCourtSummaryMapHeight({ isLandscape, isTablet }: CourtResponsiveMapHeightParams) {
  if (isTablet) {
    return isLandscape
      ? COURT_VISUAL_GEOMETRY.summaryMapTabletLandscapeHeight
      : COURT_VISUAL_GEOMETRY.summaryMapTabletPortraitHeight;
  }

  return isLandscape
    ? COURT_VISUAL_GEOMETRY.summaryMapPhoneLandscapeHeight
    : COURT_VISUAL_GEOMETRY.summaryMapPhonePortraitHeight;
}

export function getCourtLiveMapHeight({ isTabletLandscape, windowWidth }: CourtLiveMapHeightParams) {
  if (isTabletLandscape) {
    return COURT_VISUAL_GEOMETRY.liveMapTabletLandscapeHeight;
  }

  if (windowWidth >= 768) {
    return COURT_VISUAL_GEOMETRY.liveMapTabletHeight;
  }

  return COURT_VISUAL_GEOMETRY.liveMapPhoneHeight;
}
