import { forwardRef, ReactNode } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

type CourtFieldProps = {
  children?: ReactNode;
  onLayout?: (event: LayoutChangeEvent) => void;
  showLabels?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const CourtField = forwardRef<View, CourtFieldProps>(function CourtField(
  { children, onLayout, showLabels = false, style },
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
    left: '33.33%',
    top: 0,
    bottom: 0,
    width: '33.34%',
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
    left: '33.33%',
  },
  laneTwo: {
    left: '66.66%',
  },
  horizontalGuide: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(24, 128, 56, 0.14)',
  },
  horizontalTop: {
    top: '25%',
  },
  horizontalMiddle: {
    top: '50%',
    backgroundColor: 'rgba(24, 128, 56, 0.2)',
  },
  horizontalBottom: {
    top: '75%',
  },
  frameArea: {
    position: 'absolute',
    width: '12%',
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
    top: '16%',
    width: '32%',
    height: '68%',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(180, 35, 24, 0.45)',
    backgroundColor: 'rgba(180, 35, 24, 0.06)',
  },
  leftForbidden: {
    left: '-16%',
  },
  rightForbidden: {
    right: '-16%',
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
