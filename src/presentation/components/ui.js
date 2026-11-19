import React, { memo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors as c, spacing as s, radius as r } from '../theme/tokens';

export const AppText = memo(function AppText({ children, variant = 'body', muted, style, ...props }) {
  return <Text {...props} style={[styles.text, styles[variant], muted && styles.muted, style]}>{children}</Text>;
});

export const Icon = memo(function Icon({ name, size = 22, color = c.text }) {
  return <Ionicons name={name} size={size} color={color} />;
});

export function Button({ title, onPress, secondary, danger, disabled, loading = false, icon, style, ...props }) {
  const scale = useRef(new Animated.Value(1)).current;
  const isDisabled = Boolean(disabled || loading);

  function pressIn() {
    if (isDisabled) return;
    Animated.spring(scale, { toValue: 0.97, speed: 40, bounciness: 4, useNativeDriver: true }).start();
  }
  function pressOut() {
    Animated.spring(scale, { toValue: 1, speed: 30, bounciness: 6, useNativeDriver: true }).start();
  }

  const labelColor = danger ? c.danger : secondary ? c.text : c.onPrimary;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        {...props}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.button,
          secondary && styles.secondary,
          danger && styles.dangerButton,
          pressed && !isDisabled && styles.pressed,
          isDisabled && styles.disabled,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={labelColor} />
        ) : (
          icon && <Icon name={icon} size={19} color={labelColor} />
        )}
        <AppText variant="label" style={{ color: labelColor }}>{title}</AppText>
      </Pressable>
    </Animated.View>
  );
}

export function PermissionToggleButton({
  title,
  subtitle,
  active = false,
  activeLabel = 'Aceso',
  inactiveLabel = 'Apagado',
  icon = 'shield-checkmark-outline',
  onPress,
  disabled = false,
  style,
}) {
  const scale = useRef(new Animated.Value(1)).current;

  function pressIn() {
    if (disabled) return;
    Animated.spring(scale, { toValue: 0.98, speed: 45, bounciness: 3, useNativeDriver: true }).start();
  }
  function pressOut() {
    Animated.spring(scale, { toValue: 1, speed: 32, bounciness: 5, useNativeDriver: true }).start();
  }

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: !!active, disabled: !!disabled }}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={disabled}
        style={({ pressed }) => [
          styles.permButton,
          active ? styles.permButtonLit : styles.permButtonDim,
          pressed && !disabled && styles.pressed,
          disabled && styles.permDisabled,
        ]}
      >
        <View style={[styles.permIconBox, active ? styles.permIconLit : styles.permIconDim]}>
          <Icon name={icon} size={20} color={active ? c.primary : '#646C67'} />
        </View>
        <View style={styles.flex}>
          <AppText variant="label" style={active ? styles.permTitleLit : styles.permTitleDim}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" style={active ? styles.permSubLit : styles.permSubDim}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        <View style={[styles.permBadge, active ? styles.permBadgeLit : styles.permBadgeDim]}>
          <View style={[styles.permDot, active ? styles.permDotLit : styles.permDotDim]} />
          <AppText variant="caption" style={active ? styles.permBadgeTextLit : styles.permBadgeTextDim}>
            {active ? activeLabel : inactiveLabel}
          </AppText>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function Card({ children, style }) { return <View style={[styles.card, style]}>{children}</View>; }

export function Screen({ children, scroll = true, style }) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.content, style]}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, styles.flex, style]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Header({ title, subtitle, back, trailing }) {
  return (
    <View style={styles.header}>
      {back && (
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={back} style={styles.iconButton}>
          <Icon name="arrow-back" />
        </Pressable>
      )}
      <View style={styles.flex}>
        <AppText variant="title">{title}</AppText>
        {subtitle && <AppText variant="caption" muted>{subtitle}</AppText>}
      </View>
      {trailing}
    </View>
  );
}

export function Field({ label, ...props }) {
  return (
    <View style={styles.field}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.muted}
        selectionColor={c.primary}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

export function Message({ children, error = false }) {
  if (!children) return null;
  return <AppText accessibilityLiveRegion="polite" style={[styles.message, error && { color: c.danger }]}>{children}</AppText>;
}

export const NetworkIcon = memo(function NetworkIcon({ id, large = false }) {
  const name = { instagram: 'logo-instagram', youtube: 'logo-youtube', tiktok: 'logo-tiktok' }[id] || 'apps-outline';
  return (
    <View style={[styles.networkIcon, large && styles.networkLarge, { backgroundColor: c[id] || c.raised }]}>
      <Icon name={name} size={large ? 58 : 24} color={c.background} />
    </View>
  );
});

export function ProgressBar({ value, label }) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={styles.track}
    >
      <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
    </View>
  );
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
  button: {
    minHeight: 52,
    borderRadius: r.pill,
    backgroundColor: c.primary,
    paddingHorizontal: s.lg,
    paddingVertical: s.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: s.sm,
  },
  secondary: { backgroundColor: c.raised, borderWidth: 1, borderColor: c.border },
  dangerButton: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.danger },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.45 },

  permButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: r.md,
    borderWidth: 1,
  },
  permButtonLit: {
    backgroundColor: '#162611',
    borderColor: c.primary,
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 3,
  },
  permButtonDim: {
    backgroundColor: '#0E1010',
    borderColor: '#222624',
  },
  permDisabled: {
    opacity: 0.55,
  },
  permIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permIconLit: {
    backgroundColor: '#233A1B',
  },
  permIconDim: {
    backgroundColor: '#171A1A',
  },
  permTitleLit: {
    color: c.text,
  },
  permTitleDim: {
    color: '#8D9590',
  },
  permSubLit: {
    color: '#B6C9AA',
  },
  permSubDim: {
    color: '#676F6A',
  },
  permBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: r.pill,
    borderWidth: 1,
  },
  permBadgeLit: {
    backgroundColor: '#213519',
    borderColor: '#4D7336',
  },
  permBadgeDim: {
    backgroundColor: '#161918',
    borderColor: '#282D2A',
  },
  permDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  permDotLit: {
    backgroundColor: c.primary,
  },
  permDotDim: {
    backgroundColor: '#505753',
  },
  permBadgeTextLit: {
    color: c.primary,
    fontWeight: '700',
    fontSize: 11,
  },
  permBadgeTextDim: {
    color: '#737B76',
    fontWeight: '600',
    fontSize: 11,
  },

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
