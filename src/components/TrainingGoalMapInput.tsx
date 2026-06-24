import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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

import { denormalizeLocation, isValidCourtLayout } from '../domain/court';
import { getCourtInputMapHeight } from '../domain/courtVisual';
import { normalizeTrainingGoalTapLocation } from '../domain/trainingGoalMap';
import { CourtLocation } from '../domain/types';
import { fontSize, spacing } from '../utils/responsive';

type TrainingGoalMapInputProps = {
  eventType: 'point' | 'shot_defended';
  selectedLocation?: CourtLocation;
  onSelectLocation: (location: CourtLocation) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

type GoalRect = {
  pageX: number;
  pageY: number;
  width: number;
  height: number;
};

const MARKER_SIZE = 26;

export function TrainingGoalMapInput({
  eventType,
  selectedLocation,
  onSelectLocation,
  onConfirm,
  onCancel,
}: TrainingGoalMapInputProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const goalRef = useRef<View>(null);
  const [goalRect, setGoalRect] = useState<GoalRect | null>(null);
  const isLandscape = windowWidth > windowHeight;
  const isTablet = windowWidth >= 768;
  const title = eventType === 'point' ? '¿Dónde cayó el punto?' : '¿Dónde fue defendido el tiro?';
  const mapHeight = useMemo(
    () => getCourtInputMapHeight({
      bottomInset: insets.bottom,
      isLandscape,
      isTablet,
      topInset: insets.top,
      windowHeight,
      windowWidth,
    }),
    [insets.bottom, insets.top, isLandscape, isTablet, windowHeight, windowWidth],
  );
  const markerLocation = useMemo(() => {
    if (!selectedLocation || !goalRect || !isValidCourtLayout(goalRect.width, goalRect.height)) {
      return undefined;
    }

    return denormalizeLocation(selectedLocation, goalRect.width, goalRect.height);
  }, [goalRect, selectedLocation]);

  const measureGoal = useCallback(() => {
    goalRef.current?.measureInWindow((pageX, pageY, width, height) => {
      setGoalRect(isValidCourtLayout(width, height) ? { pageX, pageY, width, height } : null);
    });
  }, []);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;

    if (!isValidCourtLayout(width, height)) {
      setGoalRect(null);
      return;
    }

    requestAnimationFrame(measureGoal);
  }, [measureGoal]);

  useEffect(() => {
    requestAnimationFrame(measureGoal);
  }, [measureGoal, windowHeight, windowWidth]);

  const handlePress = useCallback((event: GestureResponderEvent) => {
    if (!goalRect || !isValidCourtLayout(goalRect.width, goalRect.height)) {
      measureGoal();
      return;
    }

    onSelectLocation(normalizeTrainingGoalTapLocation(
      event.nativeEvent.pageX - goalRect.pageX,
      event.nativeEvent.pageY - goalRect.pageY,
      goalRect.width,
      goalRect.height,
    ));
  }, [goalRect, measureGoal, onSelectLocation]);

  return (
    <Modal animationType="fade" onRequestClose={onCancel} presentationStyle="fullScreen" statusBarTranslucent visible>
      <View style={[styles.modalRoot, {
        paddingBottom: spacing.md + Math.max(insets.bottom, spacing.sm),
        paddingTop: spacing.md + Math.max(insets.top, spacing.sm),
      }]}>
        <View style={[styles.content, isLandscape && styles.contentLandscape]}>
          <View style={styles.header}>
            <Text style={styles.kicker}>Mapa de un marco</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.tip}>Tocá el área para marcar la ubicación.</Text>
          </View>

          <View ref={goalRef} collapsable={false} onLayout={handleLayout} style={[styles.goalArea, { height: mapHeight }]}>
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <View style={styles.frame} />
              <View style={styles.forbiddenSemicircle} />
              <View style={[styles.bandGuide, styles.bandGuideThirty]} />
              <View style={[styles.bandGuide, styles.bandGuideSixty]} />
              <View style={styles.centerGuide} />
            </View>
            <Pressable accessibilityLabel="Marcar ubicación en el área" onPressIn={handlePress} style={StyleSheet.absoluteFill} />
            {markerLocation ? (
              <View pointerEvents="none" style={[styles.marker, {
                left: markerLocation.x - MARKER_SIZE / 2,
                top: markerLocation.y - MARKER_SIZE / 2,
              }]} />
            ) : null}
          </View>

          <Text style={styles.degreeLegend}>Guía: 0° fondo · 45° intermedio · 90° centro del área</Text>

          <Text style={styles.help}>
            {selectedLocation ? 'Podés cambiar la ubicación tocando otra zona.' : 'Elegí una ubicación para continuar.'}
          </Text>

          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={onCancel} style={[styles.button, styles.secondaryButton]}>
              <Text style={styles.secondaryText}>Cancelar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!selectedLocation}
              onPress={onConfirm}
              style={[styles.button, styles.primaryButton, !selectedLocation && styles.buttonDisabled]}
            >
              <Text style={styles.primaryText}>Confirmar ubicación</Text>
            </Pressable>
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
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.sm,
  },
  contentLandscape: {
    justifyContent: 'flex-start',
  },
  header: {
    gap: 3,
  },
  kicker: {
    color: '#0b6bcb',
    fontSize: fontSize.small,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: '#0b1f33',
    fontSize: fontSize.title,
    fontWeight: '900',
  },
  tip: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
    fontWeight: '700',
  },
  goalArea: {
    width: '100%',
    minHeight: 200,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#188038',
    backgroundColor: '#e9f7ee',
    overflow: 'hidden',
  },
  frame: {
    position: 'absolute',
    left: '33%',
    bottom: 0,
    width: '34%',
    height: 18,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: '#0b1f33',
    backgroundColor: '#d7e5f2',
  },
  forbiddenSemicircle: {
    position: 'absolute',
    left: '14%',
    bottom: '-38%',
    width: '72%',
    height: '76%',
    borderRadius: 999,
    borderWidth: 3,
    borderColor: 'rgba(180, 35, 24, 0.58)',
    backgroundColor: 'rgba(180, 35, 24, 0.07)',
  },
  bandGuide: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    height: 1,
    backgroundColor: 'rgba(24, 128, 56, 0.28)',
  },
  bandGuideThirty: {
    top: '66.66%',
  },
  bandGuideSixty: {
    top: '33.33%',
  },
  centerGuide: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 18,
    width: 1,
    backgroundColor: 'rgba(24, 128, 56, 0.22)',
  },
  degreeLegend: {
    alignSelf: 'center',
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    color: '#36546f',
    fontSize: fontSize.tiny,
    fontWeight: '900',
    paddingHorizontal: 5,
    paddingVertical: 2,
    textAlign: 'center',
  },
  marker: {
    position: 'absolute',
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    borderWidth: 3,
    borderColor: '#ffffff',
    backgroundColor: '#b42318',
    elevation: 3,
  },
  help: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
    fontWeight: '800',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  button: {
    flexGrow: 1,
    flexBasis: 180,
    minHeight: 72,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  primaryButton: {
    backgroundColor: '#0b6bcb',
  },
  secondaryButton: {
    backgroundColor: '#e7eef7',
  },
  buttonDisabled: {
    opacity: 0.5,
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
