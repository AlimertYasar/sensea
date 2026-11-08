import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import React, { useRef, useState } from 'react';
import { Modal, Platform, Share, StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { useT } from '@/lib/i18n';
import { track } from '@/lib/monitoring';
import { F, S, useColors } from '@/lib/theme';
import type { Entry, Outfit } from '@/lib/types';
import { MoodSwatch } from './MoodSwatch';
import { OutfitBoard } from './OutfitBoard';
import { Button, Txt } from './ui';

// 9:16 story card (Instagram/TikTok/WhatsApp status), drawn in the current theme.

const W = 360;
const H = 640;

type CardRef = React.RefObject<React.ComponentRef<typeof View> | null>;

function Card({ entry, outfit, photos, cardRef }: { entry: Entry; outfit: Outfit; photos: Record<string, string>; cardRef: CardRef }) {
    const t = useT();
    const C = useColors();
    return (
      <View ref={cardRef} collapsable={false} style={[styles.card, { backgroundColor: C.bg, borderWidth: 1, borderColor: C.line }]}>
        <MoodSwatch emotions={entry.rec.emotions} seed={entry.id} height={150} radius={22}>
          <LinearGradient colors={['#00000000', '#00000080']} style={styles.scrim} />
          <Txt v="hero" color="#FFFFFF" style={styles.emotion}>
            {t.emotion[entry.rec.dominant]}
          </Txt>
        </MoodSwatch>
        <Txt v="h2" color={C.text} style={{ marginTop: S.lg }} numberOfLines={1}>
          {outfit.title}
        </Txt>
        <Txt v="small" color={C.textDim} numberOfLines={1}>
          {outfit.vibe}
        </Txt>
        <View style={{ marginTop: S.md }}>
          <OutfitBoard outfit={outfit} photos={photos} />
        </View>
        <View style={styles.footer}>
          <Txt v="h3" color={C.text} style={{ fontFamily: F.display }}>
            sensea
          </Txt>
          <Txt v="tiny" color={C.textDim}>
            {t.shareTagline}
          </Txt>
        </View>
      </View>
    );
}

export function ShareSheet({
  visible,
  onClose,
  entry,
  outfit,
  photos,
}: {
  visible: boolean;
  onClose: () => void;
  entry: Entry;
  outfit: Outfit;
  photos: Record<string, string>;
}) {
  const t = useT();
  const ref = useRef<React.ComponentRef<typeof View>>(null);
  const [busy, setBusy] = useState(false);
  const canImage = Platform.OS !== 'web';
  const C = useColors();

  const shareImage = async () => {
    setBusy(true);
    try {
      const uri = await captureRef(ref, { format: 'png', quality: 1, width: 1080, height: 1920 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Sensea' });
      }
      track('share_card');
      onClose();
    } catch {
      // fall back to text below
      await shareText();
    } finally {
      setBusy(false);
    }
  };

  const shareText = () =>
    Share.share({
      message: `${t.shareText.replace('{title}', outfit.title).replace('{items}', outfit.items.map((i) => i.name).join(', '))}`,
    }).catch(() => {});

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: C.scheme === 'light' ? '#F7F3FAF5' : '#000000D9' }]}>
        <View style={{ transform: [{ scale: 0.82 }] }}>
          <Card cardRef={ref} entry={entry} outfit={outfit} photos={photos} />
        </View>
        <View style={styles.actions}>
          {canImage && <Button label={t.shareImage} icon="instagram" onPress={shareImage} loading={busy} />}
          <Button label={t.shareAsText} icon="message-circle" kind="ghost" onPress={shareText} />
          <Button label={t.cancel} kind="ghost" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: { width: W, height: H, padding: 24, borderRadius: 28, overflow: 'hidden' },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '70%' },
  emotion: { position: 'absolute', left: 18, bottom: 12, fontSize: 40, lineHeight: 44 },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 18, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  backdrop: { flex: 1, backgroundColor: '#000000D9', alignItems: 'center', justifyContent: 'center', padding: S.gutter },
  actions: { width: '100%', maxWidth: 360, gap: 8, marginTop: -40 },
});
