import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Garment } from '@/components/garments';
import { Button, IconButton, Screen, Segmented, Txt } from '@/components/ui';
import { ApiError, tagGarment } from '@/lib/api';
import { GARMENT_SLOTS } from '@/lib/catalog';
import { useLocale, useT } from '@/lib/i18n';
import { deleteLocal, resizeToBase64, saveJpeg, savePng } from '@/lib/media';
import { track } from '@/lib/monitoring';
import { newId, useStore } from '@/lib/store';
import { F, R, S, makeStyles, useColors } from '@/lib/theme';
import type { Warmth } from '@/lib/types';

const PRESETS: [string, string][] = [
  ['black', '#1C1C1E'], ['white', '#F5F5F2'], ['grey', '#9A9AA0'], ['navy', '#1F2A44'], ['beige', '#D8C7A8'],
  ['brown', '#6B4A34'], ['olive', '#5E6243'], ['denim', '#4A6A96'], ['blue', '#3A6FD8'], ['green', '#3E8E5E'],
  ['red', '#C8323C'], ['yellow', '#F2C230'], ['pink', '#E89AB5'],
];

export default function AddPiece() {
  const C = useColors();
  const styles = useStyles();
  const t = useT();
  const locale = useLocale();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useStore((s) => s.wardrobe.find((w) => w.id === id));
  const installId = useStore((s) => s.installId);
  const add = useStore((s) => s.addWardrobeItem);
  const update = useStore((s) => s.updateWardrobeItem);
  const remove = useStore((s) => s.removeWardrobeItem);

  const [photo, setPhoto] = useState<{ uri: string; base64: string } | null>(null);
  const [cutout, setCutout] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState(false);
  const [type, setType] = useState(existing?.type ?? 'tshirt');
  const [name, setName] = useState(existing?.name ?? '');
  const [color, setColor] = useState<{ hex: string; name: string }>(
    existing ? { hex: existing.color_hex, name: existing.color_name } : { hex: '#9A9AA0', name: '' },
  );
  const [detected, setDetected] = useState<{ hex: string; name: string } | null>(null);
  const [warmth, setWarmth] = useState<Warmth>(existing?.warmth ?? 'medium');
  const types = useMemo(() => Object.keys(GARMENT_SLOTS), []);

  const pick = async (camera: boolean) => {
    setError(null);
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return setError(t.cameraDenied);
    }
    const res = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: true, aspect: [4, 5] })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: true, aspect: [4, 5] });
    if (res.canceled || !res.assets?.[0]) return;
    setBusy(true);
    setCutout(null);
    try {
      const small = await resizeToBase64(res.assets[0].uri, 768, 0.8);
      setPhoto(small);
      const tag = await tagGarment(small.base64, locale, installId);
      setType(tag.type);
      setName(tag.name);
      setColor({ hex: tag.color_hex, name: tag.color_name });
      setDetected({ hex: tag.color_hex, name: tag.color_name });
      setWarmth(tag.warmth);
      setReview(tag.needs_review);
      setCutout(tag.cutout ?? null);
    } catch (e) {
      const code = e instanceof ApiError ? e.code : 'server';
      setError(code === 'not_garment' ? t.errNotGarment : code === 'network' ? t.errNetwork : code === 'quota' ? t.errQuota : t.errGeneric);
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    const slot = GARMENT_SLOTS[type] ?? 'top';
    const finalName = name.trim() || t.garment[type] || type;
    if (existing) {
      update(existing.id, { type, slot, name: finalName, color_hex: color.hex, color_name: color.name || finalName, warmth });
    } else if (photo) {
      const nid = newId();
      add({
        id: nid,
        slot,
        type,
        name: finalName,
        color_hex: color.hex,
        color_name: color.name || finalName,
        warmth,
        photoUri: saveJpeg('wardrobe', nid, photo.base64),
        ...(cutout ? { cutoutUri: savePng('wardrobe', nid, cutout) } : {}),
        createdAt: Date.now(),
      });
      track('wardrobe_add');
    }
    router.back();
  };

  const confirmDelete = () => {
    const go = () => {
      if (!existing) return;
      deleteLocal(existing.photoUri);
      if (existing.cutoutUri) deleteLocal(existing.cutoutUri);
      remove(existing.id);
      router.back();
    };
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(t.deletePieceConfirm)) go();
    } else {
      Alert.alert(t.deletePiece, t.deletePieceConfirm, [
        { text: t.cancel, style: 'cancel' },
        { text: t.delete, style: 'destructive', onPress: go },
      ]);
    }
  };

  const shownPhoto = cutout ?? photo?.uri ?? existing?.cutoutUri ?? existing?.photoUri;
  const isCut = !!(cutout || (!photo && existing?.cutoutUri));
  const ready = !!shownPhoto && !busy;

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Txt v="h2" accessibilityRole="header" style={{ flex: 1 }}>
          {existing ? existing.name : t.addPiece}
        </Txt>
        <IconButton icon="x" label="Close" onPress={() => router.back()} />
      </View>

      {!shownPhoto ? (
        <View style={{ gap: S.md, marginTop: S.xl }}>
          <Txt v="body" color={C.textDim}>
            {t.wardrobeHint}
          </Txt>
          {Platform.OS !== 'web' && <Button label={t.takePhoto} icon="camera" onPress={() => pick(true)} />}
          <Button label={t.fromLibrary} icon="image" kind="ghost" onPress={() => pick(false)} loading={busy} />
        </View>
      ) : (
        <View style={styles.photoWrap}>
          <Image source={{ uri: shownPhoto }} style={styles.photo} contentFit={isCut ? 'contain' : 'cover'} />
          {cutout && !busy && (
            <View style={styles.cutBadge}>
              <Feather name="scissors" size={12} color="#fff" />
              <Txt v="tiny" color="#fff">
                {t.cutoutReady}
              </Txt>
            </View>
          )}
          {busy && (
            <View style={styles.busy}>
              <ActivityIndicator color="#fff" />
              <Txt v="smallSemi" color="#fff">
                {t.analyzing}
              </Txt>
            </View>
          )}
        </View>
      )}

      {error && (
        <Txt v="small" color={C.danger} style={{ marginTop: S.lg }} accessibilityLiveRegion="polite">
          {error}
        </Txt>
      )}

      {ready && (
        <>
          {review && (
            <Txt v="small" color={C.textDim} style={{ marginTop: S.lg }}>
              {t.needsReview}
            </Txt>
          )}
          <Txt v="smallSemi" color={C.textDim} style={styles.label}>
            {t.pieceType}
          </Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {types.map((g) => (
              <Pressable
                key={g}
                accessibilityRole="radio"
                accessibilityState={{ selected: g === type }}
                onPress={() => setType(g)}
                style={[styles.typeChip, g === type && styles.typeOn]}>
                <Garment type={g} color={color.hex} size={40} />
                <Txt v="tiny" color={g === type ? C.text : C.textDim} numberOfLines={1}>
                  {t.garment[g]}
                </Txt>
              </Pressable>
            ))}
          </ScrollView>

          <Txt v="smallSemi" color={C.textDim} style={styles.label}>
            {t.pieceName}
          </Txt>
          <TextInput value={name} onChangeText={setName} maxLength={48} style={styles.input} placeholderTextColor={C.textFaint} />

          <Txt v="smallSemi" color={C.textDim} style={styles.label}>
            {t.pieceColor}: {color.name}
          </Txt>
          <View style={styles.colors}>
            {[...(detected ? [[detected.name, detected.hex] as [string, string]] : []), ...PRESETS.map(([k, hx]) => [t.colorNames[k], hx] as [string, string])].map(
              ([label, hx]) => (
                <Pressable
                  key={label + hx}
                  accessibilityRole="radio"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: color.hex === hx }}
                  onPress={() => setColor({ hex: hx, name: label })}
                  style={[styles.colorDot, { backgroundColor: hx }, color.hex === hx && styles.colorOn]}>
                  {detected && hx === detected.hex && <Feather name="zap" size={12} color="#fff" />}
                </Pressable>
              ),
            )}
          </View>

          <Txt v="smallSemi" color={C.textDim} style={styles.label}>
            {t.warmthLabel}
          </Txt>
          <Segmented<Warmth>
            options={(['light', 'medium', 'warm'] as const).map((k) => ({ key: k, label: t.warmth[k] }))}
            value={warmth}
            onChange={setWarmth}
          />

          <Button label={existing ? t.save : t.saveToWardrobe} onPress={save} style={{ marginTop: S.xl }} />
          {existing && (
            <View style={styles.anchorBox}>
              <Button
                label={t.outfitWithThis}
                icon="layers"
                kind="ghost"
                onPress={() => {
                  router.back();
                  router.navigate({ pathname: '/', params: { anchor: existing.id } });
                }}
              />
              <Txt v="tiny" color={C.textFaint} style={{ textAlign: 'center' }}>
                {t.outfitWithThisHint}
              </Txt>
            </View>
          )}
          {existing && <Button label={t.deletePiece} icon="trash-2" kind="ghost" onPress={confirmDelete} style={{ marginTop: S.md }} />}
        </>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((C) => StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: S.md, marginTop: S.sm },
  photoWrap: { marginTop: S.lg, borderRadius: R.board, overflow: 'hidden', backgroundColor: C.board },
  photo: { width: '100%', aspectRatio: 0.8 },
  busy: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#0008',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  cutBadge: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    backgroundColor: '#0009',
  },
  anchorBox: { marginTop: S.md, gap: 6 },
  label: { marginTop: S.xl, marginBottom: S.sm },
  typeChip: { width: 76, alignItems: 'center', gap: 4, paddingVertical: 8, borderRadius: 14, backgroundColor: C.surface, borderWidth: 2, borderColor: C.surface },
  typeOn: { borderColor: C.brandSoft },
  input: { height: 52, paddingHorizontal: 16, borderRadius: R.input, backgroundColor: C.surface, color: C.text, fontFamily: F.body, fontSize: 16 },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorDot: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#FFFFFF33', alignItems: 'center', justifyContent: 'center' },
  colorOn: { borderWidth: 3, borderColor: C.text },
}));
