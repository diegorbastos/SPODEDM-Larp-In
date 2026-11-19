import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText, Button, Card, Icon, Message, Screen, layout } from '../components/ui';
import { colors as c } from '../theme/tokens';
import { useWellbeing } from '../state/WellbeingProvider';

export default function OnboardingScreen() {
  const { device, deviceError, error, busy, execute, control } = useWellbeing();
  const [openingSettings, setOpeningSettings] = useState(false);

  // Permissão concedida se o Android reportar como autorizada ou se não estiver em ambiente nativo
  const isAuthorized = device.usageAuthorized || !device.available;

  async function handleRequestPermission() {
    setOpeningSettings(true);
    try {
      await control('requestUsageAccess');
    } finally {
      setOpeningSettings(false);
    }
  }

  async function handleComplete() {
    await execute('completeOnboarding');
  }

  return (
    <Screen>
      <View style={layout.row}>
        <Icon name="leaf-outline" color={c.primary} size={24} />
        <AppText variant="heading">Larp-In</AppText>
      </View>

      <View style={styles.art} accessible accessibilityLabel="Bem-vindo ao Larp-In">
        <View style={styles.orbit}>
          <View style={styles.orbitInner}>
            <Icon name="timer-outline" size={64} color={c.primary} />
          </View>
        </View>
        <View style={styles.badge}>
          <Icon name="sparkles-outline" size={16} color={c.primary} />
          <AppText variant="caption">100% Local · Sem Servidores · Zero Backend</AppText>
        </View>
      </View>

      <View style={layout.gap}>
        <AppText variant="eyebrow" style={{ color: c.primary }}>CONFIGURAÇÃO INICIAL</AppText>
        <AppText variant="hero">Monitore seu tempo.{ '\n' }Com clareza real.</AppText>
        <AppText muted>
          O Larp-In lê o tempo de tela de Instagram, YouTube e TikTok diretamente do Android para que você cuide do seu foco diário.
        </AppText>
      </View>

      {/* BLOCO OBRIGATÓRIO DE PERMISSÃO */}
      <Card style={isAuthorized ? styles.cardSuccess : styles.cardPending}>
        <View style={layout.row}>
          <Icon 
            name={isAuthorized ? "checkmark-circle" : "shield-alert-outline"} 
            color={isAuthorized ? c.primary : "#D97706"} 
            size={28} 
          />
          <View style={layout.flex}>
            <AppText variant="heading">
              {isAuthorized ? "Acesso ao uso autorizado" : "Permissão necessária"}
            </AppText>
            <AppText variant="caption" muted>
              {isAuthorized 
                ? "Tudo pronto! Seus dados de tela serão sincronizados localmente." 
                : "Autorização de sistema obrigatória para medição de tela."}
            </AppText>
          </View>
        </View>

        {!isAuthorized && (
          <>
            <AppText muted>
              O Android exige que você autorize o acesso às estatísticas de uso nas configurações do sistema. Sem essa permissão, o aplicativo não consegue contabilizar seus minutos.
            </AppText>
            <Button
              title={openingSettings ? "Abrindo configurações..." : "Autorizar Acesso ao Uso"}
              icon="open-outline"
              disabled={busy || openingSettings}
              onPress={handleRequestPermission}
            />
          </>
        )}
      </Card>

      <Message error>{error || deviceError}</Message>

      {/* BOTÃO DE CONCLUSÃO BLOQUEANTE */}
      <View style={styles.footer}>
        <Button
          title={busy ? "Preparando..." : "Concluir e Começar"}
          icon="arrow-forward"
          disabled={busy || !isAuthorized}
          onPress={handleComplete}
        />
        {!isAuthorized && (
          <AppText variant="caption" muted style={styles.center}>
            Aguardando autorização nas configurações do Android para desbloquear o app.
          </AppText>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  art: { alignItems: 'center', paddingVertical: 16, gap: 16 },
  orbit: { 
    width: 180, 
    height: 180, 
    borderRadius: 90, 
    borderWidth: 1, 
    borderColor: c.border, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  orbitInner: { 
    width: 130, 
    height: 130, 
    borderRadius: 65, 
    borderWidth: 1, 
    borderColor: '#424D36', 
    backgroundColor: '#141C10', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  badge: { 
    backgroundColor: c.surface, 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 30, 
    flexDirection: 'row', 
    gap: 8, 
    alignItems: 'center' 
  },
  cardPending: {
    borderColor: '#78350F',
    backgroundColor: '#1C150A',
    gap: 12,
  },
  cardSuccess: {
    borderColor: '#2D3E23',
    backgroundColor: '#121A0E',
    gap: 12,
  },
  footer: {
    gap: 10,
    paddingTop: 8,
  },
  center: { textAlign: 'center' },
});
