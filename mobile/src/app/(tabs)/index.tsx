import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { DyeLoader } from '@/components/DyeLoader';
import { MoodSwatch } from '@/components/MoodSwatch';
import { Button, Chip, Screen, Txt } from '@/components/ui';
import { EMOTION_COLOR, EMOTIONS, OCCASIONS, STYLES } from '@/lib/catalog';
import { fmt, useLocale, useT } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { F, R, S, makeStyles, useColors } from '@/lib/theme';
import type { EmotionKey, Occasion, Style, Weather } from '@/lib/types';
import { useGenerate, wardrobeReady } from '@/lib/useGenerate';
import { getWeather } from '@/lib/weather';

const MAX = 600;

export default function Home() {
  const C = useColors();
  const styles = useStyles();
  const t = useT();
  const locale = useLocale();
  const name = useStore((s) => s.profile.name);
  const useWeather = useStore((s) => s.profile.useWeather);
  const last = useStore((s) => s.entries[0]);
  const [text, setText] = useState('');
  const [occasion, setOccasion] = useState<Occasion>('everyday');
  const [todayStyle, setTodayStyle] = useState<Style | null>(null); // null = my saved style blend
  const myStyles = useStore((s) => s.profile.styles);
  const [weather, setWeather] = useState<Weather | null>(null);
  const { generate, loading, error, errorCode, setError } = useGenerate();
  const tier = useStore((s) => s.tier);
  const wardrobe = useStore((s) => s.wardrobe);
  const useWardrobe = useStore((s) => s.profile.useWardrobe);
  const setProfile = useStore((s) => s.setProfile);
  const canUseWardrobe = tier === 'plus' && wardrobeReady(wardrobe);
  const { anchor } = useLocalSearchParams<{ anchor?: string }>();
  const anchorItem = tier === 'plus' ? wardrobe.find((w) => w.id === anchor) : undefined;
  const clearAnchor = () => router.setParams({ anchor: undefined });

  useEffect(() => {
    if (useWeather) getWeather(false).then(setWeather);
    else setWeather(null);
  }, [useWeather]);

  const addFeeling = (k: EmotionKey) => {
    const word = t.emotionWord[k];
    setError(null);
    setText((prev) => {
      if (prev.toLocaleLowerCase(locale).includes(word)) return prev;
      const base = prev.trim();
      return (base ? `${base}${/[.!?…,]$/.test(base) ? ' ' : ', '}${word}` : word.charAt(0).toLocaleUpperCase(locale) + word.slice(1)).slice(0, MAX);
    });
  };

  const submit = async () => {
    const id = await generate(text, occasion, todayStyle, anchorItem ? [anchorItem.id] : undefined);
    if (id) {
      setText('');
      if (anchorItem) clearAnchor();
      router.push({ pathname: '/result/[id]', params: { id } });
    }
  };

  const today = new Date().toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Screen
      overlay={loading ? <DyeLoader /> : null}
      footer={<Button label={loading ? t.reading : t.create} onPress={submit} loading={loading} />}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Txt v="smallSemi" color={C.textDim}>
            {name ? fmt(t.helloName, { name }) : t.hello}
          </Txt>
          <Txt v="small" color={C.textFaint}>
            {today}
          </Txt>
        </View>
        {useWeather && weather && (
          <View style={styles.weather} accessibilityLabel={`${weather.temp_c}°, ${t.condition[weather.condition]}`}>
            <Feather name={weather.condition === 'rain' ? 'cloud-rain' : weather.condition === 'clear' ? 'sun' : 'cloud'} size={16} color={C.textDim} />
            <Txt v="smallSemi" color={C.textDim}>
              {weather.temp_c}° · {t.condition[weather.condition]}
            </Txt>
          </View>
        )}
      </View>

      <Txt v="hero" style={{ marginTop: S.xl }} accessibilityRole="header">
        {t.homeTitle}
      </Txt>
      <Txt v="body" color={C.textDim} style={{ marginTop: S.sm, maxWidth: 520 }}>
        {t.homeHint}
      </Txt>

      {anchorItem && (
        <View style={styles.anchor}>
          <Image
            source={{ uri: anchorItem.cutoutUri ?? anchorItem.photoUri }}
            style={styles.anchorPhoto}
            contentFit={anchorItem.cutoutUri ? 'contain' : 'cover'}
          />
          <View style={{ flex: 1 }}>
            <Txt v="tiny" color={C.textFaint}>
              {t.anchorText}
            </Txt>
            <Txt v="bodySemi" numberOfLines={1}>
              {anchorItem.name}
            </Txt>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={t.cancel} onPress={clearAnchor} hitSlop={8} style={styles.anchorX}>
            <Feather name="x" size={18} color={C.textDim} />
          </Pressable>
        </View>
      )}

      <View style={styles.inputWrap}>
        <TextInput
          value={text}
          onChangeText={(v) => {
            setText(v.slice(0, MAX));
            if (error) setError(null);
          }}
          placeholder={t.placeholder}
          placeholderTextColor={C.textFaint}
          multiline
          maxLength={MAX}
          style={styles.input}
          accessibilityLabel={t.homeTitle}
          textAlignVertical="top"
        />
        <Txt v="tiny" color={C.textFaint} style={styles.counter}>
          {text.length}/{MAX}
        </Txt>
      </View>

      <Txt v="smallSemi" color={C.textDim} style={styles.label}>
        {t.quickFeelings}
      </Txt>
      <View style={styles.chips}>
        {EMOTIONS.map((k) => (
          <Chip key={k} label={t.emotion[k]} dot={EMOTION_COLOR[k]} onPress={() => addFeeling(k)} />
        ))}
      </View>

      <Txt v="smallSemi" color={C.textDim} style={styles.label}>
        {t.occasionQ}
      </Txt>
      <View style={styles.chips}>
        {OCCASIONS.map((o) => (
          <Chip key={o} label={t.occasion[o]} selected={occasion === o} onPress={() => setOccasion(o)} />
        ))}
      </View>

      <Txt v="smallSemi" color={C.textDim} style={styles.label}>
        {t.todayStyle}
      </Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip
          label={`${t.myStyle}: ${myStyles.map((st) => t.style[st]).join(' + ')}`}
          selected={todayStyle === null}
          onPress={() => setTodayStyle(null)}
        />
        {STYLES.map((st) => (
          <Chip key={st} label={t.style[st]} selected={todayStyle === st} onPress={() => setTodayStyle(st)} />
        ))}
      </ScrollView>

      {canUseWardrobe && (
        <View style={{ marginTop: S.lg }}>
          <Chip
            label={t.useMyWardrobe}
            selected={useWardrobe}
            dot={useWardrobe ? '#7CE0A3' : undefined}
            onPress={() => setProfile({ useWardrobe: !useWardrobe })}
          />
        </View>
      )}

      {error && (
        <View style={styles.error} accessibilityLiveRegion="polite">
          <Feather name="alert-circle" size={16} color={C.danger} />
          <Txt v="small" color={C.danger} style={{ flex: 1 }}>
            {error}
          </Txt>
        </View>
      )}
      {errorCode === 'daily' && (
        <Button label={t.upgrade} kind="ghost" onPress={() => router.push('/paywall')} style={{ marginTop: S.md }} />
      )}

      {last && (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/result/[id]', params: { id: last.id } })}
          style={({ pressed }) => [styles.last, pressed && { opacity: 0.85 }]}>
          <MoodSwatch emotions={last.rec.emotions} seed={last.id} height={64} radius={16} style={{ width: 64 }} />
          <View style={{ flex: 1 }}>
            <Txt v="tiny" color={C.textFaint}>
              {t.lastReading}
            </Txt>
            <Txt v="smallSemi" numberOfLines={1}>
              {t.emotion[last.rec.dominant]} · {last.rec.outfits[0]?.title}
            </Txt>
            <Txt v="small" color={C.textDim} numberOfLines={1}>
              {last.rec.mood_summary}
            </Txt>
          </View>
          <Feather name="chevron-right" size={20} color={C.textFaint} />
        </Pressable>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((C) => StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', marginTop: S.lg, gap: S.md },
  weather: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: R.chip,
    backgroundColor: C.surface,
  },
  inputWrap: {
    marginTop: S.xl,
    backgroundColor: C.surface,
    borderRadius: R.input,
    borderWidth: 1,
    borderColor: C.line,
    minHeight: 170,
  },
  input: {
    flex: 1,
    minHeight: 150,
    padding: 18,
    paddingBottom: 30,
    color: C.text,
    fontFamily: F.body,
    fontSize: 18,
    lineHeight: 27,
  },
  anchor: {
    marginTop: S.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: 10,
    borderRadius: R.card,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.brandSoft,
  },
  anchorPhoto: { width: 52, height: 60, borderRadius: 10, backgroundColor: C.board },
  anchorX: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  counter: { position: 'absolute', right: 16, bottom: 10 },
  label: { marginTop: S.xl, marginBottom: S.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  error: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: S.lg },
  last: {
    marginTop: S.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: 12,
    borderRadius: R.card,
    backgroundColor: C.surface,
  },
}));
