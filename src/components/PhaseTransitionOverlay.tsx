import { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text } from 'react-native';

import { PhaseTransitionContent } from '../domain/phaseTransition';
import { fontSize, spacing } from '../utils/responsive';
import { colors } from '../utils/theme';

type PhaseTransitionOverlayProps = {
  content?: PhaseTransitionContent;
  onFinished: () => void;
};

const IN_MS = 380;
const HOLD_MS = 1250;
const OUT_MS = 280;

// Overlay a pantalla completa que anuncia un cambio de fase (spec 018):
// entrada con spring, pausa y salida; un tap saltea la pausa. `onFinished`
// se dispara exactamente una vez, incluso salteando.
export function PhaseTransitionOverlay({ content, onFinished }: PhaseTransitionOverlayProps) {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(28)).current;
  const contentScale = useRef(new Animated.Value(0.92)).current;
  const accentScaleX = useRef(new Animated.Value(0)).current;
  const haloScale = useRef(new Animated.Value(0.5)).current;
  const haloOpacity = useRef(new Animated.Value(0)).current;
  const finishedRef = useRef(false);
  const holdRef = useRef<Animated.CompositeAnimation | undefined>(undefined);
  const finishRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!content) {
      return;
    }

    finishedRef.current = false;
    backdropOpacity.setValue(0);
    contentOpacity.setValue(0);
    contentTranslateY.setValue(28);
    contentScale.setValue(0.92);
    accentScaleX.setValue(0);
    haloScale.setValue(0.5);
    haloOpacity.setValue(0);

    const finish = () => {
      if (finishedRef.current) {
        return;
      }

      finishedRef.current = true;
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: OUT_MS, useNativeDriver: true }),
        Animated.timing(contentOpacity, { toValue: 0, duration: OUT_MS, useNativeDriver: true }),
        Animated.timing(contentTranslateY, { toValue: -18, duration: OUT_MS, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(haloOpacity, { toValue: 0, duration: OUT_MS, useNativeDriver: true }),
      ]).start(() => onFinished());
    };

    finishRef.current = finish;

    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 1, duration: IN_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(contentTranslateY, { toValue: 0, friction: 7, tension: 90, useNativeDriver: true }),
      Animated.spring(contentScale, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }),
      Animated.timing(haloOpacity, { toValue: 0.16, duration: 620, useNativeDriver: true }),
      Animated.timing(haloScale, { toValue: 1, duration: 620, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(240),
        Animated.timing(accentScaleX, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start(() => {
      const hold = Animated.delay(HOLD_MS);

      holdRef.current = hold;
      hold.start(({ finished }) => {
        if (finished) {
          finish();
        }
      });
    });

    return () => {
      holdRef.current?.stop();
      finish();
    };
    // Las Animated.Value viven en refs; la secuencia corre una vez por contenido nuevo.
  }, [content]);

  if (!content) {
    return null;
  }

  const skip = () => {
    holdRef.current?.stop();
    finishRef.current();
  };

  return (
    <Modal visible transparent statusBarTranslucent animationType="none" onRequestClose={skip}>
      <Pressable accessibilityRole="button" accessibilityLabel="Continuar" onPress={skip} style={styles.pressable}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        <Animated.View
          pointerEvents="none"
          style={[styles.halo, { opacity: haloOpacity, transform: [{ scale: haloScale }] }]}
        />
        <Animated.View
          style={[
            styles.content,
            { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }, { scale: contentScale }] },
          ]}
        >
          <Text style={styles.kicker}>{content.kicker}</Text>
          <Text style={styles.title}>{content.title}</Text>
          <Animated.View style={[styles.accent, { transform: [{ scaleX: accentScaleX }] }]} />
          {content.subtitle ? <Text style={styles.subtitle}>{content.subtitle}</Text> : null}
          {content.detail ? <Text style={styles.detail}>{content.detail}</Text> : null}
          <Text style={styles.hint}>Tocá para continuar</Text>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.navy,
  },
  halo: {
    position: 'absolute',
    width: 460,
    height: 460,
    borderRadius: 230,
    backgroundColor: colors.sky,
  },
  content: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  kicker: {
    color: colors.sky,
    fontSize: fontSize.small,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.white,
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
  },
  accent: {
    width: 128,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.sky,
  },
  subtitle: {
    color: colors.textOnDarkSoft,
    fontSize: fontSize.title,
    fontWeight: '900',
    textAlign: 'center',
  },
  detail: {
    color: colors.textOnDarkSoft,
    fontSize: fontSize.body,
    fontWeight: '700',
    textAlign: 'center',
  },
  hint: {
    color: colors.sky,
    fontSize: fontSize.tiny,
    fontWeight: '800',
    marginTop: spacing.md,
    opacity: 0.85,
  },
});
