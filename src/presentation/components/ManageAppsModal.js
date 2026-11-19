import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { AppText, Button, Card, Icon, layout } from './ui';
import { colors as c, spacing as s, radius as r } from '../theme/tokens';

const AppRow = memo(function AppRow({ item, isSelected, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.appRow, isSelected && styles.appRowSelected, pressed && styles.pressed]}
      onPress={() => onPress(item)}
    >
      <View style={styles.appIconCircle}>
        <Icon name="logo-android" size={20} color={isSelected ? c.primary : c.muted} />
      </View>
      <View style={layout.flex}>
        <AppText variant="label">{item.label}</AppText>
        <AppText variant="caption" muted numberOfLines={1}>{item.packageName}</AppText>
      </View>
      <Icon
        name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
        size={22}
        color={isSelected ? c.primary : c.muted}
      />
    </Pressable>
  );
});

export default function ManageAppsModal({
  visible,
  onClose,
  onSelectApp,
  selectedPackages = [],
  getInstalledApps,
  onOpenSettings,
}) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(48)).current;

  const loadApps = useCallback(async () => {
    if (!getInstalledApps) return;
    setLoading(true);
    setNotice('');
    try {
      const list = await getInstalledApps();
      setApps(Array.isArray(list) ? list : []);
    } catch {
      setApps([]);
      setNotice('Não foi possível consultar os apps instalados agora.');
    } finally {
      setLoading(false);
    }
  }, [getInstalledApps]);

  useEffect(() => {
    if (visible) {
      setSearch('');
      setNotice('');
      loadApps();

      backdropOpacity.setValue(0);
      sheetTranslateY.setValue(48);
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(sheetTranslateY, { toValue: 0, speed: 22, bounciness: 4, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, loadApps, backdropOpacity, sheetTranslateY]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return apps;
    return apps.filter(item =>
      item.label.toLowerCase().includes(q) || item.packageName.toLowerCase().includes(q)
    );
  }, [apps, search]);

  const handlePressRow = useCallback(item => {
    const handled = onSelectApp?.(item);
    if (!handled) {
      setNotice(`${item.label} detectado. Metas de tempo acompanham Instagram, YouTube e TikTok; Reels, Shorts, Kwai, FB Reels e Spotlight são bloqueados pelo filtro de vídeos curtos.`);
    }
  }, [onSelectApp]);

  const renderItem = useCallback(({ item }) => {
    const isSelected = selectedPackages.includes(item.packageName);
    return <AppRow item={item} isSelected={isSelected} onPress={handlePressRow} />;
  }, [selectedPackages, handlePressRow]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'android' ? 'height' : undefined}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View style={{ transform: [{ translateY: sheetTranslateY }] }}>
          <Card style={styles.sheet}>
            <View style={layout.between}>
              <View style={layout.flex}>
                <AppText variant="heading">Aplicativos no Android</AppText>
                <AppText variant="caption" muted>
                  Toque em Instagram, YouTube ou TikTok para ajustar a meta
                </AppText>
              </View>
              <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Fechar">
                <Icon name="close" size={20} color={c.muted} />
              </Pressable>
            </View>

            {apps.length > 0 && (
              <View style={styles.searchBox}>
                <Icon name="search-outline" size={18} color={c.muted} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Buscar aplicativo..."
                  placeholderTextColor={c.muted}
                  selectionColor={c.primary}
                  style={styles.searchInput}
                />
                {search.length > 0 && (
                  <Pressable onPress={() => setSearch('')} accessibilityLabel="Limpar busca">
                    <Icon name="close-circle" size={18} color={c.muted} />
                  </Pressable>
                )}
              </View>
            )}

            {notice ? <AppText variant="caption" style={styles.notice}>{notice}</AppText> : null}

            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={c.primary} size="large" />
                <AppText variant="caption" muted>Carregando aplicativos instalados...</AppText>
              </View>
            ) : apps.length === 0 ? (
              <View style={styles.emptyBox}>
                <Icon name="logo-android" size={38} color={c.muted} />
                <AppText muted style={styles.centerText}>
                  Lista nativa disponível no APK Android. No Expo Go, você pode ajustar metas e filtros de vídeos curtos direto na tela inicial.
                </AppText>
                {onOpenSettings && (
                  <Button
                    secondary
                    title="Abrir Ajustes e Permissões"
                    onPress={() => {
                      onClose();
                      onOpenSettings();
                    }}
                  />
                )}
              </View>
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={item => item.packageName}
                style={styles.list}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                initialNumToRender={12}
                maxToRenderPerBatch={12}
                windowSize={5}
                removeClippedSubviews={Platform.OS === 'android'}
                renderItem={renderItem}
                ListEmptyComponent={
                  <AppText muted style={styles.centerText}>Nenhum aplicativo encontrado para "{search}".</AppText>
                }
              />
            )}

            <Button title="Concluir" onPress={onClose} />
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
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  sheet: {
    backgroundColor: '#101410',
    borderColor: '#243120',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: s.lg,
    maxHeight: '85%',
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: c.raised,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: r.sm,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    color: c.text,
    fontSize: 15,
    paddingVertical: 8,
  },
  notice: {
    color: c.primary,
  },
  loadingBox: {
    paddingVertical: 44,
    alignItems: 'center',
    gap: 12,
  },
  emptyBox: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 14,
  },
  centerText: {
    textAlign: 'center',
  },
  list: {
    maxHeight: 340,
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
  pressed: {
    opacity: 0.72,
  },
});
