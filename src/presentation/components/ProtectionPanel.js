import React, { useState } from 'react';
import { AppText, Button, Card, Message } from './ui';
import { useWellbeing } from '../state/WellbeingProvider';

export default function ProtectionPanel({ compact = false }) {
  const { state, device, deviceError, busy, control } = useWellbeing();
  const [disclosure, setDisclosure] = useState(null);
  if (compact) return <Card><AppText variant="heading">{device.active ? 'Proteção ativa' : deviceError ? 'Verifique a proteção' : 'Proteção desativada'}</AppText>
    <AppText muted>{!device.available ? 'Abra o APK ou build iOS para usar dados automáticos e bloqueio.' : device.active ? 'Os aplicativos associados ficam bloqueados durante o foco e ao atingir a meta diária.' : 'Configure as permissões e ative a proteção em Ajustes.'}</AppText>
    <Message error>{deviceError}</Message></Card>;
  return <Card>
    <AppText variant="heading">Uso automático e bloqueio</AppText>
    <AppText muted>{device.available ? 'Autorize os recursos abaixo. Você pode desativar a proteção a qualquer momento.' : 'Disponível no APK Android e no build iOS. Expo Go e navegador oferecem somente a versão manual.'}</AppText>
    {device.available && <>
      <AppText>Uso: {device.usageAuthorized ? 'autorizado' : 'aguardando permissão'}{ '\n' }Bloqueio: {device.blockingAuthorized ? 'autorizado' : 'aguardando permissão'}{ '\n' }Proteção: {device.active ? 'ativa' : 'desativada'}</AppText>
      {!device.usageAuthorized && <Button secondary title="Autorizar dados de uso" disabled={busy} onPress={() => setDisclosure('requestUsageAccess')} />}
      {!device.blockingAuthorized && device.platform === 'android' && <Button secondary title="Autorizar bloqueio" disabled={busy} onPress={() => setDisclosure('requestBlockingAccess')} />}
      {disclosure && <>
        <AppText>{disclosure === 'requestBlockingAccess'
          ? 'O serviço de acessibilidade identifica o aplicativo aberto e cobre sua tela ao atingir a meta ou durante o foco. Não lê mensagens, senhas ou conteúdo da tela. Nenhum dado é enviado a servidores. Ative apenas o serviço Larp-In na próxima tela; você poderá desativá-lo nas configurações do Android.'
          : 'O Larp-In usa o tempo de atividade dos aplicativos para mostrar seu consumo e aplicar suas metas. No Android, os totais são salvos localmente. No iPhone, os dados permanecem no relatório protegido do Tempo de Uso. Não acessamos mensagens ou senhas e não enviamos dados a servidores.'}</AppText>
        <Button title="Entendi, abrir autorização" disabled={busy} onPress={async () => { if (await control(disclosure)) setDisclosure(null); }} />
        <Button secondary title="Agora não" onPress={() => setDisclosure(null)} />
      </>}
      {device.platform === 'ios' && device.usageAuthorized && <>
        <AppText muted>Associe cada rede ao aplicativo correto no seletor do iOS. Alterar uma seleção desativa a proteção até você reativá-la.</AppText>
        {state.preferences.map(p => <Button key={p.id} secondary disabled={busy} title={`${device.selected.includes(p.id) ? 'Trocar' : 'Selecionar'} ${p.name}`} onPress={() => control('selectApplications', p.id)} />)}
      </>}
      {state.protectionEnabled ? <Button secondary title="Desativar proteção" disabled={busy} onPress={() => control('disable')} />
        : <Button title="Ativar proteção" disabled={busy || !device.usageAuthorized || !device.blockingAuthorized || !device.selected.length} onPress={() => control('enable')} />}
      <Button secondary title="Atualizar permissões e dados" disabled={busy} onPress={() => control('refresh')} />
      <AppText variant="caption" muted>Bloqueia o aplicativo inteiro, não somente Reels ou Shorts. Permissões revogadas e limitações do sistema podem interromper a proteção.</AppText>
    </>}
    <Message error>{deviceError}</Message>
  </Card>;
}
