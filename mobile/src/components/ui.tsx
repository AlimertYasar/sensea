import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { R, S, T, makeStyles, useColors } from '@/lib/theme';

export function tap() {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
}

type Variant = keyof typeof T;
export function Txt({
  v = 'body',
  color,
  style,
  ...rest
}: TextProps & { v?: Variant; color?: string; style?: StyleProp<TextStyle> }) {
  const C = useColors();
  return <Text {...rest} style={[T[v], { color: color ?? C.text }, style]} />;
}

export function Screen({
  children,
  scroll = true,
  contentStyle,
  edges = ['top'],
  footer,
  overlay,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom')[];
  /** Pinned under the scroll area and lifted above the keyboard (e.g. the main call to action). */
  footer?: React.ReactNode;
  /** Rendered above everything (e.g. a loading state). */
  overlay?: React.ReactNode;
}) {
  const C = useColors();
  const styles = useStyles();
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.content, footer ? { paddingBottom: 24 } : null, contentStyle]}
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, { flex: 1 }, contentStyle]}>{children}</View>
        )}
        {footer && <View style={styles.footer}>{footer}</View>}
      </KeyboardAvoidingView>
      {overlay}
    </SafeAreaView>
  );
}

export function Button({
  label,
  onPress,
  loading,
  disabled,
  kind = 'primary',
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  kind?: 'primary' | 'ghost';
  icon?: keyof typeof Feather.glyphMap;
  style?: StyleProp<ViewStyle>;
}) {
  const C = useColors();
  const styles = useStyles();
  const primary = kind === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.btn,
        primary ? styles.btnPrimary : styles.btnGhost,
        (disabled || loading) && { opacity: 0.6 },
        pressed && { transform: [{ scale: 0.98 }] },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={primary ? '#fff' : C.text} />
      ) : icon ? (
        <Feather name={icon} size={18} color={primary ? '#fff' : C.text} />
      ) : null}
      <Txt v="bodySemi" color={primary ? '#FFFFFF' : C.text}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  dot,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  dot?: string;
}) {
  const C = useColors();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipOn,
        pressed && { opacity: 0.8 },
      ]}>
      {dot && <View style={[styles.dot, { backgroundColor: dot }]} />}
      <Txt v="smallSemi" color={selected ? C.text : C.textDim}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function Segmented<K extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
}) {
  const C = useColors();
  const styles = useStyles();
  return (
    <View style={styles.seg} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              tap();
              onChange(o.key);
            }}
            style={[styles.segItem, on && styles.segOn]}>
            <Txt v="smallSemi" color={on ? C.text : C.textDim} numberOfLines={1}>
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  color,
}: {
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  label: string;
  color?: string;
}) {
  const C = useColors();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}>
      <Feather name={icon} size={20} color={color ?? C.text} />
    </Pressable>
  );
}

const useStyles = makeStyles((C) => StyleSheet.create({
  footer: {
    paddingHorizontal: S.gutter,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: C.line,
    backgroundColor: C.bg,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  content: { paddingHorizontal: S.gutter, paddingBottom: 48, width: '100%', maxWidth: 640, alignSelf: 'center' },
  btn: {
    minHeight: 56,
    borderRadius: R.chip,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  btnPrimary: { backgroundColor: C.brand },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.line },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    minHeight: 38,
    borderRadius: R.chip,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.surface,
  },
  chipOn: { borderColor: C.brandSoft, backgroundColor: C.surfaceHigh },
  dot: { width: 10, height: 10, borderRadius: 5 },
  seg: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: R.chip, padding: 4 },
  segItem: { flex: 1, minHeight: 40, borderRadius: R.chip, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  segOn: { backgroundColor: C.surfaceHigh },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
  },
}));
