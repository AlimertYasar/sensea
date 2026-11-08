import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { MoodSwatch } from '@/components/MoodSwatch';
import { Button, IconButton, Screen, Txt } from '@/components/ui';
import { API_URL } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { reportError, track } from '@/lib/monitoring';
import { buy, getPlans, type Plan, purchasesAvailable, restore } from '@/lib/purchases';
import { useStore } from '@/lib/store';
import { R, S, makeStyles, useColors } from '@/lib/theme';

const EULA = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const HERO = [
  { key: 'happy' as const, score: 0.4 },
  { key: 'confident' as const, score: 0.35 },
  { key: 'calm' as const, score: 0.25 },
];

export default function Paywall() {
  const C = useColors();
  const styles = useStyles();
  const t = useT();
  const { focus } = useLocalSearchParams<{ focus?: 'premium' | 'plus' }>();
  const tier = useStore((s) => s.tier);
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<'premium' | 'plus'>(focus === 'plus' ? 'plus' : 'premium');

  useEffect(() => {
    track('paywall_view');
    getPlans().then(setPlans).catch(() => setPlans([]));
  }, []);

  const notify = (msg: string) => (Platform.OS === 'web' ? globalThis.alert?.(msg) : Alert.alert('Sensea', msg));

  const purchase = async (p: Plan) => {
    setBusy(p.id);
    track('purchase_start');
    try {
      if (await buy(p)) {
        track('purchase_done');
        router.back();
      }
    } catch (e) {
      reportError(e);
      notify(t.errGeneric);
    } finally {
      setBusy(null);
    }
  };

  const doRestore = async () => {
    setBusy('restore');
    try {
      const tr = await restore();
      notify(tr === 'free' ? t.restoreNone : t.restored);
    } finally {
      setBusy(null);
    }
  };

  const card = (key: 'premium' | 'plus') => {
    const on = selected === key;
    const features = key === 'plus' ? t.plusFeatures : t.premiumFeatures;
    const own = plans?.filter((p) => p.tier === key) ?? [];
    const current = tier === key;
    return (
      <Pressable
        key={key}
        accessibilityRole="radio"
        accessibilityState={{ selected: on }}
        onPress={() => setSelected(key)}
        style={[styles.card, on && styles.cardOn]}>
        <View style={styles.cardHead}>
          <Txt v="h2">{key === 'plus' ? t.plus : t.premium}</Txt>
          {current && (
            <View style={styles.badge}>
              <Txt v="tiny">{t.currentPlan}</Txt>
            </View>
          )}
        </View>
        <View style={{ gap: 8, marginTop: S.md }}>
          {features.map((f) => (
            <View key={f} style={styles.feature}>
              <Feather name="check" size={16} color={C.brandSoft} style={{ marginTop: 3 }} />
              <Txt v="small" style={{ flex: 1 }}>
                {f}
              </Txt>
            </View>
          ))}
        </View>
        {on && !current && own.length > 0 && (
          <View style={{ gap: 8, marginTop: S.lg }}>
            {own.map((p) => (
              <Button
                key={p.id}
                label={`${t.subscribe}: ${p.price}${p.period === 'year' ? t.perYear : t.perMonth}`}
                onPress={() => purchase(p)}
                loading={busy === p.id}
                kind={p.period === 'year' ? 'ghost' : 'primary'}
              />
            ))}
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="x" label="Close" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      </View>
      <MoodSwatch emotions={HERO} seed="sensea-premium" height={120} radius={26} />
      <Txt v="h1" style={{ marginTop: S.xl }} accessibilityRole="header">
        {t.paywallTitle}
      </Txt>
      <Txt v="body" color={C.textDim} style={{ marginTop: 6 }}>
        {t.paywallSub}
      </Txt>

      <View style={{ gap: S.md, marginTop: S.xl }}>{(['premium', 'plus'] as const).map(card)}</View>

      {plans === null && purchasesAvailable && <ActivityIndicator color={C.text} style={{ marginTop: S.xl }} />}
      {!purchasesAvailable && (
        <Txt v="small" color={C.textDim} style={{ marginTop: S.xl }}>
          {t.storeUnavailable}
        </Txt>
      )}

      <Button label={t.restore} kind="ghost" onPress={doRestore} loading={busy === 'restore'} style={{ marginTop: S.xl }} />

      <Txt v="tiny" color={C.textFaint} style={{ marginTop: S.xl }}>
        {t.legal}
      </Txt>
      <View style={styles.links}>
        <Pressable accessibilityRole="link" onPress={() => WebBrowser.openBrowserAsync(EULA)}>
          <Txt v="tiny" color={C.textDim} style={styles.link}>
            {t.terms}
          </Txt>
        </Pressable>
        <Pressable accessibilityRole="link" onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/privacy`)}>
          <Txt v="tiny" color={C.textDim} style={styles.link}>
            {t.privacy}
          </Txt>
        </Pressable>
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((C) => StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: S.sm, marginBottom: S.md },
  card: { padding: S.lg, borderRadius: R.card, backgroundColor: C.surface, borderWidth: 2, borderColor: C.surface },
  cardOn: { borderColor: C.brandSoft },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.chip, backgroundColor: C.surfaceHigh },
  feature: { flexDirection: 'row', gap: 10 },
  links: { flexDirection: 'row', gap: S.xl, marginTop: S.md },
  link: { textDecorationLine: 'underline' },
}));
