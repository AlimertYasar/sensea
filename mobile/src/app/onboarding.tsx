import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { MoodSwatch } from '@/components/MoodSwatch';
import { StylePicker } from '@/components/StylePicker';
import { Button, Screen, Segmented, Txt } from '@/components/ui';
import { FITS } from '@/lib/catalog';
import { useT } from '@/lib/i18n';
import { track } from '@/lib/monitoring';
import { useStore } from '@/lib/store';
import { F, R, S, makeStyles, useColors } from '@/lib/theme';
import type { Fit, Style } from '@/lib/types';

const DEMO = [
  { key: 'excited' as const, score: 0.42 },
  { key: 'calm' as const, score: 0.3 },
  { key: 'happy' as const, score: 0.18 },
  { key: 'confident' as const, score: 0.1 },
];

export default function Onboarding() {
  const C = useColors();
  const styles = useStyles();
  const t = useT();
  const setProfile = useStore((s) => s.setProfile);
  const [step, setStep] = useState(0);
  const [styles_, setStyles] = useState<Style[]>(['casual']);
  const [fit, setFit] = useState<Fit>('unisex');
  const [name, setName] = useState('');

  const finish = () => {
    track('onboarding_done');
    setProfile({ styles: styles_, fit, name: name.trim(), onboarded: true });
  };

  return (
    <Screen edges={['top', 'bottom']} contentStyle={{ flexGrow: 1 }}>
      <View style={styles.dots} accessibilityLabel={`${step + 1}/3`}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotOn]} />
        ))}
      </View>

      {step === 0 && (
        <Animated.View entering={FadeIn.duration(500)} style={{ flex: 1 }}>
          <MoodSwatch emotions={DEMO} seed="sensea-welcome" height={300} animate style={{ marginTop: S.xl }} />
          <Txt v="hero" style={{ marginTop: S.xxl, fontSize: 42, lineHeight: 44 }}>
            {t.obTitle1}
          </Txt>
          <Txt v="body" color={C.textDim} style={{ marginTop: S.md }}>
            {t.obBody1}
          </Txt>
        </Animated.View>
      )}

      {step === 1 && (
        <Animated.View entering={FadeIn.duration(350)} style={{ flex: 1 }}>
          <Txt v="h1" style={{ marginTop: S.xl }}>
            {t.obTitle2}
          </Txt>
          <Txt v="body" color={C.textDim} style={{ marginTop: S.sm, marginBottom: S.xl }}>
            {t.obBody2}
          </Txt>
          <StylePicker value={styles_} onChange={setStyles} />
        </Animated.View>
      )}

      {step === 2 && (
        <Animated.View entering={FadeIn.duration(350)} style={{ flex: 1 }}>
          <Txt v="h1" style={{ marginTop: S.xl }}>
            {t.obTitle3}
          </Txt>
          <Txt v="body" color={C.textDim} style={{ marginTop: S.sm, marginBottom: S.lg }}>
            {t.obBody3}
          </Txt>
          <Segmented options={FITS.map((f) => ({ key: f, label: t.fit[f] }))} value={fit} onChange={setFit} />
          <Txt v="smallSemi" color={C.textDim} style={{ marginTop: S.xl, marginBottom: S.sm }}>
            {t.yourName}
          </Txt>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t.namePlaceholder}
            placeholderTextColor={C.textFaint}
            maxLength={30}
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={finish}
          />
          <Txt v="small" color={C.textFaint} style={{ marginTop: S.xl }}>
            {t.privacyNote}
          </Txt>
        </Animated.View>
      )}

      <Button
        label={step < 2 ? t.next : t.start}
        onPress={() => (step < 2 ? setStep(step + 1) : finish())}
        style={{ marginTop: S.xxl }}
      />
    </Screen>
  );
}

const useStyles = makeStyles((C) => StyleSheet.create({
  dots: { flexDirection: 'row', gap: 6, marginTop: S.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.line },
  dotOn: { width: 24, backgroundColor: C.brandSoft },
  input: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: R.input,
    backgroundColor: C.surface,
    color: C.text,
    fontFamily: F.body,
    fontSize: 16,
  },
}));
