import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import {
  getCombinedLiveMapMarkers,
  getLiveMapLocationCount,
  getLiveMapLocationData,
  LiveMapMarkerKind,
  LiveMapTab,
} from '../domain/liveMaps';
import { MatchEvent, MatchPeriod } from '../domain/types';
import { fontSize, spacing } from '../utils/responsive';
import { CourtLocationMap, MarkerVariant } from './CourtLocationMap';

type LiveMapPanelProps = {
  collapsible?: boolean;
  events: MatchEvent[];
  expanded?: boolean;
  onToggleExpanded?: () => void;
  periodNumber: MatchPeriod;
};

const markerVariantByKind: Record<LiveMapMarkerKind, MarkerVariant> = {
  ourPoint: 'uruguay',
  rivalPoint: 'opponent',
  rivalDefense: 'opponentDefense',
};

const tabs: Array<{ id: LiveMapTab; label: string; markerVariant?: MarkerVariant }> = [
  { id: 'combined', label: 'Combinado' },
  { id: 'ourPoints', label: 'Puntos nuestros', markerVariant: 'uruguay' },
  { id: 'rivalPoints', label: 'Puntos rivales', markerVariant: 'opponent' },
  { id: 'rivalDefenses', label: 'Defensas rivales', markerVariant: 'opponentDefense' },
];

export function LiveMapPanel({
  collapsible = false,
  events,
  expanded = true,
  onToggleExpanded,
  periodNumber,
}: LiveMapPanelProps) {
  const { height, width } = useWindowDimensions();
  const [selectedTab, setSelectedTab] = useState<LiveMapTab>('combined');
  const isTabletLandscape = width >= 900 && width > height;
  const selectedTabConfig = tabs.find((tab) => tab.id === selectedTab) ?? tabs[0];
  const selectedData = getLiveMapLocationData(events, periodNumber, selectedTab);
  const combinedMarkers = selectedTab === 'combined'
    ? getCombinedLiveMapMarkers(events, periodNumber).map((marker) => ({
      location: marker.location,
      markerVariant: markerVariantByKind[marker.kind],
    }))
    : undefined;
  const mapHeight = isTabletLandscape ? 240 : width >= 768 ? 260 : 220;
  const ourPointsCount = getLiveMapLocationCount(events, periodNumber, 'ourPoints');
  const rivalPointsCount = getLiveMapLocationCount(events, periodNumber, 'rivalPoints');
  const rivalDefensesCount = getLiveMapLocationCount(events, periodNumber, 'rivalDefenses');

  return (
    <View style={styles.panel}>
      {collapsible && !expanded && (
        <Pressable
          accessibilityRole="button"
          onPress={onToggleExpanded}
          style={({ pressed }) => [styles.collapsedButton, pressed && styles.pressed]}
        >
          <Text style={styles.toggleText}>Ver mapas</Text>
        </Pressable>
      )}

      {expanded && (
        <>
          {collapsible && (
            <Pressable
              accessibilityRole="button"
              onPress={onToggleExpanded}
              style={({ pressed }) => [styles.compactToggleButton, pressed && styles.pressed]}
            >
              <Text style={styles.toggleText}>Ocultar</Text>
            </Pressable>
          )}

          <View style={styles.tabs}>
            {tabs.map((tab) => {
              const count = getLiveMapLocationCount(events, periodNumber, tab.id);
              const selected = tab.id === selectedTab;

              return (
                <Pressable
                  accessibilityRole="button"
                  key={tab.id}
                  onPress={() => setSelectedTab(tab.id)}
                  style={({ pressed }) => [styles.tab, selected && styles.selectedTab, pressed && styles.pressed]}
                >
                  <Text numberOfLines={2} adjustsFontSizeToFit style={[styles.tabText, selected && styles.selectedTabText]}>
                    {tab.label}
                  </Text>
                  <Text style={[styles.tabCount, selected && styles.selectedTabText]}>{count}</Text>
                </Pressable>
              );
            })}
          </View>

          <CourtLocationMap
            height={mapHeight}
            locations={selectedData.locations}
            markerVariant={selectedTabConfig.markerVariant}
            markers={combinedMarkers}
          />

          {selectedTab === 'combined' && (
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.uruguayLegendDot]} />
                <Text style={styles.legendText}>Azul: Puntos nuestros</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.opponentLegendDot]} />
                <Text style={styles.legendText}>Rojo: Puntos rivales</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, styles.opponentDefenseLegendDot]} />
                <Text style={styles.legendText}>Violeta: Defensas rivales</Text>
              </View>
            </View>
          )}

          {selectedData.locations.length === 0 ? (
            <Text style={styles.meta}>Sin ubicaciones registradas.</Text>
          ) : selectedTab === 'combined' ? (
            <Text style={styles.meta}>
              {ourPointsCount} puntos nuestros / {rivalPointsCount} puntos rivales / {rivalDefensesCount} defensas rivales.
            </Text>
          ) : (
            <Text style={styles.meta}>{selectedData.locations.length} ubicaciones registradas.</Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    padding: spacing.sm,
    gap: spacing.sm,
  },
  collapsedButton: {
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#f7fafc',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  compactToggleButton: {
    minHeight: 32,
    alignSelf: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  toggleText: {
    color: '#0b6bcb',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tab: {
    flex: 1,
    minWidth: 72,
    minHeight: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#f7fafc',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  selectedTab: {
    backgroundColor: '#0b1f33',
    borderColor: '#0b1f33',
  },
  tabText: {
    color: '#0b1f33',
    fontSize: fontSize.tiny,
    fontWeight: '900',
    textAlign: 'center',
  },
  tabCount: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
    fontWeight: '900',
    marginTop: 1,
  },
  selectedTabText: {
    color: '#ffffff',
  },
  meta: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  legendItem: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  uruguayLegendDot: {
    backgroundColor: '#0b6bcb',
  },
  opponentLegendDot: {
    backgroundColor: '#b42318',
  },
  opponentDefenseLegendDot: {
    backgroundColor: '#7c3aed',
  },
  legendText: {
    color: '#5d6b7a',
    fontSize: fontSize.tiny,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.82,
  },
});
