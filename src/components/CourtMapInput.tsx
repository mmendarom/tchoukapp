import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  GestureResponderEvent,
  LayoutChangeEvent,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { denormalizeLocation, isValidCourtLayout, normalizeTapLocation } from '../domain/court';
import { getCourtInputMapHeight } from '../domain/courtVisual';
import { CourtLocation } from '../domain/types';
import { fontSize, spacing } from '../utils/responsive';
import { CourtField } from './CourtField';

type CourtMapInputProps = {
  selectedLocation?: CourtLocation;
  onSelectLocation: (location: CourtLocation) => void;
  onConfirm: () => void;
  onCancel: () => void;
  mode: 'uruguay_point' | 'opponent_point' | 'opponent_defense';
};

type CourtRect = {
  pageX: number;
  pageY: number;
  width: number;
  height: number;
};

const SHOW_COORD_DEBUG = false;
const MARKER_SIZE = 24;

export function CourtMapInput({ selectedLocation, onSelectLocation, onConfirm, onCancel, mode }: CourtMapInputProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const courtRef = useRef<View>(null);
  const markerOpacity = useRef(new Animated.Value(0)).current;
  const markerScale = useRef(new Animated.Value(0.8)).current;
  const tapFeedback = useRef(new Animated.Value(0)).current;
  const confirmOpacity = useRef(new Animated.Value(selectedLocation ? 1 : 0.55)).current;
  const [courtRect, setCourtRect] = useState<CourtRect | null>(null);
  const [lastTap, setLastTap] = useState<{ x: number; y: number } | null>(null);

  const isLandscape = windowWidth > windowHeight;
  const isTablet = windowWidth >= 768;
  const title =
    mode === 'uruguay_point'
      ? '¿Dónde cayó nuestro punto?'
      : mode === 'opponent_point'
        ? '¿Dónde nos hicieron el punto?'
        : '¿Dónde nos defendieron?';
  const kicker = mode === 'opponent_defense' ? 'Marcá dónde nos defendieron' : 'Marcá dónde cayó la pelota';
  const tip =
    mode === 'opponent_defense'
      ? 'Marcá dónde el rival defendió el tiro.'
      : 'Tip: girá el celular para marcar con más precisión.';
  const mapHeight = useMemo(() => {
    return getCourtInputMapHeight({
      bottomInset: insets.bottom,
      isLandscape,
      isTablet,
      topInset: insets.top,
      windowHeight,
      windowWidth,
    });
  }, [insets.bottom, insets.top, isLandscape, isTablet, windowHeight, windowWidth]);
  const markerPixelLocation = useMemo(() => {
    if (!selectedLocation || !courtRect || !isValidCourtLayout(courtRect.width, courtRect.height)) {
      return null;
    }

    return denormalizeLocation(selectedLocation, courtRect.width, courtRect.height);
  }, [courtRect, selectedLocation]);

  const measureCourt = useCallback(() => {
    courtRef.current?.measureInWindow((pageX, pageY, width, height) => {
      if (!isValidCourtLayout(width, height)) {
        setCourtRect(null);
        return;
      }

      setCourtRect({ pageX, pageY, width, height });
    });
  }, []);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;

      if (!isValidCourtLayout(width, height)) {
        setCourtRect(null);
        return;
      }

      requestAnimationFrame(measureCourt);
    },
    [measureCourt],
  );

  useEffect(() => {
    requestAnimationFrame(measureCourt);
  }, [measureCourt, windowHeight, windowWidth]);

  useEffect(() => {
    Animated.timing(confirmOpacity, {
      toValue: selectedLocation ? 1 : 0.55,
      duration: 140,
      useNativeDriver: true,
    }).start();
  }, [confirmOpacity, selectedLocation]);

  useEffect(() => {
    if (!selectedLocation || !courtRect || !isValidCourtLayout(courtRect.width, courtRect.height)) {
      markerOpacity.setValue(0);
      markerScale.setValue(0.8);
      return;
    }

    Animated.parallel([
      Animated.timing(markerOpacity, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.spring(markerScale, {
        toValue: 1,
        speed: 24,
        bounciness: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }, [courtRect, markerOpacity, markerScale, selectedLocation]);

  const pulseCourt = useCallback(() => {
    tapFeedback.setValue(1);
    Animated.timing(tapFeedback, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [tapFeedback]);

  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      if (!courtRect || !isValidCourtLayout(courtRect.width, courtRect.height)) {
        measureCourt();
        return;
      }

      const localX = event.nativeEvent.pageX - courtRect.pageX;
      const localY = event.nativeEvent.pageY - courtRect.pageY;
      const location = normalizeTapLocation(localX, localY, courtRect.width, courtRect.height);

      setLastTap({ x: localX, y: localY });
      onSelectLocation(location);
      pulseCourt();
    },
    [courtRect, measureCourt, onSelectLocation, pulseCourt],
  );

  return (
    <Modal animationType="fade" onRequestClose={onCancel} presentationStyle="fullScreen" statusBarTranslucent visible>
      <View
        style={[
          styles.modalRoot,
          {
            paddingBottom: spacing.md + Math.max(insets.bottom, spacing.sm),
            paddingTop: spacing.md + Math.max(insets.top, spacing.sm),
          },
        ]}
      >
        <View style={[styles.content, isLandscape && styles.contentLandscape]}>
          <View style={[styles.header, isLandscape && styles.headerLandscape]}>
            <Text style={styles.kicker}>{kicker}</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.tip}>{tip}</Text>
          </View>

          <CourtField
            ref={courtRef}
            onLayout={handleLayout}
            showDegreeGuides
            showLabels
            style={{ height: mapHeight }}
          >
            <Pressable onPressIn={handlePress} style={StyleSheet.absoluteFill}>
              <Animated.View pointerEvents="none" style={[styles.tapFeedback, { opacity: tapFeedback }]} />
            </Pressable>

            {markerPixelLocation && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.marker,
                  {
                    left: markerPixelLocation.x - MARKER_SIZE / 2,
                    opacity: markerOpacity,
                    top: markerPixelLocation.y - MARKER_SIZE / 2,
                    transform: [{ scale: markerScale }],
                  },
                ]}
              />
            )}

            {__DEV__ && SHOW_COORD_DEBUG && (
              <View pointerEvents="none" style={styles.debugOverlay}>
                <Text style={styles.debugText}>
                  {`mapa ${Math.round(courtRect?.width ?? 0)}x${Math.round(courtRect?.height ?? 0)}`}
                </Text>
                <Text style={styles.debugText}>
                  {selectedLocation
                    ? `normalizado ${selectedLocation.x.toFixed(3)}, ${selectedLocation.y.toFixed(3)}`
                    : 'sin ubicación'}
                </Text>
                <Text style={styles.debugText}>
                  {lastTap ? `tap ${Math.round(lastTap.x)}, ${Math.round(lastTap.y)}` : 'sin tap'}
                </Text>
              </View>
            )}
          </CourtField>

          <View style={styles.mapHelp}>
            <Text adjustsFontSizeToFit minimumFontScale={0.82} numberOfLines={1} style={styles.degreeLegend}>
              Guía: 0° fondo · 45° intermedio · 90° centro del área
            </Text>
            <Text style={styles.help}>
              {selectedLocation ? 'Cambiar ubicación tocando otra zona.' : 'Tocá la cancha para marcar la ubicación.'}
            </Text>
          </View>

          <View style={[styles.actions, isLandscape && styles.actionsLandscape]}>
            <Pressable onPress={onCancel} style={[styles.button, styles.actionButton, styles.secondary]}>
              <Text style={styles.secondaryText}>Cancelar</Text>
            </Pressable>
            <Animated.View style={[styles.confirmWrap, { opacity: confirmOpacity }]}>
              <Pressable onPress={onConfirm} style={[styles.button, styles.actionButton, styles.primary]}>
                <Text style={styles.primaryText}>
                  {selectedLocation ? 'Confirmar ubicación' : 'Cambiar ubicación'}
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: '#f4f7fb',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  content: {
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
  },
  contentLandscape: {
    justifyContent: 'flex-start',
    paddingTop: spacing.sm,
  },
  header: {
    gap: 3,
  },
  headerLandscape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  kicker: {
    color: '#0b6bcb',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  title: {
    color: '#0b1f33',
    fontSize: fontSize.title,
    fontWeight: '900',
  },
  tip: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
  },
  tapFeedback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 107, 203, 0.08)',
  },
  marker: {
    position: 'absolute',
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    backgroundColor: '#b42318',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#0b1f33',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.24,
    shadowRadius: 5,
    elevation: 3,
  },
  debugOverlay: {
    position: 'absolute',
    left: spacing.xs,
    top: spacing.xs,
    borderRadius: 6,
    backgroundColor: 'rgba(11, 31, 51, 0.78)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
  },
  debugText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  help: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
    fontWeight: '800',
    textAlign: 'center',
  },
  mapHelp: {
    gap: 2,
  },
  degreeLegend: {
    color: '#7a8794',
    fontSize: fontSize.tiny,
    fontWeight: '700',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  actionsLandscape: {
    justifyContent: 'flex-end',
  },
  confirmWrap: {
    flexGrow: 1,
    flexBasis: 260,
  },
  button: {
    minHeight: 92,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  actionButton: {
    flexGrow: 1,
    flexBasis: 180,
  },
  primary: {
    backgroundColor: '#0b6bcb',
  },
  secondary: {
    backgroundColor: '#e7eef7',
  },
  primaryText: {
    color: '#ffffff',
    fontSize: fontSize.button,
    fontWeight: '900',
  },
  secondaryText: {
    color: '#0b1f33',
    fontSize: fontSize.button,
    fontWeight: '900',
  },
});
