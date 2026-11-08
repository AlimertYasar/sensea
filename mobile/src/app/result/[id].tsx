import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';

import { MoodSwatch } from '@/components/MoodSwatch';
import { OutfitBoard } from '@/components/OutfitBoard';
import { ShareSheet } from '@/components/ShareCard';
import { Button, IconButton, Screen, Segmented, tap, Txt } from '@/components/ui';
import { ApiError, renderOutfit, swapPiece } from '@/lib/api';
import { EMOTION_COLOR } from '@/lib/catalog';
import { fmt, useLocale, useT } from '@/lib/i18n';
import { resizeToBase64, saveJpeg } from '@/lib/media';
import { reportError, track } from '@/lib/monitoring';
import { useStore } from '@/lib/store';
import { makeStyles, R, S, useColors, withAlpha } from '@/lib/theme';
import { useGenerate } from '@/lib/useGenerate';
import { buildPrefs } from '@/lib/prefs';
import { wardrobePayload } from '@/lib/wear';

export default function Result() {
  const C = useColors();
  const styles = useStyles();
  const t = useT();
  const locale = useLocale();
  const pct = (v: number) => (locale === 'tr' ? `%${Math.round(v * 100)}` : `${Math.round(v * 100)}%`);
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = useStore((s) => s.entries.find((e) => e.id === id));
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const setFeedback = useStore((s) => s.setFeedback);
  const setWorn = useStore((s) => s.setWorn);
  const [idx, setIdx] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [renderMsg, setRenderMsg] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [thanks, setThanks] = useState(false);
  const [swapping, setSwapping] = useState<number | null>(null);
  const [swapMsg, setSwapMsg] = useState<string | null>(null);
  const replaceItem = useStore((s) => s.replaceItem);
  const { generate, loading, error } = useGenerate();
  const tier = useStore((s) => s.tier);
  const fit = useStore((s) => s.profile.fit);
  const installId = useStore((s) => s.installId);
  const setRender = useStore((s) => s.setRender);
  const wardrobe = useStore((s) => s.wardrobe);
  const photos = useMemo(() => Object.fromEntries(wardrobe.map((w) => [w.id, w.photoUri])), [wardrobe]);
  const cutouts = useMemo(
    () => Object.fromEntries(wardrobe.filter((w) => w.cutoutUri).map((w) => [w.id, w.cutoutUri!])),
    [wardrobe],
  );

  useEffect(() => {
    track('result_view');
  }, []);

  if (!entry) {
    return (
      <Screen>
        <View style={styles.header}>
          <IconButton icon="x" label="Close" onPress={() => router.back()} />
        </View>
        <Txt v="body" color={C.textDim} style={{ marginTop: S.xl }}>
          {t.errGeneric}
        </Txt>
      </Screen>
    );
  }

  const { rec } = entry;
  const outfit = rec.outfits[Math.min(idx, rec.outfits.length - 1)];
  const saved = entry.favorite === idx;
  const fb = entry.feedback?.[idx];
  const worn = entry.worn === idx;
  const domColor = EMOTION_COLOR[rec.dominant];
  const shown = rec.emotions.filter((e) => e.score >= 0.06).slice(0, 4);
  const palette = idx === 1 && rec.lift_palette?.length ? rec.lift_palette : rec.palette;
  const renderUri = entry.renders?.[idx];

  const giveFeedback = (v: 'like' | 'dislike') => {
    tap();
    const next = fb === v ? null : v;
    setFeedback(entry.id, idx, next);
    if (next) {
      track(next === 'like' ? 'outfit_like' : 'outfit_dislike');
      setThanks(true);
    }
  };

  const toggleWorn = () => {
    tap();
    setWorn(entry.id, idx);
    if (!worn) {
      track('outfit_worn');
      setThanks(true);
    }
  };

  const doRender = async () => {
    if (tier === 'free') return router.push('/paywall');
    setRendering(true);
    setRenderMsg(null);
    try {
      let refs: { wardrobe_id: string; image_b64: string }[] | undefined;
      if (tier === 'plus') {
        const owned = outfit.items.filter((i) => i.wardrobe_id && photos[i.wardrobe_id]).slice(0, 4);
        refs = await Promise.all(
          owned.map(async (i) => ({
            wardrobe_id: i.wardrobe_id!,
            image_b64: (await resizeToBase64(photos[i.wardrobe_id!], 512, 0.7)).base64,
          })),
        );
        if (!refs.length) refs = undefined;
      }
      const r = await renderOutfit({ outfit, fit, dominant: rec.dominant, locale, refs }, installId);
      setRender(entry.id, idx, saveJpeg('renders', `${entry.id}-${idx}`, r.image));
      setRenderMsg(fmt(t.renderLeft, { n: r.remaining }));
      track('render');
    } catch (e) {
      const code = e instanceof ApiError ? e.code : 'server';
      if (code === 'premium') router.push('/paywall');
      else setRenderMsg(code === 'quota' ? t.errQuota : code === 'network' ? t.errNetwork : t.errGeneric);
      if (code === 'server') reportError(e);
    } finally {
      setRendering(false);
    }
  };

  const swap = async (itemIndex: number) => {
    tap();
    setSwapping(itemIndex);
    setSwapMsg(null);
    try {
      const { profile, entries, wardrobe: w } = useStore.getState();
      const useMine = tier === 'plus' && (rec.uses_wardrobe || profile.useWardrobe) && w.length > 0;
      const r = await swapPiece(
        {
          outfit,
          index: itemIndex,
          dominant: rec.dominant,
          palette,
          style: entry.style,
          styles: profile.styles,
          fit,
          occasion: entry.occasion,
          locale,
          ...(entry.weather ? { weather: entry.weather } : {}),
          prefs: buildPrefs(entries, profile),
          ...(useMine ? { wardrobe: wardrobePayload(w, entries) } : {}),
          seed: Math.floor(Math.random() * 1e6),
        },
        installId,
      );
      replaceItem(entry.id, idx, itemIndex, r.item);
      track('swap');
    } catch (e) {
      const code = e instanceof ApiError ? e.code : 'server';
      setSwapMsg(code === 'quota' ? t.swapLimit : code === 'network' ? t.errNetwork : t.swapErr);
      if (code === 'server') reportError(e);
    } finally {
      setSwapping(null);
    }
  };

  const again = async () => {
    const newId = await generate(entry.text, entry.occasion);
    if (newId) router.replace({ pathname: '/result/[id]', params: { id: newId } });
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-down" label="Close" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <IconButton icon="share" label={t.share} onPress={() => setSharing(true)} />
      </View>

      {rec.wellbeing_concern && (
        <View style={styles.support} accessibilityRole="alert">
          <Txt v="h3">{t.supportTitle}</Txt>
          <Txt v="small" color={C.textDim} style={{ marginTop: 6 }}>
            {t.supportBody}
          </Txt>
          <Button label={t.supportCall} icon="phone" kind="ghost" onPress={() => Linking.openURL('tel:112')} style={{ marginTop: S.md, minHeight: 46 }} />
        </View>
      )}

      {/* Compact mood header: the outfit has to be visible on the first screen */}
      <MoodSwatch emotions={rec.emotions} seed={entry.id} height={128} radius={24} animate style={{ marginTop: S.md }}>
        <LinearGradient colors={['#00000000', '#00000099']} style={styles.scrim} />
        <View style={styles.swatchText}>
          <Txt v="h1" color="#FFFFFF" style={styles.swatchTitle}>
            {t.emotion[rec.dominant]}
          </Txt>
          <Txt v="small" color="#FFFFFFE6" style={styles.shadow} numberOfLines={2}>
            {rec.mood_summary}
          </Txt>
        </View>
      </MoodSwatch>

      {rec.outfits.length > 1 && (
        <View style={{ marginTop: S.lg }}>
          <Segmented
            options={rec.outfits.map((o, i) => ({ key: String(i), label: i === 0 ? t.inTune : t.lift }))}
            value={String(idx)}
            onChange={(k) => setIdx(Number(k))}
          />
        </View>
      )}

      <View style={styles.outfitHead}>
        <View style={{ flex: 1 }}>
          <Txt v="h2">{outfit.title}</Txt>
          {!!outfit.vibe && (
            <Txt v="small" color={C.textDim}>
              {outfit.vibe}
            </Txt>
          )}
        </View>
        <IconButton
          icon="heart"
          label={saved ? t.saved : t.save}
          color={saved ? '#E5487A' : C.text}
          onPress={() => {
            if (!saved) track('outfit_saved');
            toggleFavorite(entry.id, idx);
          }}
        />
      </View>

      <OutfitBoard outfit={outfit} photos={photos} cutouts={cutouts} />

      <View style={styles.feedback}>
        {(
          [
            ['like', 'thumbs-up', t.like, fb === 'like', () => giveFeedback('like')],
            ['dislike', 'thumbs-down', t.dislike, fb === 'dislike', () => giveFeedback('dislike')],
          ] as const
        ).map(([key, icon, label, on, press]) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: on }}
            onPress={press}
            style={({ pressed }) => [styles.fbIcon, on && styles.fbOn, pressed && { opacity: 0.8 }]}>
            <Feather name={icon} size={18} color={on ? C.text : C.textDim} />
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: worn }}
          onPress={toggleWorn}
          style={({ pressed }) => [styles.fbBtn, worn && styles.fbOn, pressed && { opacity: 0.8 }]}>
          <Feather name="check-circle" size={16} color={worn ? C.text : C.textDim} />
          <Txt v="smallSemi" color={worn ? C.text : C.textDim}>
            {t.worn}
          </Txt>
        </Pressable>
      </View>
      {thanks && (
        <Txt v="small" color={C.textDim} style={{ marginTop: S.sm }} accessibilityLiveRegion="polite">
          {t.feedbackThanks}
        </Txt>
      )}

      {renderUri ? (
        <Image source={{ uri: renderUri }} style={styles.render} contentFit="cover" accessibilityLabel={outfit.title} />
      ) : (
        <Pressable
          accessibilityRole="button"
          disabled={rendering}
          onPress={doRender}
          style={({ pressed }) => [styles.renderCta, pressed && { opacity: 0.85 }]}>
          {rendering ? <ActivityIndicator color={C.text} /> : <Feather name="aperture" size={20} color={C.text} />}
          <View style={{ flex: 1 }}>
            <Txt v="bodySemi">{rendering ? t.rendering : t.renderCta}</Txt>
            {tier === 'plus' && outfit.items.some((i) => i.wardrobe_id) && !rendering && (
              <Txt v="tiny" color={C.textDim}>
                {t.renderWithMine}
              </Txt>
            )}
          </View>
          {tier === 'free' && (
            <View style={styles.badge}>
              <Txt v="tiny">{t.premium}</Txt>
            </View>
          )}
        </Pressable>
      )}
      {renderMsg && (
        <Txt v="small" color={C.textDim} style={{ marginTop: S.sm }}>
          {renderMsg}
        </Txt>
      )}

      <Txt v="h3" style={styles.section}>
        {t.pieces}
      </Txt>
      <View style={{ gap: 2 }}>
        {outfit.items.map((it, ii) => (
          <View key={`${ii}-${it.slot}-${it.type}-${it.color_hex}`} style={styles.itemRow}>
            <View style={[styles.itemDot, { backgroundColor: it.color_hex }]} />
            <View style={{ flex: 1 }}>
              <Txt v="bodySemi">{it.name}</Txt>
              <Txt v="small" color={C.textDim}>
                {it.color_name}
              </Txt>
            </View>
            {rec.uses_wardrobe && (
              <View style={[styles.badge, !it.wardrobe_id && styles.badgeGhost]}>
                <Txt v="tiny" color={it.wardrobe_id ? C.text : C.textDim}>
                  {it.wardrobe_id ? t.owned : t.suggestion}
                </Txt>
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t.swapPiece}: ${it.name}`}
              disabled={swapping !== null}
              onPress={() => swap(ii)}
              hitSlop={6}
              style={({ pressed }) => [styles.swapBtn, pressed && { opacity: 0.7 }, swapping !== null && swapping !== ii && { opacity: 0.4 }]}>
              {swapping === ii ? <ActivityIndicator size="small" color={C.textDim} /> : <Feather name="shuffle" size={16} color={C.textDim} />}
            </Pressable>
          </View>
        ))}
      </View>
      {swapMsg && (
        <Txt v="small" color={C.danger} style={{ marginTop: S.sm }} accessibilityLiveRegion="polite">
          {swapMsg}
        </Txt>
      )}

      <View style={[styles.note, { borderLeftColor: domColor }]}>
        <Txt v="smallSemi" color={C.textDim}>
          {t.why}
        </Txt>
        <Txt v="body" style={{ marginTop: 4 }}>
          {outfit.why}
        </Txt>
        {!!outfit.tip && (
          <>
            <Txt v="smallSemi" color={C.textDim} style={{ marginTop: S.lg }}>
              {t.tip}
            </Txt>
            <Txt v="body" style={{ marginTop: 4 }}>
              {outfit.tip}
            </Txt>
          </>
        )}
      </View>

      <Txt v="h3" style={styles.section}>
        {t.palette}
      </Txt>
      <View style={styles.palette}>
        {palette.map((p) => (
          <View key={p.hex} style={{ flex: 1, gap: 6 }}>
            <View style={[styles.chipColor, { backgroundColor: p.hex }]} />
            <Txt v="tiny" color={C.textDim} numberOfLines={2}>
              {p.name}
            </Txt>
          </View>
        ))}
      </View>

      <Txt v="h3" style={styles.section}>
        {t.moodMix}
      </Txt>
      <View style={{ gap: 10 }}>
        {shown.map((e) => (
          <View key={e.key} style={styles.mixRow} accessibilityLabel={`${t.emotion[e.key]} ${pct(e.score)}`}>
            <Txt v="smallSemi" style={{ width: 96 }}>
              {t.emotion[e.key]}
            </Txt>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.max(4, e.score * 100)}%`, backgroundColor: EMOTION_COLOR[e.key] }]} />
            </View>
            <Txt v="smallSemi" color={C.textDim} style={{ width: 42, textAlign: 'right' }}>
              {pct(e.score)}
            </Txt>
          </View>
        ))}
      </View>

      {error && (
        <Txt v="small" color={C.danger} style={{ marginTop: S.lg }}>
          {error}
        </Txt>
      )}
      <Button label={t.again} icon="refresh-cw" kind="ghost" onPress={again} loading={loading} style={{ marginTop: S.xxl }} />

      <ShareSheet visible={sharing} onClose={() => setSharing(false)} entry={entry} outfit={outfit} photos={photos} />
    </Screen>
  );
}

