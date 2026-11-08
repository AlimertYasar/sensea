import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Garment } from '@/components/garments';
import { Button, Screen, Txt } from '@/components/ui';
import { fmt, useT } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { R, S, makeStyles, useColors } from '@/lib/theme';
import type { Slot } from '@/lib/types';
import { wardrobeReady } from '@/lib/useGenerate';
import { daysSince, forgotten, wearStats } from '@/lib/wear';

const ORDER: Slot[] = ['top', 'outer', 'bottom', 'one_piece', 'shoes', 'accessory'];

function Locked() {
  const C = useColors();
  const styles = useStyles();
  const t = useT();
  const demo: [string, string, number][] = [
    ['knit', '#C9B79C', -6],
    ['jeans', '#3B5B8C', 4],
    ['sneakers', '#F4F4F4', -3],
    ['coat', '#4A4560', 6],
  ];
  return (
    <Screen>
      <Txt v="h1" style={{ marginTop: S.xl }} accessibilityRole="header">
        {t.lockedTitle}
      </Txt>
      <View style={styles.lockedBoard}>
        {demo.map(([g, c, r]) => (
          <View key={g} style={{ transform: [{ rotate: `${r}deg` }] }}>
            <Garment type={g} color={c} size={78} />
          </View>
        ))}
      </View>
      <Txt v="body" color={C.textDim}>
        {t.lockedBody}
      </Txt>
      <Button
        label={t.upgradePlus}
        onPress={() => router.push({ pathname: '/paywall', params: { focus: 'plus' } })}
        style={{ marginTop: S.xl }}
      />
    </Screen>
  );
}

export default function Wardrobe() {
  const C = useColors();
  const styles = useStyles();
  const t = useT();
  const tier = useStore((s) => s.tier);
  const items = useStore((s) => s.wardrobe);
  const useWardrobe = useStore((s) => s.profile.useWardrobe);
  const setProfile = useStore((s) => s.setProfile);
  const entries = useStore((s) => s.entries);
  const stats = useMemo(() => wearStats(entries), [entries]);
  const comeback = useMemo(() => forgotten(items, stats).slice(0, 8), [items, stats]);

  if (tier !== 'plus') return <Locked />;

  const buildWith = (id: string) => router.navigate({ pathname: '/', params: { anchor: id } });

  const groups = ORDER.map((slot) => ({ slot, items: items.filter((i) => i.slot === slot) })).filter((g) => g.items.length);

  return (
    <Screen>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Txt v="h1" accessibilityRole="header">
            {t.wardrobeTitle}
          </Txt>
          <Txt v="small" color={C.textDim}>
            {items.length ? fmt(t.pieces_n, { n: items.length }) : t.wardrobeHint}
          </Txt>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.addPiece}
          onPress={() => router.push('/wardrobe/add')}
          style={({ pressed }) => [styles.add, pressed && { opacity: 0.8 }]}>
          <Feather name="plus" size={22} color="#fff" />
        </Pressable>
      </View>

      {items.length > 0 && (
        <View style={styles.toggle}>
          <Txt v="bodySemi" style={{ flex: 1 }}>
            {t.useMyWardrobe}
          </Txt>
          <Switch
            value={useWardrobe}
            onValueChange={(v) => setProfile({ useWardrobe: v })}
            trackColor={{ true: C.brand, false: C.surfaceHigh }}
            thumbColor="#FFFFFF"
            accessibilityLabel={t.useMyWardrobe}
          />
        </View>
      )}

      {items.length === 0 || !wardrobeReady(items) ? (
        <View style={styles.empty}>
          <Feather name="camera" size={22} color={C.textFaint} />
          <Txt v="body" color={C.textDim} style={{ textAlign: 'center' }}>
            {t.wardrobeEmpty}
          </Txt>
          {items.length === 0 && (
            <Button label={t.addPiece} icon="plus" onPress={() => router.push('/wardrobe/add')} style={{ alignSelf: 'stretch' }} />
          )}
        </View>
      ) : null}

      {comeback.length > 0 && wardrobeReady(items) && (
        <View style={{ marginTop: S.xl }}>
          <Txt v="h3">{t.forgottenTitle}</Txt>
          <Txt v="small" color={C.textDim} style={{ marginBottom: S.md }}>
            {t.forgottenHint}
          </Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {comeback.map((it) => {
              const d = daysSince(stats[it.id]?.lastWornAt ?? null);
              return (
                <Pressable
                  key={it.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${t.outfitWithThis}: ${it.name}`}
                  onPress={() => buildWith(it.id)}
                  style={({ pressed }) => [styles.mini, pressed && { opacity: 0.85 }]}>
                  <Image source={{ uri: it.cutoutUri ?? it.photoUri }} style={styles.miniPhoto} contentFit={it.cutoutUri ? 'contain' : 'cover'} />
                  <Txt v="tiny" numberOfLines={1}>
                    {it.name}
                  </Txt>
                  <Txt v="tiny" color={C.textFaint}>
                    {d === null ? t.neverWorn : fmt(t.lastWornDays, { n: d })}
                  </Txt>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {groups.map((g) => (
        <View key={g.slot} style={{ marginTop: S.xl }}>
          <Txt v="h3" style={{ marginBottom: S.md }}>
            {t.slot[g.slot]}
          </Txt>
          <View style={styles.grid}>
            {g.items.map((it) => (
              <Pressable
                key={it.id}
                accessibilityRole="button"
                accessibilityLabel={it.name}
                onPress={() => router.push({ pathname: '/wardrobe/add', params: { id: it.id } })}
                style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}>
                <Image
                  source={{ uri: it.cutoutUri ?? it.photoUri }}
                  style={[styles.photo, it.cutoutUri && { padding: 6 }]}
                  contentFit={it.cutoutUri ? 'contain' : 'cover'}
                />
                <View style={styles.tileFoot}>
                  <View style={[styles.dot, { backgroundColor: it.color_hex }]} />
                  <Txt v="tiny" numberOfLines={1} style={{ flex: 1 }}>
                    {it.name}
                  </Txt>
                </View>
                <Txt v="tiny" color={C.textFaint} style={styles.wear} numberOfLines={1}>
                  {stats[it.id]?.count ? fmt(t.wornTimes, { n: stats[it.id].count }) : t.neverWorn}
                </Txt>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </Screen>
  );
}

const useStyles = makeStyles((C) => StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: S.md, marginTop: S.xl },
  add: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: S.lg,
    padding: S.lg,
    borderRadius: R.card,
    backgroundColor: C.surface,
  },
  empty: { alignItems: 'center', gap: S.md, paddingVertical: S.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '31.5%', borderRadius: 16, overflow: 'hidden', backgroundColor: C.surface },
  photo: { width: '100%', aspectRatio: 0.85, backgroundColor: C.board },
  tileFoot: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingTop: 8 },
  wear: { paddingHorizontal: 8, paddingBottom: 8, paddingTop: 2 },
  mini: { width: 104, gap: 4 },
  miniPhoto: { width: 104, height: 120, borderRadius: 14, backgroundColor: C.board },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: '#FFFFFF33' },
  lockedBoard: {
    marginVertical: S.xl,
    height: 150,
    borderRadius: R.board,
    backgroundColor: C.board,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
