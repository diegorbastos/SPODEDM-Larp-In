import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors as c, spacing as s, radius as r } from '../theme/tokens';

export function AppText({ children, variant = 'body', muted, style, ...props }) {
  return <Text {...props} style={[styles.text, styles[variant], muted && styles.muted, style]}>{children}</Text>;
}
export function Icon({ name, size = 22, color = c.text }) {
  return <Ionicons name={name} size={size} color={color} />;
}
export function Button({ title, onPress, secondary, danger, disabled, icon, style, ...props }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }}
    {...props} onPress={onPress} disabled={disabled}
    style={({ pressed }) => [styles.button, secondary && styles.secondary, danger && styles.dangerButton,
      pressed && styles.pressed, disabled && styles.disabled, style]}>
    {icon && <Icon name={icon} size={19} color={secondary ? c.text : c.onPrimary} />}
    <AppText variant="label" style={{ color: danger ? c.danger : secondary ? c.text : c.onPrimary }}>{title}</AppText>
  </Pressable>;
}
export function Card({ children, style }) { return <View style={[styles.card, style]}>{children}</View>; }
export function Screen({ children, scroll = true, style }) {
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {scroll ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, style]}>{children}</ScrollView>
        : <View style={[styles.content, styles.flex, style]}>{children}</View>}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
export function Header({ title, subtitle, back, trailing }) {
  return <View style={styles.header}>
    {back && <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={back} style={styles.iconButton}><Icon name="arrow-back" /></Pressable>}
    <View style={styles.flex}><AppText variant="title">{title}</AppText>{subtitle && <AppText variant="caption" muted>{subtitle}</AppText>}</View>
    {trailing}
  </View>;
}
export function Field({ label, ...props }) {
  return <View style={styles.field}><AppText variant="label">{label}</AppText>
    <TextInput accessibilityLabel={label} placeholderTextColor={c.muted} selectionColor={c.primary} style={styles.input} {...props} /></View>;
}
export function Message({ children, error = false }) {
  if (!children) return null;
  return <AppText accessibilityLiveRegion="polite" style={[styles.message, error && { color: c.danger }]}>{children}</AppText>;
}
export function NetworkIcon({ id, large = false }) {
  const name = { instagram: 'logo-instagram', youtube: 'logo-youtube', tiktok: 'logo-tiktok' }[id];
  return <View style={[styles.networkIcon, large && styles.networkLarge, { backgroundColor: c[id] }]}>
    <Icon name={name} size={large ? 58 : 24} color={c.background} />
  </View>;
}
export function ProgressBar({ value, label }) {
  return <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.min(1, value) * 100) }} style={styles.track}>
    <View style={[styles.fill, { width: `${Math.max(0, Math.min(1, value)) * 100}%` }]} />
  </View>;
}
export const layout = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: s.md },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: s.sm },
  flex: { flex: 1 }, gap: { gap: s.md }, centered: { alignItems: 'center', gap: s.md },
  section: { marginTop: s.md, marginBottom: s.xs },
});
const styles = StyleSheet.create({
  text: { color: c.text, fontSize: 15, lineHeight: 23, flexShrink: 1 },
  body: {}, title: { fontSize: 26, lineHeight: 34, fontWeight: '700', letterSpacing: -0.7 },
  hero: { fontSize: 44, lineHeight: 49, fontWeight: '700', letterSpacing: -1.8 },
  metric: { fontSize: 64, lineHeight: 72, fontWeight: '600', letterSpacing: -3 },
  heading: { fontSize: 19, lineHeight: 26, fontWeight: '600', letterSpacing: -0.3 },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 18 },
  eyebrow: { fontSize: 11, lineHeight: 17, letterSpacing: 2, fontWeight: '600' },
  muted: { color: c.muted },
  screen: { flex: 1, backgroundColor: c.background }, flex: { flex: 1 },
  content: { padding: s.lg, paddingBottom: s.xxl, gap: s.lg, width: '100%', maxWidth: 680, alignSelf: 'center' },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: r.md, padding: s.lg, gap: s.md },
  button: { minHeight: 52, borderRadius: r.pill, backgroundColor: c.primary, paddingHorizontal: s.lg, paddingVertical: s.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: s.sm },
  secondary: { backgroundColor: c.raised, borderWidth: 1, borderColor: c.border },
  dangerButton: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.danger },
  pressed: { opacity: 0.7 }, disabled: { opacity: 0.45 },
  header: { flexDirection: 'row', alignItems: 'center', gap: s.sm },
  iconButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  field: { gap: s.sm },
  input: { color: c.text, backgroundColor: c.raised, borderWidth: 1, borderColor: c.border, borderRadius: r.sm, padding: s.md, fontSize: 16, minHeight: 54 },
  message: { color: c.primary, fontSize: 14 },
  networkIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  networkLarge: { width: 108, height: 108, borderRadius: 32 },
  track: { height: 6, borderRadius: r.pill, backgroundColor: c.track, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: c.primary, borderRadius: r.pill },
});
