import React, { useState } from 'react';
import { View } from 'react-native';
import { AppText, Button, Card, Header, Icon, Message, Screen, layout } from '../components/ui';
import { colors as c } from '../theme/tokens';
import ProtectionPanel from '../components/ProtectionPanel';
import ShortVideoBlockerCard from '../components/ShortVideoBlockerCard';
import { useWellbeing } from '../state/WellbeingProvider';

export default function SettingsScreen() {
  const { execute, busy, error } = useWellbeing();
  const [confirm, setConfirm] = useState(false);

  return (
    <Screen>
      <Header title="Do seu jeito" subtitle="Mais clareza. Menos distrações." />
      <Card>
        <View style={layout.row}>
          <Icon name="leaf-outline" size={36} color={c.primary} />
          <View style={layout.flex}>
            <AppText variant="title">Larp-In</AppText>
            <AppText variant="caption" muted>Versão 1.2.0 · Android · React Native Expo</AppText>
          </View>
        </View>
        <AppText muted>
          Uma relação mais intencional com as redes. Bloqueio de Reels, Shorts, TikTok e afins com monitoramento em segundo plano.
        </AppText>
      </Card>

      <ProtectionPanel />

      <ShortVideoBlockerCard />

      <Card>
        <Icon name="shield-checkmark-outline" color={c.primary} />
        <AppText variant="heading">Seus dados ficam com você</AppText>
        <AppText muted>Metas, filtros, intenções e histórico ficam salvos apenas neste Android. Não há conta, anúncios ou envio para servidores.</AppText>
        <AppText variant="caption" muted>O serviço em segundo plano verifica apenas os IDs das telas de Reels, Shorts, TikTok, Kwai, Facebook Reels e Spotlight — nunca lê mensagens, senhas ou textos digitados.</AppText>
      </Card>

      <Card>
        <AppText variant="heading">Um novo começo</AppText>
        <AppText muted>Apague metas, registros e sessões deste aparelho e volte à tela inicial.</AppText>
        {confirm ? (
          <>
            <AppText style={{ color: c.danger }}>Apagar todos os dados locais? Esta ação não pode ser desfeita.</AppText>
            <Button title="Manter meus dados" secondary onPress={() => setConfirm(false)} disabled={busy} />
            <Button
              title="Apagar e recomeçar"
              danger
              loading={busy}
              onPress={async () => {
                if (await execute('reset')) setConfirm(false);
              }}
            />
          </>
        ) : (
          <Button title="Restaurar dados do Larp-In" secondary onPress={() => setConfirm(true)} />
        )}
        <Message error>{error}</Message>
      </Card>

      <AppText variant="caption" muted>
        Feito para viver mais fora da tela.{'\n'}Identidade independente, sem vínculo com as redes exibidas.
      </AppText>
    </Screen>
  );
}
