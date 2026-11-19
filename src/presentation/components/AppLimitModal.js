import React, { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { AppText, Button, Card, Icon, NetworkIcon, layout } from './ui';
import { colors as c, spacing as s, radius as r } from '../theme/tokens';

const PRESETS = [15, 30, 45, 60, 90, 120];

export default function AppLimitModal({
  visible,
  network,
  currentUsage = 0,
  allowManualUsage = false,
  onClose,
  onSave,
  onRecordUsage,
  onOpenDetails,
  busy,
}) {
  const [limit, setLimit] = useState(30);
  const [intention, setIntention] = useState('');
  const [manualMinutes, setManualMinutes] = useState('');
  const [localError, setLocalError] = useState('');

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(48)).current;

  // Sincroniza estado interno sempre que o modal abrir ou trocar de rede.
  useEffect(() => {
    if (visible && network) {
      setLimit(network.limit || 30);
      setIntention(network.intention || '');
      setManualMinutes(currentUsage > 0 ? String(currentUsage) : '');
      setLocalError('');

      backdropOpacity.setValue(0);
      sheetTranslateY.setValue(44);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          speed: 22,
          bounciness: 4,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, network?.id, network?.limit, network?.intention, currentUsage, backdropOpacity, sheetTranslateY]);

  if (!network) return null;

  function adjustMinutes(delta) {
    setLocalError('');
    setLimit(prev => Math.max(5, Math.min(720, prev + delta)));
  }

  async function handleSave() {
    setLocalError('');
    const trimmedIntention = intention.trim() || network.intention || 'Usar com intenção';
    const ok = await onSave(network.id, limit, trimmedIntention);
    if (!ok) {
      setLocalError('Não foi possível salvar a meta. Tente novamente.');
      return;
    }
    if (allowManualUsage && onRecordUsage && manualMinutes.trim() !== '') {
      const parsed = Number(manualMinutes.trim());
      if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 1440 && parsed !== currentUsage) {
        await onRecordUsage(network.id, manualMinutes.trim());
      }
    }
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'android' ? 'height' : 'padding'}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View style={{ transform: [{ translateY: sheetTranslateY }], maxHeight: '90%' }}>
          <Card style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
            <View style={layout.between}>
              <View style={styles.appHeader}>
                <NetworkIcon id={network.id} />
                <View>
                  <AppText variant="heading">{network.name}</AppText>
                  <AppText variant="caption" muted>Definir limite consciente</AppText>
                </View>
              </View>
              <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Fechar">
                <Icon name="close" size={20} color={c.muted} />
              </Pressable>
            </View>

            <View style={styles.metricCard}>
              <AppText variant="eyebrow" muted>META DIÁRIA</AppText>
              <View style={styles.metricRow}>
                <AppText variant="metric" style={styles.metricValue}>{limit}</AppText>
                <AppText variant="heading" muted style={styles.metricUnit}>minutos / dia</AppText>
              </View>

              <View style={styles.stepperRow}>
                {[-15, -5, 5, 15].map(delta => (
                  <Pressable
                    key={delta}
                    onPress={() => adjustMinutes(delta)}
                    style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}
                  >
                    <AppText variant="label" style={styles.stepText}>
                      {delta > 0 ? `+${delta}m` : `${delta}m`}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.presetRow}>
              {PRESETS.map(mins => (
                <Pressable
                  key={mins}
                  onPress={() => { setLocalError(''); setLimit(mins); }}
                  style={({ pressed }) => [
                    styles.presetPill,
                    limit === mins && styles.presetPillActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <AppText variant="caption" style={[styles.presetText, limit === mins && styles.presetTextActive]}>
                    {mins}m
                  </AppText>
                </Pressable>
              ))}
            </View>

            <View style={styles.inputGroup}>
              <AppText variant="caption" muted>INTENÇÃO</AppText>
              <TextInput
                value={intention}
                onChangeText={setIntention}
                maxLength={100}
                placeholder="Para que você quer usar este app?"
                placeholderTextColor={c.muted}
                selectionColor={c.primary}
                style={styles.input}
              />
            </View>

            {allowManualUsage && (
              <View style={styles.inputGroup}>
                <AppText variant="caption" muted>USO DE HOJE (MODO MANUAL · MINUTOS)</AppText>
                <TextInput
                  value={manualMinutes}
                  onChangeText={text => setManualMinutes(text.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder="Ex.: 20"
                  placeholderTextColor={c.muted}
                  selectionColor={c.primary}
                  style={styles.input}
                />
              </View>
            )}

            {localError ? <AppText variant="caption" style={styles.errorText}>{localError}</AppText> : null}

            <View style={styles.footer}>
              <Button title="Salvar Meta" onPress={handleSave} loading={busy} />
              {onOpenDetails && (
                <Button
                  secondary
                  title="Mais detalhes e histórico"
                  onPress={() => {
                    onClose();
                    onOpenDetails(network.id);
                  }}
                />
              )}
            </View>
            </ScrollView>
          </Card>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  sheet: {
    backgroundColor: '#101410',
    borderColor: '#243120',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: s.lg,
    paddingBottom: s.xl,
  },
  sheetContent: {
    gap: s.md,
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricCard: {
    backgroundColor: '#161C14',
    borderRadius: r.md,
    borderWidth: 1,
    borderColor: '#283623',
    padding: s.md,
    alignItems: 'center',
    gap: 8,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  metricValue: {
    fontSize: 52,
    lineHeight: 58,
    color: c.text,
    fontWeight: '700',
  },
  metricUnit: {
    fontSize: 16,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    paddingTop: 4,
  },
  stepBtn: {
    flex: 1,
    backgroundColor: '#20291D',
    paddingVertical: 10,
    borderRadius: r.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#32422C',
  },
  stepText: {
    color: c.primary,
    fontWeight: '700',
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  presetPill: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: c.surface,
    borderRadius: r.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.border,
  },
  presetPillActive: {
    backgroundColor: '#23301F',
    borderColor: c.primary,
  },
  presetText: {
    color: c.muted,
    fontWeight: '600',
  },
  presetTextActive: {
    color: c.primary,
  },
  inputGroup: {
    gap: 6,
  },
  input: {
    color: c.text,
    backgroundColor: c.raised,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: r.sm,
    paddingHorizontal: s.md,
    paddingVertical: 12,
    fontSize: 15,
  },
  errorText: {
    color: c.danger,
  },
  pressed: {
    opacity: 0.72,
  },
  footer: {
    gap: s.sm,
    paddingTop: 4,
  },
});
