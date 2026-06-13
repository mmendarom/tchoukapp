import { StyleProp, StyleSheet, useWindowDimensions, View, ViewStyle } from 'react-native';

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

export function CourtLocationMap({ height, locations = [], markerVariant = 'uruguay', markers, style }: CourtLocationMapProps) {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth >= 768;
  const isLandscape = windowWidth > windowHeight;
  const mapHeight = height ?? (isTablet ? (isLandscape ? 380 : 340) : isLandscape ? 250 : 280);
  const mapMarkers = markers ?? locations.map((location) => ({ location, markerVariant }));
  const densityLocations = mapMarkers.map((marker) => marker.location);

  return (
    <CourtField style={[styles.court, { height: mapHeight }, style]}>
      {mapMarkers.map((marker, index) => {
        const density = getDensity(marker.location, densityLocations);
        const size = Math.min(12 + density * 3, 24);

        return (
          <View
            key={`${marker.markerVariant}-${marker.location.x}-${marker.location.y}-${index}`}
            style={[
              styles.dot,
              marker.markerVariant === 'opponentDefense'
                ? styles.opponentDefenseDot
                : marker.markerVariant === 'uruguay'
                  ? styles.uruguayDot
                  : styles.opponentDot,
              {
                borderRadius: size / 2,
                height: size,
                left: `${marker.location.x * 100}%`,
                marginLeft: -size / 2,
                marginTop: -size / 2,
                opacity: Math.min(0.5 + density * 0.12, 0.95),
                top: `${marker.location.y * 100}%`,
                width: size,
              },
            ]}
          />
        );
      })}
    </CourtField>
  );
}

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
