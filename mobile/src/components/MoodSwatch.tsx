import React, { useId, useMemo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Defs, Line, LinearGradient, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';

import { EMOTION_COLOR } from '@/lib/catalog';
import { mix, tint, useColors } from '@/lib/theme';
import type { EmotionKey } from '@/lib/types';

// The signature visual: a "dyed fabric" swatch whose colours are the user's emotion mix.
// Each emotion becomes a pool of dye sized by its share; a woven texture sits on top.

function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

interface Props {
  emotions: { key: EmotionKey; score: number }[];
  seed: string;
  height?: number;
  radius?: number;
  style?: ViewStyle;
  animate?: boolean;
  children?: React.ReactNode;
}

export function MoodSwatch({ emotions, seed, height = 220, radius = 30, style, animate, children }: Props) {
  const C = useColors();
  const blobs = useMemo(() => {
    const r = rng(seed);
    const top = emotions.filter((e) => e.score >= 0.04).slice(0, 4);
    const out = top.map((e, i) => ({
      key: e.key as string,
      color: EMOTION_COLOR[e.key],
      cx: i === 0 ? 25 + r() * 30 : 8 + r() * 84,
      cy: i === 0 ? 30 + r() * 35 : 8 + r() * 84,
      r: 38 + Math.sqrt(e.score) * 75,
      o: Math.min(1, 0.7 + e.score),
    }));
    // a lighter highlight of the main colour gives the dye some depth
    if (out[0]) {
      out.push({ key: 'hl', color: tint(out[0].color, 0.45), cx: 100 - out[0].cx, cy: 15 + r() * 25, r: 30, o: 0.55 });
    }
    return out;
  }, [emotions, seed]);

  const base = blobs[0] ? mix(blobs[0].color, C.bg, 0.72) : C.surfaceHigh;
  // SVG ids are document-global on web, so make them unique per instance
  const uid = useId();
  const id = `sw${uid.replace(/[^a-z0-9]/gi, '')}`;
  const Wrap: any = animate ? Animated.View : View;

  return (
    <Wrap
      entering={animate ? FadeIn.duration(900) : undefined}
      style={[{ height, borderRadius: radius, overflow: 'hidden', backgroundColor: base }, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Defs>
          {blobs.map((b, i) => (
            <RadialGradient key={b.key} id={`${id}g${i}`} cx={b.cx} cy={b.cy} r={b.r} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={b.color} stopOpacity={b.o} />
              <Stop offset="0.5" stopColor={b.color} stopOpacity={b.o * 0.6} />
              <Stop offset="1" stopColor={b.color} stopOpacity={0} />
            </RadialGradient>
          ))}
          <Pattern id={`${id}weave`} width={1.2} height={1.2} patternUnits="userSpaceOnUse">
            <Line x1={0} y1={0.3} x2={1.2} y2={0.3} stroke="#FFFFFF" strokeOpacity={0.06} strokeWidth={0.2} />
            <Line x1={0.9} y1={0} x2={0.9} y2={1.2} stroke="#000000" strokeOpacity={0.07} strokeWidth={0.2} />
          </Pattern>
          <LinearGradient id={`${id}sheen`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.14} />
            <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0.18} />
          </LinearGradient>
        </Defs>
        {blobs
          .slice()
          .reverse()
          .map((b, i) => (
            <Rect key={b.key} x={0} y={0} width={100} height={100} fill={`url(#${id}g${blobs.length - 1 - i})`} />
          ))}
        <Rect x={0} y={0} width={100} height={100} fill={`url(#${id}sheen)`} />
        <Rect x={0} y={0} width={100} height={100} fill={`url(#${id}weave)`} />
      </Svg>
      {children}
    </Wrap>
  );
}
