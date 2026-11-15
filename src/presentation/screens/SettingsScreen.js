import React, { useState } from 'react';
import { View } from 'react-native';
import { AppText, Button, Card, Header, Icon, Message, Screen, layout } from '../components/ui';
import { colors as c } from '../theme/tokens';
import ProtectionPanel from '../components/ProtectionPanel';
import { useWellbeing } from '../state/WellbeingProvider';

export default function SettingsScreen() {
  const { execute, busy, error } = useWellbeing();
  const [confirm, setConfirm] = useState(false);
  return <Screen>
    <Header title="Do seu jeito" subtitle="Mais clareza. Menos distrações." />
    <Card><View style={layout.row}><Icon name="leaf-outline" size={36} color={c.primary} /><View style={layout.flex}><AppText variant="title">Larp-In</AppText><AppText variant="caption" muted>Versão 1.1.0 · Projeto acadêmico</AppText></View></View><AppText muted>Uma relação mais intencional com as redes. Inspirado no bem-estar digital, feito para pequenas mudanças todos os dias.</AppText></Card>
    <ProtectionPanel />
    <Card><Icon name="shield-checkmark-outline" color={c.primary} /><AppText variant="heading">Seus dados ficam com você</AppText><AppText muted>Metas, intenções e histórico são salvos apenas neste aparelho. Não há conta, anúncios ou envio para servidores.</AppText><AppText variant="caption" muted>O armazenamento local não é criptografado. Não informe senhas nas intenções. Desinstalar ou limpar os dados do app pode apagar o histórico.</AppText></Card>
    <Card><AppText variant="heading">O que o Larp-In acompanha</AppText><AppText muted>No Android autorizado, o uso é coletado automaticamente ao abrir o app e a cada 30 segundos enquanto ele está ativo. No iPhone, consulte o relatório nativo do Tempo de Uso. Sem integração nativa, você pode registrar os minutos manualmente.</AppText><AppText muted>Com a proteção ativada, os aplicativos associados são bloqueados durante o foco e ao atingir suas metas. Não removemos Reels, Shorts ou anúncios. Você mantém o controle das permissões.</AppText></Card>
    <Card><AppText variant="heading">Um novo começo</AppText><AppText muted>Apague metas, registros e sessões deste aparelho e volte às boas-vindas.</AppText>
      {confirm ? <><AppText style={{ color: c.danger }}>Apagar todos os dados locais? Esta ação não pode ser desfeita.</AppText><Button title="Manter meus dados" secondary onPress={() => setConfirm(false)} disabled={busy} /><Button title="Apagar e recomeçar" danger disabled={busy} onPress={() => execute('reset')} /></>
        : <Button title="Restaurar dados do Larp-In" secondary onPress={() => setConfirm(true)} />}
      <Message error>{error}</Message>
    </Card>
    <AppText variant="caption" muted>Feito para viver mais fora da tela.{ '\n' }Identidade independente, sem vínculo com SocialLite ou com as redes exibidas.</AppText>
  </Screen>;
}
