import React, { useState, useEffect } from 'react';
import { View, Modal, Pressable, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { AppText, Button, Card, Icon, layout } from './ui';
import { colors as c, spacing as s, radius as r } from '../theme/tokens';

export default function ManageAppsModal({ visible, onClose, onSelectApp, selectedPackages = [], getInstalledApps }) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (visible && getInstalledApps) {
      loadApps();
    }
  }, [visible]);

  async function loadApps() {
    setLoading(true);
    try {
      const list = await getInstalledApps();
      if (Array.isArray(list)) {
        setApps(list);
      }
    } catch (e) {
      console.warn('Erro ao carregar apps instalados:', e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = apps.filter(item =>
    item.label.toLowerCase().includes(search.toLowerCase()) ||
    item.packageName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Card style={styles.sheet}>
          <View style={layout.between}>
            <View>
              <AppText variant="heading">Aplicativos no Dispositivo</AppText>
              <AppText variant="caption" muted>Selecione quais deseja acompanhar no Larp-In</AppText>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Fechar">
              <Icon name="close" size={20} color={c.muted} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={c.primary} size="large" />
              <AppText variant="caption" muted>Carregando aplicativos instalados...</AppText>
            </View>
          ) : apps.length === 0 ? (
            <View style={styles.emptyBox}>
              <Icon name="apps-outline" size={40} color={c.muted} />
              <AppText muted style={styles.centerText}>
                Nenhum aplicativo com lançador detectado ou permissão pendente.
              </AppText>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={item => item.packageName}
              style={styles.list}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = selectedPackages.includes(item.packageName);
                return (
                  <Pressable
                    style={[styles.appRow, isSelected && styles.appRowSelected]}
                    onPress={() => onSelectApp(item)}
                  >
                    <View style={styles.appIconCircle}>
                      <Icon name="logo-android" size={20} color={isSelected ? c.primary : c.muted} />
                    </View>
                    <View style={layout.flex}>
                      <AppText variant="label">{item.label}</AppText>
                      <AppText variant="caption" muted numberOfLines={1}>{item.packageName}</AppText>
                    </View>
                    <Icon
                      name={isSelected ? "checkbox" : "square-outline"}
                      size={22}
                      color={isSelected ? c.primary : c.muted}
                    />
                  </Pressable>
                );
              }}
            />
          )}

          <Button title="Concluir Seleção" onPress={onClose} />
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
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
    maxHeight: '80%',
    gap: s.md,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBox: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  emptyBox: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 12,
  },
  centerText: {
    textAlign: 'center',
  },
  list: {
    maxHeight: 380,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1A2118',
  },
  appRowSelected: {
    backgroundColor: '#162113',
    borderRadius: r.sm,
  },
  appIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
