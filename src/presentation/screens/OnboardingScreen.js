import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { AppText, Button, Icon, Message, PermissionToggleButton, Screen, layout } from '../components/ui';
import { colors as c } from '../theme/tokens';
import { useWellbeing } from '../state/WellbeingProvider';

export default function OnboardingScreen() {
  const { device, deviceError, error, busy, execute, control } = useWellbeing();
  const fade = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, speed: 22, bounciness: 4, useNativeDriver: true }),
    ]).start();
  }, [fade, translateY]);

  const usageOn = Boolean(device.usageAuthorized);
  const blockingOn = Boolean(device.blockingAuthorized);
  const anyReady = usageOn || blockingOn || !device.available;

  return (
    <Screen>
      <Animated.View style={[styles.container, { opacity: fade, transform: [{ translateY }] }]}>
        <View style={layout.row}>
          <Icon name="leaf-outline" color={c.primary} size={24} />
          <AppText variant="heading">Larp-In</AppText>
        </View>

        <View style={styles.art} accessible accessibilityLabel="Bem-vindo ao Larp-In">
          <View style={styles.orbit}>
            <View style={styles.orbitInner}>
              <Icon name="shield-checkmark-outline" size={62} color={c.primary} />
            </View>
          </View>
          <View style={styles.badge}>
            <Icon name="logo-android" size={16} color={c.primary} />
            <AppText variant="caption">Android · Reels, Shorts e TikTok · 100% Local</AppText>
          </View>
        </View>

        <View style={layout.gap}>
          <AppText variant="eyebrow" style={{ color: c.primary }}>MENOS SCROLL INFINITO</AppText>
          <AppText variant="hero">Bloqueie Reels e Shorts.{'\n'}Recupere seu foco.</AppText>
          <AppText muted>
            Monitore seu tempo em segundo plano sem botão flutuante e bloqueie Instagram Reels, YouTube Shorts, TikTok, Kwai e afins.
          </AppText>
        </View>

        {device.available ? (
          <View style={styles.permList}>
            <PermissionToggleButton
              title="Monitoramento de uso em fundo"
              subtitle={usageOn ? 'Permissão ativa · Toque para gerenciar' : 'Opcional · Lê minutos de uso no Android'}
              icon={usageOn ? 'pulse' : 'pulse-outline'}
              active={usageOn}
              activeLabel="Ativo"
              inactiveLabel="Apagado"
              disabled={busy}
              onPress={() => control('requestUsageAccess')}
            />
            <PermissionToggleButton
              title="Bloqueio de Reels, Shorts e TikTok"
              subtitle={blockingOn ? 'Serviço ativo sem botão flutuante' : 'Opcional · Ative apenas o serviço Larp-In (sem atalho)'}
              icon={blockingOn ? 'shield-checkmark' : 'shield-outline'}
              active={blockingOn}
              activeLabel="Ativo"
              inactiveLabel="Apagado"
              disabled={busy}
              onPress={() => control('requestBlockingAccess')}
            />
          </View>
        ) : (
          <PermissionToggleButton
            title="Modo manual pronto"
            subtitle="Expo Go / navegador · Você já pode testar todas as telas, metas e filtros"
            icon="checkmark-circle"
            active
            activeLabel="Pronto"
            inactiveLabel="Apagado"
            disabled
          />
        )}

        <Message error>{error || deviceError}</Message>

        <View style={styles.footer}>
          <Button
            title={anyReady ? 'Começar agora' : 'Entrar agora e configurar depois'}
            icon="arrow-forward"
            loading={busy}
            onPress={() => execute('completeOnboarding')}
          />
          {device.available && !anyReady && (
            <AppText variant="caption" muted style={styles.center}>
              Permissões flexíveis: você pode ativar ou retirar qualquer uma depois em Ajustes.
            </AppText>
          )}
        </View>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: 18 },
  art: { alignItems: 'center', paddingVertical: 10, gap: 14 },
  orbit: {
    width: 164,
    height: 164,
    borderRadius: 82,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitInner: {
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 1,
    borderColor: '#424D36',
    backgroundColor: '#141C10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    backgroundColor: c.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 30,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  permList: { gap: 10 },
  footer: {
    gap: 10,
    paddingTop: 4,
  },
  center: { textAlign: 'center' },
});
