import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { AppText, Card, Header, Icon, NetworkIcon, Screen, layout } from '../components/ui';
import { colors as c, spacing as s, radius as r } from '../theme/tokens';
import { useWellbeing } from '../state/WellbeingProvider';
import ShortVideoBlockerCard from '../components/ShortVideoBlockerCard';
import AppLimitModal from '../components/AppLimitModal';
import ManageAppsModal from '../components/ManageAppsModal';
import { summary, usageOn } from '../../domain/wellbeing';

const KNOWN_PACKAGES = {
  instagram: ['instagram', 'com.instagram.android', 'com.instagram.lite'],
  youtube: ['youtube', 'com.google.android.youtube', 'app.revanced.android.youtube'],
  tiktok: ['tiktok', 'com.zhiliaoapp.musically', 'com.ss.android.ugc.trill', 'com.zhiliaoapp.musically.go'],
};

function formatDuration(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0m';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

export default function HomeScreen({ navigation }) {
  const { state, clock, device, busy, execute, control } = useWellbeing();
  const [selected, setSelected] = useState('instagram');
  const [editingNetworkId, setEditingNetworkId] = useState(null);
  const [manageAppsVisible, setManageAppsVisible] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(12)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(translateYAnim, { toValue: 0, speed: 24, bounciness: 3, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, translateYAnim]);

  const stats = useMemo(() => summary(state, new Date(clock)), [state, clock]);
  const automaticToday = useMemo(
    () => state.usage.some(e => e.day === stats.today && e.source === 'device'),
    [state.usage, stats.today]
  );
  const isLive = Boolean(device.active || device.monitoringActive || automaticToday);
  const progressRatio = stats.goal > 0 ? Math.min(stats.total / stats.goal, 1) : 0;
  const isOverLimit = stats.total > stats.goal;

  useEffect(() => {
    if (!isLive) {
      pulseAnim.setValue(0.45);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.35, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isLive, pulseAnim]);

  const editingApp = useMemo(
    () => state.preferences.find(p => p.id === editingNetworkId) || null,
    [state.preferences, editingNetworkId]
  );

  const selectedPackages = useMemo(
    () => state.preferences.flatMap(p => KNOWN_PACKAGES[p.id] || [p.id]),
    [state.preferences]
  );

  const handleSaveLimit = useCallback(async (networkId, newLimit, intention) => {
    return execute('updatePreference', networkId, newLimit, intention);
  }, [execute]);

  const handleRecordUsage = useCallback(async (networkId, minutes) => {
    return execute('recordUsage', networkId, minutes);
  }, [execute]);

  const handleGetInstalledApps = useCallback(() => control('getInstalledApps'), [control]);

  const handleSelectInstalledApp = useCallback(app => {
    const pkg = String(app.packageName || '').toLowerCase();
    const label = String(app.label || '').toLowerCase();
    const existing = state.preferences.find(p => {
      const aliases = KNOWN_PACKAGES[p.id] || [p.id];
      return aliases.includes(pkg) || p.name.toLowerCase() === label;
    });
    if (existing) {
      setManageAppsVisible(false);
      setSelected(existing.id);
      setEditingNetworkId(existing.id);
      return true;
    }
    return false;
  }, [state.preferences]);

  const handleOpenDetails = useCallback(networkId => {
    navigation.navigate('Network', { networkId });
  }, [navigation]);

  const statusBadgeText = device.active
    ? 'ESCUDO ON'
    : (device.monitoringActive || automaticToday)
      ? 'EM FUNDO'
      : 'MANUAL';

  return (
    <Screen style={styles.screenContent}>
      <Header
        title="Larp-In"
        subtitle="Menos tela. Mais presença."
        trailing={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir permissões e escudo em Ajustes"
            onPress={() => navigation.navigate('Ajustes')}
            style={({ pressed }) => [
              styles.liveIndicator,
              isLive ? styles.liveIndicatorLit : styles.liveIndicatorDim,
              pressed && styles.pressed,
            ]}
          >
            <Animated.View
              style={[
                styles.pulsingDot,
                isLive ? styles.dotLit : styles.dotDim,
                { opacity: pulseAnim },
              ]}
            />
            <AppText variant="caption" style={isLive ? styles.liveTextLit : styles.liveTextDim}>
              {statusBadgeText}
            </AppText>
          </Pressable>
        }
      />

      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: translateYAnim }], gap: s.lg }}>
        {/* DIAL CENTRAL */}
        <View style={styles.dialContainer}>
          <View style={[styles.outerGlowRing, isOverLimit && styles.outerGlowRingAlert]}>
            <View style={styles.dialRing}>
              <View style={styles.dialInner}>
                <AppText variant="eyebrow" muted style={styles.dialEyebrow}>
                  TEMPO DE TELA HOJE
                </AppText>

                <AppText variant="metric" style={styles.dialMetric}>
                  {stats.recorded ? formatDuration(stats.total) : '0m'}
                </AppText>

                <View style={[styles.statusPill, isOverLimit ? styles.statusPillAlert : styles.statusPillSuccess]}>
                  <View style={[styles.statusDot, isOverLimit ? styles.statusDotAlert : styles.statusDotSuccess]} />
                  <AppText variant="caption" style={isOverLimit ? styles.statusTextAlert : styles.statusTextSuccess}>
                    {isOverLimit ? 'LIMITE DIÁRIO ATINGIDO' : `META: ${formatDuration(stats.goal)}`}
                  </AppText>
                </View>

                {stats.focusMinutes > 0 && (
                  <AppText variant="caption" style={styles.focusText}>
                    ✦ {stats.focusMinutes} min de foco preservados
                  </AppText>
                )}
              </View>
            </View>
          </View>

          <View style={styles.progressBarWrapper}>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progressRatio * 100}%` },
                  isOverLimit && styles.progressBarFillAlert,
                ]}
              />
            </View>
            <View style={layout.between}>
              <AppText variant="caption" muted>
                {stats.recorded ? `${Math.round(progressRatio * 100)}% da meta diária` : 'Toque em um app abaixo para registrar ou ajustar meta'}
              </AppText>
              <AppText variant="caption" muted>
                {formatDuration(stats.goal)}
              </AppText>
            </View>
          </View>
        </View>

        {/* BLOQUEADOR RÁPIDO DE REELS, SHORTS, TIKTOK E AFINS */}
        <ShortVideoBlockerCard compact onOpenSettings={() => navigation.navigate('Ajustes')} />

        {/* SEÇÃO: TEMPO POR APLICATIVO */}
        <View style={styles.sectionHeader}>
          <AppText variant="eyebrow" muted>SEU TEMPO POR APLICATIVO</AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Gerenciar aplicativos instalados"
            onPress={() => setManageAppsVisible(true)}
            style={({ pressed }) => [styles.manageBtn, pressed && styles.pressed]}
          >
            <Icon name="apps-outline" size={14} color={c.primary} />
            <AppText variant="caption" style={styles.manageBtnText}>Apps Android</AppText>
          </Pressable>
        </View>

        <View style={styles.networkList}>
          {state.preferences.map(p => {
            const currentMin = usageOn(state, stats.today, p.id);
            const isSelected = p.id === selected;

            return (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityLabel={`${p.name}: ${currentMin} de ${p.limit} minutos. Toque para ajustar meta.`}
                onPress={() => {
                  setSelected(p.id);
                  setEditingNetworkId(p.id);
                }}
                style={({ pressed }) => [
                  styles.networkRow,
                  isSelected && styles.networkRowActive,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.networkLeft}>
                  <NetworkIcon id={p.id} />
                  <View style={layout.flex}>
                    <AppText variant="heading" style={styles.networkName}>{p.name}</AppText>
                    <AppText variant="caption" muted numberOfLines={1}>
                      {p.intention}
                    </AppText>
                  </View>
                </View>

                <View style={styles.networkRight}>
                  <View style={styles.timeColumn}>
                    <AppText variant="heading" style={styles.networkTime}>
                      {formatDuration(currentMin)}
                    </AppText>
                    <AppText variant="caption" muted>
                      / {formatDuration(p.limit)}
                    </AppText>
                  </View>
                  <Icon name="chevron-forward" size={16} color={c.muted} />
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* CARTÃO DE AÇÃO RÁPIDA: FOCO */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Iniciar ou acompanhar sessão de foco"
          onPress={() => navigation.navigate('Foco')}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <Card style={styles.focusActionCard}>
            <View style={layout.between}>
              <View style={styles.focusTextWrapper}>
                <View style={styles.focusPill}>
                  <Icon name="moon" size={14} color={c.primary} />
                  <AppText variant="caption" style={styles.focusPillText}>PAUSA CONSCIENTE</AppText>
                </View>
                <AppText variant="heading" style={styles.focusTitle}>
                  {state.focus ? 'Sessão de Foco em Andamento' : 'Pausar Notificações e Distrações'}
                </AppText>
                <AppText variant="caption" muted>
                  {state.focus
                    ? 'Toque para verificar seu progresso e tempo restante.'
                    : 'Fique offline por alguns minutos e recupere seu ritmo.'}
                </AppText>
              </View>
              <View style={styles.focusIconCircle}>
                <Icon name="arrow-forward" color={c.onPrimary} size={20} />
              </View>
            </View>
          </Card>
        </Pressable>
      </Animated.View>

      <AppLimitModal
        visible={Boolean(editingApp)}
        network={editingApp}
        currentUsage={editingApp ? usageOn(state, stats.today, editingApp.id) : 0}
        allowManualUsage={!device.usageAuthorized}
        busy={busy}
        onClose={() => setEditingNetworkId(null)}
        onSave={handleSaveLimit}
        onRecordUsage={handleRecordUsage}
        onOpenDetails={handleOpenDetails}
      />

      <ManageAppsModal
        visible={manageAppsVisible}
        onClose={() => setManageAppsVisible(false)}
        selectedPackages={selectedPackages}
        getInstalledApps={handleGetInstalledApps}
        onSelectApp={handleSelectInstalledApp}
        onOpenSettings={() => navigation.navigate('Ajustes')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: s.xxl,
  },
  pressed: {
    opacity: 0.78,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: r.pill,
    borderWidth: 1,
  },
  liveIndicatorLit: {
    backgroundColor: '#162412',
    borderColor: c.primary,
  },
  liveIndicatorDim: {
    backgroundColor: '#121414',
    borderColor: '#262B28',
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotLit: {
    backgroundColor: c.primary,
  },
  dotDim: {
    backgroundColor: '#666E69',
  },
  liveTextLit: {
    color: c.primary,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 1,
  },
  liveTextDim: {
    color: c.muted,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 1,
  },
  dialContainer: {
    alignItems: 'center',
    paddingVertical: s.sm,
    gap: s.lg,
  },
  outerGlowRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: '#1D251A',
    backgroundColor: '#0D110D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 4,
  },
  outerGlowRingAlert: {
    borderColor: '#3D1C1A',
    backgroundColor: '#140D0D',
    shadowColor: c.danger,
  },
  dialRing: {
    width: 194,
    height: 194,
    borderRadius: 97,
    borderWidth: 2,
    borderColor: '#2A3624',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialInner: {
    alignItems: 'center',
    gap: 6,
  },
  dialEyebrow: {
    letterSpacing: 2,
    fontSize: 10,
  },
  dialMetric: {
    fontSize: 46,
    lineHeight: 50,
    fontWeight: '700',
    color: c.text,
    letterSpacing: -1.5,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: r.pill,
  },
  statusPillSuccess: {
    backgroundColor: '#172212',
    borderWidth: 1,
    borderColor: '#2E4424',
  },
  statusPillAlert: {
    backgroundColor: '#271312',
    borderWidth: 1,
    borderColor: '#52201F',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotSuccess: {
    backgroundColor: c.primary,
  },
  statusDotAlert: {
    backgroundColor: c.danger,
  },
  statusTextSuccess: {
    color: c.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  statusTextAlert: {
    color: c.danger,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  focusText: {
    color: c.primary,
    fontSize: 11,
    fontWeight: '500',
  },
  progressBarWrapper: {
    width: '100%',
    gap: 8,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#1A1E1B',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: c.primary,
    borderRadius: 3,
  },
  progressBarFillAlert: {
    backgroundColor: c.danger,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: s.xs,
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#162114',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: r.pill,
    borderWidth: 1,
    borderColor: '#2D3E25',
  },
  manageBtnText: {
    color: c.primary,
    fontWeight: '700',
  },
  networkList: {
    gap: 8,
  },
  networkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.surface,
    padding: s.md,
    borderRadius: r.md,
    borderWidth: 1,
    borderColor: c.border,
  },
  networkRowActive: {
    borderColor: '#3D4C33',
    backgroundColor: '#151A13',
  },
  networkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  networkName: {
    fontSize: 16,
  },
  networkRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeColumn: {
    alignItems: 'flex-end',
  },
  networkTime: {
    fontSize: 17,
    fontWeight: '700',
  },
  focusActionCard: {
    backgroundColor: '#121810',
    borderColor: '#293B22',
    paddingVertical: s.lg,
  },
  focusTextWrapper: {
    flex: 1,
    gap: 6,
  },
  focusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1C2717',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: r.pill,
  },
  focusPillText: {
    color: c.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  focusTitle: {
    fontSize: 17,
  },
  focusIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
});
