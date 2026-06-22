import { memo, useMemo } from 'react';
import { StyleProp, StyleSheet, useWindowDimensions, View, ViewStyle } from 'react-native';

import { getCourtSummaryMapHeight } from '../domain/courtVisual';
import { CourtLocation } from '../domain/types';
import { CourtField } from './CourtField';

export type MarkerVariant = 'uruguay' | 'opponent' | 'opponentDefense';

export type CourtLocationMarker = {
  location: CourtLocation;
  markerVariant: MarkerVariant;
};

type CourtLocationMapProps = {
  height?: number;
  locations?: CourtLocation[];
  markerVariant?: MarkerVariant;
  markers?: CourtLocationMarker[];
  style?: StyleProp<ViewStyle>;
};

const getDensity = (location: CourtLocation, locations: CourtLocation[]) =>
  locations.filter((item) => Math.abs(item.x - location.x) <= 0.07 && Math.abs(item.y - location.y) <= 0.07).length;

export const CourtLocationMap = memo(function CourtLocationMap({ height, locations = [], markerVariant = 'uruguay', markers, style }: CourtLocationMapProps) {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth >= 768;
  const isLandscape = windowWidth > windowHeight;
  const mapHeight = height ?? getCourtSummaryMapHeight({ isLandscape, isTablet });
  const mapMarkers = useMemo(() => markers ?? locations.map((location) => ({ location, markerVariant })), [locations, markerVariant, markers]);
  const renderedMarkers = useMemo(() => {
    const densityLocations = mapMarkers.map((marker) => marker.location);

    return mapMarkers.map((marker, index) => {
      const density = getDensity(marker.location, densityLocations);
      const size = Math.min(12 + density * 3, 24);

      return {
        ...marker,
        key: `${marker.markerVariant}-${marker.location.x}-${marker.location.y}-${index}`,
        opacity: Math.min(0.5 + density * 0.12, 0.95),
        size,
      };
    });
  }, [mapMarkers]);

  return (
    <CourtField style={[styles.court, { height: mapHeight }, style]}>
      {renderedMarkers.map((marker) => (
          <View
            key={marker.key}
            style={[
              styles.dot,
              marker.markerVariant === 'opponentDefense'
                ? styles.opponentDefenseDot
                : marker.markerVariant === 'uruguay'
                  ? styles.uruguayDot
                  : styles.opponentDot,
              {
                borderRadius: marker.size / 2,
                height: marker.size,
                left: `${marker.location.x * 100}%`,
                marginLeft: -marker.size / 2,
                marginTop: -marker.size / 2,
                opacity: marker.opacity,
                top: `${marker.location.y * 100}%`,
                width: marker.size,
              },
            ]}
          />
      ))}
    </CourtField>
  );
});

const styles = StyleSheet.create({
  court: {
    height: 150,
  },
  dot: {
    position: 'absolute',
    width: 14,
    height: 14,
    marginLeft: -7,
    marginTop: -7,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  uruguayDot: {
    backgroundColor: '#0b6bcb',
  },
  opponentDot: {
    backgroundColor: '#b42318',
  },
  opponentDefenseDot: {
    backgroundColor: '#7c3aed',
  },
});
