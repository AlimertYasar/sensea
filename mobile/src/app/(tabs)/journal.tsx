import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Garment } from '@/components/garments';
import { MoodSwatch } from '@/components/MoodSwatch';
import { WeekCard } from '@/components/WeekCard';
import { Screen, Segmented, Txt } from '@/components/ui';
import { EMOTION_COLOR } from '@/lib/catalog';
import { useLocale, useT } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { R, S, makeStyles, useColors } from '@/lib/theme';
import type { Entry } from '@/lib/types';

const DAY = 86400000;
const dayKey = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

export default function Journal() {
  const C = useColors();
  const styles = useStyles();
  const t = useT();
  const locale = useLocale();
  const entries = useStore((s) => s.entries);
  const [filter, setFilter] = useState<'all' | 'fav'>('all');

  // 5-week calendar, Monday-first, ending with the current week
  const weeks = useMemo(() => {
    const byDay = new Map<string, Entry>();
    for (const e of entries) if (!byDay.has(dayKey(e.createdAt))) byDay.set(dayKey(e.createdAt), e); // newest wins
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const mondayOffset = (now.getDay() + 6) % 7;
    const start = now.getTime() - (mondayOffset + 28) * DAY;
    return Array.from({ length: 5 }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => {
        const ts = start + (w * 7 + d) * DAY;
        return { ts, entry: byDay.get(dayKey(ts)), future: ts > now.getTime() };
      }),
    );
  }, [entries]);

  const weekdayNames = useMemo(() => {
    const base = new Date(2024, 0, 1); // a Monday
    return Array.from({ length: 7 }, (_, i) =>
      new Date(base.getTime() + i * DAY).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-GB', { weekday: 'narrow' }),
    );
  }, [locale]);

  const list = filter === 'fav' ? entries.filter((e) => e.favorite !== null) : entries;
  const fmtDate = (ts: number) =>
    new Date(ts).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <Screen>
      <Txt v="h1" style={{ marginTop: S.xl }} accessibilityRole="header">
        {t.journalTitle}
      </Txt>
      <Txt v="small" color={C.textDim} style={{ marginTop: 6 }}>
        {t.journalHint}
      </Txt>

      {entries.length > 0 && <WeekCard entries={entries} />}

      <View style={styles.calendar}>
        <View style={styles.week}>
          {weekdayNames.map((n, i) => (
            <Txt key={i} v="tiny" color={C.textFaint} style={styles.wd}>
              {n}
            </Txt>
          ))}
        </View>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.week}>
            {week.map(({ ts, entry, future }) => (
              <Pressable
                key={ts}
                disabled={!entry}
                onPress={() => entry && router.push({ pathname: '/result/[id]', params: { id: entry.id } })}
                accessibilityLabel={entry ? `${new Date(ts).toLocaleDateString()} ${t.emotion[entry.rec.dominant]}` : undefined}
                style={[
                  styles.cell,
                  entry ? { backgroundColor: EMOTION_COLOR[entry.rec.dominant] } : future ? styles.cellFuture : styles.cellEmpty,
                ]}
              />
            ))}
          </View>
        ))}
      </View>

      <View style={{ marginTop: S.xl }}>
        <Segmented
          options={[
            { key: 'all', label: t.all },
            { key: 'fav', label: t.favorites },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </View>

      {list.length === 0 ? (
        <View style={styles.empty}>
          <Feather name={filter === 'fav' ? 'heart' : 'feather'} size={22} color={C.textFaint} />
          <Txt v="body" color={C.textDim} style={{ textAlign: 'center' }}>
            {filter === 'fav' ? t.favEmpty : t.journalEmpty}
          </Txt>
        </View>
      ) : (
        <View style={{ marginTop: S.lg, gap: S.md }}>
          {list.map((e) => {
            const o = e.rec.outfits[e.favorite ?? 0] ?? e.rec.outfits[0];
            const hero = o.items.find((i) => i.slot === 'top' || i.slot === 'one_piece') ?? o.items[0];
            return (
              <Pressable
                key={e.id}
                onPress={() => router.push({ pathname: '/result/[id]', params: { id: e.id } })}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}>
                <MoodSwatch emotions={e.rec.emotions} seed={e.id} height={72} radius={16} style={{ width: 56 }} />
                <View style={{ flex: 1 }}>
                  <Txt v="tiny" color={C.textFaint}>
                    {fmtDate(e.createdAt)}
                  </Txt>
                  <Txt v="bodySemi" numberOfLines={1}>
                    {t.emotion[e.rec.dominant]}, {o.title}
                  </Txt>
                  <Txt v="small" color={C.textDim} numberOfLines={1}>
                    “{e.text}”
                  </Txt>
                </View>
                <View style={styles.thumb}>
                  <Garment type={hero.type} color={hero.color_hex} size={48} />
                </View>
                {e.favorite !== null && <Feather name="heart" size={14} color="#FF7A9A" style={styles.heart} />}
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((C) => StyleSheet.create({
  calendar: { marginTop: S.xl, gap: 8, padding: S.lg, borderRadius: R.card, backgroundColor: C.surface },
  week: { flexDirection: 'row', gap: 8 },
  wd: { flex: 1, textAlign: 'center' },
  cell: { flex: 1, aspectRatio: 1, borderRadius: 10 },
  cellEmpty: { backgroundColor: C.surfaceHigh },
  cellFuture: { borderWidth: 1, borderColor: C.line, borderStyle: 'dashed' },
  empty: { alignItems: 'center', gap: S.md, paddingVertical: 48, paddingHorizontal: S.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: 10, borderRadius: R.card, backgroundColor: C.surface },
  thumb: { width: 60, height: 60, borderRadius: 14, backgroundColor: C.board, alignItems: 'center', justifyContent: 'center' },
  heart: { position: 'absolute', top: 10, right: 10 },
}));
