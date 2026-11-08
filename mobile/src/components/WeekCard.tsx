import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EMOTION_COLOR } from '@/lib/catalog';
import { fmt, useLocale, useT } from '@/lib/i18n';
import { summarizeWeek } from '@/lib/insights';
import { track } from '@/lib/monitoring';
import { FAMILY_SWATCH } from '@/lib/prefs';
import { R, S, makeStyles, useColors } from '@/lib/theme';
import type { Entry } from '@/lib/types';
import { Segmented, Txt } from './ui';

const DAY = 86400000;

/** Weekly mood summary: emotion mix as one stacked bar, a trend line vs. the week before, colours worn. */
export function WeekCard({ entries }: { entries: Entry[] }) {
  const C = useColors();
  const styles = useStyles();
  const t = useT();
  const locale = useLocale();
  const [which, setWhich] = useState<'0' | '1'>('0');
  const off = Number(which);
  const week = useMemo(() => summarizeWeek(entries, off), [entries, off]);
  const prev = useMemo(() => summarizeWeek(entries, off + 1), [entries, off]);

  useEffect(() => {
    track('weekly_view');
  }, []);

  const range = useMemo(() => {
    const f = (ts: number) => new Date(ts).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-GB', { day: 'numeric', month: 'short' });
    return `${f(week.start)} – ${f(week.end - DAY)}`;
  }, [week.start, week.end, locale]);

  const delta = prev.readings && week.readings ? Math.round((week.positive - prev.positive) * 100) : null;
  const trend =
    delta === null ? null : Math.abs(delta) < 5 ? t.weekSame : delta > 0 ? fmt(t.weekUp, { n: delta }) : fmt(t.weekDown, { n: -delta });

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Txt v="h3">{t.weekTitle}</Txt>
          <Txt v="tiny" color={C.textFaint}>
            {range}
          </Txt>
        </View>
      </View>
      <Segmented
        options={[
          { key: '0', label: t.thisWeek },
          { key: '1', label: t.lastWeek },
        ]}
        value={which}
        onChange={setWhich}
      />

      {week.readings === 0 ? (
        <Txt v="small" color={C.textDim} style={{ marginTop: S.lg }}>
          {t.weekEmpty}
        </Txt>
      ) : (
        <>
          <View style={styles.bar} accessibilityLabel={week.mix.map((m) => `${t.emotion[m.key]} ${Math.round(m.share * 100)}%`).join(', ')}>
            {week.mix.map((m) => (
              <View key={m.key} style={{ flex: m.share, backgroundColor: EMOTION_COLOR[m.key] }} />
            ))}
          </View>
          <View style={styles.legend}>
            {week.mix.slice(0, 4).map((m) => (
              <View key={m.key} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: EMOTION_COLOR[m.key] }]} />
                <Txt v="tiny" color={C.textDim}>
                  {t.emotion[m.key]} {locale === 'tr' ? `%${Math.round(m.share * 100)}` : `${Math.round(m.share * 100)}%`}
                </Txt>
              </View>
            ))}
          </View>

          {week.top && (
            <Txt v="bodySemi" style={{ marginTop: S.lg }}>
              {fmt(t.weekTop, { e: t.emotion[week.top] })}
            </Txt>
          )}
          <Txt v="small" color={C.textDim} style={{ marginTop: 4 }}>
            {fmt(t.weekReadings, { n: week.readings, d: week.days })}
            {week.worn ? ` · ${fmt(t.weekWorn, { n: week.worn })}` : ''}
          </Txt>
          {trend && (
            <View style={styles.trend}>
              <Feather name={delta! >= 5 ? 'trending-up' : delta! <= -5 ? 'trending-down' : 'minus'} size={16} color={C.textDim} />
              <Txt v="small" color={C.textDim} style={{ flex: 1 }}>
                {trend}
              </Txt>
            </View>
          )}

          {week.colors.length > 0 && (
            <>
              <Txt v="smallSemi" color={C.textDim} style={{ marginTop: S.lg, marginBottom: S.sm }}>
                {t.weekColors}
              </Txt>
              <View style={styles.colors}>
                {week.colors.map((f) => (
                  <View key={f} style={styles.colorItem}>
                    <View style={[styles.swatch, { backgroundColor: FAMILY_SWATCH[f] }]} />
                    <Txt v="tiny" color={C.textDim}>
                      {t.colorNames[f]}
                    </Txt>
                  </View>
                ))}
              </View>
            </>
          )}
        </>
      )}
    </View>
  );
}

const useStyles = makeStyles((C) =>
  StyleSheet.create({
    card: { marginTop: S.xl, padding: S.lg, gap: S.md, borderRadius: R.card, backgroundColor: C.surface },
    head: { flexDirection: 'row', alignItems: 'center' },
    bar: { flexDirection: 'row', height: 16, borderRadius: 8, overflow: 'hidden', marginTop: S.sm, gap: 2 },
    legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: S.md, rowGap: 6 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    trend: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: S.sm },
    colors: { flexDirection: 'row', gap: S.md },
    colorItem: { alignItems: 'center', gap: 6, width: 64 },
    swatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: C.line },
  }),
);
