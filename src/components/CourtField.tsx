import { forwardRef, ReactNode } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { COURT_VISUAL_GEOMETRY } from '../domain/courtVisual';

type CourtFieldProps = {
  children?: ReactNode;
  onLayout?: (event: LayoutChangeEvent) => void;
  showDegreeGuides?: boolean;
  showLabels?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const CourtField = forwardRef<View, CourtFieldProps>(function CourtField(
  { children, onLayout, showDegreeGuides = false, showLabels = false, style },
  ref,
) {
  return (
    <View ref={ref} collapsable={false} onLayout={onLayout} style={[styles.court, style]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={styles.centerLane} />
        <View style={styles.centerLine} />
        <View style={styles.centerMark} />

        <View style={[styles.laneLine, styles.laneOne]} />
        <View style={[styles.laneLine, styles.laneTwo]} />
        <View style={[styles.horizontalGuide, styles.horizontalTop]} />
        <View style={[styles.horizontalGuide, styles.horizontalMiddle]} />
        <View style={[styles.horizontalGuide, styles.horizontalBottom]} />

        <View style={[styles.frameArea, styles.leftFrame]} />
        <View style={[styles.frameArea, styles.rightFrame]} />
        <View style={[styles.forbiddenArea, styles.leftForbidden]} />
        <View style={[styles.forbiddenArea, styles.rightForbidden]} />

        {showDegreeGuides && (
          <>
            <DegreeGuides side="left" />
            <DegreeGuides side="right" />
          </>
        )}

        {showLabels && (
          <>
            <Text style={[styles.zoneLabel, styles.leftZoneLabel]}>Izquierda</Text>
            <Text style={[styles.zoneLabel, styles.centerZoneLabel]}>Centro</Text>
            <Text style={[styles.zoneLabel, styles.rightZoneLabel]}>Derecha</Text>
            <Text style={[styles.forbiddenLabel, styles.leftForbiddenLabel]}>Área prohibida</Text>
            <Text style={[styles.forbiddenLabel, styles.rightForbiddenLabel]}>Área prohibida</Text>
          </>
        )}
      </View>
      {children}
    </View>
  );
});

function DegreeGuides({ side }: { side: 'left' | 'right' }) {
  const sideStyle = side === 'left' ? styles.leftDegreeGuides : styles.rightDegreeGuides;
  const tickSideStyle = side === 'left' ? styles.leftDegreeTick : styles.rightDegreeTick;

  return (
    <View style={[styles.degreeGuides, sideStyle]}>
      <View style={[styles.degreeTick, tickSideStyle, styles.degreeUpperMid]} />
      <View style={[styles.degreeTick, tickSideStyle, styles.degreeCenter]} />
      <View style={[styles.degreeTick, tickSideStyle, styles.degreeLowerMid]} />
    </View>
  );
}

const styles = StyleSheet.create({
  court: {
    width: '100%',
    borderRadius: 8,
    backgroundColor: '#e9f7ee',
    borderWidth: 2,
    borderColor: '#188038',
    overflow: 'hidden',
  },
  centerLane: {
    position: 'absolute',
    left: `${COURT_VISUAL_GEOMETRY.centerLaneLeftPercent}%`,
    top: 0,
    bottom: 0,
    width: `${COURT_VISUAL_GEOMETRY.centerLaneWidthPercent}%`,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  centerLine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#2f7d45',
  },
  centerMark: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 16,
    height: 16,
    marginLeft: -7,
    marginTop: -7,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2f7d45',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  laneLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(24, 128, 56, 0.22)',
  },
  laneOne: {
    left: `${COURT_VISUAL_GEOMETRY.laneOneLeftPercent}%`,
  },
  laneTwo: {
    left: `${COURT_VISUAL_GEOMETRY.laneTwoLeftPercent}%`,
  },
  horizontalGuide: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(24, 128, 56, 0.14)',
  },
  horizontalTop: {
    top: `${COURT_VISUAL_GEOMETRY.horizontalTopPercent}%`,
  },
  horizontalMiddle: {
    top: `${COURT_VISUAL_GEOMETRY.horizontalMiddlePercent}%`,
    backgroundColor: 'rgba(24, 128, 56, 0.2)',
  },
  horizontalBottom: {
    top: `${COURT_VISUAL_GEOMETRY.horizontalBottomPercent}%`,
  },
  frameArea: {
    position: 'absolute',
    width: `${COURT_VISUAL_GEOMETRY.frameAreaWidthPercent}%`,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 107, 203, 0.07)',
  },
  leftFrame: {
    left: 0,
    borderRightWidth: 1,
    borderRightColor: 'rgba(47, 125, 69, 0.35)',
  },
  rightFrame: {
    right: 0,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(47, 125, 69, 0.35)',
  },
  forbiddenArea: {
    position: 'absolute',
    top: `${COURT_VISUAL_GEOMETRY.forbiddenAreaTopPercent}%`,
    width: `${COURT_VISUAL_GEOMETRY.forbiddenAreaWidthPercent}%`,
    height: `${COURT_VISUAL_GEOMETRY.forbiddenAreaHeightPercent}%`,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(180, 35, 24, 0.45)',
    backgroundColor: 'rgba(180, 35, 24, 0.06)',
  },
  leftForbidden: {
    left: `${COURT_VISUAL_GEOMETRY.forbiddenAreaOffsetPercent}%`,
  },
  rightForbidden: {
    right: `${COURT_VISUAL_GEOMETRY.forbiddenAreaOffsetPercent}%`,
  },
  degreeGuides: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: `${COURT_VISUAL_GEOMETRY.degreeGuideWidthPercent}%`,
  },
  leftDegreeGuides: {
    left: 0,
  },
  rightDegreeGuides: {
    right: 0,
  },
  degreeTick: {
    position: 'absolute',
    width: 12,
    height: 1,
    borderRadius: 1,
    backgroundColor: 'rgba(11, 31, 51, 0.22)',
  },
  leftDegreeTick: {
    right: 1,
  },
  rightDegreeTick: {
    left: 1,
  },
  degreeUpperMid: {
    top: `${COURT_VISUAL_GEOMETRY.horizontalTopPercent}%`,
  },
  degreeCenter: {
    top: `${COURT_VISUAL_GEOMETRY.horizontalMiddlePercent}%`,
    height: 2,
    backgroundColor: 'rgba(11, 31, 51, 0.3)',
  },
  degreeLowerMid: {
    top: `${COURT_VISUAL_GEOMETRY.horizontalBottomPercent}%`,
  },
  zoneLabel: {
    position: 'absolute',
    top: 8,
    color: 'rgba(11, 31, 51, 0.5)',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  leftZoneLabel: {
    left: '16%',
  },
  centerZoneLabel: {
    left: '46%',
  },
  rightZoneLabel: {
    right: '13%',
  },
  forbiddenLabel: {
    position: 'absolute',
    bottom: 8,
    color: 'rgba(180, 35, 24, 0.58)',
    fontSize: 10,
    fontWeight: '900',
  },
  leftForbiddenLabel: {
    left: 10,
  },
  rightForbiddenLabel: {
    right: 10,
  },
});
