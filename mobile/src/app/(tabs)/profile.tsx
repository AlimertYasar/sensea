import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import { Garment } from '@/components/garments';
import { StylePicker } from '@/components/StylePicker';
import { Button, Screen, Segmented, Txt } from '@/components/ui';
import { FITS, GARMENT_SLOTS } from '@/lib/catalog';
import { useT } from '@/lib/i18n';
import { track } from '@/lib/monitoring';
import { FAMILIES, FAMILY_SWATCH } from '@/lib/prefs';
import { manageUrl, purchasesAvailable } from '@/lib/purchases';
import { useStore } from '@/lib/store';
import { F, R, S, makeStyles, readableOn, useColors } from '@/lib/theme';
import type { Locale } from '@/lib/types';
import { ensurePermission } from '@/lib/notifications';
import { getWeather } from '@/lib/weather';

export default function Profile() {
  const C = useColors();
  const styles = useStyles();
  const t = useT();
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const clearHistory = useStore((s) => s.clearHistory);
  const count = useStore((s) => s.entries.length);
  const tier = useStore((s) => s.tier);
  const [name, setName] = useState(profile.name);
  const [notifMsg, setNotifMsg] = useState<string | null>(null);

  const toggleAvoid = (key: 'avoidColors' | 'avoidTypes', v: string) => {
    const cur = profile[key];
    setProfile({ [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
    track('prefs_changed');
  };

  const toggleWeather = async (on: boolean) => {
    if (!on) return setProfile({ useWeather: false });
    const w = await getWeather(true);
    setProfile({ useWeather: !!w });
  };

  const toggleReminder = async (key: 'reminderOn' | 'weeklyOn', on: boolean) => {
    setNotifMsg(null);
    if (!on) return setProfile({ [key]: false });
    if (Platform.OS === 'web') return setNotifMsg(t.notifWeb);
    const ok = await ensurePermission();
    if (!ok) return setNotifMsg(t.notifDenied);
    setProfile({ [key]: true });
    track('reminder_on');
  };

  const stepTime = (delta: number) => {
    const total = (profile.reminderHour * 60 + profile.reminderMinute + delta + 1440) % 1440;
    setProfile({ reminderHour: Math.floor(total / 60), reminderMinute: total % 60 });
  };
  const hhmm = `${String(profile.reminderHour).padStart(2, '0')}:${String(profile.reminderMinute).padStart(2, '0')}`;

  const confirmClear = () => {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (globalThis.confirm?.(t.clearConfirm)) clearHistory();
      return;
    }
    Alert.alert(t.clearHistory, t.clearConfirm, [
      { text: t.cancel, style: 'cancel' },
      { text: t.delete, style: 'destructive', onPress: clearHistory },
    ]);
  };

  return (
    <Screen>
      <Txt v="h1" style={{ marginTop: S.xl }} accessibilityRole="header">
        {t.profileTitle}
      </Txt>

      <View style={styles.sub}>
        <View style={{ flex: 1 }}>
          <Txt v="tiny" color={C.textDim}>
            {t.subscription}
          </Txt>
          <Txt v="h3">{t.tierName[tier]}</Txt>
        </View>
        {tier === 'free' ? (
          <Button label={t.upgrade} onPress={() => router.push('/paywall')} style={{ minHeight: 44, paddingHorizontal: 18 }} />
        ) : (
          <Button
            label={t.manage}
            kind="ghost"
            onPress={() => (purchasesAvailable ? Linking.openURL(manageUrl!) : router.push('/paywall'))}
            style={{ minHeight: 44, paddingHorizontal: 18 }}
          />
        )}
      </View>

      <Txt v="smallSemi" color={C.textDim} style={styles.label}>
        {t.yourName}
      </Txt>
      <TextInput
        value={name}
        onChangeText={setName}
        onEndEditing={() => setProfile({ name: name.trim() })}
        onBlur={() => setProfile({ name: name.trim() })}
        placeholder={t.namePlaceholder}
        placeholderTextColor={C.textFaint}
        maxLength={30}
        style={styles.input}
        accessibilityLabel={t.yourName}
      />

      <Txt v="smallSemi" color={C.textDim} style={styles.label}>
        {t.yourStyle}
      </Txt>
      <Txt v="small" color={C.textDim} style={{ marginBottom: S.md }}>
        {t.yourStyleHint}
      </Txt>
      <StylePicker value={profile.styles} onChange={(styles) => setProfile({ styles })} />

      <Txt v="smallSemi" color={C.textDim} style={styles.label}>
        {t.yourFit}
      </Txt>
      <Segmented options={FITS.map((f) => ({ key: f, label: t.fit[f] }))} value={profile.fit} onChange={(fit) => setProfile({ fit })} />

      <Txt v="h3" style={{ marginTop: S.xxl }}>
        {t.avoidTitle}
      </Txt>
      <Txt v="small" color={C.textDim} style={{ marginTop: 4 }}>
        {t.avoidHint}
      </Txt>
      <Txt v="smallSemi" color={C.textDim} style={styles.label}>
        {t.avoidColors}
      </Txt>
      <View style={styles.avoidWrap}>
        {FAMILIES.map((f) => {
          const on = profile.avoidColors.includes(f);
          return (
            <Pressable
              key={f}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={t.colorNames[f]}
              onPress={() => toggleAvoid('avoidColors', f)}
              style={[styles.avoidChip, on && styles.avoidOn]}>
              <View style={[styles.avoidDot, { backgroundColor: FAMILY_SWATCH[f] }]}>
                {on && <Feather name="slash" size={14} color={readableOn(FAMILY_SWATCH[f])} />}
              </View>
              <Txt v="tiny" color={on ? C.text : C.textDim}>
                {t.colorNames[f]}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      <Txt v="smallSemi" color={C.textDim} style={styles.label}>
        {t.avoidTypes}
      </Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {Object.keys(GARMENT_SLOTS).map((g) => {
          const on = profile.avoidTypes.includes(g);
          return (
            <Pressable
              key={g}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={t.garment[g]}
              onPress={() => toggleAvoid('avoidTypes', g)}
              style={[styles.typeChip, on && styles.avoidOn]}>
              <View style={{ opacity: on ? 0.35 : 1 }}>
                <Garment type={g} color={C.scheme === 'light' ? '#C9B79C' : '#B3A2CB'} size={36} />
              </View>
              {on && <Feather name="slash" size={18} color={C.danger} style={styles.typeSlash} />}
              <Txt v="tiny" color={on ? C.text : C.textDim} numberOfLines={1}>
                {t.garment[g]}
              </Txt>
            </Pressable>
          );
        })}
      </ScrollView>

      <Txt v="smallSemi" color={C.textDim} style={styles.label}>
        {t.language}
      </Txt>
      <Segmented<'auto' | Locale>
        options={[
          { key: 'auto', label: t.auto },
          { key: 'tr', label: 'Türkçe' },
          { key: 'en', label: 'English' },
        ]}
        value={profile.locale ?? 'auto'}
        onChange={(k) => setProfile({ locale: k === 'auto' ? null : k })}
      />

      <Txt v="smallSemi" color={C.textDim} style={styles.label}>
        {t.appearance}
      </Txt>
      <Segmented<'dark' | 'light' | 'system'>
        options={[
          { key: 'dark', label: t.themeDark },
          { key: 'light', label: t.themeLight },
          { key: 'system', label: t.themeSystem },
        ]}
        value={profile.appearance}
        onChange={(appearance) => setProfile({ appearance })}
      />

      <Txt v="h3" style={{ marginTop: S.xxl }}>
        {t.remindersTitle}
      </Txt>
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={{ flex: 1 }}>
            <Txt v="bodySemi">{t.reminderMorning}</Txt>
            <Txt v="small" color={C.textDim}>
              {t.reminderMorningHint}
            </Txt>
          </View>
          <Switch
            value={profile.reminderOn}
            onValueChange={(v) => toggleReminder('reminderOn', v)}
            trackColor={{ true: C.brand, false: C.surfaceHigh }}
            thumbColor="#FFFFFF"
            accessibilityLabel={t.reminderMorning}
          />
        </View>
        {profile.reminderOn && (
          <View style={styles.timeRow}>
            <Txt v="smallSemi" color={C.textDim} style={{ flex: 1 }}>
              {t.reminderTime}
            </Txt>
            <Pressable accessibilityRole="button" accessibilityLabel="-15" onPress={() => stepTime(-15)} style={styles.stepBtn}>
              <Feather name="minus" size={18} color={C.text} />
            </Pressable>
            <Txt v="h3" style={styles.time} accessibilityLiveRegion="polite">
              {hhmm}
            </Txt>
            <Pressable accessibilityRole="button" accessibilityLabel="+15" onPress={() => stepTime(15)} style={styles.stepBtn}>
              <Feather name="plus" size={18} color={C.text} />
            </Pressable>
          </View>
        )}
        <View style={styles.divider} />
        <View style={styles.cardRow}>
          <View style={{ flex: 1 }}>
            <Txt v="bodySemi">{t.reminderWeekly}</Txt>
            <Txt v="small" color={C.textDim}>
              {t.reminderWeeklyHint}
            </Txt>
          </View>
          <Switch
            value={profile.weeklyOn}
            onValueChange={(v) => toggleReminder('weeklyOn', v)}
            trackColor={{ true: C.brand, false: C.surfaceHigh }}
            thumbColor="#FFFFFF"
            accessibilityLabel={t.reminderWeekly}
          />
        </View>
      </View>
      {notifMsg && (
        <Txt v="small" color={C.textDim} style={{ marginTop: S.sm }} accessibilityLiveRegion="polite">
          {notifMsg}
        </Txt>
      )}

      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Txt v="bodySemi">{t.useWeather}</Txt>
          <Txt v="small" color={C.textDim}>
            {t.useWeatherHint}
          </Txt>
        </View>
        <Switch
          value={profile.useWeather}
          onValueChange={toggleWeather}
          trackColor={{ true: C.brand, false: C.surfaceHigh }}
          thumbColor="#FFFFFF"
          accessibilityLabel={t.useWeather}
        />
      </View>

      <View style={styles.links}>
        <Pressable accessibilityRole="link" onPress={() => router.push('/privacy')} style={styles.link}>
          <Feather name="shield" size={18} color={C.textDim} />
          <Txt v="bodySemi" style={{ flex: 1 }}>
            {t.privacy}
          </Txt>
          <Feather name="chevron-right" size={18} color={C.textFaint} />
        </Pressable>
        <Pressable accessibilityRole="button" disabled={!count} onPress={confirmClear} style={[styles.link, !count && { opacity: 0.4 }]}>
          <Feather name="trash-2" size={18} color={C.danger} />
          <Txt v="bodySemi" color={C.danger} style={{ flex: 1 }}>
            {t.clearHistory}
          </Txt>
        </Pressable>
      </View>

      <Txt v="tiny" color={C.textFaint} style={{ marginTop: S.xl, textAlign: 'center' }}>
        Sensea {t.version} {Constants.expoConfig?.version ?? ''}
      </Txt>
    </Screen>
  );
}

const useStyles = makeStyles((C) => StyleSheet.create({
  label: { marginTop: S.xl, marginBottom: S.sm },
  avoidWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  avoidChip: { width: 70, alignItems: 'center', gap: 6, paddingVertical: 8, borderRadius: 14, borderWidth: 1.5, borderColor: 'transparent' },
  avoidOn: { borderColor: C.danger, backgroundColor: C.surface },
  avoidDot: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  typeChip: { width: 76, alignItems: 'center', gap: 4, paddingVertical: 8, borderRadius: 14, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.surface },
  typeSlash: { position: 'absolute', top: 16 },
  sub: { flexDirection: 'row', alignItems: 'center', gap: S.md, marginTop: S.xl, padding: S.lg, borderRadius: R.card, backgroundColor: C.surface },
  input: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: R.input,
    backgroundColor: C.surface,
    color: C.text,
    fontFamily: F.body,
    fontSize: 16,
  },
  card: { marginTop: S.md, borderRadius: R.card, backgroundColor: C.surface, paddingHorizontal: S.lg },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: S.lg, paddingVertical: S.lg },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: S.lg },
  stepBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surfaceHigh, alignItems: 'center', justifyContent: 'center' },
  time: { minWidth: 72, textAlign: 'center', fontVariant: ['tabular-nums'] },
  divider: { height: 1, backgroundColor: C.line },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: S.lg, marginTop: S.xxl },
  links: { marginTop: S.xxl, borderRadius: R.card, backgroundColor: C.surface, overflow: 'hidden' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, minHeight: 56 },
}));
