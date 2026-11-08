import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { STYLE_PREVIEW, STYLES } from '@/lib/catalog';
import { useT } from '@/lib/i18n';
import { makeStyles, R, useColors } from '@/lib/theme';
import type { Style } from '@/lib/types';
import { Garment } from './garments';
import { tap, Txt } from './ui';

export const MAX_STYLES = 3;

/** Pick 1–3 styles. The first one picked leads the blend. */
export function StylePicker({ value, onChange }: { value: Style[]; onChange: (s: Style[]) => void }) {
  const C = useColors();
  const styles = useStyles();
  const t = useT();

  const toggle = (s: Style) => {
    tap();
    if (value.includes(s)) {
      if (value.length > 1) onChange(value.filter((x) => x !== s));
    } else if (value.length < MAX_STYLES) {
      onChange([...value, s]);
    } else {
      onChange([...value.slice(1), s]); // full: drop the oldest pick
    }
  };

  return (
    <View style={styles.grid}>
      {STYLES.map((s) => {
        const order = value.indexOf(s);
        const on = order >= 0;
        const p = STYLE_PREVIEW[s];
        return (
          <Pressable
            key={s}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            onPress={() => toggle(s)}
            style={({ pressed }) => [styles.card, on && styles.cardOn, pressed && { opacity: 0.85 }]}>
            <View style={styles.preview}>
              {p.garments.map((g, i) => (
                <View key={g} style={{ marginLeft: i ? -10 : 0, transform: [{ rotate: `${(i - 1) * 6}deg` }] }}>
                  <Garment type={g} color={p.colors[i]} size={i === 2 ? 34 : 44} />
                </View>
              ))}
            </View>
            {on && (
              <View style={styles.check}>
                {order === 0 ? <Feather name="star" size={12} color="#FFFFFF" /> : <Feather name="check" size={13} color="#FFFFFF" />}
              </View>
            )}
            <Txt v="h3" style={{ marginTop: 10 }}>
              {t.style[s]}
            </Txt>
            <Txt v="tiny" color={C.textDim}>
              {order === 0 && value.length > 1 ? t.styleLead : t.styleDesc[s]}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((C) =>
  StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    card: {
      flexBasis: '47%',
      flexGrow: 1,
      padding: 12,
      borderRadius: R.card,
      backgroundColor: C.surface,
      borderWidth: 2,
      borderColor: C.surface,
    },
    cardOn: { borderColor: C.brandSoft },
    preview: {
      height: 64,
      borderRadius: 14,
      backgroundColor: C.board,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    check: {
      position: 'absolute',
      top: 18,
      right: 18,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: C.brand,
      alignItems: 'center',
      justifyContent: 'center',
    },
  }),
);
