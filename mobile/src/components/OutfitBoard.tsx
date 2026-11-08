import { Image } from 'expo-image';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { R, makeStyles, useColors } from '@/lib/theme';
import type { Outfit, OutfitItem } from '@/lib/types';
import { Garment } from './garments';

// Flat-lay composition: pieces arranged on a chalk board the way you'd lay
// clothes out on a bed, with a little rotation so it doesn't feel like a grid.

type Spot = { left: number; top: number; size: number; rot: number };

function layout(items: OutfitItem[]): { item: OutfitItem; spot: Spot }[] {
  const by = (s: string) => items.filter((i) => i.slot === s);
  const [onePiece] = by('one_piece');
  const [top] = by('top');
  const [bottom] = by('bottom');
  const [outer] = by('outer');
  const [shoes] = by('shoes');
  const acc = by('accessory');
  const out: { item: OutfitItem; spot: Spot }[] = [];

  if (onePiece) out.push({ item: onePiece, spot: { left: 0.05, top: 0.05, size: 0.56, rot: -2 } });
  if (top) out.push({ item: top, spot: { left: 0.04, top: 0.03, size: 0.48, rot: -3 } });
  if (outer) out.push({ item: outer, spot: { left: 0.5, top: 0.02, size: 0.46, rot: 5 } });
  if (bottom) out.push({ item: bottom, spot: { left: 0.07, top: 0.5, size: 0.48, rot: 2 } });
  // top is a fraction of board height (1.08 x width), size a fraction of width
  if (shoes) out.push({ item: shoes, spot: outer ? { left: 0.56, top: 0.48, size: 0.32, rot: -6 } : { left: 0.56, top: 0.46, size: 0.36, rot: -6 } });
  const accSpots: Spot[] = outer
    ? [
        { left: 0.56, top: 0.79, size: 0.2, rot: 8 },
        { left: 0.78, top: 0.8, size: 0.19, rot: -10 },
      ]
    : [
        { left: 0.62, top: 0.08, size: 0.3, rot: 8 },
        { left: 0.68, top: 0.81, size: 0.18, rot: -8 },
      ];
  acc.slice(0, 2).forEach((a, i) => out.push({ item: a, spot: accSpots[i] }));
  return out;
}

export function OutfitBoard({
  outfit,
  photos = {},
  cutouts = {},
}: {
  outfit: Outfit;
  photos?: Record<string, string>;
  cutouts?: Record<string, string>;
}) {
  const styles = useStyles();
  const [w, setW] = useState(0);
  const h = w * 1.08;
  return (
    <View style={[styles.board, { height: h || 340 }]} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 &&
        layout(outfit.items).map(({ item, spot }) => (
          <View
            key={`${item.slot}-${item.type}-${item.color_hex}`}
            style={{
              position: 'absolute',
              left: spot.left * w,
              top: spot.top * h,
              transform: [{ rotate: `${spot.rot}deg` }],
            }}>
            {item.wardrobe_id && cutouts[item.wardrobe_id] ? (
              // background-removed piece: lies on the board like the illustrated garments
              <Image
                source={{ uri: cutouts[item.wardrobe_id] }}
                style={[styles.cutout, { width: spot.size * w, height: spot.size * w }]}
                contentFit="contain"
              />
            ) : item.wardrobe_id && photos[item.wardrobe_id] ? (
              <View style={[styles.polaroid, { width: spot.size * w * 0.9 }]}>
                <Image source={{ uri: photos[item.wardrobe_id] }} style={styles.photo} contentFit="cover" />
              </View>
            ) : (
              <Garment type={item.type} color={item.color_hex} size={spot.size * w} />
            )}
          </View>
        ))}
    </View>
  );
}

const useStyles = makeStyles((C) => StyleSheet.create({
  polaroid: {
    padding: 4,
    paddingBottom: 10,
    borderRadius: 10,
    backgroundColor: C.paper,
    shadowColor: '#2A1B38',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  photo: { width: '100%', aspectRatio: 0.85, borderRadius: 7 },
  cutout: { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  board: {
    backgroundColor: C.board,
    borderRadius: R.board,
    overflow: 'hidden',
  },
}));
