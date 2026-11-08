import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { EMOTION_COLOR } from '@/lib/catalog';
import { useT } from '@/lib/i18n';
import { mix, R, S, useColors } from '@/lib/theme';
import { Txt } from './ui';

// The waiting moment, turned into the app's signature: dye pools drifting and
// blending on fabric while the mood is read (instead of a bare spinner).

const POOLS = [
  { color: EMOTION_COLOR.happy, x: -40, y: -30, size: 260, delay: 0 },
  { color: EMOTION_COLOR.calm, x: 60, y: 20, size: 240, delay: 400 },
  { color: EMOTION_COLOR.excited, x: -10, y: 70, size: 220, delay: 800 },
  { color: EMOTION_COLOR.confident, x: 80, y: -60, size: 200, delay: 1200 },
];

function Pool({ color, x, y, size, delay, still }: (typeof POOLS)[number] & { still: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [still, delay, t]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.55 + 0.45 * t.value,
    transform: [{ translateX: x * (0.6 + 0.4 * t.value) }, { translateY: y * (1 - 0.5 * t.value) }, { scale: 0.85 + 0.3 * t.value }],
  }));
  const id = `pool${color.slice(1)}`;
  return (
    <Animated.View style={[styles.pool, { width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={0.95} />
            <Stop offset="0.6" stopColor={color} stopOpacity={0.35} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={size} height={size} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

export function DyeLoader() {
  const t = useT();
  const C = useColors();
  const still = useReducedMotion();
  const steps = [t.loadStep1, t.loadStep2, t.loadStep3];
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => Math.min(s + 1, steps.length - 1)), 1800);
    return () => clearInterval(id);
  }, [steps.length]);

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(200)}
      style={[styles.wrap, { backgroundColor: C.scheme === 'light' ? '#F7F3FAF2' : '#191022F2' }]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={steps[step]}>
      <View style={[styles.fabric, { backgroundColor: mix(EMOTION_COLOR.confident, C.bg, C.scheme === 'light' ? 0.82 : 0.75) }]}>
        {POOLS.map((p) => (
          <Pool key={p.color} {...p} still={still} />
        ))}
      </View>
      <Txt v="h2" style={{ marginTop: S.xl, textAlign: 'center' }}>
        {steps[step]}
      </Txt>
      <View style={styles.dots}>
        {steps.map((_, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: i <= step ? C.brandSoft : C.line }]} />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: S.gutter,
    zIndex: 10,
  },
  fabric: { width: 240, height: 300, borderRadius: R.swatch, overflow: 'hidden' },
  pool: { position: 'absolute', left: '50%', top: '50%' },
  dots: { flexDirection: 'row', gap: 6, marginTop: S.lg },
  dot: { width: 22, height: 4, borderRadius: 2 },
});
