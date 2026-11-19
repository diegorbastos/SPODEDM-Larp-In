import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Card, Message, PermissionToggleButton } from './ui';
import { useWellbeing } from '../state/WellbeingProvider';
import { spacing as s } from '../theme/tokens';

export default function ProtectionPanel() {
  const { state, device, deviceError, busy, control } = useWellbeing();

  const usageOn = Boolean(device.usageAuthorized);
  const blockingOn = Boolean(device.blockingAuthorized);
  const canEnableShield = Boolean(device.available && blockingOn);
  const shieldLit = Boolean(device.active);

  return (
    <Card>
      <AppText variant="heading">Permissões Android</AppText>
      <AppText muted>
        {device.available
          ? 'Os botões acendem quando a permissão está ativa e apagam ao revogar nas configurações do Android. Você pode ativar apenas o que precisar.'
          : 'Ambiente sem módulo nativo Android (Expo Go ou navegador). Você pode testar todas as telas, metas e filtros normalmente.'}
      </AppText>

      <View style={styles.stack}>
        <PermissionToggleButton
          title="Monitoramento de uso em fundo"
          subtitle={
            !device.available
              ? 'Disponível no APK Android'
              : usageOn
                ? 'Ativo em segundo plano · Toque para gerenciar ou revogar'
                : 'Opcional · Lê minutos de Instagram, YouTube e TikTok (sem botão flutuante)'
          }
          icon={usageOn ? 'pulse' : 'pulse-outline'}
          active={device.available && usageOn}
          activeLabel="Ativo"
          inactiveLabel="Apagado"
          disabled={!device.available || busy}
          onPress={() => control('requestUsageAccess')}
        />

        <PermissionToggleButton
          title="Serviço de bloqueio em fundo"
          subtitle={
            !device.available
              ? 'Disponível no APK Android'
              : blockingOn
                ? 'Ativo · Bloqueia Reels, Shorts, TikTok e Afins sem botão flutuante'
                : 'Toque para ativar apenas o serviço Larp-In (não precisa do atalho flutuante)'
          }
          icon={blockingOn ? 'shield-checkmark' : 'shield-outline'}
          active={device.available && blockingOn}
          activeLabel="Ativo"
          inactiveLabel="Apagado"
          disabled={!device.available || busy}
          onPress={() => control('requestBlockingAccess')}
        />

        <PermissionToggleButton
          title="Escudo Larp-In"
          subtitle={
            !device.available
              ? 'Indisponível no Expo Go / navegador'
              : shieldLit
                ? 'Ligado · Pausando Reels, Shorts, TikTok, Foco e Metas · Toque para desligar'
                : canEnableShield
                  ? 'Pronto para ligar · Toque para ativar o bloqueio automático'
                  : 'Ative o serviço de bloqueio acima para ligar o Escudo'
          }
          icon={shieldLit ? 'lock-closed' : 'lock-open-outline'}
          active={shieldLit}
          activeLabel="Ativo"
          inactiveLabel="Apagado"
          disabled={!device.available || busy || (!state.protectionEnabled && !canEnableShield)}
          onPress={() => control(state.protectionEnabled ? 'disable' : 'enable')}
        />
      </View>

      {device.available && (
        <Button
          secondary
          icon="refresh-outline"
          title="Atualizar estado das permissões"
          loading={busy}
          onPress={() => control('refresh')}
        />
      )}

      <AppText variant="caption" muted>
        Permissões independentes: você pode usar só monitoramento de uso, só bloqueio de Reels/Shorts/TikTok, ou ambos juntos — tudo em segundo plano, sem botão flutuante e 100% local.
      </AppText>
      <Message error>{deviceError}</Message>
    </Card>
  );
}

const styles = StyleSheet.create({
  stack: { gap: s.sm },
});
