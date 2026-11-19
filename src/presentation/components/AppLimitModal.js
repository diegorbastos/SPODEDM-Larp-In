import React, { useState } from 'react';
import { View, Modal, Pressable, StyleSheet } from 'react-native';
import { AppText, Button, Card, Icon, NetworkIcon, layout } from './ui';
import { colors as c, spacing as s, radius as r } from '../theme/tokens';

export default function AppLimitModal({ visible, network, onClose, onSave, busy }) {
  if (!network) return null;

  const [limit, setLimit] = useState(network.limit || 30);
  const [intention, setIntention] = useState(network.intention || '');

  function adjustMinutes(delta) {
    setLimit(prev => Math.max(5, Math.min(720, prev + delta)));
  }

  function handleSave() {
    onSave(network.id, limit, intention || network.intention);
  }

  const presets = [15, 30, 45, 60, 90, 120];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Card style={styles.sheet}>
          <View style={layout.between}>
            <View style={styles.appHeader}>
              <NetworkIcon id={network.id} />
              <View>
                <AppText variant="heading">{network.name}</AppText>
                <AppText variant="caption" muted>Definir limite consciente</AppText>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Fechar">
              <Icon name="close" size={20} color={c.muted} />
            </Pressable>
          </View>

          <View style={styles.metricCard}>
            <AppText variant="eyebrow" muted>META DIÁRIA</AppText>
            <View style={styles.metricRow}>
              <AppText variant="metric" style={styles.metricValue}>{limit}</AppText>
              <AppText variant="heading" muted style={styles.metricUnit}>minutos / dia</AppText>
            </View>

            {/* BOTÕES DE INCREMENTO RÁPIDO ESTILO OPAL */}
            <View style={styles.stepperRow}>
              <Pressable onPress={() => adjustMinutes(-15)} style={styles.stepBtn}>
                <AppText variant="label" style={styles.stepText}>-15m</AppText>
              </Pressable>
              <Pressable onPress={() => adjustMinutes(-5)} style={styles.stepBtn}>
                <AppText variant="label" style={styles.stepText}>-5m</AppText>
              </Pressable>
              <Pressable onPress={() => adjustMinutes(5)} style={styles.stepBtn}>
                <AppText variant="label" style={styles.stepText}>+5m</AppText>
              </Pressable>
              <Pressable onPress={() => adjustMinutes(15)} style={styles.stepBtn}>
                <AppText variant="label" style={styles.stepText}>+15m</AppText>
              </Pressable>
            </View>
          </View>

          {/* PRESETS RÁPIDOS */}
          <View style={styles.presetRow}>
            {presets.map(mins => (
              <Pressable
                key={mins}
                onPress={() => setLimit(mins)}
                style={[styles.presetPill, limit === mins && styles.presetPillActive]}
              >
                <AppText variant="caption" style={[styles.presetText, limit === mins && styles.presetTextActive]}>
                  {mins}m
                </AppText>
              </Pressable>
            ))}
          </View>

          <View style={styles.footer}>
            <Button title="Salvar Meta" onPress={handleSave} disabled={busy} />
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: '#101410',
    borderColor: '#243120',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: s.lg,
    paddingBottom: s.xl,
    gap: s.lg,
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
    fontSize: 54,
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
  footer: {
    paddingTop: 4,
  },
});