const useStyles = makeStyles((C) =>
  StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', marginTop: S.sm },
    support: {
      marginTop: S.lg,
      padding: S.lg,
      borderRadius: R.card,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.line,
    },
    scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '80%' },
    swatchText: { position: 'absolute', left: 18, right: 18, bottom: 14, gap: 2 },
    swatchTitle: { textShadowColor: '#00000055', textShadowRadius: 12, textShadowOffset: { width: 0, height: 1 } },
    shadow: { textShadowColor: '#00000066', textShadowRadius: 8, textShadowOffset: { width: 0, height: 1 } },
    section: { marginTop: S.xxl, marginBottom: S.md },
    mixRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    track: { flex: 1, height: 10, borderRadius: 5, backgroundColor: C.surfaceHigh, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 5 },
    palette: { flexDirection: 'row', gap: 10 },
    chipColor: { height: 56, borderRadius: 14, borderWidth: 1, borderColor: C.line },
    outfitHead: { flexDirection: 'row', alignItems: 'center', gap: S.md, marginTop: S.lg, marginBottom: S.md },
    feedback: { flexDirection: 'row', gap: 8, marginTop: S.md },
    fbBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      minHeight: 44,
      paddingHorizontal: 8,
      borderRadius: R.chip,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.surface,
    },
    fbIcon: {
      width: 48,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: R.chip,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.surface,
    },
    fbOn: { borderColor: C.brandSoft, backgroundColor: C.surfaceHigh },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
    itemDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: withAlpha('#808080', 0.35) },
    note: { marginTop: S.xl, paddingLeft: S.lg, borderLeftWidth: 3 },
    render: { width: '100%', aspectRatio: 0.75, borderRadius: R.board, marginTop: S.md, backgroundColor: C.surface },
    renderCta: {
      marginTop: S.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: S.lg,
      borderRadius: R.card,
      borderWidth: 1.5,
      borderColor: C.line,
      borderStyle: 'dashed',
    },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.chip, backgroundColor: C.surfaceHigh },
    swapBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.surface,
    },
    badgeGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.line },
  }),
);
